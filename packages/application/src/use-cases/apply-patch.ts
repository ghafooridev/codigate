import { FileSystem } from '../ports/file-system';

export class ApplyPatchUseCase {
    constructor(private readonly fileSystem: FileSystem) { }

    async execute(input: {
        root: string;
        filePath: string;
        content: string;
    }): Promise<void> {
        await this.fileSystem.writeFile(input.root, input.filePath, input.content);
    }
}
