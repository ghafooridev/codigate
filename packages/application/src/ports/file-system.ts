import { DirectoryTree } from '@codigate/domain';

export interface FileSystem {
    getProjectStructure(
        root: string,
        maxDepth?: number
    ): Promise<DirectoryTree>;
    readFile(root: string, target: string): Promise<string>;
    writeFile(root: string, target: string, content: string): Promise<void>;
    listFiles(root: string): Promise<string[]>;
    exists(root: string, target: string): Promise<boolean>;
    findProjectRoot(start: string): Promise<string>;
}
