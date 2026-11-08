import { AnalysisRun, Finding, QualityGateResult } from '@codigate/domain';

export function renderScanReport(run: AnalysisRun): string {
    const trend = renderTrend(run);
    const coverage = renderCoverage(run);
    const missing = run.missingTests.length
        ? `\nMissing tests:\n\n${run.missingTests.map((name) => name).join('\n')}\n`
        : '';

    return [
        'Codigate Analysis',
        '',
        `Project: ${run.projectName}`,
        run.stack ? `Stack: ${run.stack}` : undefined,
        '',
        'CODIGATE SCORE',
        '━━━━━━━━━━━━━━━━━━',
        '',
        `Overall       ${pad(run.scores.overall)}/100`,
        '',
        `Security      ${pad(run.scores.security)}/100`,
        `Code Quality  ${pad(run.scores.quality)}/100`,
        `SEO           ${pad(run.scores.seo)}/100`,
        `Performance   ${pad(run.scores.performance)}/100`,
        `Testing       ${pad(run.scores.testing)}/100`,
        trend,
        '',
        `High:   ${run.counts.high}`,
        `Medium: ${run.counts.medium}`,
        `Low:    ${run.counts.low}`,
        `Info:   ${run.counts.info}`,
        coverage,
        run.coverageNote ? `\n${run.coverageNote}` : undefined,
        missing,
        renderAudit(run),
        renderIssueList(run),
        renderFiles(run),
    ]
        .filter((line) => line !== undefined)
        .join('\n');
}

export function renderFinding(finding: Finding): string {
    return [
        `${finding.filePath}:${finding.line}`,
        `${finding.severity.toUpperCase()}  ${finding.ruleId}`,
        finding.message,
        finding.suggestion ? `Suggested: ${finding.suggestion}` : undefined,
    ]
        .filter(Boolean)
        .join('\n');
}

export function renderGate(result: QualityGateResult): string {
    if (result.passed) {
        return '✓ Codigate Quality Gate PASSED';
    }

    return ['❌ Codigate Quality Gate FAILED', '', ...result.failures].join('\n');
}

function renderTrend(run: AnalysisRun): string {
    if (!run.previousScores) {
        return '';
    }

    const delta = run.scores.overall - run.previousScores.overall;
    const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
    const signed = delta > 0 ? `+${delta}` : `${delta}`;

    return [
        '',
        `Previous: ${run.previousScores.overall}`,
        `Current: ${run.scores.overall}`,
        `       ${signed} ${arrow}`,
    ].join('\n');
}

function renderCoverage(run: AnalysisRun): string {
    const entries = Object.entries(run.testingCoverage ?? {});

    if (!entries.length) {
        return '\nTesting Coverage\n\nNot measured';
    }

    return [
        '',
        'Testing Coverage',
        '',
        ...entries.map(([label, value]) => `${label.padEnd(14)}${value}%`),
    ].join('\n');
}

function renderFiles(run: AnalysisRun): string {
    if (!run.fileScores.length) {
        return '';
    }

    return [
        'Files',
        ...run.fileScores.slice(0, 20).map(
            (file) => `${file.filePath}\n  ${file.findingCount} findings`
        ),
    ].join('\n');
}

function renderAudit(run: AnalysisRun): string {
    const findings = run.findings.filter((finding) => finding.category === 'dependencies');

    if (!findings.length) {
        return '';
    }

    return ['', 'Packages', '', ...findings.map(renderFinding)].join('\n\n');
}

function renderIssueList(run: AnalysisRun): string {
    const findings = run.findings.filter((finding) => finding.category !== 'dependencies');

    if (!findings.length) {
        return '';
    }

    return ['', 'Issues', '', ...findings.slice(0, 40).map(renderFinding)].join('\n\n');
}

function pad(value: number): string {
    return String(value).padStart(3, ' ');
}
