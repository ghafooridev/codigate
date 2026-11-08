import { AnalysisRun, QualityGate, QualityGateResult } from '@codigate/domain';

export class EvaluateQualityGateUseCase {
    execute(run: AnalysisRun, gate: QualityGate): QualityGateResult {
        const failures: string[] = [];

        checkMin(failures, 'Security', run.scores.security, gate.securityMin);
        checkMin(failures, 'Quality', run.scores.quality, gate.qualityMin);
        checkMin(failures, 'Architecture', run.scores.architecture, gate.architectureMin);
        checkMin(failures, 'Testing', run.scores.testing, gate.testingMin);
        checkMin(failures, 'SEO', run.scores.seo, gate.seoMin);
        checkMin(failures, 'Overall', run.scores.overall, gate.overallMin);
        checkMax(failures, 'High', run.counts.high, highCap(gate));

        if (gate.testsMin !== undefined) {
            const coverageValues = Object.values(run.testingCoverage ?? {});
            const coverage = coverageValues.length
                ? coverageValues.reduce((sum, value) => sum + value, 0) / coverageValues.length
                : undefined;

            if (coverage === undefined) {
                failures.push(`Tests were not measured and gate requires ${gate.testsMin}`);
            } else if (coverage < gate.testsMin) {
                failures.push(`Tests ${Math.round(coverage)} < ${gate.testsMin}`);
            }
        }

        return {
            passed: failures.length === 0,
            failures,
        };
    }
}

function highCap(gate: QualityGate): number | undefined {
    if (gate.highMax !== undefined && gate.criticalMax !== undefined) {
        return Math.min(gate.highMax, gate.criticalMax);
    }

    return gate.highMax ?? gate.criticalMax;
}

function checkMin(
    failures: string[],
    label: string,
    value: number,
    min?: number
): void {
    if (min !== undefined && value < min) {
        failures.push(`${label} ${value} < ${min}`);
    }
}

function checkMax(
    failures: string[],
    label: string,
    value: number,
    max?: number
): void {
    if (max !== undefined && value > max) {
        failures.push(`${label} ${value} > ${max}`);
    }
}
