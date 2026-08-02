import { Tool } from '@codigate/domain';
import { ToolRepository } from '@codigate/application';

export class ToolRegistry implements ToolRepository {
    private tools: Tool[] = [];

    register(tool: Tool) {
        this.tools.push(tool);
    }

    getTools() {
        return this.tools;
    }
}