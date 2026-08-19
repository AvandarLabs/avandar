# Checklist Mark-Done Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Get started milestone has a clickable empty-circle check so users can mark or unmark it done without starting the tour.

**Architecture:** New reducer actions `markMilestoneDone`, `unmarkMilestoneDone`, and `clearActiveMilestone`. The checklist splits the circle from the row, then waits 400ms before closing an active tour or hiding a 4/4 panel. `userUnmarkedMilestones` is in-memory so artifact catch-up does not immediately re-tick a row the user just unmarked.

**Tech Stack:** React 19, Mantine 9, Vitest, Lingui.

**Spec:** `docs/superpowers/specs/2026-08-18-nux-checklist-mark-done-design.md`

## Global Constraints

- User-facing copy: "Mark done" / "Mark not done". Internal names may say Nux; UI never does.
- Do not reuse `completeMilestone` (payoff jump), `closeTour` (collapses the panel), or `skipActiveMilestone` (active key only, no delay).
- Unmark does not cascade. Catch-up ignore is in-memory only.
- Manual mark does not emit `nux.milestone_completed`.
- TDD: failing test first. Do not commit unless the user asks.
- Nested buttons are invalid HTML: the circle is a sibling of the row button, not a child.
- `MARK_DONE_FOLLOW_UP_MS` is 400.
- Tooltip: Mantine `Tooltip` with `events={{ hover: true, focus: true }}` so keyboard users see the same copy.

---

## File structure

**Create**

| File                                                                                          | Responsibility                   |
| --------------------------------------------------------------------------------------------- | -------------------------------- |
| `src/components/Nux/NuxChecklistPanel/useNuxMarkDoneFollowUp/useNuxMarkDoneFollowUp.ts`       | 400ms follow-up + last-mark hold |
| `src/components/Nux/NuxChecklistPanel/useNuxMarkDoneFollowUp/useNuxMarkDoneFollowUp.test.tsx` | timer / cancel / hold            |
| `src/components/Nux/NuxChecklistPanel/NuxChecklistMilestoneRow/NuxChecklistMilestoneRow.tsx`  | circle + row targets             |

**Modify**

| File                                                                   | Change                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------- |
| `src/components/Nux/NuxStateManager/NuxAppState.types.ts`              | `userUnmarkedMilestones`                          |
| `src/components/Nux/NuxStateManager/nuxActions/nuxActions.ts`          | three actions; strip unmarked on complete/restart |
| `src/components/Nux/NuxStateManager/nuxActions/nuxActions.test.ts`     | reducer tests                                     |
| `src/components/Nux/NuxPrerequisites/NuxPrerequisiteJudge.ts`          | skip unmarked keys                                |
| `src/components/Nux/NuxPrerequisites/NuxPrerequisiteJudge.test.ts`     | ignore-list case                                  |
| `src/components/Nux/NuxPrerequisites/useNuxPrerequisiteJudge.ts`       | pass the list                                     |
| `src/components/Nux/NuxPrerequisites/useNuxPrerequisiteJudge.test.tsx` | hook does not re-tick unmarked                    |
| `src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.tsx`           | hold hide; use row + hook                         |
| `src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.test.tsx`      | check control + delay                             |

---

### Task 1: Reducer actions

**Files:**

- Modify: `src/components/Nux/NuxStateManager/NuxAppState.types.ts`
- Modify: `src/components/Nux/NuxStateManager/nuxActions/nuxActions.ts`
- Test: `src/components/Nux/NuxStateManager/nuxActions/nuxActions.test.ts`

**Produces:**

- `userUnmarkedMilestones: readonly NuxProgress.MilestoneKey[]` on `NuxAppState`, default `[]`
- `nuxActions.markMilestoneDone(state, key)`
- `nuxActions.unmarkMilestoneDone(state, key)`
- `nuxActions.clearActiveMilestone(state)`

- [ ] **Step 1: Write the failing tests** in `nuxActions.test.ts`

```ts
describe("nuxActions.markMilestoneDone", () => {
  it("records the milestone without jumping to the payoff tooltip", () => {
    const nextState = nuxActions.markMilestoneDone(
      { ...HYDRATED, activeMilestoneKey: "add_dataset", activeStepIndex: 0 },
      "add_dataset",
    );
    expect(nextState.completedMilestones).toEqual(["add_dataset"]);
    expect(nextState.activeMilestoneKey).toBe("add_dataset");
    expect(nextState.activeStepIndex).toBe(0);
  });

  it("does not record the same milestone twice", () => {
    const state = {
      ...HYDRATED,
      completedMilestones: ["add_dataset"] as const,
    };
    expect(nuxActions.markMilestoneDone(state, "add_dataset")).toBe(state);
  });

  it("completes the tutorial once the last milestone is marked", () => {
    const nextState = nuxActions.markMilestoneDone(
      {
        ...HYDRATED,
        status: "in_progress",
        completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
      },
      "share_dashboard",
    );
    expect(nextState.status).toBe("completed");
    expect(nextState.isPanelExpanded).toBe(false === false); // panel flag unchanged
  });

  it("removes the key from userUnmarkedMilestones", () => {
    const nextState = nuxActions.markMilestoneDone(
      { ...HYDRATED, userUnmarkedMilestones: ["add_dataset"] },
      "add_dataset",
    );
    expect(nextState.userUnmarkedMilestones).toEqual([]);
  });

  it("does not write over dismissed", () => {
    const nextState = nuxActions.markMilestoneDone(
      { ...HYDRATED, status: "dismissed" },
      "add_dataset",
    );
    expect(nextState.status).toBe("dismissed");
    expect(nextState.completedMilestones).toContain("add_dataset");
  });
});

describe("nuxActions.unmarkMilestoneDone", () => {
  it("removes only that key", () => {
    const nextState = nuxActions.unmarkMilestoneDone(
      {
        ...HYDRATED,
        completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
      },
      "run_query",
    );
    expect(nextState.completedMilestones).toEqual([
      "add_dataset",
      "build_dashboard",
    ]);
    expect(nextState.userUnmarkedMilestones).toEqual(["run_query"]);
  });

  it("returns in_progress when a completed tutorial is unmarked", () => {
    const nextState = nuxActions.unmarkMilestoneDone(
      {
        ...HYDRATED,
        status: "completed",
        completedMilestones: [
          "add_dataset",
          "run_query",
          "build_dashboard",
          "share_dashboard",
        ],
      },
      "share_dashboard",
    );
    expect(nextState.status).toBe("in_progress");
  });

  it("does nothing when the key is not complete", () => {
    const state = {
      ...HYDRATED,
      completedMilestones: ["add_dataset"] as const,
    };
    expect(nuxActions.unmarkMilestoneDone(state, "run_query")).toBe(state);
  });
});

describe("nuxActions.clearActiveMilestone", () => {
  it("clears the tour and leaves the panel expanded", () => {
    const nextState = nuxActions.clearActiveMilestone({
      ...HYDRATED,
      activeMilestoneKey: "run_query",
      activeStepIndex: 1,
      isPanelExpanded: true,
    });
    expect(nextState.activeMilestoneKey).toBeUndefined();
    expect(nextState.activeStepIndex).toBe(0);
    expect(nextState.isPanelExpanded).toBe(true);
  });
});

describe("nuxActions.completeMilestone unmarked list", () => {
  it("removes a live-completed key from userUnmarkedMilestones", () => {
    const nextState = nuxActions.completeMilestone(
      { ...HYDRATED, userUnmarkedMilestones: ["add_dataset"] },
      { key: "add_dataset" },
    );
    expect(nextState.userUnmarkedMilestones).toEqual([]);
  });
});

describe("nuxActions.restart unmarked list", () => {
  it("clears userUnmarkedMilestones", () => {
    const nextState = nuxActions.restart({
      ...HYDRATED,
      userUnmarkedMilestones: ["add_dataset"],
    });
    expect(nextState.userUnmarkedMilestones).toEqual([]);
  });
});
```

Fix the tautological `isPanelExpanded` assertion: expect the panel flag to stay whatever it was (`HYDRATED` is `false`; for an in-progress expanded panel pass `isPanelExpanded: true` and expect `true`).

- [ ] **Step 2: Run tests, confirm they fail** because the actions are missing.

Run: `pnpm test:frontend src/components/Nux/NuxStateManager/nuxActions/nuxActions.test.ts`

- [ ] **Step 3: Implement**

Add to `NuxAppState`:

```ts
/**
 * Keys the user unmarked this session. Artifact catch-up must not re-tick
 * these until a live completion or another mark-done.
 */
userUnmarkedMilestones: readonly NuxProgress.MilestoneKey[];
```

Default `[]` on `INITIAL_NUX_STATE`.

Implement the three actions. `markMilestoneDone` must not change `activeMilestoneKey` / `activeStepIndex` / `isPanelExpanded`. Clear `blockedReason` only when the marked key is the active milestone. `completeMilestone` and `restart` strip / clear `userUnmarkedMilestones`.

- [ ] **Step 4: Re-run tests, confirm they pass.**

---

### Task 2: Catch-up ignores unmarked keys

**Files:**

- Modify: `src/components/Nux/NuxPrerequisites/NuxPrerequisiteJudge.ts`
- Modify: `src/components/Nux/NuxPrerequisites/NuxPrerequisiteJudge.test.ts`
- Modify: `src/components/Nux/NuxPrerequisites/useNuxPrerequisiteJudge.ts`
- Modify: `src/components/Nux/NuxPrerequisites/useNuxPrerequisiteJudge.test.tsx`

**Consumes:** `userUnmarkedMilestones` from Task 1.

- [ ] **Step 1: Failing judge test**

```ts
it("does not catch up a key the user unmarked this session", () => {
  expect(
    NuxPrerequisiteJudge.getCatchUpKeys({
      facts: { ...EMPTY_FACTS, hasDataset: true },
      completedMilestones: [],
      userUnmarkedMilestones: ["add_dataset"],
      prerequisites: FIRST_DASHBOARD_PREREQUISITES,
      isCatchUpSuppressed: false,
    }),
  ).toEqual([]);
});
```

Add `userUnmarkedMilestones: []` to existing `getCatchUpKeys` calls so they type-check once the option is required.

- [ ] **Step 2: Run judge tests, confirm the new one fails.**

Run: `pnpm test:frontend src/components/Nux/NuxPrerequisites/NuxPrerequisiteJudge.test.ts`

- [ ] **Step 3: Filter unmarked keys in `getCatchUpKeys`.** Pass `state.userUnmarkedMilestones` from the hook (effect deps too).

- [ ] **Step 4: Hook test: artifacts prove a dataset, `userUnmarkedMilestones: ["add_dataset"]`, completed list stays empty.**

Run: `pnpm test:frontend src/components/Nux/NuxPrerequisites/useNuxPrerequisiteJudge.test.tsx`

---

### Task 3: Checklist circle, tooltips, 400ms follow-up

**Files:**

- Create: `useNuxMarkDoneFollowUp.ts` + `.test.tsx`
- Create: `NuxChecklistMilestoneRow.tsx`
- Modify: `NuxChecklistPanel.tsx` + `.test.tsx`

**Produces:**

- `MARK_DONE_FOLLOW_UP_MS = 400`
- `useNuxMarkDoneFollowUp()` → `{ isHoldingCompletion, markDone, unmarkDone }`
- Row: ActionIcon circle (always enabled) + UnstyledButton rest of row

Circle `data-testid={`nux-milestone-check-${milestone.key}`}`. `aria-label` matches the tooltip (`Mark done` / `Mark not done`). Unique testids, not unique names.

Hide the panel when `areAllMilestonesComplete && !isHoldingCompletion`.

- [ ] **Step 1: Failing panel tests** (add to `NuxChecklistPanel.test.tsx`)

Use `vi.useFakeTimers()` in a nested describe. Probe `activeMilestoneKey` with a sibling that reads `NuxStateManager.useState()`.

Behaviors:

- Four check controls exist. Clicking `nux-milestone-check-run_query` does not call `onOpenMilestone`. Completes `run_query` in state.
- Focus check → tooltip "Mark done"; after done, tooltip "Mark not done".
- Done row cannot start; unmark re-enables start for `run_query` (no prereq).
- Locked `build_dashboard` check still marks it done.
- Active `run_query` stays active immediately after check; after 400ms it clears; panel stays expanded.
- Last remaining check: panel still visible at 0ms, gone after 400ms.
- Unmark before 400ms cancels hide / tour close.

- [ ] **Step 2: Run panel tests, confirm they fail.**

- [ ] **Step 3: Implement hook, row, panel wiring.** Translate with `` t`Mark done` `` / `` t`Mark not done` `` in the row component (Lingui extractor).

- [ ] **Step 4: Re-run panel + hook tests.**

---

### Task 4: Extract i18n and verify

- [ ] **Step 1:** `pnpm i18n:extract`
- [ ] **Step 2:** Confirm `Mark done` and `Mark not done` appear in `src/i18n/locales/en/messages.po`
- [ ] **Step 3:** Re-run all Nux tests touched above.

---

## Spec coverage

| Spec                                       | Task   |
| ------------------------------------------ | ------ |
| Clickable empty circle always              | 3      |
| Tooltips Mark done / Mark not done         | 3      |
| Mark any row, including locked             | 3      |
| Done row cannot start                      | 3      |
| Unmark until tutorial finished             | 1, 3   |
| No cascade                                 | 1      |
| mark without payoff jump                   | 1      |
| 400ms close tour / hide 4/4                | 3      |
| Unmark cancels follow-up                   | 3      |
| Catch-up ignores unmarked                  | 2      |
| completeMilestone / restart clear unmarked | 1      |
| No new analytics / schema                  | (none) |
