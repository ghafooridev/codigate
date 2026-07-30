# Pod MCP Architecture Guide

## 1. Project Overview

Pod MCP is a modular AI engineering platform built around Model Context Protocol (MCP).

The goal is to build a reusable AI engineering engine that can be consumed by different clients:

* MCP Server
* VS Code Extension
* CLI
* Web Applications
* Other integrations

The core principle:

> Interfaces can change, but the core business logic should remain independent.

MCP is only one delivery mechanism, not the whole system.

---

# 2. Technology Stack

## Core Technologies

* Node.js
* TypeScript
* Nx Monorepo
* npm package manager

## Architecture Style

* Clean Architecture principles
* Separation of concerns
* Dependency inversion
* Modular monolith initially
* Ready for future extraction into services

---

# 3. Repository Structure

```
pod-mcp/

├── apps/
│   └── mcp-server/
│
├── packages/
│   ├── domain/
│   ├── application/
│   ├── core/
│   └── shared/
│
├── ARCHITECTURE.md
├── nx.json
├── package.json
└── tsconfig.base.json
```

---

# 4. Applications

Applications are executable projects.

They are entry points into the system.

They should contain:

* Startup logic
* Framework configuration
* External communication handling

They should NOT contain:

* Business rules
* AI logic
* Domain logic

---

# 5. MCP Server Application

Location:

```
apps/mcp-server
```

Responsibility:

* Start MCP server
* Register MCP tools
* Receive MCP requests
* Convert MCP requests into application commands
* Return responses

Example structure:

```
apps/mcp-server/

src/

├── main.ts
├── server.ts
└── tools/
```

Flow:

```
MCP Client

    ↓

mcp-server

    ↓

application

    ↓

core

    ↓

domain

    ↓

Response
```

---

# 6. Packages

Packages contain reusable business capabilities.

They are not applications.

---

# 6.1 Domain Package

Location:

```
packages/domain
```

Purpose:

Contains pure business concepts.

Example:

```
packages/domain/src

├── entities/
├── value-objects/
├── rules/
├── errors/
└── index.ts
```

Contains:

* Entities
* Business rules
* Domain models

Examples:

```
Agent
Tool
Capability
Prompt
Execution
```

Restrictions:

Allowed:

```
Pure TypeScript
Business logic
```

Not allowed:

```
MCP
Database
Filesystem
HTTP
LLM SDK
```

Domain must survive if MCP disappears.

---

# 6.2 Application Package

Location:

```
packages/application
```

Purpose:

Contains use cases.

Example:

```
packages/application/src

├── use-cases/
│
├── commands/
│
├── services/
│
└── index.ts
```

Examples:

```
GenerateTestUseCase

ReviewCodeUseCase

ExecuteToolUseCase
```

Responsibility:

* Coordinate domain objects
* Execute business workflows
* Define application behavior

Depends on:

```
domain
```

---

# 6.3 Core Package

Location:

```
packages/core
```

Purpose:

AI execution engine.

Example:

```
packages/core/src

├── agent/
├── pipeline/
├── registry/
├── memory/
└── index.ts
```

Responsibilities:

* Agent execution
* Tool management
* Workflow execution
* Prompt pipelines

Examples:

```
AgentEngine

ToolRegistry

ExecutionPipeline
```

---

# 6.4 Shared Package

Location:

```
packages/shared
```

Purpose:

Common utilities.

Example:

```
packages/shared/src

├── types/
├── constants/
├── errors/
├── logger/
└── utils/
```

Contains:

* Shared types
* Common helpers
* Global constants

---

# 7. Dependency Rules

The dependency direction is always:

```
mcp-server

      ↓

application

      ↓

core

      ↓

domain
```

Shared can be used everywhere:

```
shared → all packages
```

---

## Forbidden Dependencies

Wrong:

```
domain → MCP ❌

domain → database ❌

domain → filesystem ❌

core → mcp-server ❌

application → vscode ❌
```

---

# 8. Creating Projects

## Create Node Application

For executable applications:

Example:

Create MCP Server:

```bash
npx nx g @nx/node:application mcp-server
```

Result:

```
apps/mcp-server
```

---

## Create Package

For reusable libraries:

Example:

Create domain package:

```bash
npx nx g @nx/node:lib domain --directory=packages/domain
```

Create application package:

```bash
npx nx g @nx/node:lib application --directory=packages/application
```

Create core package:

```bash
npx nx g @nx/node:lib core --directory=packages/core
```

Create shared package:

```bash
npx nx g @nx/node:lib shared --directory=packages/shared
```

---

# 9. Nx Commands

## Show Projects

```bash
npx nx show projects
```

Expected:

```
mcp-server
domain
application
core
shared
```

---

## Show Project Details

Example:

```bash
npx nx show project domain
```

---

## Build Project

Example:

```bash
npx nx build domain
```

---

## Run Application

Example:

```bash
npx nx serve mcp-server
```

---

## Dependency Graph

```bash
npx nx graph
```

Used to visualize:

* Project dependencies
* Architecture boundaries

---

# 10. Adding New Features

Example:

Adding Code Review capability.

Do not add it into:

```
apps/mcp-server
```

Instead:

```
packages/

capabilities/

└── code-review
```

The MCP server only exposes it.

---

# 11. Future Expansion

## VS Code Extension

Future structure:

```
apps/

└── vscode-extension
```

It uses:

```
application

core

domain
```

No duplicated logic.

---

## CLI

Future:

```
apps/

└── cli
```

Same engine.

---

# 12. File Communication Example

Example:

User asks MCP:

"Generate tests for this file"

Flow:

```
MCP Request

↓

apps/mcp-server/tools/generate-test.ts

↓

GenerateTestUseCase

↓

core/AgentEngine

↓

ToolRegistry

↓

domain/Tool

↓

LLM Provider

↓

Response
```

---

# 13. Development Rules

Before adding code ask:

## Is this business logic?

Put in:

```
domain
```

---

## Is this a workflow/use case?

Put in:

```
application
```

---

## Is this AI execution logic?

Put in:

```
core
```

---

## Is this external communication?

Put in:

```
apps
```

or adapter layer.

---

# 14. Main Architecture Principle

The system should be built like this:

```
        MCP
         |
        CLI
         |
     VS Code
         |
         |
    Application Layer
         |
       Core
         |
      Domain
```

The entry points can change.

The core remains stable.
