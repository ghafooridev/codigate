import {
    CreatePullRequestInput,
    PullRequestCommentInput,
    PullRequestPort,
    PullRequestResult,
} from '@codigate/application';

export class GithubPullRequestAdapter implements PullRequestPort {
    constructor(private readonly token = process.env.GITHUB_TOKEN ?? '') { }

    async createPullRequest(input: CreatePullRequestInput): Promise<PullRequestResult> {
        const payload = await this.request(
            `/repos/${input.owner}/${input.repo}/pulls`,
            'POST',
            {
                title: input.title,
                body: input.body,
                head: input.head,
                base: input.base,
            }
        ) as { html_url: string; number: number };

        return { url: payload.html_url, number: payload.number };
    }

    async commentOnPullRequest(input: PullRequestCommentInput): Promise<void> {
        await this.request(
            `/repos/${input.owner}/${input.repo}/issues/${input.pullNumber}/comments`,
            'POST',
            { body: input.body }
        );
    }

    private async request(path: string, method: string, body: unknown): Promise<unknown> {
        if (!this.token) {
            throw new Error('GITHUB_TOKEN is required for pull request operations.');
        }

        const response = await fetch(`https://api.github.com${path}`, {
            method,
            headers: {
                authorization: `Bearer ${this.token}`,
                accept: 'application/vnd.github+json',
                'content-type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`GitHub API ${response.status}: ${text}`);
        }

        return response.json();
    }
}
