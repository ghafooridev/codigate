import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AnalysisRun } from '@codigate/domain';
import { AnalysisStore } from '@codigate/application';

export class JsonlAnalysisStore implements AnalysisStore {
    async save(root: string, run: AnalysisRun): Promise<void> {
        const filePath = historyPath(root);
        await mkdir(join(root, '.codigate'), { recursive: true });

        const previous = await this.readAll(root);
        const compact: AnalysisRun = {
            ...run,
            findings: run.findings,
        };
        previous.push(compact);
        const trimmed = previous.slice(-50);

        await writeFile(
            filePath,
            trimmed.map((entry) => JSON.stringify(entry)).join('\n') + '\n',
            'utf8'
        );
    }

    async latest(root: string): Promise<AnalysisRun | undefined> {
        const all = await this.readAll(root);

        return all.at(-1);
    }

    async history(root: string): Promise<AnalysisRun[]> {
        return this.readAll(root);
    }

    private async readAll(root: string): Promise<AnalysisRun[]> {
        try {
            const raw = await readFile(historyPath(root), 'utf8');

            return raw
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => JSON.parse(line) as AnalysisRun);
        } catch {
            return [];
        }
    }
}

function historyPath(root: string): string {
    return join(root, '.codigate', 'history.jsonl');
}
