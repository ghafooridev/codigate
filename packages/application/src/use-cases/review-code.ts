import { Finding, ProjectConfig } from '@codigate/domain';
import { LlmGateway } from '../ports/llm-gateway';
import { SourceFile } from '../ports/rule-engine';

export class ReviewCodeUseCase {
    constructor(private readonly llm: LlmGateway) { }

    async execute(input: {
        files: SourceFile[];
        existing: Finding[];
        config: ProjectConfig;
    }): Promise<Finding[]> {
        const sample = input.files.slice(0, 12);
        const prompt = [
            'You are Codigate, a software engineering reviewer.',
            'Review the code for architecture, maintainability, readability, correctness,',
            'error handling, edge cases, security, performance, testing, naming, abstraction,',
            'coupling, SOLID, DRY, design patterns, and project conventions.',
            'Return ONLY a JSON array of findings with keys:',
            'ruleId, category, severity, filePath, line, message, explanation, suggestion.',
            'category must be one of: security, quality, architecture, testing, performance, conventions, seo, dependencies.',
            'severity must be one of: high, medium, low, info.',
            `Conventions: ${JSON.stringify(input.config.conventions ?? {})}`,
            `Existing static findings: ${JSON.stringify(input.existing.slice(0, 30))}`,
            'Files:',
            ...sample.map((file) => `--- ${file.path}\n${file.content.slice(0, 4000)}`),
        ].join('\n');

        const raw = await this.llm.complete([
            { role: 'system', content: 'Return valid JSON only. No markdown.' },
            { role: 'user', content: prompt },
        ]);

        return parseFindings(raw);
    }
}

function parseFindings(raw: string): Finding[] {
    const json = extractJson(raw);

    if (!Array.isArray(json)) {
        return [];
    }

    const findings: Finding[] = [];

    for (const item of json) {
        if (!item || typeof item !== 'object') {
            continue;
        }

        const record = item as Record<string, unknown>;
        const filePath = String(record.filePath ?? '');
        const message = String(record.message ?? '');

        if (!filePath || !message) {
            continue;
        }

        const line = Number(record.line ?? 1) || 1;
        const ruleId = String(record.ruleId ?? 'ai.review');

        findings.push({
            id: `${ruleId}:${filePath}:${line}`,
            ruleId,
            category: asCategory(record.category),
            severity: asSeverity(record.severity),
            filePath,
            line,
            message,
            explanation: record.explanation ? String(record.explanation) : undefined,
            suggestion: record.suggestion ? String(record.suggestion) : undefined,
        });
    }

    return findings;
}

function extractJson(raw: string): unknown {
    const trimmed = raw.trim();
    const start = trimmed.indexOf('[');
    const end = trimmed.lastIndexOf(']');

    if (start < 0 || end < 0) {
        return [];
    }

    try {
        return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
        return [];
    }
}

function asCategory(value: unknown): Finding['category'] {
    const allowed = [
        'security',
        'quality',
        'architecture',
        'testing',
        'performance',
        'conventions',
        'seo',
        'dependencies',
    ] as const;

    return allowed.includes(value as Finding['category'])
        ? (value as Finding['category'])
        : 'quality';
}

function asSeverity(value: unknown): Finding['severity'] {
    if (value === 'critical') {
        return 'high';
    }

    const allowed = ['high', 'medium', 'low', 'info'] as const;

    return allowed.includes(value as Finding['severity'])
        ? (value as Finding['severity'])
        : 'medium';
}
