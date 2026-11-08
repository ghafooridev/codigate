export type CoverageKind = 'unit' | 'component' | 'integration';

export interface CoverageGlobs {
    unit: string[];
    component: string[];
    integration: string[];
}

export interface CoverageFile {
    path: string;
    percent: number;
}

export interface CoverageSummary {
    byKind: Partial<Record<CoverageKind, number>>;
    uncovered: { path: string; kind: CoverageKind }[];
}

export function coverageKind(filePath: string, globs?: CoverageGlobs): CoverageKind | undefined {
    const normalized = filePath.replaceAll('\\', '/');

    if (isTestFile(normalized) || normalized.endsWith('.d.ts')) {
        return undefined;
    }

    if (globs) {
        if (matches(normalized, globs.component)) {
            return 'component';
        }

        if (matches(normalized, globs.integration)) {
            return 'integration';
        }

        if (matches(normalized, globs.unit)) {
            return 'unit';
        }
    }

    if (/\/integration\//i.test(normalized) || /\.integration\./i.test(normalized)) {
        return 'integration';
    }

    if (/\.(tsx|jsx)$/i.test(normalized) || /\.component\./i.test(normalized)) {
        return 'component';
    }

    if (/\.(ts|js|mjs|cjs)$/i.test(normalized)) {
        return 'unit';
    }

    return undefined;
}

export function summarizeCoverage(
    files: CoverageFile[],
    threshold: number,
    globs?: CoverageGlobs
): CoverageSummary {
    const groups: Record<CoverageKind, number[]> = {
        unit: [],
        component: [],
        integration: [],
    };
    const uncovered: CoverageSummary['uncovered'] = [];

    for (const file of files) {
        const kind = coverageKind(file.path, globs);

        if (!kind) {
            continue;
        }

        groups[kind].push(file.percent);

        if (file.percent < threshold) {
            uncovered.push({ path: file.path, kind });
        }
    }

    const byKind: CoverageSummary['byKind'] = {};

    for (const kind of ['unit', 'component', 'integration'] as const) {
        if (groups[kind].length) {
            const total = groups[kind].reduce((sum, value) => sum + value, 0);
            byKind[kind] = Math.round(total / groups[kind].length);
        }
    }

    return { byKind, uncovered };
}

function isTestFile(filePath: string): boolean {
    return /\.(spec|test)\./i.test(filePath) || filePath.includes('/__tests__/');
}

function matches(filePath: string, globs: string[]): boolean {
    return globs.flatMap(expandBraces).some((glob) => globToRegExp(glob).test(filePath));
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

function globToRegExp(glob: string): RegExp {
    const source = glob
        .replaceAll('\\', '/')
        .replaceAll(/[.+^${}()|[\]\\]/g, '\\$&')
        .replaceAll('**', '::DOUBLE::')
        .replaceAll('*', '[^/]*')
        .replaceAll('::DOUBLE::', '.*');

    return new RegExp(source, 'i');
}
