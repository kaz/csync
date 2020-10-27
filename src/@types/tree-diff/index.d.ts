declare module "tree-diff" {
	interface Options<T> {
		shouldUpdate(node1: T, node2: T, node1Index: number, node2Index: number): boolean;
		childrenKey: string;
	}
	interface Processors<T> {
		processNew(q: T);
		processUpdate(q: T);
		processMove(q: T, r: number);
		processRemove(q: T): number;
	}

	interface Patch<T> {
		removeQueue: (RemoveOp<T> | MoveOp<T>)[];
		insertQueue: (NewOp<T> | MoveOp<T>)[];
		updateQueue: UpdateOp<T>[];
	}
	interface NewOp<T> {
		type: "new";
		afterNode: T;
		parentNode: T;
		toIndex: number;
		toPath: number[];
	}
	interface UpdateOp<T> {
		type: "update";
		fromNode: T;
		afterNode: T;
		parentNode: T;
		fromIndex: number;
		fromPath: number[];
	}
	interface MoveOp<T> {
		type: "move";
		fromNode: T;
		afterNode: T;
		parentNode: T;
		fromIndex: number;
		toIndex: number;
		fromPath: number[];
		toPath: number[];
	}
	interface RemoveOp<T> {
		type: "remove";
		fromNode: T;
		parentNode: T;
		fromIndex: number;
		fromPath: number[];
	}

	function diff<T>(fromNodes: T[], afterNodes: T[], options: Options<T>): Patch<T>;
	function patch<T>(patch: Patch<T>, processors: Processors<T>);
}
