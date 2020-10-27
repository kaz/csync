import path from "path";
import crypto from "crypto";
import { promises as fs, PathLike, createReadStream, createWriteStream } from "fs";

import { AsyncProcessor, Tree, TreeNode } from ".";

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
		return this.readFolder(this.root);
	}
	processor(): AsyncProcessor<LocalTreeNode, TreeNode> {
		return new LocalProcessor();
	}
}

class LocalProcessor extends AsyncProcessor<LocalTreeNode, TreeNode> {
	async create(parent: LocalTreeNode, node: TreeNode): Promise<void> {
		console.log("local.create >>", node.name);

		const target = path.resolve(parent.path.toString(), node.name);

		if (node.type == "file") {
			const w = createWriteStream(target);
			const content = await node.content();
			content.pipe(w);
			return new Promise(resolve => w.on("end", resolve));
		}
		if (node.type == "folder") {
			return fs.mkdir(target, { recursive: true }).then(() => { });
		}
	}
	async delete(node: LocalTreeNode): Promise<void> {
		console.log("local.delete >>", node.name);

		if (node.type == "file") {
			return fs.unlink(node.path);
		}
		if (node.type == "folder") {
			return fs.rmdir(node.path, { recursive: true });
		}
	}
}
