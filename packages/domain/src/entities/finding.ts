export type Severity = 'high' | 'medium' | 'low' | 'info';

export type FindingCategory =
    | 'security'
    | 'quality'
    | 'architecture'
    | 'testing'
    | 'performance'
    | 'conventions'
    | 'seo'
    | 'dependencies';

export interface Finding {
    id: string;
    ruleId: string;
    category: FindingCategory;
    severity: Severity;
    filePath: string;
    line: number;
    column?: number;
    message: string;
    explanation?: string;
    suggestion?: string;
}

export function isSeverity(value: string): value is Severity {
    return value === 'high' || value === 'medium' || value === 'low' || value === 'info';
}
