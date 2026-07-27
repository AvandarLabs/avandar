# GROUP 3: AI chat panel (Core UX, privacy, and clarification)

- **Group**: 3 of 5 (18 features)
- **Refactor branch**: `refactor-g3/ai-chat-panel`
- **Migration strategy**: one PR for the whole group
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Base**: current `origin/develop` after Group 2
- **Depends on**:
  - Group 1 for the chat edge function and shared chat types
  - Group 2 for Data Explorer SQL application and DataViz block generation

## Scope

Group 3 ports the AI chat panel's core experience, privacy controls, and
interactive clarification flow. The migrated chat must continue to generate
SQL, recover fenced SQL when the model omits a tool call, add dashboard blocks,
work with the offline model path, and enforce privacy consent.

The retired multi-action workflow capability is not part of this group. Do not
port its tools, UI, persistence, data model, browser executor, or export code.

## Constituent rows

### Core UX

| # | Slug | One-liner |
|---|------|-----------|
| 15 | `chat-disabled-visual-feedback` | Dim and disable the composer where chat is unavailable |
| 16 | `chat-context-memo-fix` | Stabilize `useChatPageContext` with `useMemo` |
| 17 | `chat-empty-state-improvements` | Improve suggested prompts, i18n, and typography |
| 18 | `chat-try-again-and-retry-on-empty` | Add per-turn retry and one automatic retry for an empty response |
| 19 | `chat-recover-sql-without-tool-call` | Recover fenced SQL and synthesize a `generateSql` result |
| 20 | `chat-multi-dataset-clarification` | Ask which dataset should be queried when context is ambiguous |
| 21 | `chat-better-pblock-generation` | Improve chart heuristics and generated DataViz blocks |

### Privacy guardrails

| # | Slug | One-liner |
|---|------|-----------|
| 22 | `privacy-pii-detector` | Detect likely PII before data crosses the model boundary |
| 23 | `privacy-bias-detector` | Detect potentially biased requests and responses |
| 24 | `privacy-consent-modal` | Ask for consent before exposing protected data |
| 25 | `privacy-crossboundary-hmac` | Route protected transfers through an HMAC-acknowledged chokepoint |
| 26 | `privacy-audit-log-page` | Persist consent events locally and show them in settings |
| 27 | `privacy-discovery-spanish-french-stubs` | Add translated detector patterns and consent copy |
| 28 | `privacy-isrowdatamessage-helper` | Detect row-shaped data on the server |

### Clarification workflows

| # | Slug | One-liner |
|---|------|-----------|
| 29 | `chat-clarify-tool` | Add the `clarify` tool with a three-round cap |
| 30 | `chat-clarification-card-and-bias-check` | Render clarification variants and run bidirectional bias checks |
| 31 | `chat-clarification-telemetry` | Store clarification audit events in Dexie |
| 32 | `chat-discovery-clarifications` | Resolve distinct values locally and return the selected answer safely |

## Preserved invariants

- `generateSql` remains registered for online chat.
- `clarify` remains registered until the three-round cap is reached.
- Fenced SQL recovery still returns a generated SQL response.
- Dashboard block requests still reach the DataViz block generator.
- Offline chat continues to use the local model catalog and SQL prompt.
- PII detection, consent, cross-boundary acknowledgement, and privacy audits
  remain mandatory.
- Clarification answers continue to pass through the privacy boundary.
- Generated Lingui catalogs remain generated artifacts.

## Source map

### Chat surface

- `src/components/ChatPanel/`
- `src/hooks/chat/`
- `src/views/DataExplorerApp/DataExplorerApp.tsx`
- `src/components/sql/`

### Privacy and clarification

- `src/components/Privacy/`
- `src/lib/privacy/`
- `src/db/dexie/`
- `src/views/WorkspaceSettingsPage/PrivacyLogTab/`

### Server and shared contracts

- `supabase/functions/chat/`
- `supabase/functions/_shared/privacy/`
- `shared/models/chat/`
- `shared/types/chat.types.ts`

### Tests

- `tests/e2e/chat-interactive-workflows.spec.ts`
- Chat runtime and response-mapper unit tests
- Privacy detector, consent, and audit tests
- Edge-function prompt, tool, clarification, and SQL pipeline tests

## Migration order

1. Port rows 15 through 21 and verify ordinary chat plus SQL generation.
2. Port rows 22 through 28 and verify privacy consent and audit behavior.
3. Port rows 29 through 32 and verify fixed-option, custom, and discovery
   clarification responses.
4. Reconcile shared hotspot files instead of replacing them wholesale:
   `useAvandarChatRuntime.ts`, `Composer.tsx`, `buildSqlSystemPrompt.ts`, and
   `chat.routes.ts`.
5. Regenerate Lingui catalogs, then run the targeted verification suite.

## Verification

Run at minimum:

```bash
pnpm typecheck
pnpm lint
pnpm i18n:check
pnpm vitest run \
  src/components/ChatPanel \
  src/components/Privacy \
  src/lib/privacy \
  supabase/functions/chat
```

Run the clarification end-to-end scenarios one at a time:

```bash
pnpm test:e2e tests/e2e/chat-interactive-workflows.spec.ts \
  --grep "fixed-options clarification appears inline"

pnpm test:e2e tests/e2e/chat-interactive-workflows.spec.ts \
  --grep "fixed-options clarification accepts a custom"
```

Before opening the group PR, manually smoke-test:

1. Ordinary chat response rendering
2. SQL generation and application in Data Explorer
3. PII consent and privacy audit logging
4. Clarification submission
5. Dashboard block generation
6. Offline chat
