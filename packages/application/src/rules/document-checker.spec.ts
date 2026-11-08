import { describe, expect, it } from 'vitest';
import { Rule } from '@codigate/domain';
import { documentFindings } from './document-checker';
import { structuralFindings } from './structural-checker';

const rules: Rule[] = [
    {
        id: 'seo.missing-title',
        category: 'seo',
        severity: 'medium',
        title: 'Title',
        message: 'Missing title',
        suggestion: 'Add a title element.',
    },
    {
        id: 'perf.img-dimensions',
        category: 'performance',
        severity: 'medium',
        title: 'Dimensions',
        message: 'Image has no size',
        suggestion: 'Set width and height.',
    },
    {
        id: 'qual.long-function',
        category: 'quality',
        severity: 'medium',
        title: 'Long',
        message: 'Function is too long',
        suggestion: 'Split it.',
    },
];

describe('document and structural checks', () => {
    it('flags a document without a title and an image without dimensions', () => {
        const findings = documentFindings([
            {
                path: 'index.html',
                content: '<html><body><img src="a.png" alt="A"></body></html>',
            },
        ], rules);

        expect(findings.map((finding) => finding.ruleId)).toContain('seo.missing-title');
        expect(findings.map((finding) => finding.ruleId)).toContain('perf.img-dimensions');
    });

    it('flags a function longer than 80 lines', () => {
        const body = Array.from({ length: 90 }, () => '  const value = 1;').join('\n');
        const findings = structuralFindings([
            { path: 'long.ts', content: `function longOne() {\n${body}\n}` },
        ], rules);

        expect(findings.map((finding) => finding.ruleId)).toContain('qual.long-function');
    });
});
