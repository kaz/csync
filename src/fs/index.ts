import { Readable } from "stream";
import { NewOp, Processor, RemoveOp } from "tree-diff";

export type TreeNode = BaseNode & (FileNode | FolderNode);

interface BaseNode {
	type: string;
	name: string;
}
interface FileNode {
	type: "file";
	sha1: string;
	content: () => Promise<Readable>;
}
interface FolderNode {
	type: "folder";
	entries: TreeNode[];
}

export interface Tree<T extends TreeNode> {
	tree(): Promise<T>;
	processor(): AsyncProcessor<T, TreeNode>;
}

export abstract class AsyncProcessor<F, A> implements Processor<F, A> {
	abstract create(parent: F, node: A): Promise<void>;
	abstract delete(node: A): Promise<void>;

	processNew = (q: NewOp<F, A>): void => {
		this.create(q.parentNode, q.afterNode);
	};
	processUpdate(): void {
		// nothing to do
	}
	processMove(): void {
		// nothing to do
	}
	processRemove = (q: RemoveOp<F, A>): number => {
		this.delete(q.fromNode);
		return 0;
	};
}
