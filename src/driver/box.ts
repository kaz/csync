import { Readable } from "stream";
import { BoxClient } from "box-node-sdk";
import { Semaphore } from "semaphore-promise";

import { Items, Folder } from "./box-types";

class BaseAPI {
	private semaphore = new Semaphore(16);

	protected client: BoxClient;

	constructor(client: BoxClient) {
		this.client = client;
	}

	protected async call<T>(apiCall: () => Promise<T>): Promise<T> {
		const release = await this.semaphore.acquire();

		try {
			const result = await apiCall();
			release();
			return result;
		} catch (e) {
			const after = (() => {
				const maxWait = 60;
				if (e.statusCode == 429) {
					const after = Math.min(e.response && e.response.headers && e.response.headers["retry-after"] || maxWait, maxWait);
					console.error(`[!] Rate limits exeeced.`);
					console.error(`    Retrying after ${after} seconds...`);
					return after;
				} else {
					console.error(`[!] Generic error occurred. (${e.message})`);
					console.error(`    Retrying after ${maxWait} seconds...`);
					return maxWait;
				}
			})();

			await new Promise(resolve => setTimeout(resolve, 1000 * after));
			release();
			return this.call(apiCall);
		}
	}
}

class FilesAPI extends BaseAPI {
	async getReadStream(id: string): Promise<Readable> {
		return this.call(() => this.client.files.getReadStream(id));
	}
	async uploadFile(parentId: string, name: string, stream: Readable): Promise<File> {
		return this.call(() => this.client.files.uploadFile(parentId, name, stream));
	}
	async delete(id: string): Promise<void> {
		return this.call(() => this.client.files.delete(id));
	}
}

class FoldersAPI extends BaseAPI {
	async getItems(id: string, options: object): Promise<Items> {
		return this.call(() => this.client.folders.getItems(id, options));
	}
	async create(parentId: string, name: string): Promise<Folder> {
		return this.call(() => this.client.folders.create(parentId, name));
	}
	async delete(id: string, options: object): Promise<void> {
		return this.call(() => this.client.folders.delete(id, options));
	}
}

export default class {
	public files: FilesAPI;
	public folders: FoldersAPI;

	constructor(client: BoxClient) {
		this.files = new FilesAPI(client);
		this.folders = new FoldersAPI(client);
	}
}
