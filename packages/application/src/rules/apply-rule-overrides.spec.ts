import { describe, expect, it } from 'vitest';
import { Rule } from '@codigate/domain';
import { applyRuleOverrides } from './apply-rule-overrides';

const rules: Rule[] = [
    {
        id: 'sec.secret.aws-access-key',
        category: 'security',
        severity: 'high',
        title: 'AWS',
        message: 'key',
    },
    {
        id: 'seo.missing-title',
        category: 'seo',
        severity: 'medium',
        title: 'Title',
        message: 'missing',
    },
];

describe('applyRuleOverrides', () => {
    it('disables a rule and replaces its severity', () => {
        const result = applyRuleOverrides(rules, {
            rules: {
                'sec.secret.aws-access-key': { enabled: false },
                'seo.missing-title': { severity: 'low' },
            },
        });

        expect(result.map((rule) => rule.id)).toEqual(['seo.missing-title']);
        expect(result[0]?.severity).toBe('low');
    });

    it('rejects an unknown severity', () => {
        expect(() => applyRuleOverrides(rules, {
            rules: {
                'seo.missing-title': { severity: 'critical' as 'high' },
            },
        })).toThrow(/Invalid severity/);
    });
});
