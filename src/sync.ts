import { diff, patch } from "tree-diff";
import type { Tree, TreeNode } from "./fs/internal";

const opt = {
	childrenKey: "entries",
	shouldUpdate(a: TreeNode, b: TreeNode) {
		if ("sha1" in a && "sha1" in b) {
			return a.name === b.name && a.sha1 === b.sha1;
		}
		if ("entries" in a && "entries" in b) {
			return a.name === b.name;
		}
		return false;
	},
};

export default class {
	private src: Tree<TreeNode>;
	private dst: Tree<TreeNode>;

	constructor(src: Tree<TreeNode>, dst: Tree<TreeNode>) {
		this.src = src;
		this.dst = dst;
	}

	async sync() {
		const srcTree = await this.src.tree();
		const dstTree = await this.dst.tree();

		// ignore root modification
		srcTree.name = dstTree.name;
		const ops = diff([dstTree], [srcTree], opt);

		const proc = this.dst.processor();
		patch(ops, proc);

		return proc.apply();
	}
}
