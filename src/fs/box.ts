import { AsTree, TreeNode } from ".";

type BoxTreeNode = TreeNode & { id: string; };
type FolderEntry = {
	type: "file" | "folder";
	id: string;
	name: string;
	sha1?: string;
	entries?: FolderEntry[],
};

export default class implements AsTree {
	private client: any;
	private rootId: string;

	constructor(client: any, rootId: string) {
		this.client = client;
		this.rootId = rootId;
	}

	async tree(): Promise<BoxTreeNode> {
		const ent: FolderEntry = await this.client.folders.get(this.rootId);
		return {
			id: ent.id,
			type: ent.type as "folder",
			name: ent.name,
			entries: await this.readFolder(this.rootId),
		};
	}

	private async readFolder(id: string): Promise<BoxTreeNode[]> {
		const resp: FolderEntry = await this.client.folders.getItems(id, { limit: 1000 });
		return Promise.all(resp.entries!.map(async ent => {
			if (ent.type == "file") {
				return {
					id: ent.id,
					type: ent.type,
					name: ent.name,
					sha1: ent.sha1!,
				};
			}
			if (ent.type == "folder") {
				return {
					id: ent.id,
					type: ent.type,
					name: ent.name,
					entries: await this.readFolder(ent.id),
				};
			}
			throw new Error(`unexpected entry: ${JSON.stringify(ent)}`);
		}));
	}
}
