import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { getProjectStructureUseCase } from '../composition/container';

const inputSchema = z.object({
    root: z
        .string()
        .optional()
        .describe('Path to the repository root. Defaults to the current working directory.'),
    maxDepth: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Maximum directory depth to traverse. 0 returns only the root. Defaults to 4.'),
});

export function registerGetProjectStructureTool(server: McpServer): void {
    server.registerTool(
        'get_project_structure',
        {
            title: 'Get project structure',
            description:
                'Return a directory tree for a software repository so an agent can understand its layout.',
            inputSchema,
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
            },
        },
        async ({ root, maxDepth }) => {
            try {
                const tree = await getProjectStructureUseCase.execute(
                    root ?? process.cwd(),
                    maxDepth ?? 4
                );

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(tree, null, 2),
                        },
                    ],
                };
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'Failed to get project structure';

                return {
                    content: [{ type: 'text', text: message }],
                    isError: true,
                };
            }
        }
    );
}
