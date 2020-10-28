import { AsyncProcessor, Tree, TreeNode } from "./internal";
import { FileMini, FolderMini } from "../driver/box-types";
import BoxClient from "../driver/box";

type BoxTreeNode = TreeNode & { id: string; };

export default class implements Tree<BoxTreeNode> {
	private client: BoxClient;
	private root: string;

	constructor(client: BoxClient, root: string) {
		this.client = client;
		this.root = root;
	}

	private async setupRootDir(): Promise<FolderMini> {
		const accountRoot = await this.client.folders.getItems("0", { limit: 1000 });
		const found = accountRoot.entries.find(ent => ent.name == this.root);
		if (found && found.type == "folder") {
			return found;
		}
		return this.client.folders.create("0", this.root);
	}

	private async readFile(ent: FileMini): Promise<BoxTreeNode> {
		return {
			id: ent.id,
			type: ent.type,
			name: ent.name,
			sha1: ent.sha1,
			content: () => this.client.files.getReadStream(ent.id),
		};
	}
	private async readFolder(ent: FolderMini): Promise<BoxTreeNode> {
		return {
			id: ent.id,
			type: ent.type,
			name: ent.name,
			entries: await this.getFolderEntries(ent.id),
		};
	}

	private async getFolderEntries(id: string): Promise<BoxTreeNode[]> {
		const items = await this.client.folders.getItems(id, { limit: 1000 });
		return Promise.all(items.entries.map(async ent => {
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

	async create(node: TreeNode, parent: BoxTreeNode): Promise<void> {
		if (node.type == "file") {
			await this.client.files.uploadFile(parent.id, node.name, node.content);
		}
		if (node.type == "folder") {
			const ent = await this.client.folders.create(parent.id, node.name);
			const created: BoxTreeNode = {
				id: ent.id,
				type: ent.type,
				name: ent.name,
				entries: [],
			};
			await Promise.all(node.entries.map(ent => this.create(ent, created)));
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
