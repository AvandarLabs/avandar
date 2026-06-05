# 043 — Multi-language plan steps

- **Slug**: `chat-multi-language-plans`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-043/chat-multi-language-plans`
- **Depends on**: `033-chat-plan-propose`, `039-chat-plan-python-sandbox`.
- **Estimated PR size**: small — type union expansion + executor dispatch, ~200 lines.

## Notes for future you

- `type: "r"` is intentionally not wired — the executor returns an error today since the R runtime isn't registered in `availableRuntimes`. Don't try to add WebR.
- `clarification` as a `type` is a no-op step that pauses the plan for an inline clarification (uses the `clarify` tool's UI).

## What this feature is

The `proposePlan` tool's `type` enum is widened to `"sql" | "python" | "r" | "clarification"`. The executor dispatches by type:

- `sql` → DuckDB temp view (existing).
- `python` → Python sandbox (#039).
- `r` → error (R runtime intentionally deferred).
- `clarification` → pauses the plan for a clarification card.

## Steps to migrate

**Step 0** — `/deslop undrift chat-multi-language-plans`.

1. Confirm #033 + #039 have merged.
2. Create the refactor branch.
3. Widen the type union in `shared/types/plan.types.ts`.
4. Wire dispatch in `planExecutor`.

### Files to surgically edit on `develop`

- `shared/types/plan.types.ts` — widen union.
- `src/components/ChatPanel/plan/planExecutor.ts` — dispatch by type.
- `availableRuntimes.ts` — register `python`; do **not** register `r`.

## Verification

Trigger a Python step (works), an R step (returns explicit error), and a clarification step (renders card).

## How to mark this feature completed

Standard ritual.
