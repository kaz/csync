export interface AsTree {
	tree(): Promise<TreeNode>;
}

export type TreeNode = BaseNode & (FileNode | FolderNode);

interface BaseNode {
	type: string;
	name: string;
}
interface FileNode {
	type: "file";
	sha1: string;
}
interface FolderNode {
	type: "folder";
	entries: TreeNode[];
}
