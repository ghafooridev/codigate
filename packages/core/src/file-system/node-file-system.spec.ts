import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NodeFileSystem } from './node-file-system';

describe('NodeFileSystem', () => {
    it('skips node_modules and respects maxDepth', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codigate-fs-'));
        await mkdir(join(root, 'src'));
        await mkdir(join(root, 'node_modules', 'pkg'), { recursive: true });
        await writeFile(join(root, 'src', 'main.ts'), 'export const x = 1;\n');
        await writeFile(join(root, 'node_modules', 'pkg', 'index.js'), 'module.exports = {}\n');

        const fs = new NodeFileSystem();
        const tree = await fs.getProjectStructure(root, 2);
        const names = (tree.children ?? []).map((child) => child.name);

        expect(names).toContain('src');
        expect(names).not.toContain('node_modules');
    });

    it('rejects path traversal', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codigate-fs-'));
        const fs = new NodeFileSystem();

        await expect(fs.readFile(root, '../secret.txt')).rejects.toThrow(/escapes project root/);
    });
});
