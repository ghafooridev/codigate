import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { CodigateEngine } from '@codigate/core';

export function registerReadFileTool(server: McpServer, engine: CodigateEngine): void {
    server.registerTool(
        'read_file',
        {
            title: 'Read file',
            description: 'Read a file inside the project root.',
            inputSchema: z.object({
                root: z.string().optional(),
                path: z.string().describe('File path relative to the project root'),
            }),
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
            },
        },
        async ({ root, path }) => {
            try {
                const resolved = await engine.fileSystem.findProjectRoot(root ?? process.cwd());
                const content = await engine.fileSystem.readFile(resolved, path);

                return {
                    content: [{ type: 'text', text: content }],
                };
            } catch (error) {
                return {
                    content: [{
                        type: 'text',
                        text: error instanceof Error ? error.message : 'Read failed',
                    }],
                    isError: true,
                };
            }
        }
    );
}
