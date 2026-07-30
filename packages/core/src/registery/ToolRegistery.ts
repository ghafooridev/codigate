import { Tool } from '@codigate/domain';

export class ToolRegistry {
    private tools: Tool[] = [];

    register(tool: Tool) {
        this.tools.push(tool);
    }

    getTools() {
        return this.tools;
    }
}