import { AnalysisRun, Finding, Severity } from '@codigate/domain';

const SEVERITIES: Severity[] = ['high', 'medium', 'low', 'info'];

export function renderPanel(run: AnalysisRun | undefined): string {
    if (!run) {
        return page('Codigate', '<p>No analysis yet. Run <code>codigate analyze</code> in the project root.</p>');
    }

    const scores = [
        ['Overall', run.scores.overall],
        ['Security', run.scores.security],
        ['Quality', run.scores.quality],
        ['SEO', run.scores.seo],
        ['Performance', run.scores.performance],
        ['Testing', run.scores.testing],
    ] as const;
    const coverage = Object.entries(run.testingCoverage ?? {});
    const audit = run.findings.filter((finding) => finding.category === 'dependencies');
    const issues = run.findings.filter((finding) => finding.category !== 'dependencies');
    const context = [run.stack, run.gitBranch, run.gitRevision?.slice(0, 7)]
        .filter(Boolean)
        .join(' · ');

    return page('Codigate', `
        <p class="meta">${escapeHtml(run.projectName)}${context ? ` · ${escapeHtml(context)}` : ''} · ${escapeHtml(run.timestamp)}</p>
        <div class="counts" aria-label="Finding counts">
            ${SEVERITIES.map((severity) => badge(severity, `${severity} ${run.counts[severity] ?? 0}`)).join('')}
        </div>
        <section class="scores" aria-label="Scores">
            ${scores.map(([label, value]) => scoreRing(label, value ?? 0)).join('')}
        </section>
        <section>
            <h2>Coverage</h2>
            ${coverage.length
                ? `<ul class="coverage">${coverage.map(([kind, value]) => `<li><span>${escapeHtml(kind)}</span><strong>${value}%</strong></li>`).join('')}</ul>`
                : '<p>Not measured.</p>'}
            ${run.coverageNote ? `<p class="note">${escapeHtml(run.coverageNote)}</p>` : ''}
        </section>
        <section>
            <h2>Packages <span class="count">${audit.length}</span></h2>
            ${renderFindings(audit)}
        </section>
        <section>
            <h2>Issues <span class="count">${issues.length}</span></h2>
            ${renderFindings(issues)}
        </section>
    `);
}

function scoreRing(label: string, value: number): string {
    const score = clamp(value);
    const color = scoreColor(score);

    return `<article class="score-card">
        <div class="ring-wrap">
            <svg viewBox="0 0 36 36" class="ring" role="img" aria-label="${escapeHtml(label)} ${score} out of 100">
                <circle class="track" cx="18" cy="18" r="15.5"></circle>
                <circle class="value" cx="18" cy="18" r="15.5" pathLength="100"
                    stroke="${color}"
                    stroke-dasharray="${score} ${100 - score}"
                    transform="rotate(-90 18 18)"></circle>
            </svg>
            <strong>${score}</strong>
        </div>
        <span>${escapeHtml(label)}</span>
        <small>/100</small>
    </article>`;
}

function renderFindings(findings: Finding[]): string {
    if (!findings.length) {
        return '<p class="note">None.</p>';
    }

    return `<ul class="findings">${findings.slice(0, 200).map((finding) => `
        <li>
            <div class="issue-top">
                ${badge(finding.severity, finding.severity)}
                <span class="category">${escapeHtml(finding.category)}</span>
                <code class="rule">${escapeHtml(finding.ruleId)}</code>
            </div>
            <h3>${escapeHtml(finding.message)}</h3>
            <p class="where"><code>${escapeHtml(finding.filePath)}:${finding.line}</code></p>
            ${finding.explanation ? `<p class="why"><span>Why it matters</span>${escapeHtml(finding.explanation)}</p>` : ''}
            ${finding.suggestion ? `<p class="fix"><span>What to change</span>${escapeHtml(finding.suggestion)}</p>` : ''}
        </li>
    `).join('')}</ul>`;
}

function badge(severity: Severity, label: string): string {
    return `<span class="badge ${severity}">${escapeHtml(label)}</span>`;
}

function scoreColor(score: number): string {
    if (score >= 80) {
        return '#15803d';
    }

    if (score >= 50) {
        return '#b45309';
    }

    return '#b91c1c';
}

function clamp(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function page(title: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body { font: 16px/1.5 system-ui, sans-serif; margin: 2rem auto; max-width: 980px; padding: 0 1rem 3rem; color: #1c1917; background: #faf7f2; }
h1, h2, h3 { font-weight: 650; }
h2 { margin-top: 2rem; }
h3 { margin: 0.65rem 0 0.25rem; font-size: 1rem; }
.meta, .note, small { color: #57534e; }
.counts { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0 1.25rem; }
.badge { display: inline-block; padding: 0.15rem 0.55rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; }
.badge.high { background: #fee2e2; color: #991b1b; }
.badge.medium { background: #fef3c7; color: #92400e; }
.badge.low { background: #e0f2fe; color: #075985; }
.badge.info { background: #f5f5f4; color: #44403c; }
.scores { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; }
.score-card { background: white; border: 1px solid #e7e5e4; padding: 1rem 0.5rem 0.85rem; text-align: center; }
.ring-wrap { position: relative; width: 96px; height: 96px; margin: 0 auto 0.35rem; }
.ring { width: 96px; height: 96px; }
.ring .track, .ring .value { fill: none; stroke-width: 3; }
.ring .track { stroke: #e7e5e4; }
.ring .value { stroke-linecap: round; }
.ring-wrap strong { position: absolute; inset: 0; display: grid; place-items: center; font-size: 1.35rem; }
.coverage { list-style: none; padding: 0; display: grid; gap: 0.5rem; }
.coverage li { display: flex; justify-content: space-between; background: white; border: 1px solid #e7e5e4; padding: 0.55rem 0.8rem; }
.count { color: #78716c; font-size: 0.9rem; font-weight: 600; }
.findings { list-style: none; padding: 0; }
.findings li { background: white; border: 1px solid #e7e5e4; margin: 0.75rem 0; padding: 0.9rem 1rem 1rem; }
.issue-top { display: flex; flex-wrap: wrap; gap: 0.4rem 0.6rem; align-items: center; }
.category { color: #57534e; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
.rule, .where code { font-family: ui-monospace, monospace; font-size: 0.82rem; }
.where { margin: 0.15rem 0 0.7rem; }
.where code { color: #44403c; word-break: break-all; }
.why, .fix { margin: 0.45rem 0 0; }
.why span, .fix span { display: block; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #78716c; }
.fix { color: #14532d; }
code { font-family: ui-monospace, monospace; }
</style>
</head>
<body>
<h1>Codigate</h1>
${body}
</body>
</html>`;
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}
