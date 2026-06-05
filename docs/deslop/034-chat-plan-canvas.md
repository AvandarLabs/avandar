# 034 — Plan canvas (xyflow visual DAG)

- **Slug**: `chat-plan-canvas`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-034/chat-plan-canvas`
- **Depends on**: `033-chat-plan-propose`.
- **Estimated PR size**: large — ~10 files, +1.2k lines + xyflow + RoughJS deps.

## Notes for future you

- xyflow (formerly react-flow) renders the DAG. `RoughEdge.tsx` wraps it with RoughJS-styled bezier curves — the deliberately hand-drawn look is part of the brand. Don't replace with smooth bezier.
- Auto/Step run-mode toggle: Auto runs every step in sequence; Step waits for user click between steps.
- The `react-doctor` "no-inline-exhaustive-style" rule will flag `PlanStepNode.tsx` and `RoughEdge.tsx`. The pattern is intentional — RoughJS configuration needs to live next to the styles. Don't refactor to CSS modules.

## What this feature is

xyflow visual DAG canvas rendering the plan from #033. Custom `PlanStepNode` per step. `RoughEdge` wraps bezier edges with RoughJS to give them a sketched / hand-drawn look. Auto/Step run-mode toggle. Animated zoom-in / zoom-out via `fitView` + `setCenter` on plan changes.

## Steps to migrate

**Step 0** — `/deslop undrift chat-plan-canvas`.

1. Confirm #033 has merged.
2. Create the refactor branch.
3. Add xyflow + RoughJS deps.
4. Copy the canvas tree verbatim.

### Files to copy verbatim

```
src/components/ChatPanel/PlanFlowView/PlanFlowView.tsx
src/components/ChatPanel/PlanFlowView/PlanStepNode.tsx
src/components/ChatPanel/PlanFlowView/RoughEdge.tsx
src/components/ChatPanel/PlanFlowView/PlanFlowView.module.css
src/components/ChatPanel/PlanFlowView/usePlanLayout.ts
```

### Files to surgically edit on `develop`

- Chat panel — mount `<PlanFlowView />` when a plan is active.
- Theme tokens — register the RoughJS "ink" color.

### Dependency changes

```
pnpm add @xyflow/react roughjs
```

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run src/components/ChatPanel/PlanFlowView
```

### Manual

1. Trigger a multi-step plan.
2. Confirm the canvas renders with sketched edges and step nodes.
3. Toggle Auto/Step. Confirm auto runs every step; step requires click-through.
4. Zoom controls work; `fitView` centers when the plan changes.

## How to mark this feature completed

Standard ritual.
