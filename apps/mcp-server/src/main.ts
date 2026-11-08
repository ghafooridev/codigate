import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createServer } from './server';

void serveStdio(createServer, {
    onerror: (error) => {
        console.error(error);
    },
});

console.error('Codigate MCP server running on stdio');
