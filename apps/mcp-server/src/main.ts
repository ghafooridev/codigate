import { ToolRegistry } from '@codigate/core';
import { Tool } from '@codigate/domain';


const registry = new ToolRegistry();

const tool = new Tool(
    'count-character',
    'Count characters of text'
);

registry.register(tool);

console.log(registry.getTools());