import {
    AnalyzeOnDemandUseCase,
    AnalyzeProjectUseCase,
    AnalyzeWithAiUseCase,
    ApplyPatchUseCase,
    CreatePullRequestUseCase,
    EvaluateQualityGateUseCase,
    GenerateTestsUseCase,
    GetProjectStructureUseCase,
    ProposeFixUseCase,
    ReviewCodeUseCase,
    ReviewPullRequestUseCase,
    RunTestsUseCase,
    ValidateTestsUseCase,
} from '@codigate/application';
import { JsonlAnalysisStore } from '../analysis-store';
import { NpmDependencyAuditor } from '../audit';
import { RegexCodeIndexer } from '../code-index';
import { loadCustomRules, YamlProjectConfigLoader } from '../config';
import { NodeFileSystem } from '../file-system';
import { NodeGitRepository } from '../git';
import { GitlabCheckout } from '../gitlab';
import { GithubPullRequestAdapter } from '../github';
import { OpenAiCompatibleAdapter, ResolvedAiConfig, resolveAiConfig } from '../llm';
import { PatternRuleEngine } from '../rule-engine';
import { NodeTestRunner } from '../test-runner';

export interface CodigateEngine {
    fileSystem: NodeFileSystem;
    getProjectStructure: GetProjectStructureUseCase;
    analyzeProject: AnalyzeProjectUseCase;
    analyzeWithAi: AnalyzeWithAiUseCase;
    analyzeOnDemand: AnalyzeOnDemandUseCase;
    gitlab: GitlabCheckout;
    store: JsonlAnalysisStore;
    proposeFix: ProposeFixUseCase;
    applyPatch: ApplyPatchUseCase;
    generateTests: GenerateTestsUseCase;
    validateTests: ValidateTestsUseCase;
    runTests: RunTestsUseCase;
    evaluateGate: EvaluateQualityGateUseCase;
    createPullRequest: CreatePullRequestUseCase;
    reviewPullRequest: ReviewPullRequestUseCase;
    configLoader: YamlProjectConfigLoader;
    llm: OpenAiCompatibleAdapter;
    loadCustomRules: typeof loadCustomRules;
}

export function createEngine(ai?: ResolvedAiConfig): CodigateEngine {
    const fileSystem = new NodeFileSystem();
    const ruleEngine = new PatternRuleEngine();
    const indexer = new RegexCodeIndexer();
    const configLoader = new YamlProjectConfigLoader();
    const store = new JsonlAnalysisStore();
    const git = new NodeGitRepository();
    const llm = new OpenAiCompatibleAdapter(ai ?? resolveAiConfig({ env: process.env }));
    const testRunner = new NodeTestRunner();
    const pullRequests = new GithubPullRequestAdapter();
    const analyzeProject = new AnalyzeProjectUseCase(
        fileSystem,
        ruleEngine,
        indexer,
        configLoader,
        store,
        git,
        loadCustomRules
    );
    const reviewCode = new ReviewCodeUseCase(llm);
    const applyPatch = new ApplyPatchUseCase(fileSystem);
    const generateTests = new GenerateTestsUseCase(fileSystem, llm);
    const analyzeWithAi = new AnalyzeWithAiUseCase(
        analyzeProject,
        reviewCode,
        fileSystem,
        configLoader,
        () => llm.available(),
        store
    );

    return {
        fileSystem,
        getProjectStructure: new GetProjectStructureUseCase(fileSystem),
        analyzeProject,
        analyzeWithAi,
        analyzeOnDemand: new AnalyzeOnDemandUseCase(
            analyzeWithAi,
            new NpmDependencyAuditor(),
            testRunner,
            generateTests,
            applyPatch,
            configLoader,
            () => llm.available(),
            store
        ),
        gitlab: new GitlabCheckout(),
        store,
        proposeFix: new ProposeFixUseCase(fileSystem, llm),
        applyPatch,
        generateTests,
        validateTests: new ValidateTestsUseCase(
            testRunner,
            llm,
            generateTests,
            applyPatch
        ),
        runTests: new RunTestsUseCase(testRunner),
        evaluateGate: new EvaluateQualityGateUseCase(),
        createPullRequest: new CreatePullRequestUseCase(git, pullRequests),
        reviewPullRequest: new ReviewPullRequestUseCase(git, pullRequests),
        configLoader,
        llm,
        loadCustomRules,
    };
}
