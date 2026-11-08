import { AnalysisRun, Finding } from '@codigate/domain';
import { AnalysisStore } from '../ports/analysis-store';
import { FileSystem } from '../ports/file-system';
import { ProjectConfigLoader } from '../ports/project-config-loader';
import { AnalyzeProjectUseCase } from './analyze-project';
import { ReviewCodeUseCase } from './review-code';
import { ScoringEngine } from '../scoring/scoring-engine';

export class AnalyzeWithAiUseCase {
    constructor(
        private readonly analyzeProject: AnalyzeProjectUseCase,
        private readonly reviewCode: ReviewCodeUseCase,
        private readonly fileSystem: FileSystem,
        private readonly configLoader: ProjectConfigLoader,
        private readonly llmAvailable: () => Promise<boolean>,
        private readonly store?: AnalysisStore,
        private readonly scoring = new ScoringEngine()
    ) { }

    async execute(root: string): Promise<AnalysisRun> {
        const run = await this.analyzeProject.execute({ root });
        const available = await this.llmAvailable();

        if (!available) {
            return run;
        }

        const config = await this.configLoader.load(root);
        const samplePaths = [...new Set(run.findings.map((finding) => finding.filePath))].slice(0, 8);
        const files = [];

        for (const filePath of samplePaths) {
            try {
                files.push({
                    path: filePath,
                    content: await this.fileSystem.readFile(root, filePath),
                });
            } catch {
                continue;
            }
        }

        let aiFindings: Finding[] = [];

        try {
            aiFindings = await this.reviewCode.execute({
                files,
                existing: run.findings,
                config,
            });
        } catch {
            return run;
        }

        const findings = [...run.findings, ...aiFindings];
        run.findings = findings;
        run.counts = this.scoring.counts(findings);
        run.scores = this.scoring.score(findings, run.missingTests, run.testingCoverage);
        run.fileScores = this.scoring.fileScores(findings);
        await this.store?.save(root, run);

        return run;
    }
}
