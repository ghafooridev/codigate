import { describe, expect, it, vi } from 'vitest';
import { AnalysisRun } from '@codigate/domain';
import { AnalyzeOnDemandUseCase } from './analyze-on-demand';
import { AnalyzeWithAiUseCase } from './analyze-with-ai';
import { ApplyPatchUseCase } from './apply-patch';
import { GenerateTestsUseCase } from './generate-tests';

const baseRun = {
    id: 'run',
    timestamp: '2026-01-01T00:00:00.000Z',
    projectName: 'demo',
    scores: {
        overall: 100,
        security: 100,
        quality: 100,
        architecture: 100,
        testing: 100,
        performance: 100,
        conventions: 100,
        seo: 100,
    },
    counts: { high: 0, medium: 0, low: 0, info: 0 },
    findings: [],
    fileScores: [],
    missingTests: [],
} as AnalysisRun;

describe('AnalyzeOnDemandUseCase', () => {
    it('adds audit findings and does not invent coverage when measurement fails', async () => {
        const save = vi.fn();
        const generate = vi.fn();
        const useCase = new AnalyzeOnDemandUseCase(
            { execute: async () => structuredClone(baseRun) } as unknown as AnalyzeWithAiUseCase,
            {
                audit: async () => [{
                    id: 'dep.vuln.left-pad',
                    ruleId: 'dep.vuln',
                    category: 'dependencies',
                    severity: 'high',
                    filePath: 'package.json',
                    line: 1,
                    message: 'left-pad is vulnerable',
                    suggestion: 'Upgrade left-pad.',
                }],
            },
            {
                detectCommand: async () => undefined,
                run: async () => ({ passed: true, output: '', command: '' }),
                measureCoverage: async () => ({
                    measured: false,
                    note: 'Coverage was not measured: no test script in package.json.',
                    byKind: {},
                    uncovered: [],
                }),
            },
            { execute: generate } as unknown as GenerateTestsUseCase,
            { execute: async () => undefined } as unknown as ApplyPatchUseCase,
            { load: async () => ({ coverage: { threshold: 80 } }) },
            async () => true,
            { save, latest: async () => undefined, history: async () => [] }
        );

        const run = await useCase.execute('/tmp/demo');

        expect(run.findings.map((finding) => finding.id)).toContain('dep.vuln.left-pad');
        expect(run.scores.security).toBeLessThan(100);
        expect(run.testingCoverage).toBeUndefined();
        expect(run.coverageNote).toContain('not measured');
        expect(generate).not.toHaveBeenCalled();
        expect(save).toHaveBeenCalledOnce();
    });

    it('generates tests when coverage is under the threshold and a model is available', async () => {
        const generate = vi.fn(async () => ({ filePath: 'src/util.spec.ts', content: 'test' }));
        const measure = vi.fn()
            .mockResolvedValueOnce({
                measured: true,
                byKind: { unit: 40 },
                uncovered: [{ path: 'src/util.ts', kind: 'unit' }],
            })
            .mockResolvedValueOnce({
                measured: true,
                byKind: { unit: 90 },
                uncovered: [],
            });
        const useCase = new AnalyzeOnDemandUseCase(
            { execute: async () => structuredClone(baseRun) } as unknown as AnalyzeWithAiUseCase,
            { audit: async () => [] },
            {
                detectCommand: async () => 'npm test',
                run: async () => ({ passed: true, output: '', command: 'npm test' }),
                measureCoverage: measure,
            },
            { execute: generate } as unknown as GenerateTestsUseCase,
            { execute: async () => undefined } as unknown as ApplyPatchUseCase,
            { load: async () => ({}) },
            async () => true,
            { save: async () => undefined, latest: async () => undefined, history: async () => [] }
        );

        const run = await useCase.execute('/tmp/demo');

        expect(generate).toHaveBeenCalledOnce();
        expect(run.testingCoverage).toEqual({ unit: 90 });
        expect(measure).toHaveBeenCalledTimes(2);
    });
});
