import { DirectoryTree } from '@codigate/domain';
import { FileSystem } from '../ports';

export class GetProjectStructureUseCase {
    constructor(
        private readonly fileSystem: FileSystem
    ) { }

    execute(
        root: string,
        maxDepth?: number
    ): Promise<DirectoryTree> {
        return this.fileSystem.getProjectStructure(root, maxDepth);
    }
}
