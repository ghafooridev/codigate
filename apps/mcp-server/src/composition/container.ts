import { GetProjectStructureUseCase, RegisterToolUseCase } from '@codigate/application';
import { NodeFileSystem, ToolRegistry } from '@codigate/core';

const fileSystem = new NodeFileSystem();
const registry = new ToolRegistry();

export const getProjectStructureUseCase =
    new GetProjectStructureUseCase(fileSystem);

export const registerToolUseCase =
    new RegisterToolUseCase(registry);
