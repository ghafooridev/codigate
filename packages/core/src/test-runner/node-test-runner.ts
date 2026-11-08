import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { CoverageGlobs, CoverageMeasurement, summarizeCoverage, TestRunner, TestRunResult } from '@codigate/application';
import { NodeFileSystem } from '../file-system';

const execAsync = promisify(exec);

export class NodeTestRunner implements TestRunner {
    async detectCommand(root: string): Promise<string | undefined> {
        try {
            const raw = await readFile(join(root, 'package.json'), 'utf8');
            const parsed = JSON.parse(raw) as { scripts?: Record<string, string> };

            if (parsed.scripts?.test) {
                return 'npm test';
            }
        } catch {
            return undefined;
        }

        return undefined;
    }

    async run(root: string, command?: string): Promise<TestRunResult> {
        const resolved = command ?? (await this.detectCommand(root));

        if (!resolved) {
            return {
                passed: false,
                output: 'No test script found in package.json',
                command: '',
            };
        }

        try {
            const { stdout, stderr } = await execAsync(resolved, {
                cwd: root,
                encoding: 'utf8',
                timeout: 120_000,
            });

            return {
                passed: true,
                output: `${stdout}\n${stderr}`,
                command: resolved,
            };
        } catch (error) {
            const execError = error as { stdout?: string; stderr?: string; message: string };

            return {
                passed: false,
                output: `${execError.stdout ?? ''}\n${execError.stderr ?? execError.message}`,
                command: resolved,
            };
        }
    }

    async measureCoverage(
        root: string,
        threshold: number,
        globs?: CoverageGlobs
    ): Promise<CoverageMeasurement> {
        const empty: CoverageMeasurement = {
            measured: false,
            byKind: {},
            uncovered: [],
        };

        let packageJson: PackageJson;

        try {
            packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as PackageJson;
        } catch {
            return { ...empty, note: 'Coverage was not measured: not a Node project.' };
        }

        if (!packageJson.scripts?.test) {
            return { ...empty, note: 'Coverage was not measured: no test script in package.json.' };
        }

        const reportDir = join(root, '.codigate', 'coverage-report');
        await rm(reportDir, { recursive: true, force: true });
        await mkdir(reportDir, { recursive: true });
        const command = coverageCommand(packageJson);

        try {
            await execAsync(command, {
                cwd: root,
                encoding: 'utf8',
                timeout: 180_000,
                maxBuffer: 20_000_000,
            });
        } catch {
            // A failing suite can still write a coverage summary.
        }

        const summary = await readSummary(reportDir);

        if (!summary) {
            return {
                ...empty,
                note: 'Coverage was not measured: the test run did not write a coverage summary.',
            };
        }

        const files = await new NodeFileSystem().listFiles(root);
        const entries = files.map((filePath) => ({
            path: relative(root, filePath) || filePath,
            percent: lookupPercent(summary, filePath) ?? 0,
        }));
        const result = summarizeCoverage(entries, threshold, globs);

        return {
            measured: true,
            byKind: result.byKind,
            uncovered: result.uncovered,
        };
    }
}

interface PackageJson {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}

interface CoverageSummaryFile {
    lines?: { pct?: number };
}

function coverageCommand(packageJson: PackageJson): string {
    const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
    };
    const directory = '.codigate/coverage-report';
    const script = packageJson.scripts?.test ?? '';

    if (deps.vitest || script.includes('vitest')) {
        return `npx vitest run --coverage --coverage.reporter=json-summary --coverage.reportsDirectory=${directory}`;
    }

    if (deps.jest || script.includes('jest')) {
        return `npx jest --coverage --coverageReporters=json-summary --coverageDirectory=${directory}`;
    }

    return `npm test -- --coverage --coverage.reporter=json-summary --coverage.reportsDirectory=${directory}`;
}

async function readSummary(reportDir: string): Promise<Record<string, CoverageSummaryFile> | undefined> {
    for (const candidate of [
        join(reportDir, 'coverage-summary.json'),
        join(reportDir, 'coverage-final.json'),
    ]) {
        try {
            return JSON.parse(await readFile(candidate, 'utf8')) as Record<string, CoverageSummaryFile>;
        } catch {
            continue;
        }
    }

    return undefined;
}

function lookupPercent(
    summary: Record<string, CoverageSummaryFile>,
    filePath: string
): number | undefined {
    const normalized = filePath.replaceAll('\\', '/');

    for (const [key, value] of Object.entries(summary)) {
        if (key === 'total') {
            continue;
        }

        const candidate = key.replaceAll('\\', '/');

        if (candidate === normalized || candidate.endsWith(`/${normalized}`) || normalized.endsWith(`/${candidate}`)) {
            return value.lines?.pct ?? 0;
        }
    }

    return undefined;
}
