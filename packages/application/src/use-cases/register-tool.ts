import { Tool } from '@codigate/domain';
import { ToolRepository } from '../ports/tool-repository';

export class RegisterToolUseCase {
    constructor(
        private readonly registry: ToolRepository
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