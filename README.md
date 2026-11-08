# Codigate

AI-powered software analysis for repositories: static rules, scores, optional OpenAI-compatible review, CLI, VS Code, and MCP.

## CLI

```bash
npx nx build cli
node apps/cli/dist/main.js scan
node apps/cli/dist/main.js analyze
node apps/cli/dist/main.js gate
```

## VS Code

Build the extension, then use **Codigate: Scan Workspace**. Findings appear inline and in the Codigate sidebar.

## MCP

```bash
npx nx build mcp-server
npx @modelcontextprotocol/inspector node apps/mcp-server/dist/main.js
```

## AI endpoint

Set these in the environment, or under `ai` in `.codigate/config.yml`. In VS Code, use `codigate.ai.apiBase`, `codigate.ai.apiKey`, and `codigate.ai.model`.

```bash
export CODIGATE_API_BASE=https://example.com/v1
export CODIGATE_API_KEY=your-key
export CODIGATE_MODEL=assistance-model
```

Static `scan` and `gate` work without an API key. `analyze` still reports coverage gaps. `fix` and test generation need the three values. The client posts to `{apiBase}/chat/completions` with a bearer token.

## Config

See `.codigate/config.yml` and `.codigate/rules/`.
