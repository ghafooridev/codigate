import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isSeverity, ProjectConfig, Rule } from '@codigate/domain';
import { ProjectConfigLoader } from '@codigate/application';
import { parse as parseYaml } from 'yaml';

export class YamlProjectConfigLoader implements ProjectConfigLoader {
    async load(root: string): Promise<ProjectConfig> {
        const candidates = [
            join(root, '.codigate', 'config.yml'),
            join(root, '.codigate', 'config.yaml'),
            join(root, 'codigate.yml'),
        ];

        for (const candidate of candidates) {
            try {
                const raw = await readFile(candidate, 'utf8');
                const parsed = parseYaml(raw) as ProjectConfig | undefined;
                assertOverrides(parsed);

                return parsed ?? {};
            } catch {
                continue;
            }
        }

        return {};
    }
}

export async function loadCustomRules(root: string): Promise<Rule[]> {
    const directory = join(root, '.codigate', 'rules');

    try {
        const files = await readdir(directory);
        const rules: Rule[] = [];

        for (const file of files) {
            if (!file.endsWith('.yml') && !file.endsWith('.yaml')) {
                continue;
            }

            const raw = await readFile(join(directory, file), 'utf8');
            const parsed = parseYaml(raw) as Rule | Rule[];

            if (Array.isArray(parsed)) {
                rules.push(...parsed.map(assertRule));
            } else if (parsed?.id) {
                rules.push(assertRule(parsed));
            }
        }

        return rules;
    } catch {
        return [];
    }
}

function assertOverrides(config: ProjectConfig | undefined): void {
    for (const [id, override] of Object.entries(config?.rules ?? {})) {
        if (override?.severity && !isSeverity(override.severity)) {
            throw new Error(
                `Invalid severity "${String(override.severity)}" for ${id}. Use high, medium, low, or info.`
            );
        }
    }
}

function assertRule(rule: Rule): Rule {
    if (!isSeverity(rule.severity)) {
        throw new Error(
            `Invalid severity "${String(rule.severity)}" for ${rule.id}. Use high, medium, low, or info.`
        );
    }

    return rule;
}
