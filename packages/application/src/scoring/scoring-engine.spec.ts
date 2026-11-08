import { describe, expect, it } from 'vitest';
import { Finding } from '@codigate/domain';
import { ScoringEngine } from './scoring-engine';

describe('ScoringEngine', () => {
    const scoring = new ScoringEngine();

    it('starts at 100 with no findings', () => {
        const scores = scoring.score([], []);

        expect(scores.security).toBe(100);
        expect(scores.seo).toBe(100);
        expect(scores.overall).toBe(100);
    });

    it('penalizes high security findings', () => {
        const findings: Finding[] = [
            {
                id: '1',
                ruleId: 'sec.secret',
                category: 'security',
                severity: 'high',
                filePath: 'a.ts',
                line: 1,
                message: 'secret',
            },
        ];

        expect(scoring.score(findings, []).security).toBe(80);
        expect(scoring.counts(findings).high).toBe(1);
    });

    it('rolls architecture findings into quality and dependency findings into security', () => {
        const findings: Finding[] = [
            {
                id: 'arch',
                ruleId: 'arch.direct-db',
                category: 'architecture',
                severity: 'high',
                filePath: 'a.ts',
                line: 1,
                message: 'db',
            },
            {
                id: 'dep',
                ruleId: 'dep.vuln.left-pad',
                category: 'dependencies',
                severity: 'medium',
                filePath: 'package.json',
                line: 1,
                message: 'vuln',
            },
        ];
        const scores = scoring.score(findings, []);

        expect(scores.quality).toBe(80);
        expect(scores.security).toBe(92);
    });
});
