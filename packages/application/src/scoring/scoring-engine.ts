import {
    FileScorecard,
    Finding,
    FindingCategory,
    FindingCounts,
    Scorecard,
    Severity,
} from '@codigate/domain';

const PENALTY: Record<Severity, number> = {
    high: 20,
    medium: 8,
    low: 3,
    info: 0,
};

const QUALITY_CATEGORIES: FindingCategory[] = ['quality', 'architecture', 'conventions'];
const SECURITY_CATEGORIES: FindingCategory[] = ['security', 'dependencies'];

export class ScoringEngine {
    counts(findings: Finding[]): FindingCounts {
        const counts: FindingCounts = {
            high: 0,
            medium: 0,
            low: 0,
            info: 0,
        };

        for (const finding of findings) {
            counts[finding.severity] += 1;
        }

        return counts;
    }

    scoreCategory(findings: Finding[], category: Finding['category']): number {
        return this.scoreCategories(findings, [category]);
    }

    scoreCategories(findings: Finding[], categories: FindingCategory[]): number {
        const relevant = findings.filter((finding) => categories.includes(finding.category));
        const penalty = relevant.reduce(
            (sum, finding) => sum + PENALTY[finding.severity],
            0
        );

        return clamp(100 - penalty);
    }

    score(
        findings: Finding[],
        missingTests: string[],
        coverage?: Record<string, number>
    ): Scorecard {
        const security = this.scoreCategories(findings, SECURITY_CATEGORIES);
        const quality = this.scoreCategories(findings, QUALITY_CATEGORIES);
        const architecture = this.scoreCategory(findings, 'architecture');
        const performance = this.scoreCategory(findings, 'performance');
        const conventions = this.scoreCategory(findings, 'conventions');
        const seo = this.scoreCategory(findings, 'seo');
        const testing = this.testingScore(findings, missingTests, coverage);

        const overall = Math.round(
            security * 0.3 +
            quality * 0.25 +
            testing * 0.2 +
            performance * 0.15 +
            seo * 0.1
        );

        return {
            overall,
            security,
            quality,
            architecture,
            testing,
            performance,
            conventions,
            seo,
        };
    }

    fileScores(findings: Finding[]): FileScorecard[] {
        const byFile = new Map<string, Finding[]>();

        for (const finding of findings) {
            const existing = byFile.get(finding.filePath) ?? [];
            existing.push(finding);
            byFile.set(finding.filePath, existing);
        }

        return [...byFile.entries()]
            .map(([filePath, fileFindings]) => ({
                filePath,
                security: this.scoreCategories(fileFindings, SECURITY_CATEGORIES),
                quality: this.scoreCategories(fileFindings, QUALITY_CATEGORIES),
                architecture: this.scoreCategory(fileFindings, 'architecture'),
                seo: this.scoreCategory(fileFindings, 'seo'),
                findingCount: fileFindings.length,
                findings: fileFindings,
            }))
            .sort((left, right) => right.findingCount - left.findingCount);
    }

    private testingScore(
        findings: Finding[],
        missingTests: string[],
        coverage?: Record<string, number>
    ): number {
        const fromFindings = this.scoreCategory(findings, 'testing');
        const missingPenalty = Math.min(40, missingTests.length * 4);
        const coverageValues = coverage ? Object.values(coverage) : [];
        const coveragePenalty = coverageValues.length
            ? Math.round((100 - average(coverageValues)) * 0.3)
            : 0;

        return clamp(fromFindings - missingPenalty - coveragePenalty);
    }
}

function average(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
}
