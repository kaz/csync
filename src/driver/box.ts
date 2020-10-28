import { BoxClient } from "box-node-sdk";
import { Readable } from "stream";

import { Items, Folder } from "./box-types";

class BaseAPI {
	protected client: BoxClient;

	constructor(client: BoxClient) {
		this.client = client;
	}

	protected async call<T>(apiCall: () => Promise<T>): Promise<T> {
		try {
			return await apiCall();
		} catch (e) {
			if (e.statusCode == 429) {
				const after = (e.response && e.response.headers && e.response.headers["retry-after"] || 4) + 1;
				console.log(`[!] Rate limits exeeced. Retrying after ${after} seconds...`);

				await new Promise(resolve => setTimeout(resolve, 1000 * (1 + after)));
				return this.call(apiCall);
			}
			throw e;
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
