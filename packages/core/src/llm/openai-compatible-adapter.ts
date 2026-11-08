import { LlmGateway, LlmMessage } from '@codigate/application';
import { ResolvedAiConfig } from './resolve-ai-config';

export class OpenAiCompatibleAdapter implements LlmGateway {
    constructor(private readonly config: ResolvedAiConfig) { }

    async complete(messages: LlmMessage[]): Promise<string> {
        if (!this.isConfigured()) {
            throw new Error('AI is not configured. Set the API base URL, API key, and model.');
        }

        const response = await fetch(`${this.config.apiBase.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: {
                authorization: `Bearer ${this.config.apiKey}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: this.config.model,
                messages,
                temperature: 0.1,
            }),
        });

        if (!response.ok) {
            throw new Error(`AI request failed: HTTP ${response.status}`);
        }

        const payload = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
        };

        return payload.choices?.[0]?.message?.content ?? '';
    }

    async available(): Promise<boolean> {
        return this.isConfigured();
    }

    private isConfigured(): boolean {
        return Boolean(
            this.config.apiBase.trim()
            && this.config.apiKey.trim()
            && this.config.model.trim()
        );
    }
}
