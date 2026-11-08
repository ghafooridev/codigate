import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { CodigateEngine } from '@codigate/core';

export function registerScanProjectTool(server: McpServer, engine: CodigateEngine): void {
    server.registerTool(
        'scan_project',
        {
            title: 'Scan project',
            description: 'Run Codigate static analysis and return scores and findings.',
            inputSchema: z.object({
                root: z.string().optional().describe('Project root. Defaults to cwd.'),
            }),
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
            },
        },
        async ({ root }) => {
            try {
                const run = await engine.analyzeProject.execute({
                    root: root ?? process.cwd(),
                });

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                scores: run.scores,
                                counts: run.counts,
                                findings: run.findings.slice(0, 100),
                                missingTests: run.missingTests,
                            }, null, 2),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{
                        type: 'text',
                        text: error instanceof Error ? error.message : 'Scan failed',
                    }],
                    isError: true,
                };
            }
        }
    );
}
