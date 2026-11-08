import { FindingCategory, Severity } from './finding';

export interface Rule {
    id: string;
    category: FindingCategory;
    severity: Severity;
    title: string;
    message: string;
    explanation?: string;
    suggestion?: string;
    glob?: string[];
    pattern?: string;
}
