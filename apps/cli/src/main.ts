#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { createEngine, NodeFileSystem, resolveAiConfig, startAnalysisPanel, YamlProjectConfigLoader } from '@codigate/core';
import { isGitlabRemote } from '@codigate/application';
import { renderFinding, renderGate, renderScanReport } from './report';

async function main(): Promise<void> {
    const [command = 'scan', ...rest] = process.argv.slice(2);
    const flags = new Set(rest.filter((arg) => arg.startsWith('--')));
    const rawPositionals = rest.filter((arg) => !arg.startsWith('-'));
    const { root, args } = splitRoot(rawPositionals);
    const resolvedRoot = await new NodeFileSystem().findProjectRoot(root);
    const project = await new YamlProjectConfigLoader().load(resolvedRoot);
    const engine = createEngine(resolveAiConfig({
        project: project.ai,
        env: process.env,
    }));

    switch (command) {
        case 'scan': {
            const run = await engine.analyzeProject.execute({
                root: resolvedRoot,
                changedFilesOnly: flags.has('--diff'),
            });
            console.log(renderScanReport(run));

            if (flags.has('--gate')) {
                failIfGate(engine, resolvedRoot, run);
            }

            break;
        }
        case 'analyze': {
            const gitlabArg = args.find((arg) => isGitlabRemote(arg));
            const workspaceConfig = await engine.configLoader.load(resolvedRoot);
            const root = gitlabArg
                ? await engine.gitlab.resolve(
                    gitlabArg,
                    resolvedRoot,
                    workspaceConfig.gitlab?.cacheDir ?? '.codigate/cache'
                )
                : resolvedRoot;
            const run = await engine.analyzeOnDemand.execute(root);
            const config = await engine.configLoader.load(root);
            console.log(renderScanReport(run));
            ensurePanel(root, config.panel?.port ?? workspaceConfig.panel?.port ?? 4318);
            break;
        }
        case 'panel': {
            const config = await engine.configLoader.load(resolvedRoot);
            const port = config.panel?.port ?? 4318;
            const panel = await startAnalysisPanel({
                root: resolvedRoot,
                port,
                store: engine.store,
            });
            console.log(panel.alreadyRunning
                ? `Panel already available at ${panel.url}`
                : `Panel ${panel.url}`);

            if (!panel.alreadyRunning) {
                await new Promise(() => undefined);
            }

            break;
        }
        case 'gate': {
            const run = await engine.analyzeProject.execute({ root: resolvedRoot });
            console.log(renderScanReport(run));
            await failIfGate(engine, resolvedRoot, run);
            break;
        }
        case 'fix': {
            const findingId = args[0];
            const run = await engine.analyzeProject.execute({ root: resolvedRoot });
            const finding = run.findings.find((item) => item.id === findingId)
                ?? run.findings[0];

            if (!finding) {
                throw new Error('No finding to fix.');
            }

            const proposed = await engine.proposeFix.execute({
                root: resolvedRoot,
                finding,
            });
            console.log(proposed.diff);

            if (flags.has('--apply')) {
                await engine.applyPatch.execute({
                    root: resolvedRoot,
                    filePath: proposed.filePath,
                    content: proposed.updated,
                });
                console.log(`Applied ${proposed.filePath}`);
            }

            break;
        }
        case 'generate-tests': {
            const target = args[0];

            if (!target) {
                throw new Error('Usage: codigate generate-tests <file>');
            }

            const result = await engine.validateTests.execute({
                root: resolvedRoot,
                targetPath: target,
                apply: flags.has('--apply'),
            });
            console.log(result.testPath);
            console.log(result.output);
            console.log(result.passed ? 'Tests passed' : 'Tests did not pass');

            if (!result.passed) {
                process.exitCode = 1;
            }

            break;
        }
        case 'test': {
            const result = await engine.runTests.execute(resolvedRoot);
            console.log(result.output);
            process.exitCode = result.passed ? 0 : 1;
            break;
        }
        case 'pr': {
            const run = await engine.analyzeWithAi.execute(resolvedRoot);

            if (flags.has('--review')) {
                const pullNumber = Number(args[0]);
                const config = await engine.configLoader.load(resolvedRoot);
                const gate = engine.evaluateGate.execute(
                    run,
                    config.gate ?? { highMax: 0, securityMin: 80 }
                );
                await engine.reviewPullRequest.execute({
                    root: resolvedRoot,
                    run,
                    pullNumber,
                    blocked: !gate.passed,
                });
                console.log(renderGate(gate));
                break;
            }

            const created = await engine.createPullRequest.execute({
                root: resolvedRoot,
                run,
            });
            console.log(created.url);
            break;
        }
        case 'findings': {
            const run = await engine.analyzeProject.execute({ root: resolvedRoot });
            console.log(run.findings.map(renderFinding).join('\n\n'));
            break;
        }
        default:
            console.error(`Unknown command: ${command}

Usage:
  codigate scan [path] [--gate] [--diff]
  codigate analyze [path|gitlab-url]
  codigate panel [path]
  codigate gate [path]
  codigate findings [path]
  codigate fix [findingId] [--apply]
  codigate generate-tests <file> [--apply]
  codigate test [path]
  codigate pr [--review] [pullNumber]
`);
            process.exitCode = 1;
    }
}

async function failIfGate(
    engine: ReturnType<typeof createEngine>,
    root: string,
    run: Awaited<ReturnType<typeof engine.analyzeProject.execute>>
): Promise<void> {
    const config = await engine.configLoader.load(root);
    const gate = engine.evaluateGate.execute(run, config.gate ?? {
        securityMin: 80,
        highMax: 5,
        overallMin: 75,
    });
    console.log(`\n${renderGate(gate)}`);

    if (!gate.passed) {
        process.exitCode = 1;
    }
}

function ensurePanel(root: string, port: number): void {
    const child = spawn(process.execPath, [process.argv[1], 'panel', root], {
        detached: true,
        stdio: 'ignore',
    });
    child.unref();
    console.log(`\nPanel: http://127.0.0.1:${port}`);
}

function splitRoot(positionals: string[]): { root: string; args: string[] } {
    const first = positionals[0];

    if (first && existsSync(first) && statSync(first).isDirectory()) {
        return { root: first, args: positionals.slice(1) };
    }

    return { root: process.cwd(), args: positionals };
}

void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
});
