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
	private createQueue: (() => Promise<void>)[] = [];
	private deleteQueue: (() => Promise<void>)[] = [];

	constructor() {
		// diff-tree::patch() calls methods defined in Processor without `this` context.
		// This behavior causes an error (accessing fields of `undefined`), so we must avoid it.
		this.processNew = this.processNew.bind(this);
		this.processRemove = this.processRemove.bind(this);
	}

	processNew(q: NewOp<F, A>): void {
		this.createQueue.push(() => this.create(q.parentNode, q.afterNode));
	}
	processUpdate(): void {
		// nothing to do
	}
	processMove(): void {
		// nothing to do
	}
	processRemove(q: RemoveOp<F, A>): number {
		this.deleteQueue.push(() => this.delete(q.fromNode));
		return 0;
	}

	async apply() {
		await Promise.all(this.deleteQueue.map(q => q()));
		return Promise.all(this.createQueue.map(q => q()));
	}

	abstract create(parent: F, node: A): Promise<void>;
	abstract delete(node: A): Promise<void>;
}
