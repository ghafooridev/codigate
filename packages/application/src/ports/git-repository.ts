export interface GitRepository {
    isGitRepo(root: string): Promise<boolean>;
    getBranch(root: string): Promise<string | undefined>;
    getRevision(root: string): Promise<string | undefined>;
    getChangedFiles(root: string, base?: string): Promise<string[]>;
    getDiff(root: string, base?: string): Promise<string>;
    getRemote(root: string): Promise<string | undefined>;
}
