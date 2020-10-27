import { diff, patch } from "tree-diff";
import { Tree, TreeNode } from "./fs";

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

export default class <F extends TreeNode, A extends TreeNode> {
	private src: Tree<A>;
	private dst: Tree<F>;

	constructor(src: Tree<A>, dst: Tree<F>) {
		this.src = src;
		this.dst = dst;
	}

	async sync() {
		const srcTree = await this.src.tree();
		const dstTree = await this.dst.tree();

		// ignore root modificatoin
		srcTree.name = dstTree.name;
		const ops = diff([dstTree], [srcTree], opt);

		patch(ops, this.dst.processor());
	}
}