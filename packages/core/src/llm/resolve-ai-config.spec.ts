import { describe, expect, it } from 'vitest';
import { resolveAiConfig } from './resolve-ai-config';

describe('resolveAiConfig', () => {
    const project = {
        apiBase: 'https://project.example/v1',
        apiKey: 'project-key',
        model: 'project-model',
    };

    it('lets environment variables override the project file on the CLI', () => {
        const resolved = resolveAiConfig({
            project,
            env: {
                CODIGATE_API_BASE: 'https://env.example/v1',
                CODIGATE_API_KEY: 'env-key',
                CODIGATE_MODEL: 'env-model',
            },
        });

        expect(resolved).toEqual({
            apiBase: 'https://env.example/v1',
            apiKey: 'env-key',
            model: 'env-model',
        });
    });

    it('lets VS Code settings override the project file, then the project file, then env', () => {
        const resolved = resolveAiConfig({
            settings: { apiBase: 'https://settings.example/v1', apiKey: '', model: '' },
            project: { apiBase: project.apiBase, apiKey: project.apiKey },
            env: { CODIGATE_MODEL: 'env-model' },
        });

        expect(resolved).toEqual({
            apiBase: 'https://settings.example/v1',
            apiKey: 'project-key',
            model: 'env-model',
        });
    });
});
