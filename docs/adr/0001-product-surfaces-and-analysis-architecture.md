# ADR 0001: Product surfaces and analysis architecture

## Status

Accepted

## Context

Codigate started as an MCP stdio server with a repository tree tool. The MVP product is an analysis platform: static rules plus optional review through an OpenAI-compatible chat endpoint, consumed daily through CLI and VS Code, with CI quality gates.

## Decision

- CLI and VS Code are the primary product surfaces.
- MCP remains a thin adapter over the same application use cases for AI agents.
- Static `RuleEngine` findings are the source of truth. An OpenAI-compatible chat endpoint (`CODIGATE_API_BASE`, `CODIGATE_API_KEY`, `CODIGATE_MODEL`, or the `ai` config block) is an optional enhancement, never a replacement for rules.
- Adapters (filesystem, git, LLM, GitHub, test runner, analysis store) live in `packages/core` and implement application ports.
- Analysis history is stored locally at `.codigate/history.jsonl`.

## Consequences

Business logic stays out of MCP/VS Code/CLI entrypoints. Local analysis works without an AI API key. GitHub is the only git host in MVP.
