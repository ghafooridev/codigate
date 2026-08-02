import { Tool } from '@codigate/domain';

export interface ToolRepository {
    register(tool: Tool): void,
    getTools(): Tool[]
}