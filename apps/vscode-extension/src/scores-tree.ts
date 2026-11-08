import { AnalysisRun } from '@codigate/domain';
import * as vscode from 'vscode';

export class ScoresTreeProvider implements vscode.TreeDataProvider<ScoreItem> {
    private run?: AnalysisRun;
    private readonly emitter = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this.emitter.event;

    setRun(run: AnalysisRun): void {
        this.run = run;
        this.emitter.fire();
    }

    getTreeItem(element: ScoreItem): vscode.TreeItem {
        return element;
    }

    getChildren(): ScoreItem[] {
        if (!this.run) {
            return [new ScoreItem('Run Codigate: Scan Workspace', '')];
        }

        const scores = this.run.scores;

        return [
            new ScoreItem('Overall', `${scores.overall}/100`),
            new ScoreItem('Security', `${scores.security}/100`),
            new ScoreItem('Quality', `${scores.quality}/100`),
            new ScoreItem('SEO', `${scores.seo}/100`),
            new ScoreItem('Performance', `${scores.performance}/100`),
            new ScoreItem('Testing', `${scores.testing}/100`),
        ];
    }
}

class ScoreItem extends vscode.TreeItem {
    constructor(label: string, value: string) {
        super(value ? `${label}  ${value}` : label, vscode.TreeItemCollapsibleState.None);
    }
}
