import { createServer, Server } from 'node:http';
import { connect } from 'node:net';
import { AnalysisStore } from '@codigate/application';
import { renderPanel } from './render-panel';

export interface PanelHandle {
    url: string;
    alreadyRunning: boolean;
    server?: Server;
}

export async function startAnalysisPanel(options: {
    root: string;
    port: number;
    store: AnalysisStore;
}): Promise<PanelHandle> {
    const url = `http://127.0.0.1:${options.port}`;

    if (await portOpen(options.port)) {
        return { url, alreadyRunning: true };
    }

    const server = createServer(async (request, response) => {
        try {
            const run = await options.store.latest(options.root);

            if (request.url?.startsWith('/api/run')) {
                response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
                response.end(JSON.stringify(run ?? null));
                return;
            }

            response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
            response.end(renderPanel(run));
        } catch (error) {
            response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
            response.end(error instanceof Error ? error.message : 'Panel failed');
        }
    });

    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(options.port, '127.0.0.1', () => resolve());
    });

    return { url, alreadyRunning: false, server };
}

function portOpen(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = connect(port, '127.0.0.1');
        const finish = (open: boolean) => {
            socket.removeAllListeners();
            socket.destroy();
            resolve(open);
        };

        socket.once('connect', () => finish(true));
        socket.once('error', () => finish(false));
    });
}
