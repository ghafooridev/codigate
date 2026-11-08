export interface LlmMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LlmGateway {
    complete(messages: LlmMessage[]): Promise<string>;
}
