import { AnalysisRun } from '@codigate/domain';
import { GitRepository } from '../ports/git-repository';
import { PullRequestPort } from '../ports/pull-request';
import { parseGithubRemote, renderPullRequestBody } from './create-pull-request';

export class ReviewPullRequestUseCase {
    constructor(
        private readonly git: GitRepository,
        private readonly pullRequests: PullRequestPort
    ) { }

    async execute(input: {
        root: string;
        run: AnalysisRun;
        pullNumber: number;
        blocked: boolean;
    }): Promise<void> {
        const remote = await this.git.getRemote(input.root);
        const parsed = parseGithubRemote(remote);

        if (!parsed) {
            throw new Error('GitHub remote was not found.');
        }

        const status = input.blocked ? '❌ PR blocked' : '✓ Passed';
        const highFindings = input.run.findings
            .filter((finding) => finding.severity === 'high')
            .slice(0, 10)
            .map((finding) => `${finding.severity.toUpperCase()}: ${finding.message} in ${finding.filePath}:${finding.line}`)
            .join('\n');

        await this.pullRequests.commentOnPullRequest({
            owner: parsed.owner,
            repo: parsed.repo,
            pullNumber: input.pullNumber,
            body: [
                status,
                '',
                renderPullRequestBody(input.run),
                '',
                highFindings,
            ].join('\n'),
        });
    }
}
