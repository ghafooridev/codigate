import { Finding } from './finding';

export interface Scorecard {
    overall: number;
    security: number;
    quality: number;
    architecture: number;
    testing: number;
    performance: number;
    conventions: number;
    seo: number;
}

export interface FindingCounts {
    high: number;
    medium: number;
    low: number;
    info: number;
}

export interface FileScorecard {
    filePath: string;
    security: number;
    quality: number;
    architecture: number;
    seo: number;
    findingCount: number;
    findings: Finding[];
}
