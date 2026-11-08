import { ConventionSet, Rule } from '@codigate/domain';

export function conventionRules(conventions?: ConventionSet): Rule[] {
    if (!conventions) {
        return [];
    }

    const rules: Rule[] = [];
    const haystack = JSON.stringify(conventions).toLowerCase();

    if (haystack.includes('repository')) {
        rules.push({
            id: 'conv.repository-pattern',
            category: 'conventions',
            severity: 'high',
            title: 'Repository pattern',
            message: 'Direct data access violates the repository convention',
            glob: ['**/*.{controller,service,route,handler}.{ts,js}', '**/*.{tsx,jsx}'],
            pattern: '\\b(?:prisma|db)\\.\\w+',
            suggestion: 'Call a repository instead of the database client.',
        });
    }

    if (haystack.includes('react query') || haystack.includes('tanstack')) {
        rules.push({
            id: 'conv.react-query-only',
            category: 'conventions',
            severity: 'medium',
            title: 'React Query only',
            message: 'UI should use React Query rather than raw HTTP',
            glob: ['**/*.{tsx,jsx}'],
            pattern: '\\b(?:axios|fetch)\\s*\\(',
            suggestion: 'Use a React Query hook wrapping the API client.',
        });
    }

    if (haystack.includes('zustand')) {
        rules.push({
            id: 'conv.zustand-only',
            category: 'conventions',
            severity: 'medium',
            title: 'Zustand for client state',
            message: 'Non-Zustand client state library detected',
            glob: ['**/*.{ts,tsx,js,jsx}'],
            pattern: 'from\\s+["\'](?:redux|react-redux|jotai|recoil|mobx)',
            suggestion: 'Use Zustand for client state.',
        });
    }

    if (haystack.includes('pascalcase')) {
        rules.push({
            id: 'conv.pascal-components',
            category: 'conventions',
            severity: 'low',
            title: 'PascalCase components',
            message: 'React component names should be PascalCase',
            glob: ['**/*.{tsx,jsx}'],
            pattern: 'export\\s+(?:default\\s+)?function\\s+[a-z]\\w*',
            suggestion: 'Rename the component to PascalCase.',
        });
    }

    if (haystack.includes('no secrets') || haystack.includes('secret')) {
        rules.push({
            id: 'conv.no-secrets',
            category: 'conventions',
            severity: 'high',
            title: 'No secrets in source',
            message: 'Possible secret assigned in source',
            pattern: '(?:secret|password|token)\\s*[:=]\\s*["\'][^"\']{8,}["\']',
            suggestion: 'Use environment variables.',
        });
    }

    return rules;
}
