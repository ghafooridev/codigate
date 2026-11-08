import { AiConfig } from '@codigate/domain';

export interface ResolvedAiConfig {
    apiBase: string;
    apiKey: string;
    model: string;
}

export function resolveAiConfig(input: {
    settings?: AiConfig;
    project?: AiConfig;
    env?: NodeJS.ProcessEnv;
} = {}): ResolvedAiConfig {
    const env = input.env ?? {};
    const project = input.project ?? {};

    if (input.settings) {
        return {
            apiBase: pick(input.settings.apiBase, project.apiBase, env.CODIGATE_API_BASE),
            apiKey: pick(input.settings.apiKey, project.apiKey, env.CODIGATE_API_KEY),
            model: pick(input.settings.model, project.model, env.CODIGATE_MODEL),
        };
    }

    return {
        apiBase: pick(env.CODIGATE_API_BASE, project.apiBase),
        apiKey: pick(env.CODIGATE_API_KEY, project.apiKey),
        model: pick(env.CODIGATE_MODEL, project.model),
    };
}

function pick(...values: Array<string | undefined>): string {
    for (const value of values) {
        const trimmed = value?.trim();

        if (trimmed) {
            return trimmed;
        }
    }

    return '';
}
