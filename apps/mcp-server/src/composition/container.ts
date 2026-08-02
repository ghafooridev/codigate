import { ToolRegistry } from '@codigate/core';
import { RegisterToolUseCase } from '@codigate/application';

const registry = new ToolRegistry();

export const registerToolUseCase =
    new RegisterToolUseCase(registry);