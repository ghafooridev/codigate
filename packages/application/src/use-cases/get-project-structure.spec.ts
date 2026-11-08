import { describe, expect, it } from 'vitest';
import { DirectoryTree } from '@codigate/domain';
import { FileSystem } from '../ports';
import { GetProjectStructureUseCase } from './get-project-structure';

class FakeFileSystem implements FileSystem {
    constructor(private readonly tree: DirectoryTree) { }

    async getProjectStructure(): Promise<DirectoryTree> {
        return this.tree;
    }

    async readFile(): Promise<string> {
        return '';
    }

    async writeFile(): Promise<void> {
        return;
    }

    async listFiles(): Promise<string[]> {
        return [];
    }

    async exists(): Promise<boolean> {
        return true;
    }

    async findProjectRoot(start: string): Promise<string> {
        return start;
    }
}

describe('GetProjectStructureUseCase', () => {
    it('returns the tree from the filesystem port', async () => {
        const tree: DirectoryTree = {
            name: 'app',
            path: '/app',
            type: 'directory',
            children: [{ name: 'main.ts', path: '/app/main.ts', type: 'file' }],
        };
        const useCase = new GetProjectStructureUseCase(new FakeFileSystem(tree));

        await expect(useCase.execute('/app', 2)).resolves.toEqual(tree);
    });
});
