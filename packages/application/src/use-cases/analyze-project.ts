import {
    AnalysisRun,
    ProjectConfig,
    Rule,
} from '@codigate/domain';
import { AnalysisStore } from '../ports/analysis-store';
import { CodeIndexer } from '../ports/code-indexer';
import { FileSystem } from '../ports/file-system';
import { GitRepository } from '../ports/git-repository';
import { ProjectConfigLoader } from '../ports/project-config-loader';
import { RuleEngine, SourceFile } from '../ports/rule-engine';
import { conventionRules } from '../rules/convention-rules';
import { builtInRules } from '../rules/built-in-rules';
import { applyRuleOverrides } from '../rules/apply-rule-overrides';
import { documentFindings } from '../rules/document-checker';
import { structuralFindings } from '../rules/structural-checker';
import { ScoringEngine } from '../scoring/scoring-engine';
import { missingTestTargets } from '../testing/missing-tests';
import { detectStack } from '../project/detect-stack';
import { testingCoverageFromIndex } from '../testing/coverage-from-index';

const TEXT_EXTENSIONS = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.json', '.yml', '.yaml', '.md', '.env',
    '.py', '.go', '.rs', '.java', '.kt', '.cs',
    '.sql', '.graphql', '.html', '.css', '.scss',
]);

const MAX_FILE_BYTES = 512_000;

export interface AnalyzeProjectInput {
    root: string;
    extraRules?: Rule[];
    changedFilesOnly?: boolean;
}

export class AnalyzeProjectUseCase {
    constructor(
        private readonly fileSystem: FileSystem,
        private readonly ruleEngine: RuleEngine,
        private readonly indexer: CodeIndexer,
        private readonly configLoader: ProjectConfigLoader,
        private readonly store: AnalysisStore,
        private readonly git: GitRepository,
        private readonly extraRulesLoader?: (root: string) => Promise<Rule[]>,
        private readonly scoring = new ScoringEngine()
    ) { }

    async execute(input: AnalyzeProjectInput): Promise<AnalysisRun> {
        const root = await this.fileSystem.findProjectRoot(input.root);
        const config = await this.configLoader.load(root);
        const extraRules = [
            ...(input.extraRules ?? []),
            ...(this.extraRulesLoader ? await this.extraRulesLoader(root) : []),
        ];
        const files = await this.loadSourceFiles(root, input.changedFilesOnly);
        const rules = this.collectRules(config, extraRules);
        const findings = [
            ...this.ruleEngine.analyze(files, rules),
            ...structuralFindings(files, rules),
            ...documentFindings(files, rules),
        ];
        const index = this.indexer.index(files);
        const missingTests = missingTestTargets(index);
        const testingCoverage = testingCoverageFromIndex(index);
        const scores = this.scoring.score(findings, missingTests, testingCoverage);
        const previous = await this.store.latest(root);
        const packageJson = await this.readPackageName(root);

        const run: AnalysisRun = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            projectName: packageJson.name,
            stack: detectStack(packageJson.raw),
            gitRevision: await this.git.getRevision(root),
            gitBranch: await this.git.getBranch(root),
            scores,
            previousScores: previous?.scores,
            counts: this.scoring.counts(findings),
            findings,
            fileScores: this.scoring.fileScores(findings),
            missingTests,
            testingCoverage,
        };

        await this.store.save(root, run);

        return run;
    }

    private collectRules(config: ProjectConfig, extraRules?: Rule[]): Rule[] {
        return applyRuleOverrides([
            ...builtInRules(),
            ...conventionRules(config.conventions),
            ...(extraRules ?? []),
        ], config);
    }

    private async loadSourceFiles(
        root: string,
        changedFilesOnly?: boolean
    ): Promise<SourceFile[]> {
        let paths = await this.fileSystem.listFiles(root);

        if (changedFilesOnly) {
            const changed = new Set(await this.git.getChangedFiles(root));
            paths = paths.filter((filePath) => changed.has(filePath) || [...changed].some(
                (relative) => filePath.endsWith(relative) || filePath.includes(relative)
            ));
        }

        const files: SourceFile[] = [];

        for (const filePath of paths) {
            if (!hasTextExtension(filePath) || isRuleCatalog(filePath)) {
                continue;
            }

            try {
                const content = await this.fileSystem.readFile(root, filePath);

                if (content.length > MAX_FILE_BYTES) {
                    continue;
                }

                files.push({ path: filePath, content });
            } catch {
                continue;
            }
        }

        return files;
    }

    private async readPackageName(
        root: string
    ): Promise<{ name: string; raw: string }> {
        try {
            const raw = await this.fileSystem.readFile(root, 'package.json');
            const parsed = JSON.parse(raw) as { name?: string };
            return { name: parsed.name ?? 'project', raw };
        } catch {
            return { name: 'project', raw: '{}' };
        }
    }
}

function isRuleCatalog(filePath: string): boolean {
    const normalized = filePath.replaceAll('\\', '/');

    return /\/(built-in-rules|convention-rules)\.(ts|js)$/.test(normalized);
}

function hasTextExtension(filePath: string): boolean {
    const lower = filePath.toLowerCase();
    const index = lower.lastIndexOf('.');

    if (index < 0) {
        return lower.endsWith('dockerfile') || lower.endsWith('.env');
    }

    return TEXT_EXTENSIONS.has(lower.slice(index));
}
