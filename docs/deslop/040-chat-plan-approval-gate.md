# 040 — Plan approval gate

- **Slug**: `chat-plan-approval-gate`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-040/chat-plan-approval-gate`
- **Depends on**: `033-chat-plan-propose`.
- **Estimated PR size**: small — ~3 files, ~250 lines.

## Notes for future you

- The >7-step heuristic suggests Python/R but does not enforce it — the user can still approve a SQL-only plan over 7 steps. Don't escalate the heuristic to a hard block.

## What this feature is

Each plan carries `approvalStatus: "awaiting_approval" | "approved" | "rejected"`. An Approve/Reject banner blocks auto-run until the user clicks. Heuristic: when SQL steps > 7, the banner suggests Python/R as a possibly-better plan shape.

## Steps to migrate

**Step 0** — `/deslop undrift chat-plan-approval-gate`.

1. Confirm #033 has merged.
2. Create the refactor branch.
3. Add `approvalStatus` to plan types; render banner; wire to `planExecutor` gate.

### Files to copy verbatim

```
src/components/ChatPanel/plan/PlanApprovalBanner.tsx
src/components/ChatPanel/plan/PlanApprovalBanner.module.css
```

### Files to surgically edit on `develop`

- `shared/types/plan.types.ts` — add `approvalStatus`.
- `planExecutor` — gate on approval.

## Verification

Trigger a plan; confirm the banner blocks auto-run; click Approve → plan runs. Trigger an 8+ step SQL plan; confirm the Python/R suggestion appears.

## How to mark this feature completed

Standard ritual.
