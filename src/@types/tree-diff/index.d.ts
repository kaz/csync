declare module "tree-diff" {
	interface Option<F, A> {
		shouldUpdate(node1: F, node2: A, node1Index: number, node2Index: number): boolean;
		childrenKey: string;
	}
	interface Processor<F, A> {
		processNew(q: NewOp<F, A>): void;
		processUpdate(q: UpdateOp<F, A>): void;
		processMove(q: MoveOp<F, A>, r: number): void;
		processRemove(q: RemoveOp<F, A>): number;
	}

	interface Patch<F, A> {
		removeQueue: (RemoveOp<F, A> | MoveOp<F, A>)[];
		insertQueue: (NewOp<F, A> | MoveOp<F, A>)[];
		updateQueue: UpdateOp<F, A>[];
	}
	interface NewOp<F, A> {
		type: "new";
		afterNode: A;
		parentNode: F;
		toIndex: number;
		toPath: number[];
	}
	interface UpdateOp<F, A> {
		type: "update";
		fromNode: F;
		afterNode: A;
		parentNode: F;
		fromIndex: number;
		fromPath: number[];
	}
	interface MoveOp<F, A> {
		type: "move";
		fromNode: F;
		afterNode: A;
		parentNode: F;
		fromIndex: number;
		toIndex: number;
		fromPath: number[];
		toPath: number[];
	}
	interface RemoveOp<F, A> {
		type: "remove";
		fromNode: A;
		parentNode: F;
		fromIndex: number;
		fromPath: number[];
	}

	function diff<F, A>(fromNodes: F[], afterNodes: A[], options: Option<F, A>): Patch<F, A>;
	function patch<F, A>(patch: Patch<F, A>, processors: Processor<F, A>);
}
