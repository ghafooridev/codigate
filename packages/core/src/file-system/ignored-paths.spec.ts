import { describe, expect, it } from 'vitest';
import { isIgnored, matchesGlob } from './ignored-paths';

describe('ignored-paths', () => {
    it('ignores default directories', () => {
        expect(isIgnored('node_modules/left-pad/index.js')).toBe(true);
        expect(isIgnored('.git/HEAD')).toBe(true);
        expect(isIgnored('src/main.ts')).toBe(false);
    });

    it('matches brace globs', () => {
        expect(matchesGlob('src/app.tsx', '**/*.{ts,tsx}')).toBe(true);
        expect(matchesGlob('src/app.py', '**/*.{ts,tsx}')).toBe(false);
    });
});
