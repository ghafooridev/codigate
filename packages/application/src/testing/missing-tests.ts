import { CodeIndex } from '@codigate/domain';

export function missingTestTargets(index: CodeIndex): string[] {
    const testedNames = new Set(
        index.files
            .filter((file) => file.isTest)
            .flatMap((file) => [
                baseName(file.path),
                ...file.symbols.map((symbol) => symbol.name),
            ])
    );

    const candidates = index.files.filter(
        (file) =>
            !file.isTest &&
            (file.kind === 'service' ||
                file.kind === 'controller' ||
                file.kind === 'hook' ||
                file.kind === 'util')
    );

    const missing: string[] = [];

    for (const file of candidates) {
        const name = baseName(file.path);
        const hasSymbolTest = file.symbols.some((symbol) =>
            testedNames.has(symbol.name)
        );

        if (!testedNames.has(name) && !hasSymbolTest) {
            missing.push(name);
        }
    }

    return [...new Set(missing)].sort();
}

function baseName(filePath: string): string {
    const slash = filePath.replaceAll('\\', '/').split('/').pop() ?? filePath;

    return slash.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/i, '');
}
