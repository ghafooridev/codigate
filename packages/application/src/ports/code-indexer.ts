import { CodeIndex } from '@codigate/domain';
import { SourceFile } from './rule-engine';

export interface CodeIndexer {
    index(files: SourceFile[]): CodeIndex;
}
