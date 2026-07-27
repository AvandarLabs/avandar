# Remove Chat Planning Design

## Summary

Remove the Avandar AI chat panel's multi-step planning feature in full. The
chat panel will continue to support one-shot SQL generation, clarification
questions, privacy consent and audits, PII exposure approval, dashboard block
generation, retries, and offline chat.

Planning data does not need to be preserved. The Supabase column and local
IndexedDB databases that store planning data will be deleted without
conversion.

## Goals

- Remove the `proposePlan` model tool and all plan-specific API contracts.
- Remove the plan canvas, approval flow, execution, branching, annotations,
  export, schema-drift regeneration, and Python sandbox.
- Remove plan persistence from Supabase and virtual dataset models.
- Delete the two plan-specific IndexedDB databases.
- Remove planning-only dependencies, translations, tests, and documentation.
- Preserve all non-planning chat behavior.

## Non-Goals

- Do not redesign or replace planning.
- Do not migrate or preserve existing plan data.
- Do not change clarification, privacy, dashboard chat, or SQL-generation
  behavior.
- Do not refactor unrelated chat or data-explorer code.
- Do not touch the Supabase production database. This change only updates
  declarative schema and migration files in the repository and verifies them
  against local development infrastructure.

## Removal Strategy

Use a surgical vertical excision instead of reverting broad historical
commits. Planning was added alongside chat functionality that must remain, so
each planning seam will be removed while preserving adjacent behavior.

### Chat API and shared types

- Remove `ChatPlan`, `ChatPlanStep`, schema-drift, and regenerated-step types.
- Remove `ChatResponse.plan` and `ChatRetryContext.priorPlanRootMessage`.
- Remove the `proposePlan` tool, prompt instructions, parsing, fallback text,
  and terminal-tool handling from the chat route.
- Remove the `/:workspaceId/regenerate-plan` endpoint and its API definition.
- Keep `generateSql`, `clarify`, `addDashboardBlock`, retries, consent
  acknowledgements, and session-secret behavior unchanged.

### Frontend runtime and UI

- Delete `PlanStateManager`, `PlanBranchStateManager`, `PlanFlowView`, and all
  supporting plan execution, storage, layout, annotation, and export modules.
- Remove the plan providers from `ChatPanelProvider`.
- Remove plan dispatch and cleanup behavior from `useAvandarChatRuntime` and
  `applyChatTurnResponse`.
- Remove plan rendering and plan snapshots from Data Explorer.
- Preserve the existing SQL application path through
  `DataExplorerStateManager`, clarification state, privacy checks, dashboard
  block queuing, and assistant text rendering.

### Supabase data

- Remove `plan_steps` from the declarative `datasets__virtual` table.
- Restore `rpc_datasets__add_virtual_dataset` to its six-argument contract.
- Add a destructive migration that drops the seven-argument RPC overload,
  drops `datasets__virtual.plan_steps`, and recreates the six-argument RPC.
- Regenerate shared database types from the local Supabase schema.
- Do not apply any migration or write against the production Supabase project.

Existing `plan_steps` values are intentionally discarded.

### Dexie data

The planning feature owns two independent IndexedDB databases:

- `AvandarPlanStepDB`
- `AvandarPlanAnnotationDB`

Add a new `AvandarDB` Dexie version whose upgrade deletes both databases. This
is destructive cleanup, not a data migration. No plan rows or annotations are
copied. After cleanup is registered, delete the plan storage modules and their
types.

The one-time upgrade may retain the two obsolete database names because the
browser needs those identifiers to delete the stored data. It must not retain
planning models, tables, or feature behavior.

### Privacy and translations

- Remove the planning-only `plan_step_input` cross-boundary context and Privacy
  Log label.
- Keep all other cross-boundary contexts and consent/audit behavior.
- Run Lingui extraction with cleanup after deleting the UI so obsolete
  planning messages disappear from source catalogs.
- Never edit compiled `messages.ts` catalogs manually.

### Dependencies and sandbox

- Remove planning-only dependencies: `@xyflow/react`,
  `@react-pdf/renderer`, and `pyodide`.
- Delete `public/sandbox-executor.html` and `src/sandbox`.
- Keep `html-to-image`, `jspdf`, and `roughjs` because dashboard PDF export and
  annotation still use them.

### Documentation

- Delete planning-only feature specifications:
  `docs/deslop/033-chat-plan-propose.md` through the planning files ending at
  `docs/deslop/043-chat-multi-language-plans.md`.
- Remove planning phases and references from mixed chat workflow,
  checkpoint, feature inventory, and de-slopping documents.
- Preserve sections documenting privacy, clarification, dashboard chat, and
  SQL generation.
- Keep historical migration SQL files unless the Supabase schema workflow
  specifically requires otherwise. The new destructive migration represents
  the forward removal.

## Testing

Use red/green TDD for behavior-changing seams:

1. Add or adjust response-dispatch tests so a response can apply SQL,
   clarification, and dashboard blocks without a plan handler.
2. Add route-level or source-contract coverage proving the Data Explorer tool
   surface exposes `generateSql` and `clarify` but not `proposePlan`.
3. Add Dexie upgrade coverage proving both obsolete databases are deleted.
4. Add database tests for the six-argument virtual-dataset RPC and absence of
   `plan_steps`.

Then run focused regression suites for:

- clarification answers and discovery queries;
- privacy detection, consent acknowledgement, and generated-SQL assumptions;
- offline SQL generation;
- dashboard chat block synchronization;
- shared model/parser tests;
- Supabase database tests related to virtual datasets;
- TypeScript type-check, lint, formatting, and production build;
- the non-planning portions of the chat interactive-workflows E2E spec, one
  test at a time when local browser infrastructure is available.

## Success Criteria

- Searching production TypeScript for plan feature symbols returns no
  planning implementation or API contract.
- The database schema and generated types contain no `plan_steps` or
  `p_plan_steps`.
- The two obsolete IndexedDB databases are deleted on upgrade.
- Planning-only UI, sandbox, tests, translations, dependencies, and specs are
  gone.
- Clarification, privacy, dashboard chat, offline chat, and one-shot SQL
  regression tests pass.
- No production Supabase or Vercel systems are accessed or modified.
