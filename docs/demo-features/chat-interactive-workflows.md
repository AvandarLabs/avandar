# Chat Interactive Workflows — Demo Walkthrough

Status: Phase 0/1 hardening + Phase 2 (Discovery Clarifications) + Phase 3
(Plans + DAG, foundation) — landed on branch
`claude/chat-hardening-phases-Zr4Tp`.

See the design spec at
`docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md`
for the full plan; the rolling checkpoints log is at
`docs/ict4d-demo/CHECKPOINTS.md`.

This document is a tour of what's shippable in the chat panel today.

## What landed in this branch

### Phase 0 / 1 hardening

- **ESLint chokepoint guard** (`eslint.config.js`): `issueAckToken` and
  `registerAck` can only be imported from `crossBoundary.tsx`. Adding a
  new caller — even by mistake — fails CI. The privacy spec calls
  `crossBoundary` "the single chokepoint for data crossing the LLM
  boundary"; the rule operationalises that contract.
- **Privacy log gains a "Clarifications" tab**: the existing privacy log
  page (Workspace Settings → Privacy log) now has two sub-tabs.
  - **Consent** lists consent decisions from `consentAuditLog.ts`.
  - **Clarifications** lists clarification turns from
    `clarificationAuditLog.ts` (turn number, shape, outcome,
    time-to-answer). Metadata only — never the question text or
    answer.

### Phase 2 — Discovery Clarifications

- **New `discovery` response shape** in the `clarify` tool. The LLM emits
  a short DuckDB `SELECT DISTINCT` query whose result populates a
  dropdown. The query is validated by `isReadOnlyDiscoveryQuery` on
  both client and server (`SELECT` or `WITH` only, no semicolons, ≤2000
  chars).
- **DiscoveryBody UI** in `ClarificationCard.tsx`: shows a loading
  spinner while the local DuckDB query runs, then renders the values as
  a single- or multi-select. Errors and empty result sets are surfaced
  with a "Let AI decide" fallback.
- **`crossBoundary` integration**: when the user picks values from the
  discovery dropdown, the selection routes through `crossBoundary` with
  context `discovery_clarification` and the source column. The PII
  detector runs on column name + content. The medical-strict tier
  triggers correctly if the column matches the `medical` category.

### Phase 3 — Plans + DAG (v1 list view)

- **New `proposePlan` tool** registered in the chat route. The LLM can
  emit a 2–8-step plan; each step is an SQL query with a stable id.
  Steps reference earlier ones by name (`step_<id>`).
- **`PlanStateManager`** (`src/components/ChatPanel/PlanStateManager/`)
  owns the runtime state of the plan: per-node status (pending /
  running / succeeded / failed / skipped), schema, row counts, errors.
- **`planExecutor.ts`** runs each step sequentially in DuckDB-WASM,
  materialising the output as a temp view named `step_<id>`. Failures
  short-circuit the remaining steps. `dropPlanTempViews` cleans up.
- **`PlanFlowView`** (`src/components/ChatPanel/PlanFlowView/`) is the
  list-based DAG view. Each step is a collapsible card with status
  badge, SQL preview, schema, row count, and an "Open on canvas"
  button that pushes the step's view back into the Data Explorer
  canvas. Auto-runs on first render, with a "Re-run all" / "Close
  plan" toolbar.

The visual xyflow DAG is deferred: the data model is identical, so the
swap is straightforward when `@xyflow/react` is added.

## File layout

```
src/components/ChatPanel/
  PlanStateManager/
    PlanStateManager.tsx       # state shape, actions
    planExecutor.ts            # DuckDB-WASM step runner + cleanup
  PlanFlowView/
    PlanFlowView.tsx           # list-based DAG renderer
  ClarificationCard/
    ClarificationCard.tsx      # +DiscoveryBody for Phase 2
  PendingClarificationBlock/
    PendingClarificationBlock.tsx  # +resolveDiscovery + crossBoundary
  useAvandarChatRuntime.ts     # +plan dispatch, currentPlanNodes ref

src/lib/privacy/
  discoveryQuery.ts            # client-side validator
  discoveryQuery.test.ts       # 11 unit tests

supabase/functions/
  _shared/privacy/
    discoveryQuery.ts          # server-side mirror of the validator
  chat/
    chat.routes.ts             # +discovery / +proposePlan tools,
                               # system prompt updates

shared/types/
  chat.types.ts                # +ChatPlan, +ChatPlanStep,
                               # +discovery response shape

eslint.config.js               # crossBoundary chokepoint guard

src/views/WorkspaceSettingsPage/PrivacyLogTab/
  PrivacyLogTab.tsx            # +Tabs (Consent / Clarifications)

tests/e2e/
  chat-interactive-workflows.spec.ts  # mocked-AI Playwright tests
```

## Running the demo

1. `pnpm install`
2. `pnpm db:reset` — seeds local Supabase + DB.
3. `dotenv -e .env.development -- pnpm dev`
4. Sign in as `user@avandarlabs.com` / `avandar`.
5. Import a CSV (e.g. the California COVID fixture in
   `tests/e2e/fixtures/`).
6. Open the chat panel from the right-side toggle.

### Verifying Phase 1 (clarification)

Ask an ambiguous question like *"show me the best regions"*. The chat
will show a `ClarificationCard` above the composer asking what "best"
means, with either free-text or fixed options. Submitting falls through
to `generateSql`.

### Verifying Phase 2 (discovery)

Ask *"show me cases for the most-recent indicators"* or *"filter to
poverty-related indicators"*. The model can emit a `discovery` shape
clarification with a `SELECT DISTINCT "indicator" ...` query. The
dropdown is populated client-side; pick one or more values, the
selection routes through the consent modal (clean mode), and the
follow-up turn answers using the chosen value(s).

### Verifying Phase 3 (plans)

Ask *"break this into 3 steps: filter to confirmed cases, aggregate by
date, then plot"*. The model emits a `proposePlan` tool call; the
Data Explorer renders the `PlanFlowView` above the canvas with one card
per step. Each step auto-runs in DuckDB-WASM; clicking "Open on canvas"
loads the step's result into the existing visualization.

## Screenshots

Captured during the manual Playwright walkthrough:

- `screenshots/chat-discovery-dropdown.png` — discovery clarification
  resolves a list of values from DuckDB and renders them as radios.
- `screenshots/chat-plan-flow.png` — multi-step plan with two succeeded
  steps and the "Open on canvas" CTA on the second one.
- `screenshots/privacy-log-clarifications-tab.png` — new
  "Clarifications" sub-tab on the Privacy log page.

## Known limits (deferred to follow-up sessions)

- **xyflow DAG view** — the visual DAG is replaced by a vertical card
  list. The state model is xyflow-ready.
- **Schema-drift regen** (Phase 4) — drift is detectable from
  `actualSchema` vs `predictedSchema`, but auto-regen of downstream
  steps is not yet implemented.
- **Branching** (Phase 5) and **Python/R executor** (Phase 6) — not
  started.
- **Eval set** — the spec's 20-question eval harness isn't wired yet.
- **Server-side ack-token nonce registry** — replay protection is still
  in-process; multi-instance edge deployments need Redis/Supabase
  storage.
- **Spanish / French bias patterns** — still stubs pending social-
  sector advisor review.
