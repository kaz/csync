import { AsyncProcessor, Tree, TreeNode } from ".";

type BoxTreeNode = TreeNode & { id: string; };

// type-definitions for `box-node-sdk` are currently not provided.
// see https://github.com/box/box-node-sdk/issues/170
type BoxClinet = any;

type Entry = {
	type: "file" | "folder" | "web_link";
	id: string;
	name: string;
	sha1?: string;
	entries?: Entry[],
};

export default class implements Tree<BoxTreeNode> {
	private client: BoxClinet;
	private rootId: string;

	constructor(client: BoxClinet, rootId: string) {
		this.client = client;
		this.rootId = rootId;
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
		return this.readFolder(await this.client.folders.get(this.rootId));
	}
	processor(): AsyncProcessor<BoxTreeNode, TreeNode> {
		return new BoxProcessor(this.client);
	}
}

class BoxProcessor extends AsyncProcessor<BoxTreeNode, TreeNode> {
	private client: BoxClinet;

	constructor(client: BoxClinet) {
		super();
		this.client = client;
	}

	async create(parent: BoxTreeNode, node: TreeNode): Promise<void> {
		console.log("box.create >>", node.name);

		if (node.type == "file") {
			await this.client.files.uploadFile(parent.id, node.name, await node.content());
			return;
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
			return;
		}
	}
	async delete(node: BoxTreeNode): Promise<void> {
		console.log("box.delete >>", node.name);

		if (node.type == "file") {
			return this.client.files.delete(node.id);
		}
		if (node.type == "folder") {
			return this.client.folders.delete(node.id, { recursive: true });
		}
	}
}
