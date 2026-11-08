import { AnalysisRun, ProjectConfig } from '@codigate/domain';
import { AnalysisStore } from '../ports/analysis-store';
import { DependencyAuditor } from '../ports/dependency-auditor';
import { ProjectConfigLoader } from '../ports/project-config-loader';
import { TestRunner } from '../ports/test-runner';
import { CoverageGlobs, CoverageKind } from '../testing/coverage-kind';
import { ScoringEngine } from '../scoring/scoring-engine';
import { ApplyPatchUseCase } from './apply-patch';
import { AnalyzeWithAiUseCase } from './analyze-with-ai';
import { GenerateTestsUseCase } from './generate-tests';

const MAX_ROUNDS = 3;
const MAX_FILES_PER_ROUND = 8;

export class AnalyzeOnDemandUseCase {
    constructor(
        private readonly analyzeWithAi: AnalyzeWithAiUseCase,
        private readonly auditor: DependencyAuditor,
        private readonly testRunner: TestRunner,
        private readonly generateTests: GenerateTestsUseCase,
        private readonly applyPatch: ApplyPatchUseCase,
        private readonly configLoader: ProjectConfigLoader,
        private readonly llmAvailable: () => Promise<boolean>,
        private readonly store: AnalysisStore,
        private readonly scoring = new ScoringEngine()
    ) { }

    async execute(root: string): Promise<AnalysisRun> {
        const run = await this.analyzeWithAi.execute(root);
        const config = await this.configLoader.load(root);
        const threshold = config.coverage?.threshold ?? 80;
        const auditFindings = await this.auditor.audit(root);
        let coverage = await this.testRunner.measureCoverage(root, threshold, globsFrom(config));
        let note = coverage.note;
        const llm = await this.llmAvailable();
        let rounds = 0;

        while (
            rounds < MAX_ROUNDS &&
            llm &&
            coverage.measured &&
            belowThreshold(coverage.byKind, threshold)
        ) {
            const targets = coverage.uncovered.slice(0, MAX_FILES_PER_ROUND);

            if (!targets.length) {
                note = 'Coverage is under the threshold, but no uncovered source files were listed.';
                break;
            }

            let wrote = false;

            for (const target of targets) {
                try {
                    const generated = await this.generateTests.execute({
                        root,
                        targetPath: target.path,
                        kind: target.kind,
                    });
                    await this.applyPatch.execute({
                        root,
                        filePath: generated.filePath,
                        content: generated.content,
                    });
                    wrote = true;
                } catch (error) {
                    note = `Test generation stopped: ${error instanceof Error ? error.message : String(error)}`;
                    break;
                }
            }

            rounds += 1;

            if (!wrote) {
                break;
            }

            coverage = await this.testRunner.measureCoverage(root, threshold, globsFrom(config));
            note = coverage.note;
        }

        if (!llm && coverage.measured && belowThreshold(coverage.byKind, threshold)) {
            note = 'Coverage is under the threshold. Set the AI API base URL, API key, and model to generate the missing tests.';
        }

        const findings = dedupe([...run.findings, ...auditFindings]);
        const testingCoverage = coverage.measured ? definedCoverage(coverage.byKind) : undefined;

        run.findings = findings;
        run.counts = this.scoring.counts(findings);
        run.testingCoverage = testingCoverage;
        run.coverageNote = note;
        run.missingTests = coverage.measured
            ? coverage.uncovered.map((file) => file.path)
            : run.missingTests;
        run.scores = this.scoring.score(findings, run.missingTests, testingCoverage);
        run.fileScores = this.scoring.fileScores(findings);
        await this.store.save(root, run);

        return run;
    }
}

function globsFrom(config: ProjectConfig): CoverageGlobs | undefined {
    const coverage = config.coverage;

    if (!coverage?.unitGlobs && !coverage?.componentGlobs && !coverage?.integrationGlobs) {
        return undefined;
    }

    return {
        unit: coverage.unitGlobs ?? [],
        component: coverage.componentGlobs ?? [],
        integration: coverage.integrationGlobs ?? [],
    };
}

function belowThreshold(
    byKind: Partial<Record<CoverageKind, number>>,
    threshold: number
): boolean {
    return Object.values(byKind).some((value) => value !== undefined && value < threshold);
}

function definedCoverage(
    byKind: Partial<Record<CoverageKind, number>>
): Record<string, number> | undefined {
    const coverage: Record<string, number> = {};

    for (const [kind, value] of Object.entries(byKind)) {
        if (value !== undefined) {
            coverage[kind] = value;
        }
    }

    return Object.keys(coverage).length ? coverage : undefined;
}

function dedupe<T extends { id: string }>(findings: T[]): T[] {
    const byId = new Map<string, T>();

    for (const finding of findings) {
        byId.set(finding.id, finding);
    }

    return [...byId.values()];
}
