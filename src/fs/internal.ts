import { Readable } from "stream";
import { MoveOp, NewOp, Processor, RemoveOp } from "tree-diff";

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
	private createQueue: (() => Promise<void>)[] = [];
	private deleteQueue: (() => Promise<void>)[] = [];

	constructor() {
		// diff-tree::patch() calls methods defined in Processor without `this` context.
		// This behavior causes an error (accessing fields of `undefined`), so we must avoid it.
		this.processNew = this.processNew.bind(this);
		this.processRemove = this.processRemove.bind(this);
	}

	processNew(q: NewOp<F, A>): void {
		this.createQueue.push(() => this.create(q.afterNode, q.parentNode));
	}
	processUpdate(): void {
		// nothing to do
	}
	processMove(): void {
		// nothing to do
	}
	processRemove(q: MoveOp<F, A> | RemoveOp<F, A>): F {
		// skip move op
		if (q.type == "remove") {
			this.deleteQueue.push(() => this.delete(q.fromNode));
		}
		return q.fromNode;
	}

	async apply() {
		await Promise.all(this.deleteQueue.map(q => q()));
		return Promise.all(this.createQueue.map(q => q()));
	}

	abstract create(node: A, parent?: F): Promise<void>;
	abstract delete(node: F): Promise<void>;
}
