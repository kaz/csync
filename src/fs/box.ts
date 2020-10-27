import type { BoxClient } from "box-node-sdk";

import { AsyncProcessor, Tree, TreeNode } from ".";

type BoxTreeNode = TreeNode & { id: string; };

type Entry = {
	type: "file" | "folder" | "web_link";
	id: string;
	name: string;
	sha1?: string;
	entries?: Entry[],
};

export default class implements Tree<BoxTreeNode> {
	private client: BoxClient;
	private root: string;

	constructor(client: BoxClient, root: string) {
		this.client = client;
		this.root = root;
	}

	private async setupRootDir(): Promise<Entry> {
		const accountRoot: Entry = await this.client.folders.getItems("0", { limit: 1000 });
		return accountRoot.entries?.find(ent => ent.type == "folder" && ent.name == this.root) || this.client.folders.create("0", this.root);
	}

	private async readFile(ent: Entry): Promise<BoxTreeNode> {
		if (ent.type != "file") {
			throw new Error(`unexpected type: "${ent.type}", expected "file"`);
		}
		if (!ent.sha1) {
			throw new Error(`sha1 is null: ${JSON.stringify(ent)}`);
		}
		return {
			id: ent.id,
			type: ent.type,
			name: ent.name,
			sha1: ent.sha1,
			content: () => this.client.files.getReadStream(ent.id),
		};
	}
	private async readFolder(ent: Entry): Promise<BoxTreeNode> {
		if (ent.type != "folder") {
			throw new Error(`unexpected type: "${ent.type}", expected "folder"`);
		}
		return {
			id: ent.id,
			type: ent.type,
			name: ent.name,
			entries: await this.getFolderEntries(ent.id),
		};
	}

	private async getFolderEntries(id: string): Promise<BoxTreeNode[]> {
		const resp: Entry = await this.client.folders.getItems(id, { limit: 1000 });
		return Promise.all(resp.entries!.map(async ent => {
			if (ent.type == "file") {
				return this.readFile(ent);
			}
			if (ent.type == "folder") {
				return this.readFolder(ent);
			}
			throw new Error(`unexpected entry: ${JSON.stringify(ent)}`);
		}));
	}

	async tree(): Promise<BoxTreeNode> {
		return this.readFolder(await this.setupRootDir());
	}
	processor(): AsyncProcessor<BoxTreeNode, TreeNode> {
		return new BoxProcessor(this.client);
	}
}

class BoxProcessor extends AsyncProcessor<BoxTreeNode, TreeNode> {
	private client: BoxClient;

	constructor(client: BoxClient) {
		super();
		this.client = client;
	}

	async create(parent: BoxTreeNode, node: TreeNode): Promise<void> {
		if (node.type == "file") {
			await this.client.files.uploadFile(parent.id, node.name, await node.content());
		}
		if (node.type == "folder") {
			const ent: Entry = await this.client.folders.create(parent.id, node.name);
			const created: BoxTreeNode = {
				id: ent.id,
				type: "folder",
				name: ent.name,
				entries: [],
			};
			await Promise.all(node.entries.map(ent => this.create(created, ent)));
		}

		console.log("box.created >>", node.name);
	}
	async delete(node: BoxTreeNode): Promise<void> {
		if (node.type == "file") {
			await this.client.files.delete(node.id);
		}
		if (node.type == "folder") {
			await this.client.folders.delete(node.id, { recursive: true });
		}

		console.log("box.deleted >>", node.name);
	}
}
