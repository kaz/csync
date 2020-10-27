export interface AsTree {
	tree(): Promise<TreeNode>;
}

export type TreeNode = BaseNode & (FileNode | FolderNode);

interface BaseNode {
	name: string;
}
interface FileNode {
	sha1: string;
}
interface FolderNode {
	entries: TreeNode[];
}
