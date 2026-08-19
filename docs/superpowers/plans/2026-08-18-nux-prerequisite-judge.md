# Nux Prerequisite Judge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Own app-state prerequisite evaluation inside NUX so the tutorial catch-up matches what the user has actually done, while app components only emit outcome facts.

**Architecture:** One `NuxPrerequisite` strategy per milestone. A pure `NuxPrerequisiteJudge` catch-up-completes independently from workspace artifacts (TanStack Query) and from live `NuxEvents`. Restart persists `catch_up_suppressed` so replay is not immediately re-ticked. `run_query` is live-signal-only: a dashboard does not imply a question was asked.

**Tech Stack:** React 19, TypeScript, Vitest, TanStack Query, Supabase declarative schema, Lingui.

**Spec:** `docs/superpowers/specs/2026-08-18-nux-prerequisite-judge-design.md`

---

## Conventions

- **`Nux` never appears in user-facing copy.** Internal names only.
- **Schema is declarative.** Edit `supabase/schemas/`, then generate a migration. Never hand-write `supabase/migrations/*.sql` for this column. Never commit `supabase/config.toml`.
- **This branch is not `develop`.** Before any schema work, isolate local Supabase with `ava supabase switch feat-nux`. Do not run `ava supabase restore` unless merging to `develop`.
- **`pnpm db:reset` immediately before `pnpm db:new-migration`.** All worktrees share one local instance unless switched. A generated migration that drops anything you did not add is a bug: reset, regenerate, compare.
- **TDD.** Red, watch it fail, green, commit. No production code without a failing test first, except Task 1 (schema + generated types).
- **Type-only files use `.types.ts`.** Put `NuxPrerequisiteFacts` in `NuxPrerequisite.types.ts`. Do not create a types-only `NuxPrerequisiteFacts.ts` (spec listed that filename; repo file rules win).
- **Catch-up never completes `run_query`.** A workspace that already has a shared dashboard is still invited to ask a question. Do not restore `getAutoCheckedMilestonesFromArtifacts`'s prefix table.
- **Commit after every task** with `feat(nux):` / `test(nux):` / `fix(nux):`.
- **Do not commit `supabase/config.toml`.**

**Commands:**

```bash
pnpm test:frontend path/to/file.test.ts
pnpm type-check
pnpm lint
pnpm i18n:extract   # only after adding/moving Lingui strings
```

---

## File structure

**New**

| File                                                                                               | Responsibility                                            |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `src/components/Nux/NuxPrerequisites/NuxPrerequisite.types.ts`                                     | `NuxPrerequisite`, `NuxPrerequisiteFacts`                 |
| `src/components/Nux/NuxPrerequisites/NuxPrerequisiteJudge.ts`                                      | `getCatchUpKeys`, `matchesLiveEvent`                      |
| `src/components/Nux/NuxPrerequisites/NuxPrerequisiteJudge.test.ts`                                 | judge contract                                            |
| `src/components/Nux/NuxPrerequisites/useNuxPrerequisiteJudge.ts`                                   | artifact query → `catchUpMilestones`                      |
| `src/components/Nux/NuxPrerequisites/useNuxPrerequisiteJudge.test.tsx`                             | hook: writes / does not write                             |
| `src/components/Nux/NuxPrerequisites/firstDashboard/addDatasetPrerequisite.ts`                     | `hasDataset`                                              |
| `src/components/Nux/NuxPrerequisites/firstDashboard/runQueryPrerequisite.ts`                       | live `query.succeeded` filter; `isSatisfied` always false |
| `src/components/Nux/NuxPrerequisites/firstDashboard/runQueryPrerequisite.test.ts`                  | trigger + rowCount matrix                                 |
| `src/components/Nux/NuxPrerequisites/firstDashboard/buildDashboardPrerequisite.ts`                 | `hasDashboard`                                            |
| `src/components/Nux/NuxPrerequisites/firstDashboard/shareDashboardPrerequisite.ts`                 | `hasWorkspaceSharedDashboard`                             |
| `src/components/Nux/NuxPrerequisites/firstDashboard/firstDashboardPrerequisites.ts`                | registry the judge iterates                               |
| `src/components/Nux/NuxPrerequisites/firstDashboard/firstDashboardPrerequisites.test.ts`           | registry aligns with milestone `completionEvent`s         |
| `src/components/Nux/NuxRoot/hydrateNuxProgressForWorkspace/hydrateNuxProgressForWorkspace.ts`      | first catch-up pass, atomic with `isHydrated`             |
| `src/components/Nux/NuxRoot/hydrateNuxProgressForWorkspace/hydrateNuxProgressForWorkspace.test.ts` | first-pass catch-up / suppress / dismissed                |

**Modify**

| File                                                                                                    | Change                                                  |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `supabase/schemas/01.user_nux_progress.sql`                                                             | `catch_up_suppressed boolean not null default false`    |
| `shared/models/NuxProgress/NuxProgress.types.ts`                                                        | `isCatchUpSuppressed`                                   |
| `src/clients/NuxProgressClient/NuxProgressClient.ts`                                                    | parse + `updateProgress`                                |
| `src/clients/NuxProgressClient/NuxProgressClient.test.ts`                                               | round-trip the flag                                     |
| `src/components/Nux/NuxEvents/NuxEvents.ts`                                                             | `query.succeeded` payload; `NuxShareBlockedReason`      |
| `src/components/Nux/NuxStateManager/NuxAppState.types.ts`                                               | `isCatchUpSuppressed`                                   |
| `src/components/Nux/NuxStateManager/nuxActions/nuxActions.ts`                                           | hydrate, restart, `catchUpMilestones`                   |
| `src/components/Nux/NuxRoot/useNuxHydration.ts`                                                         | call extracted hydrate helper                           |
| `src/components/Nux/NuxRoot/useNuxPersistence.ts`                                                       | persist the flag                                        |
| `src/components/Nux/NuxRoot/useNuxCompletionEvents.ts`                                                  | strategies + `matchesLiveEvent`; map share-blocked copy |
| `src/components/Nux/NuxRoot/NuxRootContents.tsx`                                                        | mount `useNuxPrerequisiteJudge`                         |
| `src/views/DataExplorerApp/DataExplorerApp.tsx`                                                         | emit `{ trigger, rowCount }` with no NUX policy         |
| `src/components/permissions/ShareResourceModal/useShareResourceModalState/useResourceShareMutations.ts` | emit reason code                                        |
| `src/components/AppShell/AppShell.tsx`                                                                  | drop `NuxOpenChatPanelEffect`                           |
| `src/components/ChatPanel/ChatPanel/ChatPanel.tsx`                                                      | mount the effect                                        |
| `src/views/ProfileView/ProfileView.tsx`                                                                 | render `<TutorialSection />` only                       |
| `src/views/ProfileView/TutorialSection/TutorialSection.tsx`                                             | eligibility, restart, navigation                        |
| `shared/types/database.types.ts`                                                                        | generated after migration                               |

**Delete**

| File                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------ |
| `src/components/Nux/NuxStateManager/getAutoCheckedMilestonesFromArtifacts/getAutoCheckedMilestonesFromArtifacts.ts`      |
| `src/components/Nux/NuxStateManager/getAutoCheckedMilestonesFromArtifacts/getAutoCheckedMilestonesFromArtifacts.test.ts` |

---

### Task 1: Persist `catch_up_suppressed`

**Files:**

- Modify: `supabase/schemas/01.user_nux_progress.sql`
- Create (generated): `supabase/migrations/<timestamp>_add_nux_catch_up_suppressed.sql`
- Modify (generated): `shared/types/database.types.ts`

No unit test. The check is the generated migration adding only this column.

- [ ] **Step 1: Isolate local Supabase for this branch**

```bash
ava supabase switch feat-nux
```

Confirm `supabase/config.toml` now uses a `feat-nux` project id. Do not stage that file later.

- [ ] **Step 2: Add the column to the declarative table**

Append to the column list in `supabase/schemas/01.user_nux_progress.sql` (end of columns, before the unique constraint):

```sql
-- When true, artifact catch-up must not complete milestones. Restart sets
-- this so a replay is not immediately re-ticked by existing workspace rows.
-- Never cleared: a replay stays a replay until the user finishes or dismisses.
catch_up_suppressed boolean not null default false,
```

- [ ] **Step 3: Reset, then generate the migration**

```bash
pnpm db:reset
pnpm db:new-migration add_nux_catch_up_suppressed
```

Open the new file under `supabase/migrations/`. It must `add column catch_up_suppressed`. If it drops or alters anything else, stop, `pnpm db:reset`, regenerate, and compare. Do not keep a migration that drops objects you did not touch.

- [ ] **Step 4: Regenerate database types**

```bash
pnpm db:gen-types
```

Confirm `user_nux_progress.Row` includes `catch_up_suppressed: boolean`.

- [ ] **Step 5: Commit (schema + types only; not `supabase/config.toml`)**

```bash
git add supabase/schemas/01.user_nux_progress.sql supabase/migrations/*add_nux_catch_up_suppressed.sql shared/types/database.types.ts
git commit -m "$(cat <<'EOF'
feat(nux): persist catch-up suppression for tutorial replay

Restart must survive refresh without artifact catch-up immediately
re-completing milestones the user asked to walk again.
EOF
)"
```

---

### Task 2: Model and client round-trip `isCatchUpSuppressed`

**Files:**

- Modify: `shared/models/NuxProgress/NuxProgress.types.ts`
- Modify: `src/clients/NuxProgressClient/NuxProgressClient.ts`
- Test: `src/clients/NuxProgressClient/NuxProgressClient.test.ts`

- [ ] **Step 1: Write the failing parse test**

In `src/clients/NuxProgressClient/NuxProgressClient.test.ts`, add `catch_up_suppressed: false` to `DB_ROW` and:

```typescript
it("maps catch_up_suppressed to isCatchUpSuppressed", () => {
  const model = NuxProgressDBReadToModelReadSchema.parse({
    ...DB_ROW,
    catch_up_suppressed: true,
  });
  expect(model.isCatchUpSuppressed).toBe(true);
});
```

Keep the existing tests passing once `DB_ROW` includes the new required column (`false`).

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm test:frontend src/clients/NuxProgressClient/NuxProgressClient.test.ts
```

Expected: FAIL (`catch_up_suppressed` unrecognized and/or `isCatchUpSuppressed` missing).

- [ ] **Step 3: Minimal implementation**

`shared/models/NuxProgress/NuxProgress.types.ts` — add to `NuxProgressRead`:

```typescript
/**
 * When true, workspace-artifact catch-up must not complete milestones.
 * Restart sets this so a replay is not immediately re-ticked.
 */
isCatchUpSuppressed: boolean;
```

`NuxProgressClient.ts`:

- Zod object: `catch_up_suppressed: z.boolean()`
- Transform: `isCatchUpSuppressed: row.catch_up_suppressed`
- `updateProgress` `data` accepts `isCatchUpSuppressed?: boolean`
- Update payload: when defined, set `catch_up_suppressed: data.isCatchUpSuppressed`

- [ ] **Step 4: Run tests**

```bash
pnpm test:frontend src/clients/NuxProgressClient/NuxProgressClient.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/models/NuxProgress/NuxProgress.types.ts src/clients/NuxProgressClient/NuxProgressClient.ts src/clients/NuxProgressClient/NuxProgressClient.test.ts
git commit -m "$(cat <<'EOF'
feat(nux): round-trip catch-up suppression on the progress row

The judge and restart action need this flag in the model, not only in SQL.
EOF
)"
```

---

### Task 3: Live-signal payloads carry facts, not tutorial copy

**Files:**

- Modify: `src/components/Nux/NuxEvents/NuxEvents.ts`
- Test: `src/components/Nux/NuxEvents/NuxEvents.test.ts`

- [ ] **Step 1: Write the failing emit-shape tests**

Replace the `query.succeeded` and `dashboard.shareBlocked` emits in `NuxEvents.test.ts`:

```typescript
NuxEvents.emit("query.succeeded", {
  trigger: "sql_submit",
  rowCount: 3,
});

NuxEvents.emit("dashboard.shareBlocked", {
  reason: "shareable_dashboard_limit",
});
```

And assert those payloads. A test that still emits `query.succeeded` with `{}` or `reason: "plan limit"` must fail the typecheck / assertion.

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm test:frontend src/components/Nux/NuxEvents/NuxEvents.test.ts
```

Expected: FAIL (payload types still `Record<string, never>` / `reason: string`).

- [ ] **Step 3: Minimal implementation**

In `NuxEvents.ts`:

```typescript
import type { UserQueryAnalyticsTrigger } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";

export type NuxShareBlockedReason = "shareable_dashboard_limit";

export type NuxEventPayloads = {
  "dataset.saved": { datasetId: string };
  "query.succeeded": {
    trigger: UserQueryAnalyticsTrigger;
    rowCount: number;
  };
  "dashboard.created": { dashboardId: string };
  "dashboard.sharedToWorkspace": { dashboardId: string };
  "dashboard.shareBlocked": { reason: NuxShareBlockedReason };
};
```

Fix every other `query.succeeded` / `shareBlocked` emit in the repo that now type-errors (`NuxEvents.test.ts` is this task; DataExplorer and the share modal are later tasks — if `pnpm type-check` fails on them after this change, leave those call sites compiling by updating their emit arguments in this task to the new shape, even if they still contain NUX policy. Strip the policy in Tasks 11 and 12).

For `DataExplorerApp` temporarily emit:

```typescript
NuxEvents.emit("query.succeeded", {
  trigger: state.queryTrigger,
  rowCount: queryResults?.data?.length ?? 0,
});
```

still behind the existing trigger filter if that is the smallest compile fix. Task 11 removes the filter.

For share modal, temporarily emit `reason: "shareable_dashboard_limit"` instead of the Lingui string. Task 12 moves the copy.

- [ ] **Step 4: Run tests**

```bash
pnpm test:frontend src/components/Nux/NuxEvents/NuxEvents.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Nux/NuxEvents/NuxEvents.ts src/components/Nux/NuxEvents/NuxEvents.test.ts src/views/DataExplorerApp/DataExplorerApp.tsx src/components/permissions/ShareResourceModal/useShareResourceModalState/useResourceShareMutations.ts
git commit -m "$(cat <<'EOF'
feat(nux): emit query and share-blocked facts instead of tutorial policy

The judge needs trigger, row count, and a closed reason union. Copy and
"does this count" stay in NUX.
EOF
)"
```

Only stage the call sites you actually had to touch to compile.

---

### Task 4: Declare `first_dashboard` prerequisite strategies

**Files:**

- Create: the seven files under `src/components/Nux/NuxPrerequisites/` listed in File structure (types + four strategies + registry + tests)

- [ ] **Step 1: Write the failing `runQueryPrerequisite` tests**

Create `src/components/Nux/NuxPrerequisites/firstDashboard/runQueryPrerequisite.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { runQueryPrerequisite } from "@/components/Nux/NuxPrerequisites/firstDashboard/runQueryPrerequisite";
import type { NuxEvent } from "@/components/Nux/NuxEvents/NuxEvents";
import type { NuxPrerequisiteFacts } from "@/components/Nux/NuxPrerequisites/NuxPrerequisite.types";

const EMPTY_FACTS: NuxPrerequisiteFacts = {
  hasDataset: false,
  hasDashboard: false,
  hasWorkspaceSharedDashboard: false,
};

function _queryEvent(
  trigger:
    | "sql_submit"
    | "structured_change"
    | "chat_generated"
    | "url_hydration"
    | "dataset_opened",
  rowCount: number,
): NuxEvent {
  return {
    name: "query.succeeded",
    payload: { trigger, rowCount },
  };
}

describe("runQueryPrerequisite.matchesEvent", () => {
  it("accepts a user-asked query that returned rows", () => {
    expect(
      runQueryPrerequisite.matchesEvent?.(_queryEvent("sql_submit", 1)),
    ).toBe(true);
    expect(
      runQueryPrerequisite.matchesEvent?.(_queryEvent("structured_change", 4)),
    ).toBe(true);
    expect(
      runQueryPrerequisite.matchesEvent?.(_queryEvent("chat_generated", 2)),
    ).toBe(true);
  });

  it("rejects explorer-initiated runs and empty results", () => {
    expect(
      runQueryPrerequisite.matchesEvent?.(_queryEvent("url_hydration", 10)),
    ).toBe(false);
    expect(
      runQueryPrerequisite.matchesEvent?.(_queryEvent("dataset_opened", 10)),
    ).toBe(false);
    expect(
      runQueryPrerequisite.matchesEvent?.(_queryEvent("sql_submit", 0)),
    ).toBe(false);
  });
});

describe("runQueryPrerequisite.isSatisfied", () => {
  it("is never satisfied by workspace artifacts", () => {
    expect(
      runQueryPrerequisite.isSatisfied({
        ...EMPTY_FACTS,
        hasDataset: true,
        hasDashboard: true,
        hasWorkspaceSharedDashboard: true,
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm test:frontend src/components/Nux/NuxPrerequisites/firstDashboard/runQueryPrerequisite.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement types and all four strategies**

`NuxPrerequisite.types.ts`:

```typescript
import type {
  NuxEvent,
  NuxEventName,
} from "@/components/Nux/NuxEvents/NuxEvents";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";

export type NuxPrerequisiteFacts = {
  hasDataset: boolean;
  hasDashboard: boolean;
  hasWorkspaceSharedDashboard: boolean;
};

export type NuxPrerequisite = {
  milestoneKey: NuxProgress.MilestoneKey;
  completionEvent?: NuxEventName;
  matchesEvent?: (event: NuxEvent) => boolean;
  isSatisfied: (facts: Readonly<NuxPrerequisiteFacts>) => boolean;
};
```

Each strategy file exports one named const matching the filename (`addDatasetPrerequisite`, etc.). `runQueryPrerequisite.matchesEvent` returns true only when `event.name === "query.succeeded"` and `trigger` is `sql_submit` | `structured_change` | `chat_generated` and `rowCount > 0`. `isSatisfied` returns `false`.

The other three: default (no `matchesEvent`), `isSatisfied` reads the matching fact.

`firstDashboardPrerequisites.ts`:

```typescript
export const FIRST_DASHBOARD_PREREQUISITES: readonly NuxPrerequisite[] = [
  addDatasetPrerequisite,
  runQueryPrerequisite,
  buildDashboardPrerequisite,
  shareDashboardPrerequisite,
];
```

- [ ] **Step 4: Add the registry alignment test**

`firstDashboardPrerequisites.test.ts`: every `FIRST_DASHBOARD_MILESTONES` entry's `completionEvent` equals the strategy with the same `milestoneKey`. This fails if someone updates copy data and forgets the strategy.

- [ ] **Step 5: Run tests**

```bash
pnpm test:frontend src/components/Nux/NuxPrerequisites/firstDashboard/runQueryPrerequisite.test.ts src/components/Nux/NuxPrerequisites/firstDashboard/firstDashboardPrerequisites.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Nux/NuxPrerequisites
git commit -m "$(cat <<'EOF'
feat(nux): declare first-dashboard prerequisites as strategy objects

A new pre-req is filling in NuxPrerequisite. The judge must not switch
on milestone keys.
EOF
)"
```

---

### Task 5: Pure `NuxPrerequisiteJudge`

**Files:**

- Create: `src/components/Nux/NuxPrerequisites/NuxPrerequisiteJudge.ts`
- Test: `src/components/Nux/NuxPrerequisites/NuxPrerequisiteJudge.test.ts`

- [ ] **Step 1: Write the failing judge tests**

Use `FIRST_DASHBOARD_PREREQUISITES` (real strategies), not fakes, for artifact cases:

```typescript
const EMPTY_FACTS: NuxPrerequisiteFacts = {
  hasDataset: false,
  hasDashboard: false,
  hasWorkspaceSharedDashboard: false,
};

describe("NuxPrerequisiteJudge.getCatchUpKeys", () => {
  it("returns nothing for empty facts", () => {
    expect(
      NuxPrerequisiteJudge.getCatchUpKeys({
        facts: EMPTY_FACTS,
        completedMilestones: [],
        prerequisites: FIRST_DASHBOARD_PREREQUISITES,
        isCatchUpSuppressed: false,
      }),
    ).toEqual([]);
  });

  it("completes only add_dataset when a dataset exists", () => {
    expect(
      NuxPrerequisiteJudge.getCatchUpKeys({
        facts: { ...EMPTY_FACTS, hasDataset: true },
        completedMilestones: [],
        prerequisites: FIRST_DASHBOARD_PREREQUISITES,
        isCatchUpSuppressed: false,
      }),
    ).toEqual(["add_dataset"]);
  });

  it("does not complete run_query when a dashboard exists", () => {
    expect(
      NuxPrerequisiteJudge.getCatchUpKeys({
        facts: { ...EMPTY_FACTS, hasDashboard: true },
        completedMilestones: [],
        prerequisites: FIRST_DASHBOARD_PREREQUISITES,
        isCatchUpSuppressed: false,
      }),
    ).toEqual(["build_dashboard"]);
  });

  it("completes each artifact independently", () => {
    expect(
      NuxPrerequisiteJudge.getCatchUpKeys({
        facts: {
          hasDataset: true,
          hasDashboard: true,
          hasWorkspaceSharedDashboard: true,
        },
        completedMilestones: [],
        prerequisites: FIRST_DASHBOARD_PREREQUISITES,
        isCatchUpSuppressed: false,
      }),
    ).toEqual(["add_dataset", "build_dashboard", "share_dashboard"]);
  });

  it("does not re-add an already completed milestone", () => {
    expect(
      NuxPrerequisiteJudge.getCatchUpKeys({
        facts: { ...EMPTY_FACTS, hasDataset: true },
        completedMilestones: ["add_dataset"],
        prerequisites: FIRST_DASHBOARD_PREREQUISITES,
        isCatchUpSuppressed: false,
      }),
    ).toEqual([]);
  });

  it("returns nothing when catch-up is suppressed", () => {
    expect(
      NuxPrerequisiteJudge.getCatchUpKeys({
        facts: {
          hasDataset: true,
          hasDashboard: true,
          hasWorkspaceSharedDashboard: true,
        },
        completedMilestones: [],
        prerequisites: FIRST_DASHBOARD_PREREQUISITES,
        isCatchUpSuppressed: true,
      }),
    ).toEqual([]);
  });
});
```

Also test `matchesLiveEvent`: `query.succeeded` + `sql_submit` + rows matches `runQueryPrerequisite`; `url_hydration` does not; `dataset.saved` matches `addDatasetPrerequisite`.

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm test:frontend src/components/Nux/NuxPrerequisites/NuxPrerequisiteJudge.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Minimal implementation**

```typescript
export const NuxPrerequisiteJudge = {
  getCatchUpKeys(options: {
    facts: Readonly<NuxPrerequisiteFacts>;
    completedMilestones: readonly NuxProgress.MilestoneKey[];
    prerequisites: readonly NuxPrerequisite[];
    isCatchUpSuppressed: boolean;
  }): readonly NuxProgress.MilestoneKey[] {
    if (options.isCatchUpSuppressed) {
      return [];
    }
    const completed = new Set(options.completedMilestones);
    return options.prerequisites
      .filter((prerequisite) => {
        return (
          !completed.has(prerequisite.milestoneKey) &&
          prerequisite.isSatisfied(options.facts)
        );
      })
      .map((prerequisite) => {
        return prerequisite.milestoneKey;
      });
  },

  matchesLiveEvent(event: NuxEvent, prerequisite: NuxPrerequisite): boolean {
    if (prerequisite.completionEvent !== event.name) {
      return false;
    }
    return prerequisite.matchesEvent?.(event) ?? true;
  },
};
```

Keep both functions short. No milestone-key switch.

- [ ] **Step 4: Run tests**

```bash
pnpm test:frontend src/components/Nux/NuxPrerequisites/NuxPrerequisiteJudge.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Nux/NuxPrerequisites/NuxPrerequisiteJudge.ts src/components/Nux/NuxPrerequisites/NuxPrerequisiteJudge.test.ts
git commit -m "$(cat <<'EOF'
feat(nux): add a pure prerequisite judge for independent catch-up

Prefix auto-check was forging run_query from dashboards and never
re-running after the invite.
EOF
)"
```

---

### Task 6: Reducer: suppress on restart, batch catch-up

**Files:**

- Modify: `src/components/Nux/NuxStateManager/NuxAppState.types.ts`
- Modify: `src/components/Nux/NuxStateManager/nuxActions/nuxActions.ts`
- Test: `src/components/Nux/NuxStateManager/nuxActions/nuxActions.test.ts`

- [ ] **Step 1: Write the failing action tests**

Add `isCatchUpSuppressed: false` to `HYDRATED` once the field exists on the type (or add it in the same change as the tests).

```typescript
describe("nuxActions.restart", () => {
  it("suppresses artifact catch-up so replay is not immediately re-ticked", () => {
    const nextState = nuxActions.restart({
      ...HYDRATED,
      status: "completed",
      completedMilestones: [
        "add_dataset",
        "run_query",
        "build_dashboard",
        "share_dashboard",
      ],
    });
    expect(nextState.isCatchUpSuppressed).toBe(true);
    expect(nextState.completedMilestones).toEqual([]);
  });
});

describe("nuxActions.catchUpMilestones", () => {
  it("records every new key in one transition", () => {
    const nextState = nuxActions.catchUpMilestones(HYDRATED, [
      "add_dataset",
      "build_dashboard",
    ]);
    expect(nextState.completedMilestones).toEqual([
      "add_dataset",
      "build_dashboard",
    ]);
  });

  it("jumps the open milestone to its payoff tooltip", () => {
    const nextState = nuxActions.catchUpMilestones(
      { ...HYDRATED, activeMilestoneKey: "add_dataset", activeStepIndex: 0 },
      ["add_dataset"],
    );
    expect(nextState.activeMilestoneKey).toBe("add_dataset");
    expect(nextState.activeStepIndex).toBe(2);
  });

  it("does not reopen a dismissed tutorial", () => {
    const nextState = nuxActions.catchUpMilestones(
      { ...HYDRATED, status: "dismissed" },
      ["add_dataset"],
    );
    expect(nextState.status).toBe("dismissed");
    expect(nextState.isPanelExpanded).toBe(false);
  });

  it("returns the same state when there is nothing to add", () => {
    const state = {
      ...HYDRATED,
      completedMilestones: ["add_dataset"] as const,
    };
    expect(nuxActions.catchUpMilestones(state, ["add_dataset"])).toBe(state);
  });
});

describe("nuxActions.hydrate", () => {
  it("seeds isCatchUpSuppressed from the persisted row", () => {
    const nextState = nuxActions.hydrate(INITIAL_NUX_STATE, {
      progressId: HYDRATED.progressId!,
      status: "in_progress",
      completedMilestones: [],
      isCatchUpSuppressed: true,
    });
    expect(nextState.isCatchUpSuppressed).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm test:frontend src/components/Nux/NuxStateManager/nuxActions/nuxActions.test.ts
```

Expected: FAIL (`catchUpMilestones` missing and/or flag not set).

- [ ] **Step 3: Minimal implementation**

- `NuxAppState.isCatchUpSuppressed: boolean`
- `INITIAL_NUX_STATE.isCatchUpSuppressed: false`
- `hydrate` copies `payload.isCatchUpSuppressed`
- `restart` sets `isCatchUpSuppressed: true`
- `catchUpMilestones(state, keys)`:
  - `const pendingKeys = keys.filter((key) => !state.completedMilestones.includes(key))`
  - if `pendingKeys.length === 0`, return `state` (same reference)
  - `return pendingKeys.reduce((nextState, key) => nuxActions.completeMilestone(nextState, { key }), state)`

Do not special-case status in `catchUpMilestones`. `completeMilestone` already keeps `dismissed`. The hook (Task 10) is what refuses to dispatch for `completed` / `dismissed`.

- [ ] **Step 4: Run tests**

```bash
pnpm test:frontend src/components/Nux/NuxStateManager/nuxActions/nuxActions.test.ts
```

Expected: PASS. If other NUX tests fail because `NuxAppState` object literals omit the new field, add `isCatchUpSuppressed: false` (or spread `INITIAL_NUX_STATE`). That is in scope.

- [ ] **Step 5: Commit**

```bash
git add src/components/Nux/NuxStateManager
git commit -m "$(cat <<'EOF'
feat(nux): restart suppresses catch-up and batch-complete artifacts

Replay must not be overwritten by existing datasets, and catch-up must
be one persist rather than one write per milestone.
EOF
)"
```

---

### Task 7: Persistence writes the flag

**Files:**

- Modify: `src/components/Nux/NuxRoot/useNuxPersistence.ts`

- [ ] **Step 1: Write a failing persistence test**

Create `src/components/Nux/NuxRoot/useNuxPersistence.test.tsx` that:

1. Renders a harness calling `useNuxPersistence` under `NuxStateManager.Provider` with `isHydrated: true`, `progressId` set, `status: "in_progress"`, `isCatchUpSuppressed: false`.
2. Mocks `NuxProgressClient.updateProgress`.
3. After the first effect (baseline signature), dispatch `restart` via `NuxStateManager.useDispatch()` inside an `act`.
4. Expect `updateProgress` to have been called with `data.isCatchUpSuppressed: true`.

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm test:frontend src/components/Nux/NuxRoot/useNuxPersistence.test.tsx
```

Expected: FAIL (signature omits the flag, so restart that only flips the flag would not write — or the write payload lacks the field).

- [ ] **Step 3: Include the flag in the persist signature and payload**

```typescript
const signature = JSON.stringify({
  status: state.status,
  completedMilestones: state.completedMilestones,
  isCatchUpSuppressed: state.isCatchUpSuppressed,
});
// ...
void NuxProgressClient.updateProgress({
  progressId: state.progressId,
  data: {
    status: state.status,
    completedMilestones: state.completedMilestones,
    isCatchUpSuppressed: state.isCatchUpSuppressed,
  },
});
```

Add `state.isCatchUpSuppressed` to the effect deps.

- [ ] **Step 4: Run the persistence test if you wrote one, plus nuxActions tests**

```bash
pnpm test:frontend src/components/Nux/NuxRoot/useNuxPersistence.test.tsx src/components/Nux/NuxStateManager/nuxActions/nuxActions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Nux/NuxRoot/useNuxPersistence.ts src/components/Nux/NuxRoot/useNuxPersistence.test.tsx
git commit -m "$(cat <<'EOF'
feat(nux): persist catch-up suppression with the progress row

Restart must survive a refresh, not only the current session.
EOF
)"
```

---

### Task 8: First-paint hydration uses the judge

**Files:**

- Create: `src/components/Nux/NuxRoot/hydrateNuxProgressForWorkspace/hydrateNuxProgressForWorkspace.ts`
- Test: `src/components/Nux/NuxRoot/hydrateNuxProgressForWorkspace/hydrateNuxProgressForWorkspace.test.ts`
- Modify: `src/components/Nux/NuxRoot/useNuxHydration.ts`
- Delete: `getAutoCheckedMilestonesFromArtifacts.ts` and its test

**Do not copy the old `if (progress.status !== "not_started") return`.** Catch-up runs for `not_started` and `in_progress` unless suppressed, dismissed, or completed.

- [ ] **Step 1: Write the failing hydrate tests**

Mock `NuxProgressClient.ensureForCurrentUser`, `getWorkspaceArtifacts`, and `updateProgress`.

Cases:

1. `not_started`, empty artifacts → no `updateProgress`, completed `[]`, `isCatchUpSuppressed: false`.
2. `not_started`, `hasDataset: true` → `updateProgress` with `completedMilestones: ["add_dataset"]`, status stays `not_started`.
3. `not_started`, all three artifact flags true → completed `["add_dataset", "build_dashboard", "share_dashboard"]` (no `run_query`), status still `not_started` (tutorial not finished).
4. `in_progress`, `isCatchUpSuppressed: true`, artifacts present → no `updateProgress`, completed stays whatever the row had (empty).
5. `in_progress`, `isCatchUpSuppressed: false`, `hasDataset: true`, completed `[]` → catch-up writes `["add_dataset"]`.
6. `dismissed` → no artifact catch-up write.
7. `completed` → no artifact catch-up write.

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm test:frontend src/components/Nux/NuxRoot/hydrateNuxProgressForWorkspace/hydrateNuxProgressForWorkspace.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement `hydrateNuxProgressForWorkspace`**

Return shape:

```typescript
export type HydrationResult = {
  progressId: NuxProgress.Id;
  status: NuxProgress.Status;
  completedMilestones: readonly NuxProgress.MilestoneKey[];
  isCatchUpSuppressed: boolean;
};
```

Algorithm:

1. `progress = await NuxProgressClient.ensureForCurrentUser()`.
2. If `status` is `dismissed` or `completed`, or `isCatchUpSuppressed`, return the row as-is (including the flag).
3. `facts = await NuxProgressClient.getWorkspaceArtifacts({ workspaceId })`.
4. `keys = NuxPrerequisiteJudge.getCatchUpKeys({ facts, completedMilestones: progress.completedMilestones, prerequisites: FIRST_DASHBOARD_PREREQUISITES, isCatchUpSuppressed: progress.isCatchUpSuppressed })`.
5. If `keys` is empty, return the row.
6. `completedMilestones = [...progress.completedMilestones, ...keys]`.
7. `status = areAllMilestonesComplete(completedMilestones) ? "completed" : progress.status` (do not overwrite `dismissed`; that path already returned).
8. `await NuxProgressClient.updateProgress({ progressId, data: { status, completedMilestones } })`.
9. Return the merged result with `isCatchUpSuppressed` from the row.

`useNuxHydration` calls this helper and `dispatch.hydrate` with all four fields. Delete `_hydrateNuxProgressForWorkspace` from the hook file. Delete `getAutoCheckedMilestonesFromArtifacts*`.

- [ ] **Step 4: Run tests**

```bash
pnpm test:frontend src/components/Nux/NuxRoot/hydrateNuxProgressForWorkspace/hydrateNuxProgressForWorkspace.test.ts src/components/Nux/NuxStateManager/getAutoCheckedMilestonesFromArtifacts/getAutoCheckedMilestonesFromArtifacts.test.ts
```

Expected: hydrate tests PASS; the deleted-file test path should not run (file gone). Grep the repo for `getAutoCheckedMilestonesFromArtifacts` and fix any leftover imports.

- [ ] **Step 5: Commit**

```bash
git add src/components/Nux/NuxRoot src/components/Nux/NuxStateManager
git commit -m "$(cat <<'EOF'
feat(nux): catch up NUX progress from artifacts at hydrate

Replace the not_started-only prefix table with the judge so independent
milestones can tick without forging run_query.
EOF
)"
```

---

### Task 9: Live completion uses strategies

**Files:**

- Modify: `src/components/Nux/NuxRoot/useNuxCompletionEvents.ts`

- [ ] **Step 1: Write the failing live-match tests**

Add `src/components/Nux/NuxRoot/useNuxCompletionEvents.test.tsx`. The match decision is `NuxPrerequisiteJudge.matchesLiveEvent`; the hook tests the subscriber side effects:

1. Emit `query.succeeded` `{ trigger: "url_hydration", rowCount: 10 }` while `run_query` is incomplete → `completedMilestones` does **not** include `run_query`.
2. Emit `query.succeeded` `{ trigger: "sql_submit", rowCount: 1 }` → includes `run_query`.
3. Emit `dashboard.shareBlocked` `{ reason: "shareable_dashboard_limit" }` → `blockedReason` is the Lingui string currently in the share modal (`Your plan does not allow sharing another dashboard. You can upgrade, or unshare another dashboard, and come back to this.`).

Render a harness that calls `useNuxCompletionEvents` under `NuxStateManager.Provider` + a workspace mock if the hook reads `useCurrentWorkspace` (it does, for analytics). Mock `AnalyticsClient.logEvent`. Mock `useCurrentWorkspace` the same way other NUX tests do, or wrap with whatever `test-utils` already provides.

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm test:frontend src/components/Nux/NuxRoot/useNuxCompletionEvents.test.tsx
```

Expected: FAIL (`url_hydration` still completes, or share-blocked still expects a raw string from the event).

- [ ] **Step 3: Wire the subscriber to strategies**

Keep the dismissed early-return and the `dashboard.shareBlocked` branch first.

Share-blocked: `useLingui()` + `matchLiteral` on `event.payload.reason` with the `t\`...\``string **in this hook**. Do not pass`t` into a helper (Lingui will not extract it).

Completion:

```typescript
const prerequisite = FIRST_DASHBOARD_PREREQUISITES.find((candidate) => {
  return NuxPrerequisiteJudge.matchesLiveEvent(event, candidate);
});
if (!prerequisite) {
  return;
}
dispatch.completeMilestone({
  key: prerequisite.milestoneKey,
  datasetId:
    event.name === "dataset.saved" ? event.payload.datasetId : undefined,
  dashboardId:
    event.name === "dashboard.created" ? event.payload.dashboardId : undefined,
});
```

Stop using `FIRST_DASHBOARD_MILESTONES.find(propEq("completionEvent", event.name))`.

- [ ] **Step 4: Run tests**

```bash
pnpm test:frontend src/components/Nux/NuxRoot/useNuxCompletionEvents.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Extract i18n**

```bash
pnpm i18n:extract
```

Stage only the catalog hunks for this string if it moved. If the string is unchanged and already in the catalog, the extract may be a no-op.

- [ ] **Step 6: Commit**

```bash
git add src/components/Nux/NuxRoot/useNuxCompletionEvents.ts src/components/Nux/NuxRoot/useNuxCompletionEvents.test.tsx src/i18n/locales
git commit -m "$(cat <<'EOF'
feat(nux): complete milestones through prerequisite strategies

url_hydration must not finish run_query, and share-blocked copy belongs
in NUX, not the share mutation.
EOF
)"
```

---

### Task 10: Subscribe to artifacts after hydrate

**Files:**

- Create: `src/components/Nux/NuxPrerequisites/useNuxPrerequisiteJudge.ts`
- Test: `src/components/Nux/NuxPrerequisites/useNuxPrerequisiteJudge.test.tsx`
- Modify: `src/components/Nux/NuxRoot/NuxRootContents.tsx`

- [ ] **Step 1: Write the failing hook tests**

Mock `NuxProgressClient.useGetWorkspaceArtifacts` to return controllable `data`. Harness calls the hook under `NuxStateManager.Provider`.

1. Hydrated, `in_progress`, not suppressed, artifacts `{ hasDataset: true, ...false }` → `completedMilestones` includes `add_dataset`.
2. Same artifacts, `isCatchUpSuppressed: true` → does not add `add_dataset`.
3. `status: "dismissed"` → does not write.
4. `status: "completed"` → does not write.
5. `isHydrated: false` → does not write.
6. Changing mock artifacts from empty to `hasDashboard: true` after a rerender → adds `build_dashboard` only.

Use `act` + rerender. Spy `NuxProgressClient.updateProgress` is **not** required; asserting manager state is enough (`useNuxPersistence` is a different hook).

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm test:frontend src/components/Nux/NuxPrerequisites/useNuxPrerequisiteJudge.test.tsx
```

Expected: FAIL (hook missing).

- [ ] **Step 3: Implement the hook and mount it**

```typescript
export function useNuxPrerequisiteJudge(): void {
  const workspace = useCurrentWorkspace();
  const state = NuxStateManager.useState();
  const dispatch = NuxStateManager.useDispatch();
  const [artifacts] = NuxProgressClient.useGetWorkspaceArtifacts({
    workspaceId: workspace.id,
  });

  useEffect(
    function catchUpFromWorkspaceArtifacts() {
      if (!state.isHydrated || artifacts === undefined) {
        return;
      }
      if (state.status !== "not_started" && state.status !== "in_progress") {
        return;
      }
      const keys = NuxPrerequisiteJudge.getCatchUpKeys({
        facts: artifacts,
        completedMilestones: state.completedMilestones,
        prerequisites: FIRST_DASHBOARD_PREREQUISITES,
        isCatchUpSuppressed: state.isCatchUpSuppressed,
      });
      if (keys.length === 0) {
        return;
      }
      dispatch.catchUpMilestones(keys);
    },
    [
      artifacts,
      dispatch,
      state.completedMilestones,
      state.isCatchUpSuppressed,
      state.isHydrated,
      state.status,
    ],
  );
}
```

`NuxWorkspaceArtifacts` is the same shape as `NuxPrerequisiteFacts`. If TypeScript disagrees, pass an explicit object; do not add a mapper with behavior.

In `NuxRootContents`, call `useNuxPrerequisiteJudge()` next to `useNuxHydration()`.

- [ ] **Step 4: Run tests**

```bash
pnpm test:frontend src/components/Nux/NuxPrerequisites/useNuxPrerequisiteJudge.test.tsx src/components/Nux/NuxRoot/NuxRoot.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Nux/NuxPrerequisites/useNuxPrerequisiteJudge.ts src/components/Nux/NuxPrerequisites/useNuxPrerequisiteJudge.test.tsx src/components/Nux/NuxRoot/NuxRootContents.tsx
git commit -m "$(cat <<'EOF'
feat(nux): catch up tutorial progress when workspace artifacts change

Missed live signals should tick once the same queries the app already
invalidates settle.
EOF
)"
```

---

### Task 11: Data Explorer emits facts only

**Files:**

- Modify: `src/views/DataExplorerApp/DataExplorerApp.tsx`

There is no DataExplorerApp test harness. Do not add one. Policy coverage is `runQueryPrerequisite.test.ts`. This task deletes the policy from the view.

- [ ] **Step 1: Strip NUX policy from the effect**

Replace `announceSuccessfulQueryToNux` with:

```typescript
useEffect(
  function announceSettledQuery() {
    if (
      isLoadingResults ||
      dataQuery.isError ||
      announcedQueryAtRef.current === dataQuery.dataUpdatedAt
    ) {
      return;
    }
    announcedQueryAtRef.current = dataQuery.dataUpdatedAt;
    NuxEvents.emit("query.succeeded", {
      trigger: state.queryTrigger,
      rowCount: queryResults?.data?.length ?? 0,
    });
  },
  [
    isLoadingResults,
    dataQuery.isError,
    dataQuery.dataUpdatedAt,
    queryResults,
    state.queryTrigger,
  ],
);
```

Keep `announcedQueryAtRef` (dedupe the same settled query; that is not tutorial policy). Delete comments about `run_query`, `url_hydration`, and "asking something".

- [ ] **Step 2: Run related tests**

```bash
pnpm test:frontend src/components/Nux/NuxPrerequisites/firstDashboard/runQueryPrerequisite.test.ts src/components/Nux/NuxRoot/useNuxCompletionEvents.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/views/DataExplorerApp/DataExplorerApp.tsx
git commit -m "$(cat <<'EOF'
fix(nux): emit every settled explorer query as facts

Whether a run counts as asking a question is NUX's match, not the
explorer's.
EOF
)"
```

---

### Task 12: Share modal emits a reason code

**Files:**

- Modify: `src/components/permissions/ShareResourceModal/useShareResourceModalState/useResourceShareMutations.ts`

If Task 3 already switched the emit to `shareable_dashboard_limit`, this task only deletes tutorial comments and any leftover Lingui NUX copy from the emit. Keep the user-facing `notifyError` toast (that is the share UI, not the tutorial).

- [ ] **Step 1: Production change**

```typescript
NuxEvents.emit("dashboard.shareBlocked", {
  reason: "shareable_dashboard_limit",
});
```

Delete comments that mention the onboarding tutorial / checklist. Keep comments about the plan-limit toast if they explain the share UI.

- [ ] **Step 2: Type-check the share modal file's callers**

```bash
pnpm type-check
```

Expected: no errors on `NuxShareBlockedReason`.

- [ ] **Step 3: Commit**

```bash
git add src/components/permissions/ShareResourceModal/useShareResourceModalState/useResourceShareMutations.ts
git commit -m "$(cat <<'EOF'
fix(nux): emit a share-blocked reason code from the share mutation

Tutorial copy is not the modal's job.
EOF
)"
```

If Task 3 already made this exact change, skip the commit rather than making an empty one.

---

### Task 13: Mount chat-open effect in `ChatPanel`

**Files:**

- Modify: `src/components/AppShell/AppShell.tsx`
- Modify: `src/components/ChatPanel/ChatPanel/ChatPanel.tsx`
- Modify: `src/components/Nux/NuxTour/useNuxOpenChatPanel/NuxOpenChatPanelEffect.tsx` (comment only)

- [ ] **Step 1: Failing AppShell test that the shell still renders without importing NUX chat effect**

`AppShell.test.tsx` already renders without a workspace. After the move, that test must still pass. Add to `useNuxOpenChatPanel.test.tsx` (or ChatPanel) nothing structural. The existing hook tests remain the behavior tests.

- [ ] **Step 2: Run existing tests (baseline green)**

```bash
pnpm test:frontend src/components/AppShell/AppShell.test.tsx src/components/Nux/NuxTour/useNuxOpenChatPanel/useNuxOpenChatPanel.test.tsx
```

Expected: PASS (before the move).

- [ ] **Step 3: Move the mount**

Remove from `AppShell.tsx`:

- `NuxOpenChatPanelEffect` import
- `{currentWorkspace ? <NuxOpenChatPanelEffect /> : null}`

In `ChatPanel.tsx`, first line of the component body (still under `ChatPanelStateManager`):

```typescript
<NuxOpenChatPanelEffect />
```

or call it as a sibling inside the returned tree so it is unambiguously a child of `ChatPanel`. Update `NuxOpenChatPanelEffect` JSDoc: it must run under AppShell's inner `ChatPanelStateManager.Provider`; `ChatPanel` is that boundary, not `AppShell`.

- [ ] **Step 4: Re-run tests**

```bash
pnpm test:frontend src/components/AppShell/AppShell.test.tsx src/components/Nux/NuxTour/useNuxOpenChatPanel/useNuxOpenChatPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AppShell/AppShell.tsx src/components/ChatPanel/ChatPanel/ChatPanel.tsx src/components/Nux/NuxTour/useNuxOpenChatPanel/NuxOpenChatPanelEffect.tsx
git commit -m "$(cat <<'EOF'
fix(nux): open the chat panel from ChatPanel, not AppShell

AppShell should not import NUX. The effect still has to live under the
inner chat store.
EOF
)"
```

---

### Task 14: `TutorialSection` owns restart

**Files:**

- Modify: `src/views/ProfileView/TutorialSection/TutorialSection.tsx`
- Modify: `src/views/ProfileView/TutorialSection/TutorialSection.test.tsx`
- Modify: `src/views/ProfileView/ProfileView.tsx`

- [ ] **Step 1: Rewrite TutorialSection tests to the new contract**

`TutorialSection` takes no `onRestart` prop.

1. `useNuxEligibility` mocked `false` → no "Restart tutorial" button (and no stray "Tutorial" heading).
2. Eligibility `true` → button present, copy still must not contain "nux".
3. Click → `nuxActions.restart` effect on provided state (`isCatchUpSuppressed` true, completions empty) **or** mock `restartFirstDashboardTutorial` and `AnalyticsClient.logEvent` and assert they were called.

Mock:

```typescript
vi.mock("@/components/Nux/useNuxEligibility/useNuxEligibility", () => {
  return { useNuxEligibility: vi.fn() };
});
```

Wrap eligible cases in `NuxStateManager.Provider`. Mock `useNuxNavigation` to return `vi.fn()`. Mock `useCurrentWorkspace` if the section logs analytics (workspace id). Mock `AnalyticsClient.logEvent`.

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm test:frontend src/views/ProfileView/TutorialSection/TutorialSection.test.tsx
```

Expected: FAIL (component still requires `onRestart`).

- [ ] **Step 3: Move wiring out of ProfileView**

`TutorialSection`:

- `useNuxEligibility()`; return `null` when false (include the `Divider` inside the section when visible, so ProfileView does not render a dangling divider).
- `NuxStateManager.useDispatch()`, `useNuxNavigation()`, `useCurrentWorkspace()`.
- Button `onClick` calls `restartFirstDashboardTutorial({ restart: nuxDispatch.restart, openMilestone })` then `AnalyticsClient.logEvent({ event: "nux.restarted", workspaceId: workspace.id })`.

`ProfileView`: delete `useNuxNavigation`, `useNuxEligibility`, `NuxStateManager`, `restartFirstDashboardTutorial`, `AnalyticsClient` NUX usage. Always render `<TutorialSection />` after the password `Divider` — **or** drop that extra divider from ProfileView and let the section render `<> <Divider /> ... </>` when eligible.

- [ ] **Step 4: Run tests**

```bash
pnpm test:frontend src/views/ProfileView/TutorialSection/TutorialSection.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/ProfileView
git commit -m "$(cat <<'EOF'
fix(nux): keep profile tutorial restart inside TutorialSection

ProfileView should not read NUX state or eligibility.
EOF
)"
```

---

### Task 15: Final verification

- [ ] **Step 1: Grep for leftover prefix auto-check and NUX policy**

```bash
rg "getAutoCheckedMilestonesFromArtifacts" src
rg "isUserAskedQuestion" src
rg "NuxOpenChatPanelEffect" src/components/AppShell
```

Expected: no matches for the first two; AppShell does not import the effect.

- [ ] **Step 2: Type-check and lint**

```bash
pnpm type-check
pnpm lint
```

Fix every error this work introduced. In auto-fixable format:

```bash
pnpm lint:ts:fix-changed
```

- [ ] **Step 3: Run the NUX-related unit tests together**

```bash
pnpm test:frontend \
  src/components/Nux/NuxPrerequisites \
  src/components/Nux/NuxStateManager/nuxActions/nuxActions.test.ts \
  src/components/Nux/NuxRoot \
  src/components/Nux/NuxEvents/NuxEvents.test.ts \
  src/clients/NuxProgressClient/NuxProgressClient.test.ts \
  src/views/ProfileView/TutorialSection/TutorialSection.test.tsx \
  src/components/AppShell/AppShell.test.tsx \
  src/components/Nux/NuxTour/useNuxOpenChatPanel/useNuxOpenChatPanel.test.tsx
```

Expected: all PASS.

- [ ] **Step 4: Confirm `supabase/config.toml` is unstaged**

```bash
git status --short supabase/config.toml
```

If it is modified, leave it uncommitted. The user restores with `ava supabase restore` when they are done with the branch.

- [ ] **Step 5: Commit any leftover fixes from this task** (only if there are changes)

```bash
git commit -m "$(cat <<'EOF'
fix(nux): finish prerequisite-judge type and lint fallout
EOF
)"
```

Do not create an empty commit.

---

## Spec coverage

| Spec section                                             | Task                                        |
| -------------------------------------------------------- | ------------------------------------------- |
| Catch-up-only, never un-complete                         | 5, 6 (`completeMilestone` already additive) |
| Independent, not prefix; dashboard ≠ `run_query`         | 4, 5, 8                                     |
| Live events still complete immediately                   | 9                                           |
| `matchesEvent` owns query-trigger policy                 | 4, 9, 11                                    |
| Query subscription after hydrate                         | 10                                          |
| First paint atomic (`isHydrated` after first judge pass) | 8                                           |
| `catch_up_suppressed` column + restart                   | 1, 2, 6, 7                                  |
| Judge writes only `not_started` / `in_progress`          | 8, 10                                       |
| App emit contract                                        | 3, 11, 12                                   |
| AppShell / ChatPanel                                     | 13                                          |
| Profile / TutorialSection                                | 14                                          |
| Delete `getAutoCheckedMilestonesFromArtifacts`           | 8                                           |
| No Playwright catch-up spec                              | out of scope                                |
| No analytics `query.ran` detector                        | out of scope                                |
