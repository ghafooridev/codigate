import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve, sep } from 'node:path';
import { DirectoryTree } from '@codigate/domain';
import { FileSystem } from '@codigate/application';
import { assertWithinRoot, isIgnored, parseGitignore } from './ignored-paths';

export class NodeFileSystem implements FileSystem {
    async getProjectStructure(
        root: string,
        maxDepth?: number
    ): Promise<DirectoryTree> {
        const absolutePath = resolve(root);
        const gitignore = await this.loadGitignore(absolutePath);

        return this.walk(absolutePath, absolutePath, 0, maxDepth, gitignore);
    }

    async readFile(root: string, target: string): Promise<string> {
        const absolute = this.resolveWithin(root, target);

        return readFile(absolute, 'utf8');
    }

    async writeFile(root: string, target: string, content: string): Promise<void> {
        const absolute = this.resolveWithin(root, target);

        await writeFile(absolute, content, 'utf8');
    }

    async listFiles(root: string): Promise<string[]> {
        const absoluteRoot = resolve(root);
        const gitignore = await this.loadGitignore(absoluteRoot);
        const files: string[] = [];

        await this.collectFiles(absoluteRoot, absoluteRoot, gitignore, files);

        return files.sort((left, right) => left.localeCompare(right));
    }

    async exists(root: string, target: string): Promise<boolean> {
        try {
            await stat(this.resolveWithin(root, target));
            return true;
        } catch {
            return false;
        }
    }

    async findProjectRoot(start: string): Promise<string> {
        let current = resolve(start);

        while (true) {
            if (await this.pathExists(join(current, '.git')) || await this.pathExists(join(current, 'package.json'))) {
                return current;
            }

            const parent = resolve(current, '..');

            if (parent === current) {
                return resolve(start);
            }

            current = parent;
        }
    }

    private resolveWithin(root: string, target: string): string {
        const absoluteRoot = resolve(root);
        const absoluteTarget = resolve(absoluteRoot, target);

        return assertWithinRoot(absoluteRoot, absoluteTarget, resolve, sep);
    }

    private async walk(
        projectRoot: string,
        absolutePath: string,
        depth: number,
        maxDepth: number | undefined,
        gitignore: string[]
    ): Promise<DirectoryTree> {
        const name = basename(absolutePath) || absolutePath;
        const stats = await stat(absolutePath);

        if (!stats.isDirectory()) {
            return {
                name,
                path: absolutePath,
                type: 'file',
            };
        }

        const node: DirectoryTree = {
            name,
            path: absolutePath,
            type: 'directory',
        };

        const shouldDescend = maxDepth === undefined || depth < maxDepth;

        if (!shouldDescend) {
            return node;
        }

        const entries = await readdir(absolutePath, { withFileTypes: true });
        entries.sort((left, right) => left.name.localeCompare(right.name));

        const children: DirectoryTree[] = [];

        for (const entry of entries) {
            const childPath = join(absolutePath, entry.name);
            const relativePath = relative(projectRoot, childPath);

            if (isIgnored(relativePath, gitignore)) {
                continue;
            }

            if (entry.isDirectory()) {
                children.push(
                    await this.walk(projectRoot, childPath, depth + 1, maxDepth, gitignore)
                );
            } else if (entry.isFile() || entry.isSymbolicLink()) {
                children.push({
                    name: entry.name,
                    path: childPath,
                    type: 'file',
                });
            }
        }

        node.children = children;

        return node;
    }

    private async collectFiles(
        projectRoot: string,
        directory: string,
        gitignore: string[],
        files: string[]
    ): Promise<void> {
        const entries = await readdir(directory, { withFileTypes: true });

        for (const entry of entries) {
            const childPath = join(directory, entry.name);
            const relativePath = relative(projectRoot, childPath);

            if (isIgnored(relativePath, gitignore)) {
                continue;
            }

            if (entry.isDirectory()) {
                await this.collectFiles(projectRoot, childPath, gitignore, files);
            } else if (entry.isFile()) {
                files.push(childPath);
            }
        }
    }

    private async loadGitignore(root: string): Promise<string[]> {
        try {
            const contents = await readFile(join(root, '.gitignore'), 'utf8');
            return parseGitignore(contents);
        } catch {
            return [];
        }
    }

    private async pathExists(path: string): Promise<boolean> {
        try {
            await stat(path);
            return true;
        } catch {
            return false;
        }
    }
}
