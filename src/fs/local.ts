import path from "path";
import crypto from "crypto";
import { promises as fs, PathLike } from "fs";

import { AsTree, TreeNode } from ".";

export default class implements AsTree {
	private root: PathLike;

	constructor(root: PathLike) {
		this.root = root;
	}

	async tree(): Promise<TreeNode> {
		return this.readFolder(this.root);
	}

	private async readFile(cur: PathLike): Promise<TreeNode> {
		const data = await fs.readFile(cur);
		return {
			type: "file",
			name: path.basename(cur.toString()),
			sha1: crypto.createHash("sha1").update(data).digest("hex"),
		};
	}
	private async readFolder(cur: PathLike): Promise<TreeNode> {
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
			name: path.basename(cur.toString()),
			entries,
		};
	}
}
