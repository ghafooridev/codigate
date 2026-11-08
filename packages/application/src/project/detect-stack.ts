export function detectStack(packageJson: string): string | undefined {
    let names: string[] = [];

    try {
        const parsed = JSON.parse(packageJson) as {
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
        };
        names = [
            ...Object.keys(parsed.dependencies ?? {}),
            ...Object.keys(parsed.devDependencies ?? {}),
        ];
    } catch {
        return undefined;
    }

    const parts: string[] = [];

    if (names.includes('next')) {
        parts.push('Next.js');
    }

    if (names.some((name) => name.startsWith('@nestjs/'))) {
        parts.push('NestJS');
    }

    if (names.includes('react') && !parts.includes('Next.js')) {
        parts.push('React');
    }

    if (names.includes('typescript') || names.includes('@types/node')) {
        parts.push('TypeScript');
    }

    if (names.includes('express') && !parts.includes('NestJS')) {
        parts.push('Express');
    }

    return parts.length ? parts.join(' / ') : undefined;
}
