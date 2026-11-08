import { ConventionSet } from './convention-set';
import { Severity } from './finding';
import { QualityGate } from './quality-gate';

export interface RuleOverride {
    enabled?: boolean;
    severity?: Severity;
}

export interface CoverageConfig {
    threshold?: number;
    unitGlobs?: string[];
    componentGlobs?: string[];
    integrationGlobs?: string[];
}

export interface PanelConfig {
    port?: number;
}

export interface GitlabConfig {
    cacheDir?: string;
}

export interface AiConfig {
    apiBase?: string;
    apiKey?: string;
    model?: string;
}

export interface ProjectConfig {
    conventions?: ConventionSet;
    gate?: QualityGate;
    rules?: Record<string, RuleOverride>;
    coverage?: CoverageConfig;
    panel?: PanelConfig;
    gitlab?: GitlabConfig;
    ai?: AiConfig;
}
