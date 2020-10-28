interface Base {
    id: string;
    type: string;
    name: string;
}

export interface FileMini extends Base {
    type: "file";
    sha1: string;
}
export interface File extends FileMini {

}

export interface FolderMini extends Base {
    type: "folder";
}
export interface Folder extends FolderMini {

}

export interface Items {
    entries: (FileMini | FolderMini)[];
}
