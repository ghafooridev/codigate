import { AnalysisRun, Finding, Severity } from '@codigate/domain';
import * as vscode from 'vscode';

export class FindingsTreeProvider implements vscode.TreeDataProvider<FindingItem> {
    private run?: AnalysisRun;
    private readonly emitter = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this.emitter.event;

    setRun(run: AnalysisRun): void {
        this.run = run;
        this.emitter.fire();
    }

    getTreeItem(element: FindingItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FindingItem): FindingItem[] {
        if (!this.run) {
            return [];
        }

        if (!element) {
            return (['high', 'medium', 'low', 'info'] as Severity[])
                .map((severity) => {
                    const count = this.run?.counts[severity] ?? 0;
                    return new FindingItem(
                        `${severity} (${count})`,
                        severity,
                        vscode.TreeItemCollapsibleState.Collapsed
                    );
                });
        }

        return this.run.findings
            .filter((finding) => finding.severity === element.severity)
            .map((finding) => FindingItem.fromFinding(finding));
    }
}

export class FindingItem extends vscode.TreeItem {
    constructor(
        label: string,
        readonly severity?: Severity,
        collapsibleState = vscode.TreeItemCollapsibleState.None,
        readonly finding?: Finding
    ) {
        super(label, collapsibleState);

        if (finding) {
            this.description = `${finding.filePath}:${finding.line}`;
            this.tooltip = finding.suggestion
                ? `${finding.message}\nFix: ${finding.suggestion}`
                : finding.message;
            this.command = {
                command: 'codigate.openFinding',
                title: 'Open finding',
                arguments: [finding],
            };
        }
    }

    static fromFinding(finding: Finding): FindingItem {
        return new FindingItem(
            finding.message,
            finding.severity,
            vscode.TreeItemCollapsibleState.None,
            finding
        );
    }
}
