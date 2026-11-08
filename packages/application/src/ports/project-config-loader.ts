import { ProjectConfig } from '@codigate/domain';

export interface ProjectConfigLoader {
    load(root: string): Promise<ProjectConfig>;
}
