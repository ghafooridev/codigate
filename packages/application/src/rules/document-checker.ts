import { Finding, Rule } from '@codigate/domain';
import { SourceFile } from '../ports/rule-engine';

export function documentFindings(files: SourceFile[], rules: Rule[]): Finding[] {
    const byId = new Map(rules.map((rule) => [rule.id, rule]));
    const findings: Finding[] = [];

    for (const file of files) {
        if (isDocument(file.path)) {
            findings.push(...documentLevel(file, byId));
        }

        if (isMarkup(file.path)) {
            findings.push(...markupLines(file, byId));
        }

        if (isStyle(file.path)) {
            findings.push(...fontFace(file, byId));
        }
    }

    return findings;
}

function documentLevel(file: SourceFile, rules: Map<string, Rule>): Finding[] {
    const findings: Finding[] = [];
    const content = file.content;
    const h1Count = content.match(/<h1\b/gi)?.length ?? 0;

    absent(
        findings,
        rules,
        file,
        'seo.missing-title',
        !/<title[\s>]/i.test(content) && !/og:title/i.test(content) && !/export\s+const\s+metadata\b/.test(content)
    );
    absent(findings, rules, file, 'seo.missing-meta-description', !/name\s*=\s*["']description["']/i.test(content));
    absent(findings, rules, file, 'seo.missing-canonical', !/rel\s*=\s*["']canonical["']/i.test(content));
    absent(findings, rules, file, 'seo.missing-lang', /<html\b/i.test(content) && !/<html\b[^>]*\blang\s*=/i.test(content));
    absent(findings, rules, file, 'seo.missing-h1', h1Count === 0);
    absent(findings, rules, file, 'seo.multiple-h1', h1Count > 1);
    absent(findings, rules, file, 'seo.missing-og-title', !/property\s*=\s*["']og:title["']/i.test(content));
    absent(findings, rules, file, 'seo.missing-og-description', !/property\s*=\s*["']og:description["']/i.test(content));
    absent(
        findings,
        rules,
        file,
        'perf.missing-viewport',
        !/name\s*=\s*["']viewport["']/i.test(content) && !/export\s+const\s+viewport\b/.test(content)
    );

    if (isHtml(file.path)) {
        findings.push(...headScripts(file, rules.get('perf.render-blocking-script')));
    }

    return findings;
}

function markupLines(file: SourceFile, rules: Map<string, Rule>): Finding[] {
    const findings: Finding[] = [];
    const altRule = rules.get('seo.image-alt');
    const sizeRule = rules.get('perf.img-dimensions');
    let altCount = 0;
    let sizeCount = 0;

    file.content.split(/\r?\n/).forEach((line, index) => {
        if (!/<img\b|<Image\b/.test(line)) {
            return;
        }

        if (altRule && altCount < 20 && !/\balt\s*=/.test(line)) {
            altCount += 1;
            findings.push(hit(altRule, file.path, index + 1));
        }

        if (sizeRule && sizeCount < 20 && !(/\bwidth\s*=/.test(line) && /\bheight\s*=/.test(line))) {
            sizeCount += 1;
            findings.push(hit(sizeRule, file.path, index + 1));
        }
    });

    return findings;
}

function fontFace(file: SourceFile, rules: Map<string, Rule>): Finding[] {
    const rule = rules.get('perf.font-display');

    if (!rule || !/@font-face/i.test(file.content)) {
        return [];
    }

    const findings: Finding[] = [];
    const parts = file.content.split(/@font-face/i).slice(1);

    parts.forEach((part, index) => {
        const body = part.split('}')[0] ?? '';

        if (!/font-display\s*:/i.test(body)) {
            findings.push(hit(rule, file.path, lineOf(file.content, index)));
        }
    });

    return findings;
}

function headScripts(file: SourceFile, rule: Rule | undefined): Finding[] {
    if (!rule) {
        return [];
    }

    const findings: Finding[] = [];
    let inHead = false;
    let count = 0;

    file.content.split(/\r?\n/).forEach((line, index) => {
        if (/<head\b/i.test(line)) {
            inHead = true;
        }

        if (inHead && count < 20 && /<script\b/i.test(line) && !/\b(?:defer|async)\b/i.test(line) && !/type\s*=\s*["']module["']/i.test(line)) {
            count += 1;
            findings.push(hit(rule, file.path, index + 1));
        }

        if (/<\/head>/i.test(line)) {
            inHead = false;
        }
    });

    return findings;
}

function absent(
    findings: Finding[],
    rules: Map<string, Rule>,
    file: SourceFile,
    id: string,
    missing: boolean
): void {
    const rule = rules.get(id);

    if (rule && missing) {
        findings.push(hit(rule, file.path, 1));
    }
}

function hit(rule: Rule, filePath: string, line: number): Finding {
    return {
        id: `${rule.id}:${filePath}:${line}`,
        ruleId: rule.id,
        category: rule.category,
        severity: rule.severity,
        filePath,
        line,
        message: rule.message,
        explanation: rule.explanation,
        suggestion: rule.suggestion,
    };
}

function isDocument(filePath: string): boolean {
    const name = baseName(filePath);

    return isHtml(filePath) || /^(layout|_document|document)\.(tsx|jsx)$/i.test(name);
}

function isHtml(filePath: string): boolean {
    return /\.(html|htm)$/i.test(filePath);
}

function isMarkup(filePath: string): boolean {
    return /\.(html|htm|tsx|jsx)$/i.test(filePath);
}

function isStyle(filePath: string): boolean {
    return /\.(css|scss)$/i.test(filePath);
}

function baseName(filePath: string): string {
    return filePath.replaceAll('\\', '/').split('/').pop() ?? filePath;
}

function lineOf(content: string, fontFaceIndex: number): number {
    const chunks = content.split(/@font-face/i);
    const before = chunks.slice(0, fontFaceIndex + 1).join('@font-face');

    return before.split(/\r?\n/).length;
}
