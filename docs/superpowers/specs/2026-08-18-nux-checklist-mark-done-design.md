# Nux: checklist mark-done control - design

**Status:** Draft for implementation
**Author:** pablo@avandarlabs.com (brainstormed with Claude)
**Date:** 2026-08-18
**Branch:** `feat/nux`
**Amends:** `docs/superpowers/specs/2026-08-16-nux-first-dashboard-tutorial-design.md`
(§3.2 Checklist panel) and `docs/superpowers/specs/2026-08-18-nux-prerequisite-judge-design.md`
(catch-up is additive; restart was the only rewind). Does not reopen milestone
copy, routes, or tooltip count.
**Related:** `src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.tsx`,
`src/components/Nux/NuxStateManager/nuxActions/nuxActions.ts`,
`src/components/Nux/NuxPrerequisites/useNuxPrerequisiteJudge.ts`

---

## 1. Problem

The Get started list only shows a check after a milestone is already done, and
the whole row is the only click target. Done rows cannot be started (correct)
but there is no way to declare "I already did this" or to undo that without
Profile restart. Users who skip the happy path, or who marked the wrong row,
are stuck following the tour.

## 2. Goals and non-goals

**Goals**

- Every milestone row has a clickable completion circle while the panel is
  showing.
- Users can mark any milestone done, including ones whose prerequisites are
  unmet.
- A done milestone cannot be started from the row. Its circle can still unmark
  it, until the tutorial is finished.
- Unmark is local: later done rows stay done.

**Non-goals**

- Changing Skip this step, real-event payoff jumps, or `completeMilestone`.
- A completed-state card after 4/4. The panel still unmounts; it just waits
  ~400ms so the last tick is visible.
- Cascading unmarks.
- Schema changes. Catch-up ignore for user-unmarked keys is in-memory only.
- New analytics events. Manual mark does not emit `nux.milestone_completed`
  (same as Skip). Finishing the last milestone still emits `nux.completed`
  through the existing status-transition effect.

## 3. Interaction

Each row has two targets.

| Target | Undone | Done |
| --- | --- | --- |
| Circle | Empty. Tooltip: "Mark done". Always enabled. | Filled green with a check. Tooltip: "Mark not done". Always enabled while the panel is up. |
| Rest of the row | Starts the tour, unless prerequisites are unmet (locked, same as today). | Does not start the tour. |

Locked (prerequisite-unmet) rows can still be marked done. Clicking the circle
does not start the tour (`stopPropagation`). Visual treatment stays option A:
empty circle, fills green when done. No outlined check on incomplete rows.

Unmark is allowed only while the tutorial is not finished. Once every
milestone is done and the hold expires, the panel unmounts and there is
nothing to unmark. Profile restart remains the rewind for a finished
tutorial.

## 4. State

Two new reducer actions. Do not reuse `completeMilestone` (payoff jump) or
`closeTour` (collapses the panel) or `skipActiveMilestone` (only the active
key, no delay).

### 4.1 `markMilestoneDone(key)`

- Idempotent if `key` is already in `completedMilestones`.
- Appends `key`. Removes it from `userUnmarkedMilestones` (see §5).
- Sets `status` to `completed` if every milestone is now done, else
  `in_progress`. Does not write over `dismissed`.
- Does **not** change `activeMilestoneKey` or `activeStepIndex`. The open
  tooltip stays put so the filled circle is visible under it.

The checklist then schedules one **400ms** follow-up
(`MARK_DONE_FOLLOW_UP_MS`). When it fires it may do both of these, in order:

1. If `key` is still the active milestone, dispatch `clearActiveMilestone`
   (`activeMilestoneKey` undefined, `activeStepIndex` 0, panel stays
   expanded).
2. If every milestone is still done, drop the hold and unmount as today.

Checking a *different* milestone than the open tour leaves that tour alone.
A live completion still uses `completeMilestone` and still jumps to the
payoff.

Unmarking `key` before the timer fires cancels both follow-ups. During the
4/4 hold the circle is still clickable: unmark returns `in_progress` and the
panel stays.

### 4.2 `unmarkMilestoneDone(key)`

- Removes only `key` from `completedMilestones`. No cascade.
- Adds `key` to `userUnmarkedMilestones`.
- If `status` was `completed`, writes `in_progress` (defensive; the panel is
  already gone once the tutorial is finished).
- Does not open a tour.

After unmark, the row can be started again, subject to the existing
prerequisite lock.

### 4.3 `clearActiveMilestone`

Closes tooltips without collapsing the checklist. Used by the delayed
follow-up. Distinct from `closeTour`, which also sets `isPanelExpanded:
false`.

## 5. Catch-up vs unmark

The prerequisite judge is additive: a dataset in the workspace will catch-up
`add_dataset` as soon as `completedMilestones` no longer includes it. Without
a guard, unmark would flash and the circle would fill again.

`userUnmarkedMilestones` is an in-memory list on `NuxAppState`. The judge
must not catch-up those keys. It is not persisted.

| Event | Effect on the list |
| --- | --- |
| `unmarkMilestoneDone(key)` | add `key` |
| `markMilestoneDone(key)` | remove `key` |
| `completeMilestone` / live event | remove `key` |
| `restart` | clear the list (restart already suppresses catch-up globally) |

Refresh: persisted `completed_milestones` omit the unmarked key, then
hydration + catch-up may check it off again from artifacts. That is
accepted. Same-session unmark is what lets them replay the tour.

`run_query` is live-signal-only, so unmarking it already sticks until they
ask again or mark it done.

## 6. Persistence

`useNuxPersistence` already writes `status` and `completedMilestones`. Mark
and unmark ride that path. No new columns. `userUnmarkedMilestones` is not
written.

## 7. Testing

Reducer (`nuxActions.test.ts`):

- `markMilestoneDone` is idempotent and does not jump to the last tooltip.
- `unmarkMilestoneDone` removes only that key.
- Unmark of a `completed` row returns `in_progress`.
- `clearActiveMilestone` clears the tour and leaves the panel expanded.

Panel (`NuxChecklistPanel.test.tsx`), fake timers for delays:

- Every row has a check control. Clicking it does not call `onOpenMilestone`.
- Tooltips: "Mark done" / "Mark not done".
- A done row cannot start. Unmark re-enables start when prerequisites are
  met.
- A locked row can still be marked done.
- Checking the active milestone closes the tour after 400ms, not immediately.
- Checking the last remaining milestone keeps the panel for 400ms, then
  hides.
- Unmark before 400ms cancels the pending close.

Judge: catch-up skips keys in `userUnmarkedMilestones`.

## 8. Files

- `nuxActions.ts` / `nuxActions.test.ts`: the three actions.
- `NuxAppState.types.ts`: `userUnmarkedMilestones`.
- `NuxChecklistPanel.tsx` / `.test.tsx`: split circle vs row, tooltips,
  follow-up timer, last-mark hold.
- `useNuxPrerequisiteJudge.ts` and judge tests: honor the ignore list.
- `NuxStateManager` picks up the new actions automatically from `nuxActions`.
