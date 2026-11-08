import { FileSystem } from '../ports/file-system';
import { LlmGateway } from '../ports/llm-gateway';
import { CoverageKind } from '../testing/coverage-kind';
import { stripFence } from './propose-fix';

export interface GeneratedTest {
    filePath: string;
    content: string;
}

export class GenerateTestsUseCase {
    constructor(
        private readonly fileSystem: FileSystem,
        private readonly llm: LlmGateway
    ) { }

    async execute(input: {
        root: string;
        targetPath: string;
        kind?: CoverageKind;
    }): Promise<GeneratedTest> {
        const source = await this.fileSystem.readFile(input.root, input.targetPath);
        const kind = input.kind ?? 'unit';
        const testPath = toTestPath(input.targetPath, kind);
        const content = stripFence(
            await this.llm.complete([
                {
                    role: 'system',
                    content: promptFor(kind),
                },
                {
                    role: 'user',
                    content: `Create ${kind} tests for ${input.targetPath}:\n${source}`,
                },
            ])
        );

        return { filePath: testPath, content };
    }
}

export function toTestPath(filePath: string, kind: CoverageKind = 'unit'): string {
    if (/\.(spec|test)\./.test(filePath)) {
        return filePath;
    }

    const suffix = kind === 'integration'
        ? '.integration.spec'
        : kind === 'component'
            ? '.component.spec'
            : '.spec';

    return filePath.replace(/(\.[a-zA-Z]+)$/, `${suffix}$1`);
}

function promptFor(kind: CoverageKind): string {
    if (kind === 'component') {
        return 'Write a component test. Render the component and assert visible behavior. Return the full file only. Prefer vitest and Testing Library when the source is React.';
    }

    if (kind === 'integration') {
        return 'Write an integration test that exercises the module with its collaborators. Return the full file only. Prefer vitest or node:test to match the source.';
    }

    return 'Write a focused unit test file. Return the full file only. Prefer vitest or node:test to match the source.';
}
