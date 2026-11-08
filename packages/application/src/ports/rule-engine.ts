import { Finding, Rule } from '@codigate/domain';

export interface SourceFile {
    path: string;
    content: string;
}

export interface RuleEngine {
    analyze(files: SourceFile[], rules: Rule[]): Finding[];
}
