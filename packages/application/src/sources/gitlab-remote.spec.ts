import { describe, expect, it } from 'vitest';
import { isGitlabRemote } from './gitlab-remote';

describe('isGitlabRemote', () => {
    it('accepts gitlab.com, self-hosted GitLab hosts, and SSH remotes', () => {
        expect(isGitlabRemote('https://gitlab.com/group/project')).toBe(true);
        expect(isGitlabRemote('https://gitlab.example.com/group/project.git')).toBe(true);
        expect(isGitlabRemote('git@gitlab.com:group/project.git')).toBe(true);
        expect(isGitlabRemote('https://github.com/group/project')).toBe(false);
        expect(isGitlabRemote('/tmp/project')).toBe(false);
    });
});
