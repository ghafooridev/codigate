import { describe, expect, it } from 'vitest';
import { AnalysisRun } from '@codigate/domain';
import { renderPanel } from './render-panel';

describe('renderPanel', () => {
    it('draws score rings and severity badges with the issue explanation', () => {
        const html = renderPanel({
            id: '1',
            timestamp: '2026-10-31T00:00:00.000Z',
            projectName: 'sample-project',
            scores: {
                overall: 58,
                security: 0,
                quality: 57,
                architecture: 100,
                testing: 96,
                performance: 100,
                conventions: 100,
                seo: 100,
            },
            counts: { high: 2, medium: 1, low: 0, info: 3 },
            findings: [
                {
                    id: 'dep',
                    ruleId: 'dep.vuln',
                    category: 'dependencies',
                    severity: 'high',
                    filePath: 'package.json',
                    line: 1,
                    message: 'lodash has a critical advisory',
                    explanation: 'Prototype pollution can change object behavior.',
                    suggestion: 'Upgrade lodash.',
                },
                {
                    id: 'nest',
                    ruleId: 'qual.deep-nesting',
                    category: 'quality',
                    severity: 'medium',
                    filePath: 'src/async.js',
                    line: 12,
                    message: 'Block nesting is deeper than 4 levels',
                    suggestion: 'Return early.',
                },
            ],
            fileScores: [],
            missingTests: [],
        } as AnalysisRun);

        expect(html).toContain('stroke-dasharray="58 42"');
        expect(html).toContain('class="badge high"');
        expect(html).toContain('class="badge medium"');
        expect(html).toContain('class="badge low"');
        expect(html).toContain('class="badge info"');
        expect(html).toContain('Why it matters');
        expect(html).toContain('Prototype pollution can change object behavior.');
        expect(html).toContain('What to change');
        expect(html).toContain('qual.deep-nesting');
    });
});