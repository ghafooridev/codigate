import { Finding } from './finding';
import { FileScorecard, FindingCounts, Scorecard } from './scorecard';

export interface AnalysisRun {
    id: string;
    timestamp: string;
    projectName: string;
    stack?: string;
    gitRevision?: string;
    gitBranch?: string;
    scores: Scorecard;
    previousScores?: Scorecard;
    counts: FindingCounts;
    findings: Finding[];
    fileScores: FileScorecard[];
    missingTests: string[];
    testingCoverage?: Record<string, number>;
    coverageNote?: string;
}

export interface AnalysisTrend {
    previous?: number;
    current: number;
    delta: number;
}
