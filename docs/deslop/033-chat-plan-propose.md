# 033 — Phase 3: proposePlan tool

- **Slug**: `chat-plan-propose`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-033/chat-plan-propose`
- **Depends on**: `032-chat-discovery-clarifications`.
- **Estimated PR size**: large — ~12 files, +1.5k lines.

## Notes for future you

- This is the **plan-execution foundation**. Rows #034 (canvas), #035 (materialization), #036 (virtual-dataset persistence), #037 (schema drift), #038 (branching), #039 (Python sandbox), #040 (approval gate), #041 (annotations), #042 (export), #043 (multi-language) all build on this.
- Plan max length: 8 steps. Server-side Zod schema enforces.
- DuckDB temp-view lifecycle uses `step_<id>` naming. Each step becomes a temp view; the executor cleans up on plan replace / close.

## What this feature is

`proposePlan` tool registered alongside `generateSql` / `clarify`. The model produces a ≤8-step plan (each step is a SQL query or, later, Python/R/clarification). Server validates the plan via Zod. Client `PlanStateManager` tracks step status; `planExecutor` runs steps in order using DuckDB temp views named `step_<id>`. Views are cleaned up on plan replace, close, or new `proposePlan`.

## Steps to migrate

**Step 0** — `/deslop undrift chat-plan-propose`.

1. Confirm #032 has merged.
2. Create the refactor branch.
3. Copy the tool definition + Zod schema + PlanStateManager + planExecutor.
4. Wire the tool into the chat tool registry and runtime.

### Files to copy verbatim

```
supabase/functions/chat/tools/proposePlan.ts
shared/types/plan.types.ts
src/components/ChatPanel/plan/PlanStateManager.ts
src/components/ChatPanel/plan/planExecutor.ts
src/components/ChatPanel/plan/duckdbTempViewLifecycle.ts
```

### Files to surgically edit on `develop`

- The chat edge function tool registry.
- The chat runtime — register PlanStateManager.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run supabase/functions/chat src/components/ChatPanel/plan
```

### Manual

1. Ask a question that needs a multi-step plan ("Compare last quarter vs Q1 for top 5 customers").
2. Confirm the model proposes a plan. Each step runs against DuckDB; `step_<id>` views exist.
3. Close the plan — confirm views are dropped.

## Risks + things to look out for

- **View leakage.** Failed cleanup leaks `step_*` views into the global DuckDB instance. Test failure paths.
- **Plan length cap.** Server-side Zod must enforce ≤8 steps. Don't trust the model.

## How to mark this feature completed

Standard ritual.
