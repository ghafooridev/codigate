import { TestRunner, TestRunResult } from '../ports/test-runner';

export class RunTestsUseCase {
    constructor(private readonly testRunner: TestRunner) { }

    execute(root: string): Promise<TestRunResult> {
        return this.testRunner.run(root);
    }
}
