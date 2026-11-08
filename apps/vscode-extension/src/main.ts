import * as vscode from 'vscode';
import { createEngine, resolveAiConfig, startAnalysisPanel, YamlProjectConfigLoader } from '@codigate/core';
import { AnalysisRun, Finding } from '@codigate/domain';
import { ScoresTreeProvider } from './scores-tree';
import { FindingsTreeProvider } from './findings-tree';
const diagnostics = vscode.languages.createDiagnosticCollection('codigate');
let latestRun: AnalysisRun | undefined;
let panelUrl: string | undefined;

export function activate(context: vscode.ExtensionContext): void {
    const scores = new ScoresTreeProvider();
    const findings = new FindingsTreeProvider();

    context.subscriptions.push(
        diagnostics,
        vscode.window.registerTreeDataProvider('codigate.scores', scores),
        vscode.window.registerTreeDataProvider('codigate.findings', findings),
        vscode.commands.registerCommand('codigate.scan', async () => {
            const run = await scanWorkspace();
            scores.setRun(run);
            findings.setRun(run);
            publishDiagnostics(run);
            void vscode.window.showInformationMessage(
                `Codigate overall ${run.scores.overall}/100`
            );
        }),
        vscode.commands.registerCommand('codigate.analyze', async () => {
            const root = workspaceRoot();
            const run = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Codigate analyze',
            }, async () => (await workspaceEngine()).analyzeOnDemand.execute(root));
            latestRun = run;
            scores.setRun(run);
            findings.setRun(run);
            publishDiagnostics(run);
            void vscode.window.showInformationMessage(
                `Codigate overall ${run.scores.overall}/100`
            );
            await openPanel(root);
        }),
        vscode.commands.registerCommand('codigate.openPanel', async () => {
            await openPanel(workspaceRoot());
        }),
        vscode.commands.registerCommand('codigate.openFinding', async (finding: Finding) => {
            await openFinding(finding);
        }),
        vscode.commands.registerCommand('codigate.fix', async (item?: { finding?: Finding }) => {
            const finding = item?.finding ?? latestRun?.findings[0];

            if (!finding) {
                void vscode.window.showWarningMessage('No Codigate finding to fix.');
                return;
            }

            const proposed = await (await workspaceEngine()).proposeFix.execute({
                root: workspaceRoot(),
                finding,
            });
            const document = await vscode.workspace.openTextDocument({
                content: proposed.diff,
                language: 'diff',
            });
            await vscode.window.showTextDocument(document);

            const apply = await vscode.window.showInformationMessage(
                `Apply fix to ${proposed.filePath}?`,
                'Apply'
            );

            if (apply === 'Apply') {
                await (await workspaceEngine()).applyPatch.execute({
                    root: workspaceRoot(),
                    filePath: proposed.filePath,
                    content: proposed.updated,
                });
            }
        })
    );
}

export function deactivate(): void {
    diagnostics.clear();
}

async function workspaceEngine() {
    const root = workspaceRoot();
    const project = await new YamlProjectConfigLoader().load(root);
    const settings = vscode.workspace.getConfiguration('codigate');

    return createEngine(resolveAiConfig({
        settings: {
            apiBase: settings.get<string>('ai.apiBase'),
            apiKey: settings.get<string>('ai.apiKey'),
            model: settings.get<string>('ai.model'),
        },
        project: project.ai,
        env: process.env,
    }));
}

async function scanWorkspace(): Promise<AnalysisRun> {
    const root = workspaceRoot();
    const run = await (await workspaceEngine()).analyzeProject.execute({ root });
    latestRun = run;

    return run;
}

function workspaceRoot(): string {
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!folder) {
        throw new Error('Open a workspace folder to run Codigate.');
    }

    return folder;
}

function publishDiagnostics(run: AnalysisRun): void {
    diagnostics.clear();
    const byFile = new Map<string, vscode.Diagnostic[]>();

    for (const finding of run.findings) {
        const range = new vscode.Range(
            Math.max(0, finding.line - 1),
            finding.column ?? 0,
            Math.max(0, finding.line - 1),
            200
        );
        const diagnostic = new vscode.Diagnostic(
            range,
            [
                `${finding.severity.toUpperCase()}: ${finding.message}`,
                finding.suggestion ? `Fix: ${finding.suggestion}` : undefined,
            ].filter(Boolean).join(' — '),
            toSeverity(finding.severity)
        );
        diagnostic.source = 'Codigate';
        diagnostic.code = finding.ruleId;
        const list = byFile.get(finding.filePath) ?? [];
        list.push(diagnostic);
        byFile.set(finding.filePath, list);
    }

    for (const [filePath, list] of byFile) {
        diagnostics.set(vscode.Uri.file(filePath), list);
    }
}

async function openFinding(finding: Finding): Promise<void> {
    const uri = vscode.Uri.file(finding.filePath);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);
    const position = new vscode.Position(Math.max(0, finding.line - 1), 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position));
}

async function openPanel(root: string): Promise<void> {
    if (!panelUrl) {
        const engine = await workspaceEngine();
        const config = await engine.configLoader.load(root);
        const panel = await startAnalysisPanel({
            root,
            port: config.panel?.port ?? 4318,
            store: engine.store,
        });
        panelUrl = panel.url;
    }

    await vscode.env.openExternal(vscode.Uri.parse(panelUrl));
}

function toSeverity(severity: Finding['severity']): vscode.DiagnosticSeverity {
    if (severity === 'high') {
        return vscode.DiagnosticSeverity.Error;
    }

    if (severity === 'medium') {
        return vscode.DiagnosticSeverity.Warning;
    }

    return vscode.DiagnosticSeverity.Information;
}
