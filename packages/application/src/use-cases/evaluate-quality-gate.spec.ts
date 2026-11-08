import { describe, expect, it } from 'vitest';
import { EvaluateQualityGateUseCase } from './evaluate-quality-gate';
import { AnalysisRun } from '@codigate/domain';

describe('EvaluateQualityGateUseCase', () => {
    it('fails when high findings exceed the gate', () => {
        const run = {
            scores: {
                overall: 90,
                security: 90,
                quality: 90,
                architecture: 90,
                testing: 90,
                performance: 90,
                conventions: 90,
                seo: 90,
            },
            counts: { high: 1, medium: 0, low: 0, info: 0 },
            testingCoverage: { unit: 100 },
        } as AnalysisRun;

        const result = new EvaluateQualityGateUseCase().execute(run, { highMax: 0 });

        expect(result.passed).toBe(false);
        expect(result.failures[0]).toContain('High');
    });

    it('treats a legacy criticalMax as a high-finding cap', () => {
        const run = {
            scores: {
                overall: 90,
                security: 90,
                quality: 90,
                architecture: 90,
                testing: 90,
                performance: 90,
                conventions: 90,
                seo: 90,
            },
            counts: { high: 1, medium: 0, low: 0, info: 0 },
            testingCoverage: { unit: 90 },
        } as AnalysisRun;

        const result = new EvaluateQualityGateUseCase().execute(run, { criticalMax: 0, highMax: 5 });

        expect(result.passed).toBe(false);
    });
});
