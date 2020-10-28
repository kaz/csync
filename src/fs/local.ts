import path from "path";
import crypto from "crypto";
import { promises as fs, PathLike, createReadStream, createWriteStream } from "fs";

import { AsyncProcessor, Tree, TreeNode } from "./internal";

type LocalTreeNode = TreeNode & { path: PathLike; };

export default class implements Tree<LocalTreeNode> {
	private root: PathLike;

	constructor(root: PathLike) {
		this.root = root;
	}

	private async readFile(cur: PathLike): Promise<LocalTreeNode> {
		const r = createReadStream(cur);
		const hash = crypto.createHash("sha1");
		r.pipe(hash);
		await new Promise(resolve => r.on("end", resolve));

		return {
			type: "file",
			path: cur,
			name: path.basename(cur.toString()),
			sha1: hash.digest("hex"),
			content: async () => createReadStream(cur),
		};
	}
	private async readFolder(cur: PathLike): Promise<LocalTreeNode> {
		const dirents = await fs.readdir(cur, { withFileTypes: true });
		const entries = await Promise.all(dirents.map(ent => {
			const entPath = path.resolve(cur.toString(), ent.name);
			if (ent.isFile()) {
				return this.readFile(entPath);
			}
			if (ent.isDirectory()) {
				return this.readFolder(entPath);
			}
			throw new Error(`unexpected dirent: ${entPath}`);
		}));
		return {
			type: "folder",
			path: cur,
			name: path.basename(cur.toString()),
			entries,
		};
	}

	async tree(): Promise<LocalTreeNode> {
		await fs.mkdir(this.root, { recursive: true });
		return this.readFolder(this.root);
	}
	processor(): AsyncProcessor<LocalTreeNode, TreeNode> {
		return new LocalProcessor();
	}
}

class LocalProcessor extends AsyncProcessor<LocalTreeNode, TreeNode> {
	async create(node: TreeNode, parent: LocalTreeNode): Promise<void> {
		const target = path.resolve(parent.path.toString(), node.name);

		if (node.type == "file") {
			const w = createWriteStream(target);
			const content = await node.content();
			content.pipe(w);
			await new Promise(resolve => w.on("end", resolve));
		}
		if (node.type == "folder") {
			await fs.mkdir(target, { recursive: true });
			const created: LocalTreeNode = Object.assign({ path: target }, node);
			await Promise.all(node.entries.map(ent => this.create(ent, created)));
		}

		console.log("local.created >>", node.name);
	}
	async delete(node: LocalTreeNode): Promise<void> {
		if (node.type == "file") {
			await fs.unlink(node.path);
		}
		if (node.type == "folder") {
			await fs.rmdir(node.path, { recursive: true });
		}

		console.log("local.deleted >>", node.name);
	}
}
