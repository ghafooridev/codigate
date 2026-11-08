export interface DirectoryTree {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: DirectoryTree[];
}
