import { TestRunner, TestRunResult } from '../ports/test-runner';
import { GenerateTestsUseCase } from './generate-tests';
import { LlmGateway } from '../ports/llm-gateway';
import { ApplyPatchUseCase } from './apply-patch';
import { stripFence } from './propose-fix';

export interface ValidateTestsResult {
    passed: boolean;
    iterations: number;
    output: string;
    testPath: string;
}

export class ValidateTestsUseCase {
    constructor(
        private readonly testRunner: TestRunner,
        private readonly llm: LlmGateway,
        private readonly generateTests: GenerateTestsUseCase,
        private readonly applyPatch: ApplyPatchUseCase,
        private readonly maxIterations = 3
    ) { }

    async execute(input: {
        root: string;
        targetPath: string;
        apply: boolean;
    }): Promise<ValidateTestsResult> {
        const generated = await this.generateTests.execute({
            root: input.root,
            targetPath: input.targetPath,
        });

        if (input.apply) {
            await this.applyPatch.execute({
                root: input.root,
                filePath: generated.filePath,
                content: generated.content,
            });
        }

        let output = '';
        let passed = false;
        let content = generated.content;
        let iteration = 0;

        if (!input.apply) {
            return {
                passed: false,
                iterations: 0,
                output: 'Tests generated but not written. Re-run with apply to execute.',
                testPath: generated.filePath,
            };
        }

        while (iteration < this.maxIterations) {
            iteration += 1;
            const result: TestRunResult = await this.testRunner.run(input.root);
            output = result.output;
            passed = result.passed;

            if (passed) {
                break;
            }

            content = stripFence(
                await this.llm.complete([
                    {
                        role: 'system',
                        content: 'Fix the failing test file. Return the full file only.',
                    },
                    {
                        role: 'user',
                        content: [
                            `Test file: ${generated.filePath}`,
                            content,
                            'Failure output:',
                            output.slice(0, 6000),
                        ].join('\n'),
                    },
                ])
            );

            await this.applyPatch.execute({
                root: input.root,
                filePath: generated.filePath,
                content,
            });
        }

        return {
            passed,
            iterations: iteration,
            output,
            testPath: generated.filePath,
        };
    }
}
