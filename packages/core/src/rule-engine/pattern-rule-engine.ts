import { Finding, Rule } from '@codigate/domain';
import { RuleEngine, SourceFile } from '@codigate/application';
import { matchesGlob } from '../file-system/ignored-paths';

export class PatternRuleEngine implements RuleEngine {
    analyze(files: SourceFile[], rules: Rule[]): Finding[] {
        const findings: Finding[] = [];

        for (const file of files) {
            for (const rule of rules) {
                if (!matchesFile(file.path, rule.glob) || !rule.pattern) {
                    continue;
                }

                const regex = toRegex(rule.pattern);
                const lines = file.content.split(/\r?\n/);

                lines.forEach((line, index) => {
                    if (!regex.test(line)) {
                        return;
                    }

                    regex.lastIndex = 0;
                    findings.push({
                        id: `${rule.id}:${file.path}:${index + 1}`,
                        ruleId: rule.id,
                        category: rule.category,
                        severity: rule.severity,
                        filePath: file.path,
                        line: index + 1,
                        message: rule.message,
                        explanation: rule.explanation,
                        suggestion: rule.suggestion,
                    });
                });
            }
        }

        return findings;
    }
}

function matchesFile(filePath: string, glob?: string[]): boolean {
    if (!glob || glob.length === 0) {
        return true;
    }

    return glob.some((pattern) => matchesGlob(filePath, pattern));
}

function toRegex(pattern: string): RegExp {
    return new RegExp(pattern, 'gi');
}
