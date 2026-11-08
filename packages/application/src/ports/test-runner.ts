import type { CoverageGlobs, CoverageKind } from '../testing/coverage-kind';

export interface TestRunResult {
    passed: boolean;
    output: string;
    command: string;
}

export interface CoverageMeasurement {
    measured: boolean;
    note?: string;
    byKind: Partial<Record<CoverageKind, number>>;
    uncovered: { path: string; kind: CoverageKind }[];
}

export interface TestRunner {
    detectCommand(root: string): Promise<string | undefined>;
    run(root: string, command?: string): Promise<TestRunResult>;
    measureCoverage(root: string, threshold: number, globs?: CoverageGlobs): Promise<CoverageMeasurement>;
}
