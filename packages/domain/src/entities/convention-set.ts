export interface ConventionSet {
    architecture?: string;
    naming?: Record<string, string> | string;
    react?: Record<string, string> | string;
    api?: string;
    state?: string;
    backend?: string;
    testing?: string;
    security?: string;
}
