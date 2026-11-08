import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { mkdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { isGitlabRemote } from '@codigate/application';

const exec = promisify(execFile);

export class GitlabCheckout {
    async resolve(target: string, workspace: string, cacheDir = '.codigate/cache'): Promise<string> {
        if (!isGitlabRemote(target)) {
            return target;
        }

        const destination = join(workspace, cacheDir, hashRemote(target));
        await mkdir(join(workspace, cacheDir), { recursive: true });

        if (await isRepo(destination)) {
            await this.fetch(destination);
            return destination;
        }

        await rm(destination, { recursive: true, force: true });
        await this.clone(target, destination);

        return destination;
    }

    private async clone(url: string, destination: string): Promise<void> {
        const token = process.env.GITLAB_TOKEN;
        const args = [
            ...authArgs(token),
            'clone',
            '--depth',
            '1',
            url,
            destination,
        ];

        try {
            await exec('git', args, { encoding: 'utf8' });
        } catch (error) {
            throw new Error(`GitLab checkout failed: ${redact(message(error), token)}`);
        }
    }

    private async fetch(destination: string): Promise<void> {
        const token = process.env.GITLAB_TOKEN;
        const args = [
            ...authArgs(token),
            '-C',
            destination,
            'pull',
            '--ff-only',
            '--depth',
            '1',
        ];

        try {
            await exec('git', args, { encoding: 'utf8' });
        } catch (error) {
            throw new Error(`GitLab update failed: ${redact(message(error), token)}`);
        }
    }
}

function authArgs(token: string | undefined): string[] {
    if (!token || token.includes('\n')) {
        return [];
    }

    return ['-c', `http.extraHeader=Authorization: Bearer ${token}`];
}

function hashRemote(url: string): string {
    return createHash('sha256').update(url).digest('hex').slice(0, 16);
}

async function isRepo(path: string): Promise<boolean> {
    try {
        await stat(join(path, '.git'));
        return true;
    } catch {
        return false;
    }
}

function message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function redact(text: string, token: string | undefined): string {
    return token ? text.split(token).join('***') : text;
}
