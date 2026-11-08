import { AnalysisRun } from '@codigate/domain';
import { GitRepository } from '../ports/git-repository';
import { PullRequestPort } from '../ports/pull-request';

export class CreatePullRequestUseCase {
    constructor(
        private readonly git: GitRepository,
        private readonly pullRequests: PullRequestPort
    ) { }

    async execute(input: {
        root: string;
        run: AnalysisRun;
        base?: string;
    }) {
        const remote = await this.git.getRemote(input.root);
        const parsed = parseGithubRemote(remote);

        if (!parsed) {
            throw new Error('GitHub remote was not found. Set origin to a GitHub URL.');
        }

        const head = (await this.git.getBranch(input.root)) ?? 'HEAD';
        const title = `chore: codigate analysis ${input.run.scores.overall}/100`;
        const body = renderPullRequestBody(input.run);

        return this.pullRequests.createPullRequest({
            owner: parsed.owner,
            repo: parsed.repo,
            title,
            body,
            head,
            base: input.base ?? 'main',
        });
    }
}

export function parseGithubRemote(
    remote?: string
): { owner: string; repo: string } | undefined {
    if (!remote) {
        return undefined;
    }

    const match = remote.match(/github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/.]+)(?:\.git)?/);

    if (!match?.groups) {
        return undefined;
    }

    return { owner: match.groups.owner, repo: match.groups.repo };
}

export function renderPullRequestBody(run: AnalysisRun): string {
    return [
        '## Codigate Bot',
        '',
        `Security Score: ${run.scores.security}/100`,
        `Quality Score: ${run.scores.quality}/100`,
        `SEO Score: ${run.scores.seo}/100`,
        `Performance Score: ${run.scores.performance}/100`,
        `Tests: ${averageCoverage(run)}%`,
        '',
        'Findings:',
        `${run.counts.high} High`,
        `${run.counts.medium} Medium`,
        '',
        `Missing tests: ${run.missingTests.length}`,
        '',
        `Overall: ${run.scores.overall}/100`,
    ].join('\n');
}

function averageCoverage(run: AnalysisRun): number {
    const values = Object.values(run.testingCoverage ?? {});

    if (!values.length) {
        return 0;
    }

    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
