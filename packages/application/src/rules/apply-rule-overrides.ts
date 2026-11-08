import { isSeverity, ProjectConfig, Rule } from '@codigate/domain';

export function applyRuleOverrides(rules: Rule[], config: ProjectConfig): Rule[] {
    const overrides = config.rules ?? {};
    const byId = new Map<string, Rule>();

    for (const rule of rules) {
        byId.set(rule.id, rule);
    }

    const enabled: Rule[] = [];

    for (const rule of byId.values()) {
        const override = overrides[rule.id];

        if (override?.enabled === false) {
            continue;
        }

        if (override?.severity) {
            if (!isSeverity(override.severity)) {
                throw new Error(
                    `Invalid severity "${String(override.severity)}" for ${rule.id}. Use high, medium, low, or info.`
                );
            }

            enabled.push({ ...rule, severity: override.severity });
            continue;
        }

        enabled.push(rule);
    }

    return enabled;
}
