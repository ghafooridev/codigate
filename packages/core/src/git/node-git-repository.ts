import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { GitRepository } from '@codigate/application';

const exec = promisify(execFile);

export class NodeGitRepository implements GitRepository {
    async isGitRepo(root: string): Promise<boolean> {
        try {
            await git(root, ['rev-parse', '--is-inside-work-tree']);
            return true;
        } catch {
            return false;
        }
    }

    async getBranch(root: string): Promise<string | undefined> {
        try {
            return (await git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
        } catch {
            return undefined;
        }
    }

    async getRevision(root: string): Promise<string | undefined> {
        try {
            return (await git(root, ['rev-parse', 'HEAD'])).trim();
        } catch {
            return undefined;
        }
    }

    async getChangedFiles(root: string, base = 'HEAD~1'): Promise<string[]> {
        try {
            const output = await git(root, ['diff', '--name-only', base]);

            return output
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean);
        } catch {
            return [];
        }
    }

    async getDiff(root: string, base = 'HEAD~1'): Promise<string> {
        try {
            return await git(root, ['diff', base]);
        } catch {
            return '';
        }
    }

    async getRemote(root: string): Promise<string | undefined> {
        try {
            return (await git(root, ['remote', 'get-url', 'origin'])).trim();
        } catch {
            return undefined;
        }
    }
}

async function git(cwd: string, args: string[]): Promise<string> {
    const { stdout } = await exec('git', args, { cwd, encoding: 'utf8' });

    return stdout;
}
