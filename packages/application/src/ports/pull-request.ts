export interface CreatePullRequestInput {
    owner: string;
    repo: string;
    title: string;
    body: string;
    head: string;
    base: string;
}

export interface PullRequestCommentInput {
    owner: string;
    repo: string;
    pullNumber: number;
    body: string;
    path?: string;
    line?: number;
}

export interface PullRequestResult {
    url: string;
    number: number;
}

export interface PullRequestPort {
    createPullRequest(input: CreatePullRequestInput): Promise<PullRequestResult>;
    commentOnPullRequest(input: PullRequestCommentInput): Promise<void>;
}
