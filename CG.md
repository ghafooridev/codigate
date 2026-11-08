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
codigate/

├── apps/
│   ├── cli/
│   ├── vscode-extension/
│   └── mcp-server/
│
├── packages/
│   ├── domain/
│   ├── application/
│   ├── core/
│   └── shared/
│
├── .codigate/
│   ├── config.yml
│   └── rules/
│
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

# 11. Product surfaces

CLI, VS Code, and the local panel all call the same engine in `packages/core`. They do not keep their own analysis rules.

```
apps/cli
apps/vscode-extension
apps/mcp-server
```

`scan` is the fast static pass. `analyze` is the full on-demand pipeline: rules, package audit, coverage, optional test writing, scores, and the panel.

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

---

# 15. How to run

Install dependencies once from the repository root:

```bash
npm ci
```

Build the CLI, then run it from the project you want to analyze:

```bash
npx nx build cli
node apps/cli/dist/main.js scan
node apps/cli/dist/main.js analyze
```

`npm run codigate` is the same binary (`node apps/cli/dist/main.js`). `scan` and `gate` stay local and do not call npm, GitLab, or a model. `analyze` is the full report.

## Scripts

From `package.json`:

```bash
npm run build          # build every project
npm run codigate       # CLI entry, after the CLI build
npm run test           # vitest
npm run build:server   # MCP server only
npm start              # run the MCP server
```

## CLI commands

Run these in the root of the repository you want to inspect. Pass a path when that root is not the current directory.

```bash
node apps/cli/dist/main.js scan [path] [--gate] [--diff]
node apps/cli/dist/main.js analyze [path|gitlab-url]
node apps/cli/dist/main.js panel [path]
node apps/cli/dist/main.js gate [path]
node apps/cli/dist/main.js findings [path]
node apps/cli/dist/main.js fix [findingId] [--apply]
node apps/cli/dist/main.js generate-tests <file> [--apply]
node apps/cli/dist/main.js test [path]
node apps/cli/dist/main.js pr [--review] [pullNumber]
```

What each one does:

* `scan` runs built-in and custom rules, scores the tree, and writes `.codigate/history.jsonl`. `--diff` limits the scan to files changed since `HEAD~1`. `--gate` fails the process when the quality gate fails.
* `analyze` runs the same rules, then `npm audit`, `npm outdated`, and test coverage. If unit, component, or integration coverage is under the threshold and an AI endpoint is configured, it writes tests and measures again, up to 3 rounds. It prints scores out of 100, issues with suggestions, coverage, and the package list, then opens the panel when the port is free.
* `panel` serves the latest saved run and stays running.
* `gate` scans and exits non-zero when a gate limit fails.
* `findings` prints each issue with file, severity, message, and suggestion.
* `fix` asks the configured AI endpoint for a patch. `--apply` writes it.
* `generate-tests` drafts a test for one file. `--apply` writes it and runs the suite.
* `test` runs the project's `npm test` script.
* `pr` opens or reviews a GitHub pull request. GitLab analysis does not use this command.

Analyze a GitLab project (public, or private with `GITLAB_TOKEN`):

```bash
export GITLAB_TOKEN=glpat-...
node apps/cli/dist/main.js analyze https://gitlab.com/group/project
```

The checkout is a shallow clone under `.codigate/cache`. A host is treated as GitLab when the hostname contains `gitlab`, including self-hosted hosts such as `gitlab.example.com`. GitHub remotes stay on the `pr` command.

After a fix, run `analyze` or **Codigate: Analyze** again. Each run is stored, and the report shows the previous overall score when one exists.

## VS Code

```bash
npx nx build vscode-extension
```

Install the extension from `apps/vscode-extension`, then open a folder. Commands:

* **Codigate: Scan Workspace** — static scores and findings in the Codigate sidebar and inline diagnostics.
* **Codigate: Analyze** — the same pipeline as `codigate analyze`, then opens the panel.
* **Codigate: Open Panel** — opens the latest run in the browser.
* **Codigate: Fix Finding** — proposes a patch for the selected finding.

Each finding tooltip includes the suggested fix.

Pair a model under Settings, search for Codigate. A non-empty value overrides `.codigate/config.yml`. An empty value falls through to the project file, then to `CODIGATE_API_BASE`, `CODIGATE_API_KEY`, and `CODIGATE_MODEL`.

* `codigate.ai.apiBase` — base URL, including `/v1`
* `codigate.ai.apiKey` — bearer token
* `codigate.ai.model` — model name sent in the request

## Local panel

Default address: `http://127.0.0.1:4318`

`analyze` starts it when that port is free. `panel` starts it and keeps the process alive. Reload the page after another analyze; the page reads the latest line of `.codigate/history.jsonl`.

The page shows overall, security, quality, SEO, performance, and testing out of 100, the three coverage numbers, package findings, and issues with fixes.

## AI endpoint

Codigate does not run a local model. Review, fix, and test generation call whatever OpenAI-compatible chat API you pair. `scan` and `gate` never call it. `analyze` still finishes when the API is unset: it reports the coverage gap and does not write tests. `fix`, `generate-tests`, and the coverage-repair loop need all three of base URL, API key, and model.

The client sends this request. `apiBase` already includes `/v1`; Codigate appends `/chat/completions`.

```bash
curl --request POST \
  --url https://aifa-chatbot.dev.dotin.ir/v1/chat/completions \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --data '{
  "model": "assistance-model",
  "messages": [
    { "role": "user", "content": "create a while loop in python" }
  ]
}'
```

The live call also sends `"temperature": 0.1`. Roles are `system`, `user`, and `assistant`.

How a value is chosen:

* CLI: `CODIGATE_API_BASE`, `CODIGATE_API_KEY`, and `CODIGATE_MODEL` win over `ai` in `.codigate/config.yml` in the directory where the command runs. A GitLab clone does not replace the operator key. If the checkout has no `ai` block, the cwd file and the environment are used.
* VS Code: `codigate.ai.apiBase`, `codigate.ai.apiKey`, and `codigate.ai.model` win when they are non-empty. Otherwise the project `ai` block is used, then the same environment variables.

Leave `apiKey` empty in the committed YAML and export the key in the shell:

```bash
export CODIGATE_API_KEY=YOUR_API_KEY
node apps/cli/dist/main.js analyze
```

The project file can still hold the address and model name:

```yaml
ai:
  apiBase: https://aifa-chatbot.dev.dotin.ir/v1
  apiKey: ""
  model: assistance-model
```

To point the CLI at a different gateway without editing the file:

```bash
export CODIGATE_API_BASE=https://example.com/v1
export CODIGATE_API_KEY=YOUR_API_KEY
export CODIGATE_MODEL=your-model
```

## Scores

Every score is 0–100. One high finding costs 20 points, medium 8, low 3, info 0.

* Security includes security rules and dependency findings.
* Quality includes code smells, architecture, and convention hits.
* Performance includes static web-vital checks.
* SEO is its own score.
* Testing drops when tests are missing or measured coverage is low. Unmeasured coverage is shown as not measured, not as 100.

Overall is `security 30% + quality 25% + testing 20% + performance 15% + SEO 10%`.

## Settings

Project settings live in `.codigate/config.yml`. The loader also accepts `.codigate/config.yaml` and `codigate.yml`. Unknown severities are rejected. Allowed values are `high`, `medium`, `low`, and `info`.

```yaml
conventions:
  architecture: Clean Architecture
  naming:
    components: PascalCase
    functions: camelCase
  react: Server Components by default
  api: React Query only
  state: Zustand only for client state
  backend: Repository pattern
  testing: Vitest
  security: No secrets in source

panel:
  port: 4318

coverage:
  threshold: 80
  # optional globs; omit them to use the built-in split
  # unitGlobs:
  #   - "**/*.{spec,test}.{ts,tsx,js,jsx}"
  # componentGlobs:
  #   - "**/*component*.{spec,test}.{ts,tsx,js,jsx}"
  # integrationGlobs:
  #   - "**/*integration*.{spec,test}.{ts,tsx,js,jsx}"
  #   - "**/integration/**"

gitlab:
  cacheDir: .codigate/cache

ai:
  apiBase: https://aifa-chatbot.dev.dotin.ir/v1
  apiKey: ""
  model: assistance-model

rules:
  sec.secret.aws-access-key:
    enabled: true
    severity: high
  seo.missing-meta-description:
    enabled: false
    severity: medium

gate:
  securityMin: 80
  qualityMin: 80
  architectureMin: 80
  testingMin: 50
  seoMin: 70
  overallMin: 75
  highMax: 5
  testsMin: 50
  # criticalMax is a legacy alias and caps high findings
```

`rules.<id>.enabled: false` removes that check before the scan. `severity` replaces the built-in level for that id.

`coverage.threshold` defaults to 80. Kinds are unit, component, and integration. Component coverage follows TSX/JSX and `*.component.*` sources. Integration coverage follows an `integration` path. Everything else that is source is unit. Test files are not counted as source.

`gate` is what `scan --gate` and `gate` enforce. `testsMin` is the average of the measured coverage numbers. `highMax` is the maximum number of high findings. An old `criticalMax` still applies as a cap on high findings.

## Custom rules

Add a YAML file under `.codigate/rules/`. One object, or a list, per file. Same shape as `.codigate/rules/no-direct-axios.yml`:

```yaml
id: custom.no-direct-axios
category: conventions
severity: high
title: Use ApiClient instead of Axios
message: Direct Axios usage is not allowed; use ApiClient
glob:
  - "**/*.{ts,tsx,js,jsx}"
pattern: "\\bfrom\\s+['\"]axios['\"]|\\baxios\\."
suggestion: Route HTTP through ApiClient.
```

`category` is one of `security`, `quality`, `architecture`, `testing`, `performance`, `conventions`, `seo`, `dependencies`.

Built-in ids you can enable, disable, or re-severity:

* Security: `sec.secret.aws-access-key`, `sec.secret.private-key`, `sec.secret.generic-token`, `sec.secret.jwt`, `sec.eval`, `sec.inner-html`, `sec.child-process`, `sec.shell-interpolation`, `sec.disable-tls`, `sec.sql-concat`, `sec.math-random`, `sec.cors-wildcard`, `sec.http-asset`, `sec.hash-password`
* Quality: `qual.any-type`, `qual.empty-catch`, `qual.console-log`, `qual.todo`, `qual.long-function`, `qual.deep-nesting`
* Structure: `arch.direct-db`, `arch.axios-in-ui`
* Performance and web vitals: `perf.nested-loop`, `perf.img-dimensions`, `perf.render-blocking-script`, `perf.font-display`, `perf.missing-viewport`
* SEO, on HTML and layout files: `seo.missing-title`, `seo.missing-meta-description`, `seo.missing-canonical`, `seo.missing-lang`, `seo.missing-h1`, `seo.multiple-h1`, `seo.image-alt`, `seo.missing-og-title`, `seo.missing-og-description`
* Tests: `test.skipped`

Convention rules are added only when `.codigate/config.yml` `conventions` text mentions them: repository pattern, React Query, Zustand, PascalCase components, and no secrets.

## Environment

```bash
export CODIGATE_API_BASE=https://aifa-chatbot.dev.dotin.ir/v1
export CODIGATE_API_KEY=YOUR_API_KEY
export CODIGATE_MODEL=assistance-model
export GITLAB_TOKEN=...    # private GitLab clones only
export GITHUB_TOKEN=...    # codigate pr only
```

`CODIGATE_API_*` overrides the `ai` block on the CLI. In VS Code, a non-empty Codigate setting overrides both the file and these variables.

`.codigate/cache`, `.codigate/coverage-report`, and `.codigate/history.jsonl` are gitignored.

## What analyze does not do

Pattern checks are not a compiler taint engine. Web vitals are static proxies, not a Lighthouse run. Coverage repair runs only when the repo has an npm test script and the AI base URL, API key, and model are set. Package audit is npm only. A non-Node repo gets an info finding that the audit was skipped.
