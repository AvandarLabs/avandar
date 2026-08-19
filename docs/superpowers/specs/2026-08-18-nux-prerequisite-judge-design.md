# Nux: prerequisite judge and app-state catch-up - design

**Status:** Draft for implementation
**Author:** pablo@avandarlabs.com (brainstormed with Claude)
**Date:** 2026-08-18
**Branch:** `feat/nux`
**Amends:** `docs/superpowers/specs/2026-08-16-nux-first-dashboard-tutorial-design.md`
(§4.5 Event bridge, §6.3 Auto-check). Does not reopen that spec's product
scope. The four milestones, copy, and live-event names stay.

---

## 1. Problem

The tutorial drifts from what the user has actually done. Two mechanisms
own "is this milestone done?" and they disagree.

1. **One-shot auto-check** (`getAutoCheckedMilestonesFromArtifacts`) runs only
   while `status = not_started`, and it is a prefix table: a dashboard forges
   `run_query` even when no question was asked. After the invite, it never
   runs again.
2. **Live events** complete milestones after that. If a signal is missed
   (alternate save path, subscriber not mounted, explorer policy filtering
   the emit), progress stays behind reality for the rest of the session.

NUX policy also leaked into the app:

- `DataExplorerApp` decides which `queryTrigger` counts as "asked a
  question," whether empty results count, and how to dedupe.
- `useResourceShareMutations` emits tutorial copy on `dashboard.shareBlocked`.
- `AppShell` mounts `NuxOpenChatPanelEffect`.
- `ProfileView` wires restart, eligibility, and navigation instead of
  `TutorialSection`.

The allowed leak is a one-line outcome signal and `data-nux` anchors.
Everything else belongs to NUX.

---

## 2. Goals and non-goals

**Goals**

- App components emit facts at the moment of an outcome. They do not decide
  whether a tutorial exists or whether the outcome counts.
- NUX owns evaluating app-state prerequisites (workspace rows, and any
  future local/db readers) against tutorial progress.
- Declaring a new prerequisite is filling in `NuxPrerequisite`. The judge
  never switches on a milestone key.
- Catch-up is independent per milestone, not a furthest-artifact prefix.
- Catch-up is additive only. Restart is the only rewind.
- `run_query` stays live-signal-only. Missing it means ask again. Querying
  is cheap, and a dashboard must not imply a question was asked.

**Non-goals**

- Un-completing a milestone when the user deletes the last dataset or
  dashboard.
- A durable `run_query` detector (`usage_analytics_events`, chat history).
- A tutorial catalog. Strategies are registered for `first_dashboard` only.
- Changing milestone copy, routes, or tooltip count.

---

## 3. Architecture

NUX owns three lanes. App components participate only in lane 1.

| Lane          | Owner                                                        | Job                                                                         |
| ------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Live signal   | `NuxEvents.emit` at the success site                         | Immediate "you just did it" (payoff tooltip)                                |
| Durable facts | `NuxProgressClient.getWorkspaceArtifacts` via TanStack Query | Dataset / dashboard / share existence                                       |
| Judgment      | `NuxPrerequisiteJudge`                                       | Catch-up any uncompleted milestone whose strategy says `isSatisfied(facts)` |

```
src/components/Nux/NuxPrerequisites/
  NuxPrerequisite.types.ts
  NuxPrerequisiteFacts.ts
  NuxPrerequisiteJudge.ts          // pure: facts + progress → keys to complete
  useNuxPrerequisiteJudge.ts       // subscribes to artifacts, dispatches catch-up
  firstDashboard/
    addDatasetPrerequisite.ts
    runQueryPrerequisite.ts
    buildDashboardPrerequisite.ts
    shareDashboardPrerequisite.ts
    firstDashboardPrerequisites.ts // the registry array the judge iterates
```

`getAutoCheckedMilestonesFromArtifacts` is deleted. Hydration still loads the
progress row. Catch-up is the judge: once before `isHydrated = true` (so the
invite does not flash the wrong first milestone), then for the rest of the
session whenever the artifacts query changes. The first pass lives in
`useNuxHydration` so invite and hydrate stay atomic. `useNuxPrerequisiteJudge`
owns subsequent changes. Both read the same `getWorkspaceArtifacts` query, so
the second read is a cache hit.

The judge does not import `DatasetClient` or `DashboardClient`. One
NUX-owned artifacts query is enough; it already invalidates when those
clients mutate.

`useNuxCompletionEvents` stays for the live lane. Policy that currently
lives in views (which query trigger counts, empty results) moves into the
strategy's `matchesEvent`.

---

## 4. The `NuxPrerequisite` interface

A prerequisite is a strategy object. Adding one is filling this in.

```typescript
type NuxPrerequisiteFacts = {
  hasDataset: boolean;
  hasDashboard: boolean;
  hasWorkspaceSharedDashboard: boolean;
};

type NuxPrerequisite = {
  milestoneKey: NuxProgress.MilestoneKey;
  /** Live signal that completes this immediately. Omit if catch-up only. */
  completionEvent?: NuxEventName;
  /**
   * Extra live-signal filter. Default: any event with `completionEvent`.
   * run_query's trigger and rowCount policy live here, not in DataExplorerApp.
   */
  matchesEvent?: (event: NuxEvent) => boolean;
  /**
   * Durable catch-up against already-fetched facts.
   * Return false for live-signal-only (run_query).
   */
  isSatisfied: (facts: Readonly<NuxPrerequisiteFacts>) => boolean;
};
```

`first_dashboard` registrations:

| Milestone         | `completionEvent`             | `matchesEvent`                        | `isSatisfied`                       |
| ----------------- | ----------------------------- | ------------------------------------- | ----------------------------------- |
| `add_dataset`     | `dataset.saved`               | default                               | `facts.hasDataset`                  |
| `run_query`       | `query.succeeded`             | user-asked trigger and `rowCount > 0` | `false`                             |
| `build_dashboard` | `dashboard.created`           | default                               | `facts.hasDashboard`                |
| `share_dashboard` | `dashboard.sharedToWorkspace` | default                               | `facts.hasWorkspaceSharedDashboard` |

User-asked triggers: `sql_submit`, `structured_change`, `chat_generated`.
Not user-asked: `url_hydration`, `dataset_opened`. Those still emit; NUX
ignores them.

Opening locks (`prerequisites: ["run_query"]` on a milestone) stay on
`NuxMilestone`. Those are "other milestones complete," not app-state facts.
Catch-up filling `completedMilestones` is what unlocks them.

---

## 5. Judge behavior

**Catch-up-only.** `isSatisfied === false` never removes a key.

**Independent, not prefix.** A dashboard does not complete `run_query`.

**Pure function.**

```typescript
NuxPrerequisiteJudge.getCatchUpKeys({
  facts,
  completedMilestones,
  prerequisites,
  isCatchUpSuppressed,
}): readonly NuxProgress.MilestoneKey[]
```

Returns uncompleted keys whose `isSatisfied(facts)` is true. Returns `[]`
when `isCatchUpSuppressed` is true. The judge does not write state; the
hook dispatches.

**Live path.** `useNuxCompletionEvents` finds the strategy whose
`completionEvent` matches and whose `matchesEvent` (or the default) passes,
then `completeMilestone`. Payoff jump if that tour is open: unchanged.

**Catch-up path.** `useNuxPrerequisiteJudge` reads artifacts via
`NuxProgressClient.useGetWorkspaceArtifacts`. On each facts change it
calls `getCatchUpKeys` and, if the result is non-empty, dispatches one
batched `catchUpMilestones` action. If the active milestone is in the
batch, the same payoff jump as a live complete.

**When it writes.** Only while `status` is `not_started` or `in_progress`.
`dismissed` and `completed` are left alone.

**First paint.** Hydration awaits the first artifacts read, runs the judge,
persists any catch-up, then sets `isHydrated`. Same atomic invite decision
as today's auto-check, without the prefix table.

---

## 6. Restart vs catch-up

Catch-up during `in_progress` would re-tick every artifact-backed milestone
the moment Restart clears `completedMilestones`, including across refresh.
Today that does not happen, because auto-check is `not_started`-only.

Persist the bypass:

```sql
alter table public.user_nux_progress
add column catch_up_suppressed boolean not null default false;
```

Model field: `isCatchUpSuppressed`. Default `false` for new rows. Restart
sets it `true`. It is never cleared: a replay is a replay until the user
finishes or dismisses.

`nuxActions.restart` sets `isCatchUpSuppressed: true` in memory.
`useNuxPersistence` writes it with the rest of the row.

---

## 7. App-component contract

**Allowed in app components**

- `NuxEvents.emit(name, facts)` at the moment of a real outcome. Facts, not
  tutorial policy.
- `NuxAnchors.props(anchor)` on spotlight targets.

**Not allowed in app components**

- Filtering whether an outcome "counts" for NUX.
- Reading `NuxStateManager` (exception: NUX UI surfaces).
- Tutorial copy (Lingui strings that exist only for the checklist/tour).
- Mounting NUX effects in `AppShell`.

**Call-site changes**

| Site                        | After                                                                                                                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DataExplorerApp`           | Emit `query.succeeded` with `{ trigger, rowCount }` whenever a query settles successfully. No trigger filter, no empty-result policy, no NUX comments about milestones.                                  |
| `ManualUploadView`          | Unchanged: `dataset.saved` with `datasetId`.                                                                                                                                                             |
| `SaveToDashboardModal`      | Unchanged: `dashboard.created` with `dashboardId`.                                                                                                                                                       |
| `useResourceShareMutations` | `dashboard.sharedToWorkspace` unchanged. `dashboard.shareBlocked` payload is `{ reason: NuxShareBlockedReason }`, a closed union starting at `"shareable_dashboard_limit"`. NUX maps the code to Lingui. |
| `AppShell`                  | Drops `NuxOpenChatPanelEffect`. `ChatPanel` mounts it, because that is the `ChatPanelStateManager` boundary the effect must run under.                                                                   |
| `ProfileView`               | Renders `<TutorialSection />` only. Eligibility, restart, and navigation move into `TutorialSection`.                                                                                                    |

`query.succeeded` payload type becomes `{ trigger: UserQueryAnalyticsTrigger; rowCount: number }`.

---

## 8. State, client, and persistence

`NuxAppState` gains `isCatchUpSuppressed: boolean` (default `false`).

`NuxProgress.T` gains `isCatchUpSuppressed: boolean`.

`NuxProgressClient.updateProgress` accepts `isCatchUpSuppressed` alongside
`status` and `completedMilestones`.

`nuxActions.catchUpMilestones(state, keys)` appends every key not already
in `completedMilestones`, then applies the same status / payoff / panel
rules as `completeMilestone` would for a single key. One dispatch, one
persist.

`useNuxHydration` stops calling `getAutoCheckedMilestonesFromArtifacts`.
It loads the row, reads artifacts, runs the judge (no-op when suppressed),
persists catch-up if needed, then `dispatch.hydrate`.

---

## 9. Testing

Pure judge tests are the contract. No React unless the hook's subscription
behavior is under test.

**`NuxPrerequisiteJudge`**

- Empty facts → no keys.
- Each artifact completes only its own milestone.
- A dashboard does not complete `run_query`.
- Already-complete keys are not re-added.
- `isCatchUpSuppressed` → `[]`.
- `isSatisfied: false` never removes a key.

**Per-strategy**

- `runQueryPrerequisite.matchesEvent`: `sql_submit` / `chat_generated` /
  `structured_change` with `rowCount > 0` pass; `url_hydration`,
  `dataset_opened`, and `rowCount === 0` fail.

**`useNuxPrerequisiteJudge`**

- Artifact query change dispatches catch-up.
- Suppressed / dismissed / completed do not write.

**Actions**

- Restart sets `isCatchUpSuppressed`.
- Batched catch-up of the active milestone jumps to its payoff.
- Hydration no longer depends on `getAutoCheckedMilestonesFromArtifacts`.

**Call sites**

- Explorer emits `{ trigger, rowCount }` even for `url_hydration`.
- Share modal emits a reason code, not tutorial copy.

**Schema / client**

- `NuxProgress` and `NuxProgressClient` round-trip `isCatchUpSuppressed`.
- Restart persistence writes the flag.

---

## 10. Out of scope

- Spotlight / Cmd+K resume.
- Persisting the active step index.
- Detecting `run_query` from analytics or local chat history.
- Bidirectional progress (delete dataset → reopen `add_dataset`).
- Playwright coverage of catch-up. Unit tests of the judge plus hydration
  cover the behavior; an e2e for "dataset already exists" can land later
  if the existing first-milestone spec is extended.
