export interface IndexedSymbol {
    name: string;
    kind: 'class' | 'function' | 'component' | 'hook' | 'unknown';
    filePath: string;
    line: number;
}

export interface IndexedFile {
    path: string;
    language: string;
    isTest: boolean;
    kind?: 'service' | 'controller' | 'hook' | 'util' | 'component' | 'other';
    symbols: IndexedSymbol[];
}

export interface CodeIndex {
    files: IndexedFile[];
    symbols: IndexedSymbol[];
}
