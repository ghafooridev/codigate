import { AnalysisRun } from '@codigate/domain';

export interface AnalysisStore {
    save(root: string, run: AnalysisRun): Promise<void>;
    latest(root: string): Promise<AnalysisRun | undefined>;
    history(root: string): Promise<AnalysisRun[]>;
}
