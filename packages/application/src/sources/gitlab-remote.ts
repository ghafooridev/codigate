export function isGitlabRemote(input: string): boolean {
    if (/^git@[^:\s]+:\S+/.test(input)) {
        return input.includes('gitlab');
    }

    try {
        const url = new URL(input);

        return (url.protocol === 'http:' || url.protocol === 'https:')
            && url.hostname.includes('gitlab');
    } catch {
        return false;
    }
}
