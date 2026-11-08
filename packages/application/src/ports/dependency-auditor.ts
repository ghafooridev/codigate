import { Finding } from '@codigate/domain';

export interface DependencyAuditor {
    audit(root: string): Promise<Finding[]>;
}
