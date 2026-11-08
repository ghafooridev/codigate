export interface QualityGate {
    securityMin?: number;
    qualityMin?: number;
    architectureMin?: number;
    testingMin?: number;
    overallMin?: number;
    seoMin?: number;
    /** @deprecated Use highMax. Still applied as a cap on high findings. */
    criticalMax?: number;
    highMax?: number;
    testsMin?: number;
}

export interface QualityGateResult {
    passed: boolean;
    failures: string[];
}
