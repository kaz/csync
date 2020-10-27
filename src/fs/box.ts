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
	private client: any;
	private rootId: string;

	constructor(client: any, rootId: string) {
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
		throw new Error("Method not implemented.");
	}
}
