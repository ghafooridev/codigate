import { McpServer } from '@modelcontextprotocol/server';
import { registerGetProjectStructureTool } from './tools/get-project-structure';
import { registerScanProjectTool } from './tools/scan-project';
import { registerReadFileTool } from './tools/read-file';
import { createEngine } from '@codigate/core';

export function createServer(): McpServer {
    const server = new McpServer({
        name: 'codigate',
        version: '0.0.1',
    });
    const engine = createEngine();

    registerGetProjectStructureTool(server);
    registerScanProjectTool(server, engine);
    registerReadFileTool(server, engine);

    return server;
}
