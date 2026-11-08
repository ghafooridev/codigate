import { CodeIndex, IndexedFile, IndexedSymbol } from '@codigate/domain';
import { CodeIndexer, SourceFile } from '@codigate/application';

export class RegexCodeIndexer implements CodeIndexer {
    index(files: SourceFile[]): CodeIndex {
        const indexedFiles = files.map((file) => indexFile(file));

        return {
            files: indexedFiles,
            symbols: indexedFiles.flatMap((file) => file.symbols),
        };
    }
}

function indexFile(file: SourceFile): IndexedFile {
    const normalized = file.path.replaceAll('\\', '/');
    const isTest = /\.(spec|test)\./.test(normalized) || normalized.includes('/__tests__/');
    const symbols = extractSymbols(file);

    return {
        path: file.path,
        language: languageOf(normalized),
        isTest,
        kind: kindOf(normalized, symbols),
        symbols,
    };
}

function extractSymbols(file: SourceFile): IndexedSymbol[] {
    const symbols: IndexedSymbol[] = [];
    const lines = file.content.split(/\r?\n/);

    lines.forEach((line, index) => {
        const classMatch = line.match(/\b(?:export\s+)?class\s+([A-Z]\w*)/);
        const fnMatch = line.match(/\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_]\w*)/);
        const hookMatch = line.match(/\b(?:export\s+)?(?:const|function)\s+(use[A-Z]\w*)/);

        if (classMatch) {
            symbols.push({
                name: classMatch[1],
                kind: 'class',
                filePath: file.path,
                line: index + 1,
            });
        } else if (hookMatch) {
            symbols.push({
                name: hookMatch[1],
                kind: 'hook',
                filePath: file.path,
                line: index + 1,
            });
        } else if (fnMatch) {
            symbols.push({
                name: fnMatch[1],
                kind: line.includes('<') || file.path.endsWith('.tsx') ? 'component' : 'function',
                filePath: file.path,
                line: index + 1,
            });
        }
    });

    return symbols;
}

function kindOf(
    path: string,
    symbols: IndexedSymbol[]
): IndexedFile['kind'] {
    const name = path.toLowerCase();

    if (name.includes('controller')) {
        return 'controller';
    }

    if (name.includes('service')) {
        return 'service';
    }

    if (name.includes('hook') || symbols.some((symbol) => symbol.kind === 'hook')) {
        return 'hook';
    }

    if (name.includes('util') || name.includes('helper')) {
        return 'util';
    }

    if (name.endsWith('.tsx') || name.endsWith('.jsx')) {
        return 'component';
    }

    return 'other';
}

function languageOf(path: string): string {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) {
        return 'typescript';
    }

    if (path.endsWith('.js') || path.endsWith('.jsx')) {
        return 'javascript';
    }

    if (path.endsWith('.py')) {
        return 'python';
    }

    return 'text';
}
