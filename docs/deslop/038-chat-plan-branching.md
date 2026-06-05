# 038 — Phase 5: plan branching

- **Slug**: `chat-plan-branching`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-038/chat-plan-branching`
- **Depends on**: `033-chat-plan-propose`, `034-chat-plan-canvas`.
- **Estimated PR size**: medium — ~6 files, +500 lines.

## Notes for future you

- Per-branch chat thread + per-branch virtual-dataset persistence are **intentionally deferred** upstream. This row ships the branching primitive only; the thread / persistence work is later.
- "Branch from here" CTA only appears on succeeded steps — don't show it on pending or failed steps.

## What this feature is

Allow the user to fork a plan into branches: a "Branch from here" CTA on each succeeded step creates a new branch that copies the upstream steps and lets the user explore an alternative continuation. `PlanBranchStateManager` tracks branches; `PlanBranchSidebar` lists them.

## Steps to migrate

**Step 0** — `/deslop undrift chat-plan-branching`.

1. Confirm #033 + #034 have merged.
2. Create the refactor branch.
3. Copy the branch manager + sidebar + CTA.

### Files to copy verbatim

```
src/components/ChatPanel/plan/PlanBranchStateManager.ts
src/components/ChatPanel/plan/PlanBranchSidebar.tsx
src/components/ChatPanel/plan/PlanBranchSidebar.module.css
```

### Files to surgically edit on `develop`

- `PlanStepNode` (from #034) — render the "Branch from here" CTA on succeeded steps.

## Verification

Standard.

## How to mark this feature completed

Standard ritual.
