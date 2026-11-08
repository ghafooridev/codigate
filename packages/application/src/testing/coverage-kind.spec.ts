import { describe, expect, it } from 'vitest';
import { coverageKind, summarizeCoverage } from './coverage-kind';

describe('coverageKind', () => {
    it('splits source files into unit, component, and integration', () => {
        expect(coverageKind('src/util.ts')).toBe('unit');
        expect(coverageKind('src/button.tsx')).toBe('component');
        expect(coverageKind('src/integration/api.ts')).toBe('integration');
        expect(coverageKind('src/util.spec.ts')).toBeUndefined();
    });

    it('averages coverage per kind and lists files under the threshold', () => {
        const summary = summarizeCoverage([
            { path: 'src/util.ts', percent: 50 },
            { path: 'src/other.ts', percent: 100 },
            { path: 'src/button.tsx', percent: 10 },
        ], 80);

        expect(summary.byKind.unit).toBe(75);
        expect(summary.byKind.component).toBe(10);
        expect(summary.uncovered.map((file) => file.path)).toEqual([
            'src/util.ts',
            'src/button.tsx',
        ]);
    });
});
