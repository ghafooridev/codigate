export const DEFAULT_IGNORE_NAMES = [
    '.git',
    '.codigate',
    'node_modules',
    'dist',
    'build',
    '.next',
    'coverage',
    '.nx',
    '.turbo',
    'out',
    'tmp',
    'vendor',
    '__pycache__',
    '.venv',
    'workspace_modules',
];

export function parseGitignore(contents: string): string[] {
    return contents
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));
}

export function isIgnored(
    relativePath: string,
    gitignorePatterns: string[] = []
): boolean {
    const normalized = relativePath.replaceAll('\\', '/').replace(/^\.\//, '');
    const segments = normalized.split('/').filter(Boolean);

    if (segments.some((segment) => DEFAULT_IGNORE_NAMES.includes(segment))) {
        return true;
    }

    return gitignorePatterns.some((pattern) => matchesGitignore(normalized, pattern));
}

export function matchesGlob(filePath: string, glob: string): boolean {
    const normalized = filePath.replaceAll('\\', '/');

    return expandBraces(glob).some((pattern) => {
        const regex = globToRegExp(pattern);

        return regex.test(normalized) || regex.test(normalized.split('/').pop() ?? normalized);
    });
}

function expandBraces(glob: string): string[] {
    const match = glob.match(/\{([^}]+)\}/);

    if (!match) {
        return [glob];
    }

    return match[1]
        .split(',')
        .flatMap((option) => expandBraces(glob.replace(match[0], option.trim())));
}

function matchesGitignore(relativePath: string, pattern: string): boolean {
    let body = pattern;
    let directoryOnly = false;

    if (body.startsWith('!')) {
        return false;
    }

    if (body.endsWith('/')) {
        directoryOnly = true;
        body = body.slice(0, -1);
    }

    if (body.startsWith('/')) {
        body = body.slice(1);
    }

    const regex = globToRegExp(body.includes('/') ? body : `**/${body}`);
    const matched = regex.test(relativePath);

    if (!matched) {
        return false;
    }

    if (directoryOnly && relativePath.split('/').pop()?.includes('.')) {
        return false;
    }

    return true;
}

function globToRegExp(glob: string): RegExp {
    const escaped = glob
        .replaceAll(/[.+^${}()|[\]\\]/g, '\\$&')
        .replaceAll('**', '::DOUBLE::')
        .replaceAll('*', '[^/]*')
        .replaceAll('::DOUBLE::', '.*')
        .replaceAll('?', '.');

    return new RegExp(`(^|/)${escaped}($|/)`, 'i');
}

export function assertWithinRoot(root: string, target: string, resolvePath: (path: string) => string, sep: string): string {
    const resolvedRoot = resolvePath(root);
    const resolvedTarget = resolvePath(target);
    const prefix = resolvedRoot.endsWith(sep) ? resolvedRoot : resolvedRoot + sep;

    if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(prefix)) {
        throw new Error(`Path escapes project root: ${target}`);
    }

    return resolvedTarget;
}
