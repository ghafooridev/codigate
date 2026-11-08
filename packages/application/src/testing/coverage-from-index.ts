import { CodeIndex } from '@codigate/domain';

export function testingCoverageFromIndex(
    index: CodeIndex
): Record<string, number> {
    const groups: Record<string, { total: number; tested: number }> = {
        Services: { total: 0, tested: 0 },
        Controllers: { total: 0, tested: 0 },
        Utils: { total: 0, tested: 0 },
        Hooks: { total: 0, tested: 0 },
    };

    const tested = new Set(
        index.files.filter((file) => file.isTest).map((file) => baseName(file.path).toLowerCase())
    );

    for (const file of index.files) {
        if (file.isTest || !file.kind || file.kind === 'other' || file.kind === 'component') {
            continue;
        }

        const group =
            file.kind === 'service'
                ? 'Services'
                : file.kind === 'controller'
                    ? 'Controllers'
                    : file.kind === 'hook'
                        ? 'Hooks'
                        : 'Utils';

        groups[group].total += 1;

        const name = baseName(file.path).toLowerCase();
        const covered = [...tested].some(
            (testName) => testName.includes(name) || name.includes(testName.replace(/\.spec|\.test/g, ''))
        );

        if (covered) {
            groups[group].tested += 1;
        }
    }

    const coverage: Record<string, number> = {};

    for (const [label, value] of Object.entries(groups)) {
        coverage[label] = value.total === 0
            ? 100
            : Math.round((value.tested / value.total) * 100);
    }

    return coverage;
}

function baseName(filePath: string): string {
    const slash = filePath.replaceAll('\\', '/').split('/').pop() ?? filePath;

    return slash.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/i, '');
}
