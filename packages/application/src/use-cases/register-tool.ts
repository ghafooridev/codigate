import { Tool } from '@codigate/domain';
import { ToolRegistry } from '@codigate/core';

export class RegisterToolUseCase {
    constructor(
        private readonly registry: ToolRegistry
    ) { }

    execute(
        name: string,
        description: string
    ) {
        const tool = new Tool(
            name,
            description
        );

        this.registry.register(tool);
    }
}