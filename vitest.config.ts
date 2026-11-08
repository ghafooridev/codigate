import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@codigate/domain': path.resolve(__dirname, 'packages/domain/src/index.ts'),
            '@codigate/application': path.resolve(__dirname, 'packages/application/src/index.ts'),
            '@codigate/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
        },
    },
    test: {
        include: ['packages/**/*.spec.ts', 'apps/**/*.spec.ts'],
        environment: 'node',
    },
});
