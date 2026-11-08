import { Finding, Rule } from '@codigate/domain';
import { SourceFile } from '../ports/rule-engine';

const LONG_FUNCTION_LINES = 80;
const MAX_NESTING = 4;

export function structuralFindings(files: SourceFile[], rules: Rule[]): Finding[] {
    const longRule = rules.find((rule) => rule.id === 'qual.long-function');
    const nestRule = rules.find((rule) => rule.id === 'qual.deep-nesting');

    if (!longRule && !nestRule) {
        return [];
    }

    const findings: Finding[] = [];

    for (const file of files) {
        if (isMinified(file.content)) {
            continue;
        }

        findings.push(...inspectFile(file, longRule, nestRule));
    }

    return findings;
}

function inspectFile(
    file: SourceFile,
    longRule: Rule | undefined,
    nestRule: Rule | undefined
): Finding[] {
    const findings: Finding[] = [];
    const lines = file.content.split(/\r?\n/);
    let depth = 0;
    const stack: { name: string; start: number; base: number; nested: boolean }[] = [];

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const opens = count(line, '{');
        const closes = count(line, '}');

        if (isFunctionStart(line)) {
            stack.push({
                name: functionName(line),
                start: lineNumber,
                base: depth,
                nested: false,
            });
        }

        depth += opens;

        for (const frame of stack) {
            if (nestRule && !frame.nested && depth - frame.base > MAX_NESTING) {
                frame.nested = true;
                findings.push(finding(nestRule, file.path, lineNumber, frame.name));
            }
        }

        depth = Math.max(0, depth - closes);

        while (stack.length && depth <= stack[stack.length - 1].base && lineNumber > stack[stack.length - 1].start) {
            const frame = stack.pop();

            if (!frame || !longRule) {
                continue;
            }

            const length = lineNumber - frame.start + 1;

            if (length > LONG_FUNCTION_LINES) {
                findings.push(finding(longRule, file.path, frame.start, frame.name, length));
            }
        }
    });

    return findings;
}

function finding(
    rule: Rule,
    filePath: string,
    line: number,
    name: string,
    length?: number
): Finding {
    const detail = length
        ? `${name} is ${length} lines`
        : `${name} nests more than ${MAX_NESTING} blocks`;

    return {
        id: `${rule.id}:${filePath}:${line}`,
        ruleId: rule.id,
        category: rule.category,
        severity: rule.severity,
        filePath,
        line,
        message: `${rule.message}: ${detail}`,
        explanation: rule.explanation,
        suggestion: rule.suggestion,
    };
}

function isFunctionStart(line: string): boolean {
    if (/\bfunction\b|\b=>\s*\{/.test(line)) {
        return true;
    }

    return /^\s*(?:public |private |protected |async |static )*(?!if\b|for\b|while\b|switch\b|catch\b|with\b)[A-Za-z_$][\w$]*\s*\([^;]*\)\s*\{/.test(line);
}

function functionName(line: string): string {
    const match = line.match(/function\s+([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*)\s*(?:=|\()/) ;

    return match?.[1] ?? match?.[2] ?? 'function';
}

function count(line: string, token: string): number {
    return line.split(token).length - 1;
}

function isMinified(content: string): boolean {
    const first = content.split(/\r?\n/, 1)[0] ?? '';

    return first.length > 500;
}
