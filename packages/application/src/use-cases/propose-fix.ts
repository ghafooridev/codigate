import { Finding } from '@codigate/domain';
import { FileSystem } from '../ports/file-system';
import { LlmGateway } from '../ports/llm-gateway';

export interface ProposedFix {
    filePath: string;
    original: string;
    updated: string;
    diff: string;
}

export class ProposeFixUseCase {
    constructor(
        private readonly fileSystem: FileSystem,
        private readonly llm: LlmGateway
    ) { }

    async execute(input: {
        root: string;
        finding: Finding;
    }): Promise<ProposedFix> {
        const original = await this.fileSystem.readFile(input.root, input.finding.filePath);
        const updatedRaw = await this.llm.complete([
            {
                role: 'system',
                content:
                    'You fix source files. Return the full updated file contents only. No markdown fences.',
            },
            {
                role: 'user',
                content: [
                    `Fix this finding in the file.`,
                    `Rule: ${input.finding.ruleId}`,
                    `Message: ${input.finding.message}`,
                    `Suggestion: ${input.finding.suggestion ?? ''}`,
                    `Line: ${input.finding.line}`,
                    `File: ${input.finding.filePath}`,
                    original,
                ].join('\n'),
            },
        ]);
        const updated = stripFence(updatedRaw);

        return {
            filePath: input.finding.filePath,
            original,
            updated,
            diff: makeDiff(input.finding.filePath, original, updated),
        };
    }
}

export function stripFence(text: string): string {
    return text.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trimEnd() + '\n';
}

export function makeDiff(filePath: string, original: string, updated: string): string {
    const left = original.split('\n');
    const right = updated.split('\n');
    const lines = [`--- ${filePath}`, `+++ ${filePath}`];
    const max = Math.max(left.length, right.length);

    for (let index = 0; index < max; index += 1) {
        const before = left[index];
        const after = right[index];

        if (before === after) {
            if (before !== undefined) {
                lines.push(` ${before}`);
            }
            continue;
        }

        if (before !== undefined) {
            lines.push(`- ${before}`);
        }

        if (after !== undefined) {
            lines.push(`+ ${after}`);
        }
    }

    return lines.join('\n');
}
