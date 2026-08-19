# Nux First-Dashboard Tutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a restartable, once-per-user onboarding tutorial that walks an eligible new user from an empty workspace to a dashboard shared with their workspace, in four milestones and ten tooltips.

**Architecture:** A per-user `user_nux_progress` row (no `workspace_id`) holds lifecycle status and completed milestone keys. A pure tutorial definition module declares milestones and steps as data. A `createAppStateManager` reducer holds runtime state, mounted once in the workspace layout. Four existing success paths emit events through a tiny module-level bus, which is what advances the tour. A lazy-loaded `react-joyride` wrapper renders the tooltips; a global collapsible panel renders the checklist and does all cross-milestone routing.

**Tech Stack:** React 19.2.5, TypeScript, Mantine 9, TanStack Router + Query, Lingui, Supabase (declarative schema), Vitest + Testing Library, Playwright, react-joyride 3.2.0.

**Spec:** `docs/superpowers/specs/2026-08-16-nux-first-dashboard-tutorial-design.md`

---

## Conventions this plan follows

Read these once before Task 1. They are repo facts an engineer new to Avandar will otherwise get wrong.

- **`Nux` is an internal prefix only.** It appears in type names, file paths, and the database. It must never appear in user-facing copy, which says "tutorial".
- **All schema changes are declarative.** Edit `supabase/schemas/NN.*.sql`, then generate a migration. Never hand-write a file in `supabase/migrations/`.
- **Two path aliases exist.** `$/` resolves to `shared/`, `@/` resolves to `src/`. Imports from `shared/` into `shared/` use an explicit `.ts` extension; imports into `src/` do not.
- **The CRUD client factory is `createRdbCrudClient`** from `$/RdbCrudClient/createRdbCrudClient`, not the `createSupabaseCRUDClient` some older docs mention. This plan uses a hand-written service client instead, matching `src/clients/UserClient.ts`, because the model is a single upserted row per user.
- **All user-facing copy goes through Lingui.** In components use `<Trans>` or `useLingui()`'s `t`. In plain data modules use `msg` from `@lingui/core/macro` and resolve with `i18n._(descriptor)`, the pattern in `src/components/permissions/ShareResourceModal/ShareGeneralAccess/ShareGeneralAccess.tsx`. A `t` threaded in as a function parameter is invisible to the extractor and will never reach the catalogs.
- **react-joyride 3 is not react-joyride 2.** The component is a **named** export, the v2 `callback` prop is now `onEvent(data, controls)`, and defaults live in an `options` prop rather than under `styles.options`. Ignore v2 examples found online.
- **Commit after every task.** Use `feat(nux): ...` / `test(nux): ...` / `fix(nux): ...`.

**Verification commands** used throughout:

```bash
pnpm test:frontend       # vitest for src/
pnpm test:models         # vitest for shared/models
pnpm type-check          # tsc -b --noEmit
pnpm lint                # eslint + stylelint + react-doctor
pnpm i18n:check          # fails if extraction is stale
```

---

## File structure

**New — database**

| File | Responsibility |
| --- | --- |
| `supabase/schemas/00.enum.nux_status.sql` | the `nux_status` enum |
| `supabase/schemas/01.user_nux_progress.sql` | the table, its trigger, index, and RLS |

`01` because the table depends only on `auth.users` and the enum. It is a peer of `01.workspaces.sql`, not a dependent, and peers share an index.

**New — shared model**

| File | Responsibility |
| --- | --- |
| `shared/models/Nux/NuxProgress.constants.ts` | milestone key order and the tutorial key |
| `shared/models/Nux/NuxProgress.types.ts` | the read model and its branded id |
| `shared/models/Nux/NuxProgress.ts` | the `NuxProgress` namespace |

**New — client**

| File | Responsibility |
| --- | --- |
| `src/clients/NuxProgressClient.ts` | read, ensure, update the row; count workspace artifacts |

**New — pure tutorial logic (no React)**

| File | Responsibility |
| --- | --- |
| `src/components/Nux/nuxAnchors.ts` | every `data-nux` value and its selector |
| `src/components/Nux/nuxEvents.ts` | the completion-event bus |
| `src/components/Nux/tutorials/NuxTutorial.types.ts` | milestone and step shapes |
| `src/components/Nux/tutorials/firstDashboard.ts` | the four milestones and ten steps |
| `src/components/Nux/NuxStateManager/nuxSelectors.ts` | derived reads over milestone state |
| `src/components/Nux/NuxStateManager/resolveAutoCheckedMilestones.ts` | artifacts to already-done milestones |
| `src/components/Nux/NuxStateManager/nuxActions.ts` | the pure reducer actions |
| `src/components/Nux/NuxStateManager/NuxStateManager.ts` | the manager built from those actions |

**New — React**

| File | Responsibility |
| --- | --- |
| `src/components/Nux/useNuxEligibility.ts` | owner-or-admin, desktop width, web only |
| `src/components/Nux/NuxTour/NuxTooltip.tsx` | the Mantine-themed tooltip body |
| `src/components/Nux/NuxTour/buildJoyrideSteps.ts` | milestone steps to Joyride steps |
| `src/components/Nux/NuxTour/NuxTour.tsx` | the Joyride wrapper |
| `src/components/Nux/NuxTour/NuxTourLazy.tsx` | the `React.lazy` boundary |
| `src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.tsx` | the panel and its collapsed pill |
| `src/components/Nux/NuxWelcomeModal/NuxWelcomeModal.tsx` | the one-time invite |
| `src/components/Nux/NuxRoot/useNuxHydration.ts` | load the row, auto-check, hydrate |
| `src/components/Nux/NuxRoot/useNuxPersistence.ts` | write milestone and status changes back |
| `src/components/Nux/NuxRoot/useNuxCompletionEvents.ts` | bus subscription to milestone completion |
| `src/components/Nux/NuxRoot/useNuxNavigation.ts` | route when a milestone opens |
| `src/components/Nux/NuxRoot/NuxRoot.tsx` | composition behind the eligibility gate |
| `src/views/ProfileView/TutorialSection.tsx` | the restart control |

**New — assets and tests**

| File | Responsibility |
| --- | --- |
| `public/samples/avandar-sample-sales.csv` | the sample dataset |
| `tests/e2e/nux-first-milestone.spec.ts` | milestone 1 end to end |

**Modified**

| File | Change |
| --- | --- |
| `package.json` | add `react-joyride` |
| `shared/analytics/AnalyticsEvents/AnalyticsEvents.constants.ts` | five client event names |
| `shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts` | their payloads |
| `supabase/schemas/30.usage_analytics_events.sql` | RLS allowlist and category map |
| `src/components/layouts/RootLayout/WorkspaceLayoutContents.tsx` | mount `NuxRoot` |
| `src/views/ProfileView/ProfileView.tsx` | render `TutorialSection` |
| `src/views/DataExplorerApp/DataExplorerApp.tsx` | anchors, the builder fix, the query event |
| `src/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView.tsx` | upload and import anchors, save event |
| `src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/DatasetSummaryView.tsx` | summary anchor |
| `src/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer.tsx` | viz tab anchor |
| `src/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardModal.tsx` | dashboard-created event |
| `src/views/DashboardApp/DashboardShareModal/DashboardShareButton.tsx` | share button anchor |
| `src/components/permissions/ShareResourceModal/ShareGeneralAccess/ShareGeneralAccess.tsx` | access and role anchors, shared event |
| `src/components/ChatPanel/ChatThread/Composer/Composer.tsx` | chat composer anchor |

---

# Phase 1: Data foundation

## Task 1: Add the react-joyride dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

```bash
pnpm add react-joyride@3.2.0
```

- [ ] **Step 2: Verify the version and peer range**

Run: `pnpm why react-joyride`
Expected: a single `react-joyride 3.2.0` entry, no unmet-peer warning for react 19.

`react-joyride` is used only by the root app, so it stays out of the `catalog:` in `pnpm-workspace.yaml`. The catalog exists for packages that must resolve to exactly one copy across the workspace; nothing under `packages/` imports this.

- [ ] **Step 3: Confirm the export shape is v3, not v2**

Run:

```bash
node -e "const j=require('react-joyride'); console.log(Object.keys(j).sort().join(' '))"
```

Expected output includes `ACTIONS EVENTS Joyride LIFECYCLE ORIGIN STATUS useJoyride`. If you see a `default` export and no named `Joyride`, the wrong major version installed and every later task will fail to compile.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat(nux): add react-joyride 3 dependency"
```

---

## Task 2: Create the nux_status enum and user_nux_progress table

**Files:**
- Create: `supabase/schemas/00.enum.nux_status.sql`
- Create: `supabase/schemas/01.user_nux_progress.sql`

- [ ] **Step 1: Write the enum file**

Create `supabase/schemas/00.enum.nux_status.sql`:

```sql
-- Lifecycle state of one user's run through one onboarding tutorial.
--
--   not_started - the invite has never been answered. This is the only value
--                 that lets the auto-check run and the welcome modal appear.
--   in_progress - the invite HAS been answered, by either button, and the
--                 tutorial is neither finished nor dismissed. Read it as
--                 "offered", not as "actively touring". Writing it on the
--                 "Not now" path too is what makes the invite show once.
--   completed   - every milestone is done, or every milestone was already
--                 satisfied by existing work when the tutorial first loaded.
--   dismissed   - the user explicitly dismissed the checklist. Only the
--                 restart control on the profile page brings it back.
--
-- Keep new values at the end: moving one is not a rename, it forces a full
-- rebuild of the type and a rewrite of every column using it.
create type public.nux_status as enum(
  'not_started',
  'in_progress',
  'completed',
  'dismissed'
);
```

- [ ] **Step 2: Write the table file**

Create `supabase/schemas/01.user_nux_progress.sql`:

```sql
/**
 * One row per user per onboarding tutorial.
 *
 * Deliberately NOT scoped to a workspace. `user_profiles` is per workspace, so
 * it cannot answer "has this person ever been onboarded", and the product rule
 * is that the tutorial runs once per person for their whole Avandar life. A
 * second workspace must never re-trigger it.
 */
create table public.user_nux_progress (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Timestamp when the row was created
  created_at timestamptz not null default now(),
  -- Timestamp for last update
  updated_at timestamptz not null default now(),
  -- The user this progress belongs to
  user_id uuid not null default auth.uid () references auth.users (id) on update cascade on delete cascade,
  -- Which tutorial this row tracks. Only 'first_dashboard' exists today. The
  -- column plus the unique constraint below are what make a tutorial catalog
  -- additive later rather than another migration.
  tutorial_key text not null default 'first_dashboard',
  -- Lifecycle state. See `public.nux_status`.
  status public.nux_status not null default 'not_started',
  -- Milestone keys already finished, so a partial run resumes in place.
  -- Progress is persisted at milestone granularity, never per tooltip: four
  -- writes per tutorial instead of ten, and no resume-mid-tooltip bugs.
  -- Deliberately text[] rather than an enum, so renaming a milestone in
  -- TypeScript cannot make an existing row unreadable. The client filters
  -- unknown keys out on read.
  completed_milestones text[] not null default '{}',
  constraint user_nux_progress__unique_user_tutorial unique (user_id, tutorial_key)
);

-- Enable row level security
alter table public.user_nux_progress enable row level security;

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_user_nux_progress__set_updated_at before
update on public.user_nux_progress for each row
execute function public.util__set_updated_at ();

-- Index to improve lookups by user
create index idx_user_nux_progress__user_id on public.user_nux_progress (user_id);

-- Policies. A user may only ever read or write their own progress. There is
-- deliberately no DELETE policy: restarting the tutorial updates the row in
-- place, so there is no code path that needs to remove one.
create policy "
  User can SELECT user_nux_progress they own
" on public.user_nux_progress for
select
  to authenticated using (
    public.user_nux_progress.user_id = (
      select
        auth.uid ()
    )
  );

create policy "
  User can INSERT user_nux_progress they own
" on public.user_nux_progress for insert to authenticated
with
  check (
    public.user_nux_progress.user_id = (
      select
        auth.uid ()
    )
  );

create policy "
  User can UPDATE user_nux_progress they own
" on public.user_nux_progress
for update
  to authenticated using (
    public.user_nux_progress.user_id = (
      select
        auth.uid ()
    )
  );
```

- [ ] **Step 3: Generate the migration**

Run: `pnpm db:new-migration add_user_nux_progress`

This wraps `supabase stop && PGSSLMODE=disable supabase db diff -f add_user_nux_progress`.
Expected: a new file under `supabase/migrations/` containing `create type public.nux_status`, `create table public.user_nux_progress`, three policies, one trigger, one index.

- [ ] **Step 4: Read the generated migration before applying it**

Open the new `supabase/migrations/*_add_user_nux_progress.sql`. Confirm it contains no `drop` statement against any table you did not touch. If it drops storage policies, stop: that is the known `db diff` failure mode documented in the `supabase-declarative-schema` skill, and the fix is to check `supabase/schemas/99.storage.sql` is in sync, not to accept the migration.

- [ ] **Step 5: Apply and regenerate types**

```bash
pnpm db:apply-migrations
pnpm db:gen-types
```

- [ ] **Step 6: Verify the generated types**

Run: `grep -n "user_nux_progress" shared/types/database.types.ts | head -3`
Expected: at least one match, meaning the table reached the generated types.

Run: `grep -n "nux_status" shared/types/database.types.ts | head -3`
Expected: a match under `Enums`.

- [ ] **Step 7: Verify the declarative loop is closed**

Run: `supabase stop && PGSSLMODE=disable supabase db diff`
Expected: empty output. Non-empty means the migration and the declarative schema disagree.

- [ ] **Step 8: Commit**

```bash
git add supabase/schemas supabase/migrations shared/types/database.types.ts
git commit -m "feat(nux): add user_nux_progress table and nux_status enum"
```

---

## Task 3: Add the NuxProgress model

**Files:**
- Create: `shared/models/Nux/NuxProgress.constants.ts`
- Create: `shared/models/Nux/NuxProgress.types.ts`
- Create: `shared/models/Nux/NuxProgress.ts`
- Test: `shared/models/Nux/NuxProgress.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/models/Nux/NuxProgress.test.ts`:

```ts
import {
  FIRST_DASHBOARD_TUTORIAL_KEY,
  NUX_MILESTONE_KEYS,
} from "$/models/Nux/NuxProgress.constants.ts";
import { describe, expect, it } from "vitest";

describe("NuxProgress constants", () => {
  it("declares the four milestones in tutorial order", () => {
    expect(NUX_MILESTONE_KEYS).toEqual([
      "add_dataset",
      "run_query",
      "build_dashboard",
      "share_dashboard",
    ]);
  });

  it("names the only tutorial that ships", () => {
    expect(FIRST_DASHBOARD_TUTORIAL_KEY).toBe("first_dashboard");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run shared/models/Nux/NuxProgress.test.ts`
Expected: FAIL, "Failed to resolve import ... NuxProgress.constants.ts".

- [ ] **Step 3: Write the constants**

Create `shared/models/Nux/NuxProgress.constants.ts`:

```ts
/**
 * The four milestones of the `first_dashboard` tutorial, in the order a user
 * walks them. Order is meaningful: `getFirstUnfinishedMilestoneKey` and the
 * auto-check both read this array positionally.
 */
export const NUX_MILESTONE_KEYS = [
  "add_dataset",
  "run_query",
  "build_dashboard",
  "share_dashboard",
] as const;

/**
 * The only tutorial that ships. `user_nux_progress` is keyed on
 * (user_id, tutorial_key) so a catalog is additive later.
 */
export const FIRST_DASHBOARD_TUTORIAL_KEY = "first_dashboard";
```

- [ ] **Step 4: Write the types**

Create `shared/models/Nux/NuxProgress.types.ts`:

```ts
import type { NUX_MILESTONE_KEYS } from "$/models/Nux/NuxProgress.constants.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { Database } from "$/types/database.types.ts";
import type { UUID } from "@avandar/utils";

export type NuxProgressId = UUID<"NuxProgress">;

/** Mirrors the `nux_status` enum in `supabase/schemas/00.enum.nux_status.sql`. */
export type NuxStatus = Database["public"]["Enums"]["nux_status"];

/** One milestone of the `first_dashboard` tutorial. */
export type NuxMilestoneKey = (typeof NUX_MILESTONE_KEYS)[number];

/** The only tutorial key that exists today. */
export type NuxTutorialKey = "first_dashboard";

/**
 * A user's progress through one tutorial.
 *
 * There is no `workspaceId`, and that is the point: the tutorial is a
 * once-per-person event, so joining or creating a second workspace must not
 * re-trigger it.
 */
export type NuxProgressRead = {
  progressId: NuxProgressId;
  userId: UserId;
  tutorialKey: NuxTutorialKey;
  status: NuxStatus;
  /** Only keys the current build recognises; unknown keys are dropped on read. */
  completedMilestones: readonly NuxMilestoneKey[];
  createdAt: Date;
  updatedAt: Date;
};
```

- [ ] **Step 5: Write the namespace**

Create `shared/models/Nux/NuxProgress.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace */
import type {
  NuxMilestoneKey,
  NuxProgressId,
  NuxProgressRead,
  NuxStatus,
  NuxTutorialKey,
} from "$/models/Nux/NuxProgress.types.ts";

export namespace NuxProgress {
  export type T = NuxProgressRead;
  export type Id = NuxProgressId;
  export type Status = NuxStatus;
  export type MilestoneKey = NuxMilestoneKey;
  export type TutorialKey = NuxTutorialKey;
}
```

- [ ] **Step 6: Run the test and watch it pass**

Run: `pnpm vitest run shared/models/Nux/NuxProgress.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 7: Commit**

```bash
git add shared/models/Nux
git commit -m "feat(nux): add NuxProgress model types and constants"
```

---

## Task 4: Add the NuxProgressClient

**Files:**
- Create: `src/clients/NuxProgressClient.ts`
- Test: `src/clients/NuxProgressClient.test.ts`

This follows `src/clients/UserClient.ts`, a hand-written service client with a zod transform, rather than `createRdbCrudClient`. The model is one upserted row per user with read-then-create semantics, which the generic CRUD client does not express.

- [ ] **Step 1: Write the failing test**

Create `src/clients/NuxProgressClient.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { NuxProgressDBReadToModelReadSchema } from "@/clients/NuxProgressClient";

const DB_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  tutorial_key: "first_dashboard",
  status: "in_progress",
  completed_milestones: ["add_dataset"],
  created_at: "2026-08-16T00:00:00.000Z",
  updated_at: "2026-08-16T00:00:00.000Z",
};

describe("NuxProgressDBReadToModelReadSchema", () => {
  it("camel-cases the row and renames id to progressId", () => {
    const model = NuxProgressDBReadToModelReadSchema.parse(DB_ROW);
    expect(model.progressId).toBe(DB_ROW.id);
    expect(model.userId).toBe(DB_ROW.user_id);
    expect(model.status).toBe("in_progress");
    expect(model.createdAt).toBeInstanceOf(Date);
  });

  it("drops milestone keys this build does not recognise", () => {
    const model = NuxProgressDBReadToModelReadSchema.parse({
      ...DB_ROW,
      completed_milestones: ["add_dataset", "retired_milestone", "run_query"],
    });
    expect(model.completedMilestones).toEqual(["add_dataset", "run_query"]);
  });
});
```

The second test is the one that matters. `completed_milestones` is `text[]`, so a milestone renamed in a future build would otherwise make the row throw on parse and lock the user out of the tutorial entirely.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/clients/NuxProgressClient.test.ts`
Expected: FAIL, cannot resolve `@/clients/NuxProgressClient`.

- [ ] **Step 3: Write the client**

Create `src/clients/NuxProgressClient.ts`:

```ts
import { createServiceClient } from "@avandar/clients";
import { withLogger } from "@avandar/logger";
import { withQueryHooks } from "@avandar/query-hooks";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import {
  FIRST_DASHBOARD_TUTORIAL_KEY,
  NUX_MILESTONE_KEYS,
} from "$/models/Nux/NuxProgress.constants";
import { z } from "zod";
import { AuthClient } from "@/clients/AuthClient/AuthClient";
import type { ServiceClient } from "@avandar/clients";
import type { ILogger, WithLogger } from "@avandar/logger";
import type { WithQueryHooks } from "@avandar/query-hooks";
import type { NuxProgress } from "$/models/Nux/NuxProgress";
import type {
  NuxMilestoneKey,
  NuxProgressId,
} from "$/models/Nux/NuxProgress.types";
import type { UserId } from "$/models/User/User.types";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * What already exists in the workspace, used once per user to decide which
 * milestones are already satisfied. See `resolveAutoCheckedMilestones`.
 */
export type NuxWorkspaceArtifacts = {
  hasDataset: boolean;
  hasDashboard: boolean;
  hasWorkspaceSharedDashboard: boolean;
};

const _MILESTONE_KEY_SET: ReadonlySet<string> = new Set(NUX_MILESTONE_KEYS);

/**
 * Parses a `user_nux_progress` row into the model.
 *
 * `completed_milestones` is validated as plain strings and then filtered,
 * rather than parsed with `z.enum`. A milestone key renamed in a later build
 * would make `z.enum` throw on an existing row, which would lock that user out
 * of the tutorial with no way back. Dropping the unknown key just replays that
 * milestone, which is the harmless outcome.
 */
export const NuxProgressDBReadToModelReadSchema: z.ZodType<
  NuxProgress.T,
  {
    id: string;
    user_id: string;
    tutorial_key: string;
    status: string;
    completed_milestones: string[];
    created_at: string;
    updated_at: string;
  }
> = z
  .object({
    id: z.uuid(),
    user_id: z.uuid(),
    tutorial_key: z.string(),
    status: z.enum(["not_started", "in_progress", "completed", "dismissed"]),
    completed_milestones: z.array(z.string()),
    created_at: z.iso.datetime({ offset: true }),
    updated_at: z.iso.datetime({ offset: true }),
  })
  .transform((row): NuxProgress.T => {
    return {
      progressId: row.id as NuxProgressId,
      userId: row.user_id as UserId,
      tutorialKey: FIRST_DASHBOARD_TUTORIAL_KEY,
      status: row.status,
      completedMilestones: row.completed_milestones.filter(
        (key): key is NuxMilestoneKey => {
          return _MILESTONE_KEY_SET.has(key);
        },
      ),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  });

/** Reads the caller's row, or `undefined` when they have never been offered. */
async function _fetchProgressRow(
  dbClient: AvaSupabaseDBClient,
  userId: string,
): Promise<NuxProgress.T | undefined> {
  const { data } = await dbClient
    .from("user_nux_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("tutorial_key", FIRST_DASHBOARD_TUTORIAL_KEY)
    .maybeSingle()
    .throwOnError();
  return data ? NuxProgressDBReadToModelReadSchema.parse(data) : undefined;
}

async function _requireUserId(): Promise<string> {
  const session = await AuthClient.getCurrentSession();
  if (!session?.user) {
    throw new Error("User not found.");
  }
  return session.user.id;
}

type NuxProgressClientQueries = {
  getForCurrentUser: () => Promise<NuxProgress.T | undefined>;
  getWorkspaceArtifacts: (params: {
    workspaceId: Workspace.Id;
  }) => Promise<NuxWorkspaceArtifacts>;
};

type NuxProgressClientMutations = {
  ensureForCurrentUser: () => Promise<NuxProgress.T>;
  updateProgress: (params: {
    progressId: NuxProgress.Id;
    data: {
      status?: NuxProgress.Status;
      completedMilestones?: readonly NuxMilestoneKey[];
    };
  }) => Promise<NuxProgress.T>;
};

type INuxProgressClient = ServiceClient<"NuxProgressClient"> &
  NuxProgressClientQueries &
  NuxProgressClientMutations;

function createNuxProgressClient(): WithLogger<
  WithQueryHooks<
    INuxProgressClient,
    keyof NuxProgressClientQueries,
    keyof NuxProgressClientMutations
  >
> {
  const dbClient = AvaSupabase.db();
  const baseClient = createServiceClient("NuxProgressClient");

  return withLogger(baseClient, (baseLogger: ILogger) => {
    return withQueryHooks(
      {
        ...baseClient,

        /** The caller's progress row, or `undefined` if they have none yet. */
        getForCurrentUser: async (): Promise<NuxProgress.T | undefined> => {
          const logger = baseLogger.appendName("getForCurrentUser");
          const userId = await _requireUserId();
          const progress = await _fetchProgressRow(dbClient, userId);
          logger.log("Nux progress retrieved", { progress });
          return progress;
        },

        /**
         * Whether the workspace already contains the artifacts each milestone
         * produces. Three head-count queries rather than three full selects:
         * the answer is only ever "any?".
         *
         * "Shared to the workspace" is `is_restricted = false`, which is what
         * `GeneralAccessModule` derives the `workspace` dropdown value from.
         */
        getWorkspaceArtifacts: async ({
          workspaceId,
        }: {
          workspaceId: Workspace.Id;
        }): Promise<NuxWorkspaceArtifacts> => {
          const logger = baseLogger.appendName("getWorkspaceArtifacts");
          const [datasets, dashboards, sharedDashboards] = await Promise.all([
            dbClient
              .from("datasets")
              .select("id", { count: "exact", head: true })
              .eq("workspace_id", workspaceId)
              .throwOnError(),
            dbClient
              .from("dashboards")
              .select("id", { count: "exact", head: true })
              .eq("workspace_id", workspaceId)
              .throwOnError(),
            dbClient
              .from("dashboards")
              .select("id", { count: "exact", head: true })
              .eq("workspace_id", workspaceId)
              .eq("is_restricted", false)
              .throwOnError(),
          ]);
          const artifacts: NuxWorkspaceArtifacts = {
            hasDataset: (datasets.count ?? 0) > 0,
            hasDashboard: (dashboards.count ?? 0) > 0,
            hasWorkspaceSharedDashboard: (sharedDashboards.count ?? 0) > 0,
          };
          logger.log("Workspace artifacts retrieved", artifacts);
          return artifacts;
        },

        /**
         * The caller's row, created at its defaults if absent.
         *
         * Read-then-insert rather than a plain upsert: an upsert with
         * `ignoreDuplicates: false` would reset `status` to `not_started` on
         * every call and re-show the invite forever. `ignoreDuplicates: true`
         * keeps a concurrent first call from failing on the unique constraint.
         */
        ensureForCurrentUser: async (): Promise<NuxProgress.T> => {
          const logger = baseLogger.appendName("ensureForCurrentUser");
          const userId = await _requireUserId();
          const existing = await _fetchProgressRow(dbClient, userId);
          if (existing) {
            return existing;
          }
          await dbClient
            .from("user_nux_progress")
            .upsert(
              {
                user_id: userId,
                tutorial_key: FIRST_DASHBOARD_TUTORIAL_KEY,
              },
              {
                onConflict: "user_id,tutorial_key",
                ignoreDuplicates: true,
              },
            )
            .throwOnError();
          const created = await _fetchProgressRow(dbClient, userId);
          if (!created) {
            throw new Error("Failed to create Nux progress row.");
          }
          logger.log("Nux progress row created", { created });
          return created;
        },

        /** Writes status and/or completed milestones back. */
        updateProgress: async ({
          progressId,
          data,
        }: {
          progressId: NuxProgress.Id;
          data: {
            status?: NuxProgress.Status;
            completedMilestones?: readonly NuxMilestoneKey[];
          };
        }): Promise<NuxProgress.T> => {
          const logger = baseLogger.appendName("updateProgress");
          logger.log("Updating Nux progress", { progressId, data });
          const { data: row } = await dbClient
            .from("user_nux_progress")
            .update({
              ...(data.status !== undefined ? { status: data.status } : {}),
              ...(data.completedMilestones !== undefined ?
                { completed_milestones: [...data.completedMilestones] }
              : {}),
            })
            .eq("id", progressId)
            .select("*")
            .single()
            .throwOnError();
          return NuxProgressDBReadToModelReadSchema.parse(row);
        },
      },
      {
        queryFns: ["getForCurrentUser", "getWorkspaceArtifacts"],
        mutationFns: ["ensureForCurrentUser", "updateProgress"],
      },
    );
  });
}

/** Client for the per-user onboarding tutorial progress row. */
export const NuxProgressClient = createNuxProgressClient();
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `pnpm vitest run src/clients/NuxProgressClient.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Type-check**

Run: `pnpm type-check`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/clients/NuxProgressClient.ts src/clients/NuxProgressClient.test.ts
git commit -m "feat(nux): add NuxProgressClient"
```

---

## Task 5: Register the five analytics events

**Files:**
- Modify: `shared/analytics/AnalyticsEvents/AnalyticsEvents.constants.ts`
- Modify: `shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts`
- Modify: `supabase/schemas/30.usage_analytics_events.sql`

Analytics events cross three places: the TypeScript name list, the RLS insert allowlist, and the SQL category map. Missing the SQL half means every insert is silently rejected by RLS and swallowed by `AnalyticsClient`, so nothing errors and no rows appear.

- [ ] **Step 1: Add the names**

In `shared/analytics/AnalyticsEvents/AnalyticsEvents.constants.ts`, extend `CLIENT_ANALYTICS_EVENT_NAMES`. Replace:

```ts
  "chat.message_sent",
  "chat.sql_generated",
] as const;
```

with:

```ts
  "chat.message_sent",
  "chat.sql_generated",
  "nux.started",
  "nux.milestone_completed",
  "nux.dismissed",
  "nux.completed",
  "nux.restarted",
] as const;
```

- [ ] **Step 2: Add the payloads**

In `shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts`, add this import beside the existing type imports:

```ts
import type { NuxMilestoneKey } from "$/models/Nux/NuxProgress.types.ts";
```

Then in the `AnalyticsEventPayloads` mapped type, replace:

```ts
  : K extends "chat.sql_generated" ? { sqlChars: number }
```

with:

```ts
  : K extends "chat.sql_generated" ? { sqlChars: number }
  : K extends "nux.started" ? { startedAtMilestone: NuxMilestoneKey }
  : K extends "nux.milestone_completed" ? { milestoneKey: NuxMilestoneKey }
  : K extends "nux.dismissed" ?
    { milestoneKey: NuxMilestoneKey | null; completedCount: number }
```

`nux.completed` and `nux.restarted` are deliberately absent: the mapped type's `: undefined` fallback makes them payload-free, and `nux.completed` would only ever carry the number four.

`milestoneKey` on `nux.dismissed` is `null` rather than `undefined` because the value is JSON-serialised into the `payload` column, and `undefined` would simply vanish, making "dismissed from the pill" indistinguishable from "field missing".

- [ ] **Step 3: Add them to the RLS allowlist**

In `supabase/schemas/30.usage_analytics_events.sql`, inside the INSERT policy, replace:

```sql
      'chat.message_sent',
      'chat.sql_generated'
    ) and
```

with:

```sql
      'chat.message_sent',
      'chat.sql_generated',
      'nux.started',
      'nux.milestone_completed',
      'nux.dismissed',
      'nux.completed',
      'nux.restarted'
    ) and
```

- [ ] **Step 4: Add them to the category map**

In the same file, inside `public.util__analytics_event_category`, replace:

```sql
      when 'dashboard.published' then 'activation'
```

with:

```sql
      when 'dashboard.published' then 'activation'
      -- Every nux event is an activation-funnel signal, including the two
      -- negative ones: a dismissal is a drop-off inside activation, and a
      -- restart is a re-entry into it. Filing them elsewhere would split one
      -- funnel across two categories.
      when 'nux.started' then 'activation'
      when 'nux.milestone_completed' then 'activation'
      when 'nux.dismissed' then 'activation'
      when 'nux.completed' then 'activation'
      when 'nux.restarted' then 'activation'
```

- [ ] **Step 5: Generate and apply the migration**

```bash
pnpm db:new-migration allow_nux_analytics_events
pnpm db:apply-migrations
```

Expected: the migration contains a `create or replace function public.util__analytics_event_category` and a policy drop plus recreate. Read it before applying, as in Task 2 Step 4.

- [ ] **Step 6: Verify the category map end to end**

Run:

```bash
pnpm db:sql-cmd "select public.util__analytics_event_category('nux.started');"
```

Expected: one row, `activation`. A result of `other` means Step 4 did not reach the database.

- [ ] **Step 7: Run the analytics tests**

Run: `pnpm vitest run shared/analytics/AnalyticsEvents/AnalyticsEvents.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add shared/analytics supabase/schemas/30.usage_analytics_events.sql supabase/migrations
git commit -m "feat(nux): register the five nux analytics events"
```

---

# Phase 2: Pure tutorial logic

## Task 6: Define the anchors

**Files:**
- Create: `src/components/Nux/nuxAnchors.ts`
- Test: `src/components/Nux/nuxAnchors.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/Nux/nuxAnchors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  NuxAnchors,
  nuxAnchorProps,
  nuxAnchorSelector,
} from "@/components/Nux/nuxAnchors";

describe("nuxAnchors", () => {
  it("builds a data attribute selector", () => {
    expect(nuxAnchorSelector(NuxAnchors.datasetUploadForm)).toBe(
      '[data-nux="dataset-upload-form"]',
    );
  });

  it("spreads onto a component as a data attribute", () => {
    expect(nuxAnchorProps(NuxAnchors.datasetSummary)).toEqual({
      "data-nux": "dataset-summary",
    });
  });

  it("keeps every anchor value unique", () => {
    const values = Object.values(NuxAnchors);
    expect(new Set(values).size).toBe(values.length);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/components/Nux/nuxAnchors.test.ts`
Expected: FAIL, cannot resolve the module.

- [ ] **Step 3: Write the anchors**

Create `src/components/Nux/nuxAnchors.ts`:

```ts
/**
 * Every DOM hook the onboarding tutorial spotlights, in one place.
 *
 * Steps target `[data-nux="..."]` and never a class name or a DOM shape, so a
 * Mantine upgrade or a styling refactor cannot silently break the tour. Keeping
 * the values here rather than inline at each call site means a rename is one
 * edit, and `firstDashboard.ts` cannot invent an anchor nothing renders.
 */
export const NuxAnchors = {
  /** The file picker on the Import page's Upload tab. */
  datasetUploadForm: "dataset-upload-form",
  /** The name-and-save form that appears once a file has been parsed. */
  datasetImportForm: "dataset-import-form",
  /** The auto-generated column profile on the dataset page. */
  datasetSummary: "dataset-summary",
  /** The chat panel's message composer. */
  chatComposer: "chat-composer",
  /** The Data Explorer's chart area. */
  explorerCanvas: "explorer-canvas",
  /** The Visualizations tab in the Data Explorer drawer. */
  explorerVizTab: "explorer-viz-tab",
  /** The Save dropdown's trigger button in the Data Explorer toolbar. */
  explorerSaveMenu: "explorer-save-menu",
  /** The Share button in the dashboard editor toolbar. */
  dashboardShareButton: "dashboard-share-button",
  /** The General access dropdown in the share modal. */
  generalAccessSelect: "general-access-select",
  /** The workspace role picker, which only mounts once access is `workspace`. */
  shareRoleSelect: "share-role-select",
} as const;

export type NuxAnchor = (typeof NuxAnchors)[keyof typeof NuxAnchors];

/** Spread onto the element that should be spotlighted. */
export function nuxAnchorProps(anchor: NuxAnchor): { "data-nux": NuxAnchor } {
  return { "data-nux": anchor };
}

/** The CSS selector Joyride uses to find an anchored element. */
export function nuxAnchorSelector(anchor: NuxAnchor): string {
  return `[data-nux="${anchor}"]`;
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `pnpm vitest run src/components/Nux/nuxAnchors.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/Nux/nuxAnchors.ts src/components/Nux/nuxAnchors.test.ts
git commit -m "feat(nux): add the tutorial anchor registry"
```

---

## Task 7: Define the tutorial

**Files:**
- Create: `src/components/Nux/tutorials/NuxTutorial.types.ts`
- Create: `src/components/Nux/tutorials/firstDashboard.ts`
- Test: `src/components/Nux/tutorials/firstDashboard.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/Nux/tutorials/firstDashboard.test.ts`:

```ts
import { NUX_MILESTONE_KEYS } from "$/models/Nux/NuxProgress.constants";
import { describe, expect, it } from "vitest";
import { NuxAnchors } from "@/components/Nux/nuxAnchors";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard";

describe("firstDashboard tutorial", () => {
  it("declares the milestones in the model's order", () => {
    expect(
      FIRST_DASHBOARD_MILESTONES.map((milestone) => {
        return milestone.key;
      }),
    ).toEqual([...NUX_MILESTONE_KEYS]);
  });

  it("holds ten tooltips in chunks of 3, 2, 2, 3", () => {
    expect(
      FIRST_DASHBOARD_MILESTONES.map((milestone) => {
        return milestone.steps.length;
      }),
    ).toEqual([3, 2, 2, 3]);
  });

  it("only targets anchors the registry knows", () => {
    const known = new Set<string>(Object.values(NuxAnchors));
    FIRST_DASHBOARD_MILESTONES.forEach((milestone) => {
      milestone.steps.forEach((step) => {
        expect(known.has(step.anchor)).toBe(true);
      });
    });
  });

  it("gives every milestone a distinct completion event", () => {
    const events = FIRST_DASHBOARD_MILESTONES.map((milestone) => {
      return milestone.completionEvent;
    });
    expect(new Set(events).size).toBe(events.length);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/components/Nux/tutorials/firstDashboard.test.ts`
Expected: FAIL, cannot resolve `firstDashboard`.

- [ ] **Step 3: Write the types**

Create `src/components/Nux/tutorials/NuxTutorial.types.ts`:

```ts
import type { NuxAnchor } from "@/components/Nux/nuxAnchors";
import type { NuxEventName } from "@/components/Nux/nuxEvents";
import type { NuxMilestoneKey } from "$/models/Nux/NuxProgress.types";
import type { MessageDescriptor } from "@lingui/core";
import type { Placement } from "react-joyride";

/**
 * Where the checklist sends the user when a milestone is opened.
 *
 * `dashboard_editor` routes using the id captured from `dashboard.created`.
 * It is needed because `SaveToDashboardModal` does NOT navigate on create: it
 * shows a toast with an "Open dashboard" link and closes itself, so after
 * milestone 3 the user is still standing in the Data Explorer.
 */
export type NuxMilestoneRoute =
  | { kind: "data_import" }
  | { kind: "data_explorer" }
  | { kind: "dashboard_editor" };

export type NuxStep = {
  anchor: NuxAnchor;
  title: MessageDescriptor;
  body: MessageDescriptor;
  placement: Placement | "auto" | "center";
  /**
   * Renders the "download our sample" link beneath the body. Only milestone
   * 1's first tooltip sets it, which is the one place a user can be stuck for
   * want of a spreadsheet.
   */
  showSampleDownload?: boolean;
  /**
   * How long Joyride waits for this step's target, in milliseconds. Steps
   * whose target only appears after the user acts need far longer than the
   * 1000ms default.
   */
  targetWaitTimeoutMs?: number;
};

export type NuxMilestone = {
  key: NuxMilestoneKey;
  title: MessageDescriptor;
  /** One line under the title in the checklist panel. */
  summary: MessageDescriptor;
  route: NuxMilestoneRoute;
  completionEvent: NuxEventName;
  steps: readonly NuxStep[];
};
```

- [ ] **Step 4: Write the tutorial**

Create `src/components/Nux/tutorials/firstDashboard.ts`:

```ts
import { msg } from "@lingui/core/macro";
import { NuxAnchors } from "@/components/Nux/nuxAnchors";
import type { NuxMilestone } from "@/components/Nux/tutorials/NuxTutorial.types";

/**
 * How long a step waits for a target that only appears after the user does
 * something. The default 1000ms is right for a target already on the page and
 * far too short for one behind a file picker or a modal.
 */
const AWAIT_USER_ACTION_MS = 60_000;

/**
 * The `first_dashboard` tutorial: four milestones, ten tooltips, chunked 3/2/2/3.
 *
 * Pure data, so it is unit-testable and so a second tutorial is a second file
 * rather than a refactor. Copy uses `msg` descriptors rather than `t` because
 * this module has no React context to resolve them in; `NuxTooltip` resolves
 * them with `i18n._()` at render.
 *
 * No step is spent on navigation. The checklist panel routes to a milestone's
 * `route` when its row is clicked, and arrival tooltips name their location in
 * copy instead. That is what took this from fifteen tooltips to ten.
 */
export const FIRST_DASHBOARD_MILESTONES: readonly NuxMilestone[] = [
  {
    key: "add_dataset",
    title: msg`Add your first dataset`,
    summary: msg`Bring a spreadsheet into Avandar.`,
    route: { kind: "data_import" },
    completionEvent: "dataset.saved",
    steps: [
      {
        anchor: NuxAnchors.datasetUploadForm,
        title: msg`Start with a spreadsheet`,
        body: msg`You're in Data Manager, Import. Pick a CSV or Excel file from your computer.`,
        placement: "right",
        showSampleDownload: true,
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
      {
        anchor: NuxAnchors.datasetImportForm,
        title: msg`Name it and save`,
        body: msg`Avandar already read your file and guessed what each column contains. Give the dataset a name, then save.`,
        placement: "top",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
      {
        anchor: NuxAnchors.datasetSummary,
        title: msg`It profiled your data for you`,
        body: msg`Ranges, distributions, what's missing. You didn't have to ask.`,
        placement: "left",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
    ],
  },
  {
    key: "run_query",
    title: msg`Ask your first question`,
    summary: msg`Get an answer out of the data you just added.`,
    route: { kind: "data_explorer" },
    completionEvent: "query.succeeded",
    steps: [
      {
        anchor: NuxAnchors.chatComposer,
        title: msg`Just ask`,
        body: msg`This is the Data Explorer, and this is Ava. Ask a question in plain English, like "total revenue by region".`,
        placement: "left",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
      {
        anchor: NuxAnchors.explorerCanvas,
        title: msg`There's your answer`,
        body: msg`Ava wrote the SQL, ran it, and picked a chart to show it in.`,
        placement: "top",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
    ],
  },
  {
    key: "build_dashboard",
    title: msg`Build your first dashboard`,
    summary: msg`Keep that chart somewhere you can come back to.`,
    route: { kind: "data_explorer" },
    completionEvent: "dashboard.created",
    steps: [
      {
        anchor: NuxAnchors.explorerVizTab,
        title: msg`Change the chart if you like`,
        body: msg`The Visualizations tab has the chart settings, if this isn't the shape you wanted.`,
        placement: "top",
      },
      {
        anchor: NuxAnchors.explorerSaveMenu,
        title: msg`Save it to a dashboard`,
        body: msg`Open Save and choose "Save to dashboard". Name the dashboard, create it, and Avandar will take you there.`,
        placement: "bottom",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
    ],
  },
  {
    key: "share_dashboard",
    title: msg`Share it with your workspace`,
    summary: msg`Let your colleagues open what you just built.`,
    route: { kind: "dashboard_editor" },
    completionEvent: "dashboard.sharedToWorkspace",
    steps: [
      {
        anchor: NuxAnchors.dashboardShareButton,
        title: msg`Only you can see this`,
        body: msg`Your dashboard exists, but nobody else can open it yet. Let's fix that.`,
        placement: "bottom",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
      {
        anchor: NuxAnchors.generalAccessSelect,
        title: msg`Open it to your workspace`,
        body: msg`Workspace means everyone in your workspace, not the public. Nothing here creates a public link. And you can set it back to Private whenever you like.`,
        placement: "bottom",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
      {
        anchor: NuxAnchors.shareRoleSelect,
        title: msg`Pick what they can do`,
        body: msg`Viewer lets people look at it. Editor lets them change it. Viewer is the safe default, and you can change anyone's role later.`,
        placement: "bottom",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
    ],
  },
];
```

- [ ] **Step 5: Run the test and watch it pass**

Run: `pnpm vitest run src/components/Nux/tutorials/firstDashboard.test.ts`
Expected: PASS, 4 tests. It will still fail to resolve `nuxEvents`; that is Task 8. If you are working strictly task by task, run Task 8 first and then return to this step.

- [ ] **Step 6: Commit**

```bash
git add src/components/Nux/tutorials
git commit -m "feat(nux): declare the first-dashboard tutorial"
```

---

## Task 8: Add the completion-event bus

**Files:**
- Create: `src/components/Nux/nuxEvents.ts`
- Test: `src/components/Nux/nuxEvents.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/Nux/nuxEvents.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { NuxEvents } from "@/components/Nux/nuxEvents";

describe("NuxEvents", () => {
  it("delivers an emitted event to every subscriber", () => {
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = NuxEvents.subscribe(first);
    const unsubscribeSecond = NuxEvents.subscribe(second);

    NuxEvents.emit("dataset.saved", { datasetId: "abc" });

    expect(first).toHaveBeenCalledWith({
      name: "dataset.saved",
      payload: { datasetId: "abc" },
    });
    expect(second).toHaveBeenCalledTimes(1);

    unsubscribeFirst();
    unsubscribeSecond();
  });

  it("stops delivering after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = NuxEvents.subscribe(listener);
    unsubscribe();

    NuxEvents.emit("query.succeeded", {});

    expect(listener).not.toHaveBeenCalled();
  });

  it("is a no-op when nobody is listening", () => {
    expect(() => {
      NuxEvents.emit("dashboard.created", { dashboardId: "d1" });
    }).not.toThrow();
  });
});
```

The third test encodes the contract that lets four production flows call `NuxEvents.emit` unconditionally: a user who is not onboarding has no subscriber, and emitting costs nothing.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/components/Nux/nuxEvents.test.ts`
Expected: FAIL, cannot resolve the module.

- [ ] **Step 3: Write the bus**

Create `src/components/Nux/nuxEvents.ts`:

```ts
/**
 * The four real outcomes that advance the onboarding tutorial.
 *
 * These are deliberately separate from `AnalyticsEvents`: analytics records
 * what happened for reporting, this tells the tour to move. The names describe
 * the outcome, not the tutorial, so a call site does not have to know a
 * tutorial exists.
 */
export type NuxEventName =
  | "dataset.saved"
  | "query.succeeded"
  | "dashboard.created"
  | "dashboard.sharedToWorkspace";

export type NuxEventPayloads = {
  "dataset.saved": { datasetId: string };
  "query.succeeded": Record<string, never>;
  "dashboard.created": { dashboardId: string };
  "dashboard.sharedToWorkspace": { dashboardId: string };
};

/** A discriminated union, so a subscriber narrows the payload by name. */
export type NuxEvent = {
  [K in NuxEventName]: { name: K; payload: NuxEventPayloads[K] };
}[NuxEventName];

type NuxEventListener = (event: NuxEvent) => void;

const _listeners = new Set<NuxEventListener>();

export const NuxEvents = {
  /**
   * Announce an outcome. A no-op when nothing is subscribed, which is the
   * case for every user who is not currently in the tutorial. That is what
   * lets the four production call sites emit unconditionally.
   */
  emit<K extends NuxEventName>(name: K, payload: NuxEventPayloads[K]): void {
    _listeners.forEach((listener) => {
      listener({ name, payload } as NuxEvent);
    });
  },

  /** Returns its own unsubscribe, for use as a `useEffect` cleanup. */
  subscribe(listener: NuxEventListener): () => void {
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  },
};
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `pnpm vitest run src/components/Nux/nuxEvents.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/Nux/nuxEvents.ts src/components/Nux/nuxEvents.test.ts
git commit -m "feat(nux): add the tutorial completion-event bus"
```

---

## Task 9: Resolve already-satisfied milestones

**Files:**
- Create: `src/components/Nux/NuxStateManager/resolveAutoCheckedMilestones.ts`
- Test: `src/components/Nux/NuxStateManager/resolveAutoCheckedMilestones.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/Nux/NuxStateManager/resolveAutoCheckedMilestones.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveAutoCheckedMilestones } from "@/components/Nux/NuxStateManager/resolveAutoCheckedMilestones";

describe("resolveAutoCheckedMilestones", () => {
  it("checks nothing for an empty workspace", () => {
    expect(
      resolveAutoCheckedMilestones({
        hasDataset: false,
        hasDashboard: false,
        hasWorkspaceSharedDashboard: false,
      }),
    ).toEqual([]);
  });

  it("checks the first milestone when a dataset exists", () => {
    expect(
      resolveAutoCheckedMilestones({
        hasDataset: true,
        hasDashboard: false,
        hasWorkspaceSharedDashboard: false,
      }),
    ).toEqual(["add_dataset"]);
  });

  it("checks the first three when a dashboard exists", () => {
    expect(
      resolveAutoCheckedMilestones({
        hasDataset: true,
        hasDashboard: true,
        hasWorkspaceSharedDashboard: false,
      }),
    ).toEqual(["add_dataset", "run_query", "build_dashboard"]);
  });

  it("checks everything when a workspace-shared dashboard exists", () => {
    expect(
      resolveAutoCheckedMilestones({
        hasDataset: true,
        hasDashboard: true,
        hasWorkspaceSharedDashboard: true,
      }),
    ).toEqual([
      "add_dataset",
      "run_query",
      "build_dashboard",
      "share_dashboard",
    ]);
  });

  it("checks the whole prefix even when an earlier artifact is missing", () => {
    expect(
      resolveAutoCheckedMilestones({
        hasDataset: false,
        hasDashboard: true,
        hasWorkspaceSharedDashboard: false,
      }),
    ).toEqual(["add_dataset", "run_query", "build_dashboard"]);
  });
});
```

The last test is the interesting one: a dashboard cannot exist without a dataset having existed, so a dashboard with no dataset means the dataset was deleted. Re-asking for a first dataset in that state would be wrong.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/components/Nux/NuxStateManager/resolveAutoCheckedMilestones.test.ts`
Expected: FAIL, cannot resolve the module.

- [ ] **Step 3: Write it**

Create `src/components/Nux/NuxStateManager/resolveAutoCheckedMilestones.ts`:

```ts
import { NUX_MILESTONE_KEYS } from "$/models/Nux/NuxProgress.constants";
import type { NuxWorkspaceArtifacts } from "@/clients/NuxProgressClient";
import type { NuxMilestoneKey } from "$/models/Nux/NuxProgress.types";

/**
 * Which milestones the workspace's existing contents already satisfy.
 *
 * "Furthest artifact wins": find the last milestone whose artifact exists and
 * mark it and everything before it done. This is why milestone 2 has no
 * artifact of its own. There is no reliable way to detect "this user has run a
 * query", and a detector for it would be one more thing to maintain and to get
 * wrong. A dashboard cannot exist without a query having been run, so
 * milestone 2 rides on milestone 3's artifact.
 *
 * The prefix is returned whole rather than per-artifact, so a workspace whose
 * dataset was deleted after its dashboard was built is not asked to add a
 * first dataset again.
 */
export function resolveAutoCheckedMilestones(
  artifacts: Readonly<NuxWorkspaceArtifacts>,
): readonly NuxMilestoneKey[] {
  const completedThrough =
    artifacts.hasWorkspaceSharedDashboard ? 4
    : artifacts.hasDashboard ? 3
    : artifacts.hasDataset ? 1
    : 0;
  return NUX_MILESTONE_KEYS.slice(0, completedThrough);
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `pnpm vitest run src/components/Nux/NuxStateManager/resolveAutoCheckedMilestones.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/Nux/NuxStateManager
git commit -m "feat(nux): resolve already-satisfied milestones from workspace artifacts"
```

---

## Task 10: Add the state selectors

**Files:**
- Create: `src/components/Nux/NuxStateManager/nuxSelectors.ts`
- Test: `src/components/Nux/NuxStateManager/nuxSelectors.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/Nux/NuxStateManager/nuxSelectors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  areAllMilestonesComplete,
  getFirstUnfinishedMilestoneKey,
} from "@/components/Nux/NuxStateManager/nuxSelectors";

describe("getFirstUnfinishedMilestoneKey", () => {
  it("returns the first milestone when nothing is done", () => {
    expect(getFirstUnfinishedMilestoneKey([])).toBe("add_dataset");
  });

  it("skips completed milestones", () => {
    expect(getFirstUnfinishedMilestoneKey(["add_dataset"])).toBe("run_query");
  });

  it("respects tutorial order over completion order", () => {
    expect(getFirstUnfinishedMilestoneKey(["build_dashboard"])).toBe(
      "add_dataset",
    );
  });

  it("returns undefined when everything is done", () => {
    expect(
      getFirstUnfinishedMilestoneKey([
        "add_dataset",
        "run_query",
        "build_dashboard",
        "share_dashboard",
      ]),
    ).toBeUndefined();
  });
});

describe("areAllMilestonesComplete", () => {
  it("is false for a partial run", () => {
    expect(areAllMilestonesComplete(["add_dataset"])).toBe(false);
  });

  it("is true for a full run", () => {
    expect(
      areAllMilestonesComplete([
        "add_dataset",
        "run_query",
        "build_dashboard",
        "share_dashboard",
      ]),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/components/Nux/NuxStateManager/nuxSelectors.test.ts`
Expected: FAIL, cannot resolve the module.

- [ ] **Step 3: Write the selectors**

Create `src/components/Nux/NuxStateManager/nuxSelectors.ts`:

```ts
import { NUX_MILESTONE_KEYS } from "$/models/Nux/NuxProgress.constants";
import type { NuxMilestoneKey } from "$/models/Nux/NuxProgress.types";

/**
 * The milestone to open next, in tutorial order rather than completion order.
 *
 * `undefined` means the tutorial is finished. Order comes from
 * `NUX_MILESTONE_KEYS`, not from the completed array, so a user who somehow
 * finishes milestone 3 first is still sent back to milestone 1.
 */
export function getFirstUnfinishedMilestoneKey(
  completedMilestones: readonly NuxMilestoneKey[],
): NuxMilestoneKey | undefined {
  return NUX_MILESTONE_KEYS.find((key) => {
    return !completedMilestones.includes(key);
  });
}

export function areAllMilestonesComplete(
  completedMilestones: readonly NuxMilestoneKey[],
): boolean {
  return getFirstUnfinishedMilestoneKey(completedMilestones) === undefined;
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `pnpm vitest run src/components/Nux/NuxStateManager/nuxSelectors.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/Nux/NuxStateManager/nuxSelectors.ts src/components/Nux/NuxStateManager/nuxSelectors.test.ts
git commit -m "feat(nux): add milestone-ordering selectors"
```

---

## Task 11: Add the state machine

**Files:**
- Create: `src/components/Nux/NuxStateManager/NuxAppState.types.ts`
- Create: `src/components/Nux/NuxStateManager/nuxActions.ts`
- Create: `src/components/Nux/NuxStateManager/NuxStateManager.ts`
- Test: `src/components/Nux/NuxStateManager/nuxActions.test.ts`

The actions live in their own module so they can be unit-tested as plain functions. `createAppStateManager` only wires them to a `useReducer` and a context.

- [ ] **Step 1: Write the failing test**

Create `src/components/Nux/NuxStateManager/nuxActions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import { nuxActions } from "@/components/Nux/NuxStateManager/nuxActions";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";

// `progressId` is a branded UUID, so a plain string needs the double cast.
const HYDRATED: NuxAppState = {
  ...INITIAL_NUX_STATE,
  progressId: "11111111-1111-4111-8111-111111111111" as unknown as NuxAppState["progressId"],
  status: "not_started",
  isHydrated: true,
};

describe("nuxActions.startTour", () => {
  it("marks the tutorial offered and opens the first unfinished milestone", () => {
    const next = nuxActions.startTour(HYDRATED);
    expect(next.status).toBe("in_progress");
    expect(next.activeMilestoneKey).toBe("add_dataset");
    expect(next.activeStepIndex).toBe(0);
    expect(next.isPanelExpanded).toBe(true);
  });

  it("opens the first unfinished milestone, not always the first", () => {
    const next = nuxActions.startTour({
      ...HYDRATED,
      completedMilestones: ["add_dataset"],
    });
    expect(next.activeMilestoneKey).toBe("run_query");
  });
});

describe("nuxActions.declineInvite", () => {
  it("marks the tutorial offered without opening anything", () => {
    const next = nuxActions.declineInvite(HYDRATED);
    expect(next.status).toBe("in_progress");
    expect(next.activeMilestoneKey).toBeUndefined();
    expect(next.isPanelExpanded).toBe(false);
  });
});

describe("nuxActions.completeMilestone", () => {
  it("records the milestone and closes its tooltips", () => {
    const next = nuxActions.completeMilestone(
      { ...HYDRATED, activeMilestoneKey: "add_dataset", activeStepIndex: 2 },
      { key: "add_dataset", datasetId: "ds1" },
    );
    expect(next.completedMilestones).toEqual(["add_dataset"]);
    expect(next.activeMilestoneKey).toBeUndefined();
    expect(next.recentDatasetId).toBe("ds1");
  });

  it("does not record the same milestone twice", () => {
    const next = nuxActions.completeMilestone(
      { ...HYDRATED, completedMilestones: ["add_dataset"] },
      { key: "add_dataset" },
    );
    expect(next.completedMilestones).toEqual(["add_dataset"]);
  });

  it("completes the tutorial once the last milestone lands", () => {
    const next = nuxActions.completeMilestone(
      {
        ...HYDRATED,
        status: "in_progress",
        completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
      },
      { key: "share_dashboard" },
    );
    expect(next.status).toBe("completed");
  });

  it("ignores a completion for a milestone that is already done", () => {
    const state: NuxAppState = {
      ...HYDRATED,
      completedMilestones: ["add_dataset"],
      activeMilestoneKey: "run_query",
      activeStepIndex: 1,
    };
    const next = nuxActions.completeMilestone(state, { key: "add_dataset" });
    expect(next.activeMilestoneKey).toBe("run_query");
    expect(next.activeStepIndex).toBe(1);
  });
});

describe("nuxActions.restart", () => {
  it("clears progress and reopens the first milestone", () => {
    const next = nuxActions.restart({
      ...HYDRATED,
      status: "completed",
      completedMilestones: [
        "add_dataset",
        "run_query",
        "build_dashboard",
        "share_dashboard",
      ],
    });
    expect(next.status).toBe("in_progress");
    expect(next.completedMilestones).toEqual([]);
    expect(next.activeMilestoneKey).toBe("add_dataset");
  });
});

describe("nuxActions.dismiss", () => {
  it("hides everything", () => {
    const next = nuxActions.dismiss({
      ...HYDRATED,
      activeMilestoneKey: "run_query",
    });
    expect(next.status).toBe("dismissed");
    expect(next.activeMilestoneKey).toBeUndefined();
    expect(next.isPanelExpanded).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/components/Nux/NuxStateManager/nuxActions.test.ts`
Expected: FAIL, cannot resolve `NuxAppState.types`.

- [ ] **Step 3: Write the state shape**

Create `src/components/Nux/NuxStateManager/NuxAppState.types.ts`:

```ts
import type { NuxProgress } from "$/models/Nux/NuxProgress";
import type { NuxMilestoneKey } from "$/models/Nux/NuxProgress.types";

export type NuxAppState = {
  /** False until the progress row and the auto-check have both landed. */
  isHydrated: boolean;
  /** Row id, needed for every write. `undefined` before hydration. */
  progressId: NuxProgress.Id | undefined;
  status: NuxProgress.Status | undefined;
  completedMilestones: readonly NuxMilestoneKey[];
  /** The milestone whose tooltips are showing, or `undefined` when none are. */
  activeMilestoneKey: NuxMilestoneKey | undefined;
  /**
   * Index into the active milestone's steps. Deliberately NOT persisted: a
   * hard refresh resumes at the milestone's first tooltip, which costs one
   * tooltip and removes a whole class of resume bugs.
   */
  activeStepIndex: number;
  isPanelExpanded: boolean;
  /**
   * Why the active milestone cannot be finished (plan limit, offline, unsaved
   * changes). Set from the share modal's own blocked reason so the tour never
   * spotlights a dead control.
   */
  blockedReason: string | undefined;
  /**
   * Ids captured from completion events so later milestones can route to the
   * right place. Ephemeral by design: they are a convenience for this session,
   * not state worth a database column.
   */
  recentDatasetId: string | undefined;
  recentDashboardId: string | undefined;
};

export const INITIAL_NUX_STATE: NuxAppState = {
  isHydrated: false,
  progressId: undefined,
  status: undefined,
  completedMilestones: [],
  activeMilestoneKey: undefined,
  activeStepIndex: 0,
  isPanelExpanded: false,
  blockedReason: undefined,
  recentDatasetId: undefined,
  recentDashboardId: undefined,
};
```

- [ ] **Step 4: Write the actions**

Create `src/components/Nux/NuxStateManager/nuxActions.ts`:

```ts
import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import {
  areAllMilestonesComplete,
  getFirstUnfinishedMilestoneKey,
} from "@/components/Nux/NuxStateManager/nuxSelectors";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { NuxProgress } from "$/models/Nux/NuxProgress";
import type { NuxMilestoneKey } from "$/models/Nux/NuxProgress.types";

/**
 * Every transition the tutorial can make, as pure functions.
 *
 * Kept out of `NuxStateManager.ts` so they can be tested as plain data in and
 * data out, with no React and no provider.
 */
export const nuxActions = {
  /** Seeds state from the persisted row plus the one-shot auto-check. */
  hydrate: (
    state: NuxAppState,
    payload: {
      progressId: NuxProgress.Id;
      status: NuxProgress.Status;
      completedMilestones: readonly NuxMilestoneKey[];
    },
  ): NuxAppState => {
    return {
      ...state,
      isHydrated: true,
      progressId: payload.progressId,
      status: payload.status,
      completedMilestones: payload.completedMilestones,
      isPanelExpanded:
        payload.status === "in_progress" &&
        !areAllMilestonesComplete(payload.completedMilestones),
    };
  },

  /**
   * "Start tour". Opens the first UNFINISHED milestone, which is not always
   * the first milestone: the auto-check may have already checked some off.
   */
  startTour: (state: NuxAppState): NuxAppState => {
    return {
      ...state,
      status: "in_progress",
      activeMilestoneKey: getFirstUnfinishedMilestoneKey(
        state.completedMilestones,
      ),
      activeStepIndex: 0,
      isPanelExpanded: true,
    };
  },

  /**
   * "Not now". Writes `in_progress` too, which is what makes the invite show
   * at most once: the invite's condition is `status === "not_started"` and
   * nothing else ever writes that value back.
   */
  declineInvite: (state: NuxAppState): NuxAppState => {
    return {
      ...state,
      status: "in_progress",
      activeMilestoneKey: undefined,
      activeStepIndex: 0,
      isPanelExpanded: false,
    };
  },

  /** Clicking a milestone row in the checklist. */
  openMilestone: (
    state: NuxAppState,
    key: NuxMilestoneKey,
  ): NuxAppState => {
    return {
      ...state,
      status: state.status === "not_started" ? "in_progress" : state.status,
      activeMilestoneKey: key,
      activeStepIndex: 0,
      blockedReason: undefined,
    };
  },

  goToStep: (state: NuxAppState, index: number): NuxAppState => {
    return { ...state, activeStepIndex: Math.max(0, index) };
  },

  /** Closing the tooltips without finishing. Progress is kept. */
  closeTour: (state: NuxAppState): NuxAppState => {
    return {
      ...state,
      activeMilestoneKey: undefined,
      activeStepIndex: 0,
      isPanelExpanded: false,
    };
  },

  /**
   * A real outcome landed. Idempotent: the bus can deliver the same event
   * twice (a retried mutation, a remounted subscriber) and the second delivery
   * must not close a milestone the user has since moved on to.
   */
  completeMilestone: (
    state: NuxAppState,
    payload: {
      key: NuxMilestoneKey;
      datasetId?: string;
      dashboardId?: string;
    },
  ): NuxAppState => {
    if (state.completedMilestones.includes(payload.key)) {
      return state;
    }
    const completedMilestones = [...state.completedMilestones, payload.key];
    const isActive = state.activeMilestoneKey === payload.key;
    return {
      ...state,
      completedMilestones,
      status:
        areAllMilestonesComplete(completedMilestones) ?
          "completed"
        : "in_progress",
      activeMilestoneKey: isActive ? undefined : state.activeMilestoneKey,
      activeStepIndex: isActive ? 0 : state.activeStepIndex,
      isPanelExpanded: !areAllMilestonesComplete(completedMilestones),
      blockedReason: undefined,
      recentDatasetId: payload.datasetId ?? state.recentDatasetId,
      recentDashboardId: payload.dashboardId ?? state.recentDashboardId,
    };
  },

  /** Explicit dismissal. Only the profile restart brings it back. */
  dismiss: (state: NuxAppState): NuxAppState => {
    return {
      ...state,
      status: "dismissed",
      activeMilestoneKey: undefined,
      activeStepIndex: 0,
      isPanelExpanded: false,
    };
  },

  /**
   * Restart from the profile page.
   *
   * Writes `in_progress` directly, which is also what bypasses the auto-check:
   * the auto-check only runs while status is `not_started`. Someone asking to
   * replay the tutorial wants all four milestones, not "you are already done".
   */
  restart: (state: NuxAppState): NuxAppState => {
    return {
      ...state,
      status: "in_progress",
      completedMilestones: [],
      activeMilestoneKey: getFirstUnfinishedMilestoneKey([]),
      activeStepIndex: 0,
      isPanelExpanded: true,
      blockedReason: undefined,
      recentDatasetId: INITIAL_NUX_STATE.recentDatasetId,
      recentDashboardId: INITIAL_NUX_STATE.recentDashboardId,
    };
  },

  setPanelExpanded: (state: NuxAppState, isExpanded: boolean): NuxAppState => {
    return { ...state, isPanelExpanded: isExpanded };
  },

  setBlockedReason: (
    state: NuxAppState,
    reason: string | undefined,
  ): NuxAppState => {
    return { ...state, blockedReason: reason };
  },
};
```

- [ ] **Step 5: Write the manager**

Create `src/components/Nux/NuxStateManager/NuxStateManager.ts`:

```ts
import { createAppStateManager } from "@/lib/utils/state/createAppStateManager/createAppStateManager";
import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import { nuxActions } from "@/components/Nux/NuxStateManager/nuxActions";

/**
 * Runtime state for the onboarding tutorial.
 *
 * Mounted once per workspace in `WorkspaceLayoutContents`, above the router
 * outlet, so a route change never loses the active milestone. The transitions
 * themselves live in `nuxActions.ts` and are tested there.
 */
export const NuxStateManager = createAppStateManager({
  name: "Nux",
  initialState: INITIAL_NUX_STATE,
  actions: nuxActions,
});
```

- [ ] **Step 6: Run the test and watch it pass**

Run: `pnpm vitest run src/components/Nux/NuxStateManager/nuxActions.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/Nux/NuxStateManager
git commit -m "feat(nux): add the tutorial state machine"
```

---

# Phase 3: React surface

## Task 12: Add the eligibility hook

**Files:**
- Create: `src/components/Nux/useNuxEligibility.ts`
- Test: `src/components/Nux/useNuxEligibility.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/Nux/useNuxEligibility.test.tsx`:

```tsx
import { isDesktop } from "$/platform/isDesktop";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIsGlobalAdmin } from "@/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { renderHook } from "@/test-utils";
import { useNuxEligibility } from "@/components/Nux/useNuxEligibility";

vi.mock("@/hooks/users/useCurrentUser", () => {
  return { useCurrentUser: vi.fn() };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return { useCurrentWorkspace: vi.fn() };
});
vi.mock("@/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin", () => {
  return { useIsGlobalAdmin: vi.fn() };
});
vi.mock("$/platform/isDesktop", () => {
  return { isDesktop: vi.fn() };
});
vi.mock("@mantine/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/hooks")>();
  return { ...actual, useMediaQuery: vi.fn(() => true) };
});

const OWNER_ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.mocked(useCurrentUser).mockReturnValue({ id: OWNER_ID } as never);
  vi.mocked(useCurrentWorkspace).mockReturnValue({ ownerId: OWNER_ID } as never);
  vi.mocked(useIsGlobalAdmin).mockReturnValue(false);
  vi.mocked(isDesktop).mockReturnValue(false);
});

describe("useNuxEligibility", () => {
  it("is eligible for the workspace owner on desktop web", () => {
    expect(renderHook(() => useNuxEligibility()).result.current).toBe(true);
  });

  it("is eligible for a global admin who does not own the workspace", () => {
    vi.mocked(useCurrentWorkspace).mockReturnValue({ ownerId: "other" } as never);
    vi.mocked(useIsGlobalAdmin).mockReturnValue(true);
    expect(renderHook(() => useNuxEligibility()).result.current).toBe(true);
  });

  it("is not eligible for a plain member", () => {
    vi.mocked(useCurrentWorkspace).mockReturnValue({ ownerId: "other" } as never);
    expect(renderHook(() => useNuxEligibility()).result.current).toBe(false);
  });

  it("is not eligible in the desktop app", () => {
    vi.mocked(isDesktop).mockReturnValue(true);
    expect(renderHook(() => useNuxEligibility()).result.current).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/components/Nux/useNuxEligibility.test.tsx`
Expected: FAIL, cannot resolve `useNuxEligibility`.

- [ ] **Step 3: Write the hook**

Create `src/components/Nux/useNuxEligibility.ts`:

```ts
import { useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { isDesktop } from "$/platform/isDesktop";
import { useIsGlobalAdmin } from "@/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

/**
 * Whether the onboarding tutorial may run for this user, here, now.
 *
 * Three conditions, all of which must hold:
 *
 *   1. Owner or Settings admin. Every milestone assumes create and share
 *      permissions, so an invited viewer would be walked into a wall. The
 *      experience for those users is deliberately empty for now and is
 *      tracked separately.
 *   2. Desktop width. Joyride spotlighting is unreliable on narrow viewports
 *      and the Data Explorer is already cramped there.
 *   3. Web, not the Electron shell, which has its own offline behaviour the
 *      flow has not been tested against.
 *
 * Conditions 2 and 3 suppress rather than degrade: shipping an untested flow
 * on a surface nobody designed for is worse than shipping nothing there.
 */
export function useNuxEligibility(): boolean {
  const theme = useMantineTheme();
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();
  const isGlobalAdmin = useIsGlobalAdmin();
  // `useMediaQuery` returns `undefined` on the first render before it has
  // measured, so this compares to `true` rather than trusting truthiness.
  const isDesktopWidth =
    useMediaQuery(`(min-width: ${theme.breakpoints.lg})`) === true;

  if (isDesktop() || !isDesktopWidth || !user) {
    return false;
  }
  return workspace.ownerId === user.id || isGlobalAdmin;
}
```

- [ ] **Step 4: Confirm the workspace model's owner field name**

Run: `grep -n "ownerId" shared/models/Workspace/Workspace.types.ts`
Expected: a match. If the field is named differently, use that name here and in the test.

- [ ] **Step 5: Run the test and watch it pass**

Run: `pnpm vitest run src/components/Nux/useNuxEligibility.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/Nux/useNuxEligibility.ts src/components/Nux/useNuxEligibility.test.tsx
git commit -m "feat(nux): gate the tutorial on owner-or-admin, desktop, web"
```

---

## Task 13: Build the tour renderer

**Files:**
- Create: `src/components/Nux/NuxTour/buildJoyrideSteps.ts`
- Create: `src/components/Nux/NuxTour/NuxTooltip.tsx`
- Create: `src/components/Nux/NuxTour/NuxTour.tsx`
- Create: `src/components/Nux/NuxTour/NuxTourLazy.tsx`
- Test: `src/components/Nux/NuxTour/buildJoyrideSteps.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/Nux/NuxTour/buildJoyrideSteps.test.ts`:

```ts
import { i18n } from "@lingui/core";
import { beforeAll, describe, expect, it } from "vitest";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard";
import { buildJoyrideSteps } from "@/components/Nux/NuxTour/buildJoyrideSteps";

beforeAll(() => {
  i18n.loadAndActivate({ locale: "en", messages: {} });
});

describe("buildJoyrideSteps", () => {
  it("maps every step to its anchor selector", () => {
    const milestone = FIRST_DASHBOARD_MILESTONES[0]!;
    const steps = buildJoyrideSteps({ milestone, i18n });
    expect(steps).toHaveLength(3);
    expect(steps[0]!.target).toBe('[data-nux="dataset-upload-form"]');
  });

  it("passes each step's own target wait timeout through", () => {
    const milestone = FIRST_DASHBOARD_MILESTONES[2]!;
    const steps = buildJoyrideSteps({ milestone, i18n });
    // The viz-tab step declares no override, so it keeps Joyride's default.
    expect(steps[0]!.targetWaitTimeout).toBeUndefined();
    expect(steps[1]!.targetWaitTimeout).toBe(60_000);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/components/Nux/NuxTour/buildJoyrideSteps.test.ts`
Expected: FAIL, cannot resolve `buildJoyrideSteps`.

- [ ] **Step 3: Write the step builder**

Create `src/components/Nux/NuxTour/buildJoyrideSteps.ts`:

```ts
import { nuxAnchorSelector } from "@/components/Nux/nuxAnchors";
import type { NuxMilestone } from "@/components/Nux/tutorials/NuxTutorial.types";
import type { I18n } from "@lingui/core";
import type { Step } from "react-joyride";

/**
 * Turns one milestone's declarative steps into Joyride steps.
 *
 * Takes `i18n` rather than a `t` function because the copy lives as `msg`
 * descriptors in a plain data module, which is the only form the Lingui
 * extractor can follow outside a component.
 *
 * `content` is left as a plain string here; `NuxTooltip` renders the title and
 * body itself, so Joyride's default chrome never ships.
 */
export function buildJoyrideSteps(options: {
  milestone: NuxMilestone;
  i18n: I18n;
}): Step[] {
  const { milestone, i18n } = options;
  return milestone.steps.map((step): Step => {
    return {
      target: nuxAnchorSelector(step.anchor),
      title: i18n._(step.title),
      content: i18n._(step.body),
      placement: step.placement,
      // Show the tooltip straight away rather than a beacon the user has to
      // find and click. Onboarding is opt-in already; a second opt-in per
      // step is friction with no benefit.
      skipBeacon: true,
      // Steps whose target only appears after the user acts declare their own
      // timeout; the rest keep Joyride's 1000ms default.
      ...(step.targetWaitTimeoutMs !== undefined ?
        { targetWaitTimeout: step.targetWaitTimeoutMs }
      : {}),
      data: { showSampleDownload: step.showSampleDownload === true },
    };
  });
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `pnpm vitest run src/components/Nux/NuxTour/buildJoyrideSteps.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Write the tooltip**

Create `src/components/Nux/NuxTour/NuxTooltip.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Anchor, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import type { TooltipRenderProps } from "react-joyride";

/** Where the sample spreadsheet is served from. See `public/samples/`. */
const SAMPLE_CSV_HREF = "/samples/avandar-sample-sales.csv";

/**
 * The tutorial's tooltip body.
 *
 * Replaces Joyride's default chrome entirely so the tooltip is a Mantine
 * surface like everything else in the product, rather than a third-party
 * widget wearing our colours.
 */
export function NuxTooltip({
  backProps,
  closeProps,
  index,
  primaryProps,
  size,
  step,
  tooltipProps,
}: Readonly<TooltipRenderProps>): ReactNode {
  const showSampleDownload =
    (step.data as { showSampleDownload?: boolean } | undefined)
      ?.showSampleDownload === true;
  const isLastStep = index === size - 1;

  return (
    <Card {...tooltipProps} withBorder shadow="md" padding="md" maw={380}>
      <Stack gap="xs">
        {step.title ?
          <Title order={4} size="h5">
            {step.title}
          </Title>
        : null}
        <Text size="sm">{step.content}</Text>
        {showSampleDownload ?
          <Text size="sm" c="dimmed">
            <Trans>
              No spreadsheet handy?{" "}
              <Anchor href={SAMPLE_CSV_HREF} download size="sm">
                Download our sample
              </Anchor>{" "}
              and use that.
            </Trans>
          </Text>
        : null}
        <Group justify="space-between" mt="xs">
          <Button {...closeProps} variant="subtle" color="neutral" size="xs">
            <Trans>Close</Trans>
          </Button>
          <Group gap="xs">
            {index > 0 ?
              <Button {...backProps} variant="default" size="xs">
                <Trans>Back</Trans>
              </Button>
            : null}
            <Button {...primaryProps} size="xs">
              {isLastStep ?
                <Trans>Done</Trans>
              : <Trans>Next</Trans>}
            </Button>
          </Group>
        </Group>
        <Text size="xs" c="dimmed" ta="right">
          {index + 1} / {size}
        </Text>
      </Stack>
    </Card>
  );
}
```

- [ ] **Step 6: Write the tour wrapper**

Create `src/components/Nux/NuxTour/NuxTour.tsx`:

```tsx
import { useLingui } from "@lingui/react";
import { useMemo } from "react";
import { EVENTS, Joyride } from "react-joyride";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { buildJoyrideSteps } from "@/components/Nux/NuxTour/buildJoyrideSteps";
import { NuxTooltip } from "@/components/Nux/NuxTour/NuxTooltip";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard";
import type { EventHandler } from "react-joyride";
import type { ReactNode } from "react";

/**
 * Sits above Mantine's modal layer. Milestones 3 and 4 both spotlight controls
 * inside portals, and Joyride's default of 100 would put the overlay behind
 * them.
 */
const NUX_TOUR_Z_INDEX = 400;

/**
 * Renders the active milestone's tooltips.
 *
 * Controlled mode: `stepIndex` comes from `NuxStateManager`, not from
 * Joyride's own cursor, because the tour also advances on real product events
 * that Joyride knows nothing about.
 */
export function NuxTour(): ReactNode {
  const { i18n } = useLingui();
  const [state, dispatch] = NuxStateManager.useContext();

  const milestone = useMemo(() => {
    return FIRST_DASHBOARD_MILESTONES.find((candidate) => {
      return candidate.key === state.activeMilestoneKey;
    });
  }, [state.activeMilestoneKey]);

  const steps = useMemo(() => {
    return milestone ? buildJoyrideSteps({ milestone, i18n }) : [];
  }, [milestone, i18n]);

  if (!milestone || steps.length === 0) {
    return null;
  }

  const onEvent: EventHandler = (data) => {
    if (data.type === EVENTS.STEP_AFTER) {
      // The last step of a milestone deliberately does NOT complete it.
      // Milestones are completed by real outcomes on the event bus, so a user
      // who clicks Next without acting is simply out of tooltips.
      const nextIndex =
        data.action === "prev" ? data.index - 1 : data.index + 1;
      if (nextIndex >= steps.length) {
        dispatch.closeTour();
        return;
      }
      dispatch.goToStep(nextIndex);
      return;
    }
    if (data.type === EVENTS.TARGET_NOT_FOUND || data.type === EVENTS.ERROR) {
      // The target never appeared within its wait timeout. Collapse to the
      // pill rather than leaving an overlay over a page with no spotlight.
      dispatch.closeTour();
      return;
    }
    if (data.type === EVENTS.TOUR_END) {
      dispatch.closeTour();
    }
  };

  return (
    <Joyride
      steps={steps}
      run
      continuous
      stepIndex={Math.min(state.activeStepIndex, steps.length - 1)}
      onEvent={onEvent}
      tooltipComponent={NuxTooltip}
      options={{
        zIndex: NUX_TOUR_Z_INDEX,
        // Clicking the backdrop should not end the tutorial: the user is very
        // likely clicking the control the tooltip just told them to click.
        overlayClickAction: false,
        spotlightPadding: 6,
      }}
    />
  );
}
```

- [ ] **Step 7: Write the lazy boundary**

Create `src/components/Nux/NuxTour/NuxTourLazy.tsx`:

```tsx
import { lazy, Suspense } from "react";
import type { ReactNode } from "react";

/**
 * Keeps `react-joyride` out of the main chunk. Most users are not eligible for
 * the tutorial and must never download it; `NuxRoot` only renders this once a
 * milestone is actually open.
 */
const LazyNuxTour = lazy(async () => {
  const module = await import("@/components/Nux/NuxTour/NuxTour");
  return { default: module.NuxTour };
});

export function NuxTourLazy(): ReactNode {
  return (
    <Suspense fallback={null}>
      <LazyNuxTour />
    </Suspense>
  );
}
```

- [ ] **Step 8: Type-check**

Run: `pnpm type-check`
Expected: exit 0. If `Joyride` is reported as not exported, Task 1 installed react-joyride 2.

- [ ] **Step 9: Commit**

```bash
git add src/components/Nux/NuxTour
git commit -m "feat(nux): add the Joyride tour renderer and Mantine tooltip"
```

---

## Task 14: Build the checklist panel

**Files:**
- Create: `src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.tsx`
- Test: `src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { NuxChecklistPanel } from "@/components/Nux/NuxChecklistPanel/NuxChecklistPanel";
import { render, screen } from "@/test-utils";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { ReactNode } from "react";

function renderPanel(overrides: Partial<NuxAppState>): void {
  function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return (
      <NuxStateManager.Provider
        initialStateOverrides={
          {
            isHydrated: true,
            progressId: "p1",
            status: "in_progress",
            completedMilestones: [],
            activeMilestoneKey: undefined,
            activeStepIndex: 0,
            isPanelExpanded: true,
            blockedReason: undefined,
            recentDatasetId: undefined,
            recentDashboardId: undefined,
            ...overrides,
          } as NuxAppState
        }
      >
        {children}
      </NuxStateManager.Provider>
    );
  }
  render(<NuxChecklistPanel onOpenMilestone={vi.fn()} />, { wrapper: Wrapper });
}

describe("NuxChecklistPanel", () => {
  it("lists all four milestones when expanded", () => {
    renderPanel({});
    expect(screen.getByText("Add your first dataset")).toBeInTheDocument();
    expect(screen.getByText("Share it with your workspace")).toBeInTheDocument();
    expect(screen.getByText("0 / 4")).toBeInTheDocument();
  });

  it("shows progress as milestones complete", () => {
    renderPanel({ completedMilestones: ["add_dataset", "run_query"] });
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
  });

  it("collapses to a pill", () => {
    renderPanel({ isPanelExpanded: false });
    expect(screen.queryByText("Add your first dataset")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Get started/ }),
    ).toBeInTheDocument();
  });

  it("renders nothing once every milestone is done", () => {
    renderPanel({
      status: "completed",
      completedMilestones: [
        "add_dataset",
        "run_query",
        "build_dashboard",
        "share_dashboard",
      ],
    });
    expect(screen.queryByText(/Get started/)).not.toBeInTheDocument();
  });

  it("renders nothing once dismissed", () => {
    renderPanel({ status: "dismissed" });
    expect(screen.queryByText(/Get started/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.test.tsx`
Expected: FAIL, cannot resolve `NuxChecklistPanel`.

- [ ] **Step 3: Write the panel**

Create `src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.tsx`:

```tsx
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
  ActionIcon,
  Button,
  Card,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconCheck, IconChevronRight, IconX } from "@tabler/icons-react";
import { NUX_MILESTONE_KEYS } from "$/models/Nux/NuxProgress.constants";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { areAllMilestonesComplete } from "@/components/Nux/NuxStateManager/nuxSelectors";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard";
import type { NuxMilestoneKey } from "$/models/Nux/NuxProgress.types";
import type { ReactNode } from "react";

/**
 * A `msg` descriptor rather than a bare string: `i18n._("...")` on a literal
 * is invisible to the Lingui extractor, so the label would never reach the
 * catalogs and would ship untranslated.
 */
const DISMISS_LABEL = msg`Dismiss the tutorial`;

type Props = {
  /**
   * Routing lives with the caller, not here: the panel knows which milestone
   * was clicked, `NuxRoot` knows how to get there.
   */
  onOpenMilestone: (key: NuxMilestoneKey) => void;
};

/**
 * The persistent "Get started" checklist.
 *
 * Mounted once in the workspace layout so it survives every route change,
 * which matters because the four milestones span five routes and progress
 * ticks over while the user is somewhere else.
 *
 * It is also the tutorial's navigation. Clicking a row routes to that
 * milestone, which is why no tooltip has to be spent telling the user where
 * to click next.
 */
export function NuxChecklistPanel({ onOpenMilestone }: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  const [state, dispatch] = NuxStateManager.useContext();

  const isFinished = areAllMilestonesComplete(state.completedMilestones);
  if (
    !state.isHydrated ||
    state.status === "dismissed" ||
    state.status === "not_started" ||
    isFinished
  ) {
    return null;
  }

  const completedCount = state.completedMilestones.length;
  const total = NUX_MILESTONE_KEYS.length;

  if (!state.isPanelExpanded) {
    return (
      <Button
        pos="fixed"
        bottom={16}
        right={16}
        style={{ zIndex: 300 }}
        size="compact-sm"
        rightSection={<IconChevronRight size={14} />}
        onClick={() => {
          dispatch.setPanelExpanded(true);
        }}
      >
        <Trans>
          Get started {completedCount}/{total}
        </Trans>
      </Button>
    );
  }

  return (
    <Card
      withBorder
      shadow="md"
      padding="md"
      pos="fixed"
      bottom={16}
      right={16}
      w={320}
      style={{ zIndex: 300 }}
    >
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Title order={4} size="h6">
            <Trans>Get started</Trans>
          </Title>
          <Group gap={4} wrap="nowrap">
            <Text size="xs" c="dimmed">
              {completedCount} / {total}
            </Text>
            <ActionIcon
              variant="subtle"
              color="neutral"
              size="sm"
              aria-label={i18n._(DISMISS_LABEL)}
              onClick={() => {
                dispatch.dismiss();
              }}
            >
              <IconX size={14} />
            </ActionIcon>
          </Group>
        </Group>

        {FIRST_DASHBOARD_MILESTONES.map((milestone) => {
          const isDone = state.completedMilestones.includes(milestone.key);
          return (
            <UnstyledButton
              key={milestone.key}
              disabled={isDone}
              onClick={() => {
                onOpenMilestone(milestone.key);
              }}
            >
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <ThemeIcon
                  size="sm"
                  radius="xl"
                  variant={isDone ? "filled" : "light"}
                  color={isDone ? "green" : "neutral"}
                >
                  {isDone ?
                    <IconCheck size={12} />
                  : null}
                </ThemeIcon>
                <Stack gap={0}>
                  <Text size="sm" fw={isDone ? 400 : 600} td={isDone ? "line-through" : undefined}>
                    {i18n._(milestone.title)}
                  </Text>
                  {isDone ?
                    null
                  : <Text size="xs" c="dimmed">
                      {i18n._(milestone.summary)}
                    </Text>
                  }
                </Stack>
              </Group>
            </UnstyledButton>
          );
        })}

        {state.blockedReason ?
          <Text size="xs" c="dimmed">
            {state.blockedReason}
          </Text>
        : null}
      </Stack>
    </Card>
  );
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `pnpm vitest run src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/Nux/NuxChecklistPanel
git commit -m "feat(nux): add the get-started checklist panel"
```

---

## Task 15: Build the welcome modal

**Files:**
- Create: `src/components/Nux/NuxWelcomeModal/NuxWelcomeModal.tsx`
- Test: `src/components/Nux/NuxWelcomeModal/NuxWelcomeModal.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/Nux/NuxWelcomeModal/NuxWelcomeModal.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { NuxWelcomeModal } from "@/components/Nux/NuxWelcomeModal/NuxWelcomeModal";
import { fireEvent, render, screen } from "@/test-utils";

describe("NuxWelcomeModal", () => {
  it("sets expectations without promising anything about the team", () => {
    render(
      <NuxWelcomeModal isOpen onStart={vi.fn()} onDecline={vi.fn()} />,
    );
    expect(screen.getByText("Welcome to Avandar")).toBeInTheDocument();
    expect(
      screen.getByText(/spreadsheet to your first dashboard/),
    ).toBeInTheDocument();
  });

  it("starts the tutorial", () => {
    const onStart = vi.fn();
    render(<NuxWelcomeModal isOpen onStart={onStart} onDecline={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Start tour" }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("declines the tutorial", () => {
    const onDecline = vi.fn();
    render(<NuxWelcomeModal isOpen onStart={vi.fn()} onDecline={onDecline} />);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    render(
      <NuxWelcomeModal isOpen={false} onStart={vi.fn()} onDecline={vi.fn()} />,
    );
    expect(screen.queryByText("Welcome to Avandar")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/components/Nux/NuxWelcomeModal/NuxWelcomeModal.test.tsx`
Expected: FAIL, cannot resolve `NuxWelcomeModal`.

- [ ] **Step 3: Write the modal**

Create `src/components/Nux/NuxWelcomeModal/NuxWelcomeModal.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  isOpen: boolean;
  onStart: () => void;
  onDecline: () => void;
};

/**
 * The one-time invite.
 *
 * Shown at most once per user: both buttons write `in_progress`, and the
 * invite's condition is `status === "not_started"`.
 *
 * The copy names the outcome and the time cost, because setting an
 * expectation up front is what makes people finish. It deliberately does not
 * mention colleagues seeing the result: the goal here is to lower the stakes
 * of starting, and sharing is explained when they get to it.
 */
export function NuxWelcomeModal({
  isOpen,
  onStart,
  onDecline,
}: Readonly<Props>): ReactNode {
  return (
    <Modal
      opened={isOpen}
      onClose={onDecline}
      centered
      size="md"
      title={<Trans>Welcome to Avandar</Trans>}
    >
      <Stack gap="lg">
        <Text size="sm">
          <Trans>
            Want a quick tour? In about 5 minutes you'll go from a spreadsheet
            to your first dashboard.
          </Trans>
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onDecline}>
            <Trans>Not now</Trans>
          </Button>
          <Button onClick={onStart}>
            <Trans>Start tour</Trans>
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `pnpm vitest run src/components/Nux/NuxWelcomeModal/NuxWelcomeModal.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/Nux/NuxWelcomeModal
git commit -m "feat(nux): add the tutorial welcome invite"
```

---

## Task 16: Wire hydration, persistence, events, and navigation

**Files:**
- Create: `src/components/Nux/NuxRoot/useNuxHydration.ts`
- Create: `src/components/Nux/NuxRoot/useNuxPersistence.ts`
- Create: `src/components/Nux/NuxRoot/useNuxCompletionEvents.ts`
- Create: `src/components/Nux/NuxRoot/useNuxNavigation.ts`
- Create: `src/components/Nux/NuxRoot/NuxRoot.tsx`
- Modify: `src/components/layouts/RootLayout/WorkspaceLayoutContents.tsx`

Four hooks rather than one, so each has a single job and the composition in `NuxRoot` reads as a description of the feature.

- [ ] **Step 1: Write the hydration hook**

Create `src/components/Nux/NuxRoot/useNuxHydration.ts`:

```ts
import { useEffect, useRef } from "react";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { NuxProgressClient } from "@/clients/NuxProgressClient";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { resolveAutoCheckedMilestones } from "@/components/Nux/NuxStateManager/resolveAutoCheckedMilestones";
import { areAllMilestonesComplete } from "@/components/Nux/NuxStateManager/nuxSelectors";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

/**
 * Loads the progress row, runs the one-shot auto-check, and seeds state.
 *
 * The auto-check only runs while status is `not_started`. That single
 * condition is also what makes the profile restart replay all four milestones:
 * restart writes `in_progress` directly, so this never fires for it.
 */
export function useNuxHydration(): void {
  const workspace = useCurrentWorkspace();
  const dispatch = NuxStateManager.useDispatch();
  const state = NuxStateManager.useState();
  const hasRunRef = useRef(false);

  useEffect(
    function hydrateNuxProgress() {
      if (hasRunRef.current || state.isHydrated) {
        return;
      }
      hasRunRef.current = true;

      void (async () => {
        const progress = await NuxProgressClient.ensureForCurrentUser();

        if (progress.status !== "not_started") {
          dispatch.hydrate({
            progressId: progress.progressId,
            status: progress.status,
            completedMilestones: progress.completedMilestones,
          });
          return;
        }

        const artifacts = await NuxProgressClient.getWorkspaceArtifacts({
          workspaceId: workspace.id,
        });
        const autoChecked = resolveAutoCheckedMilestones(artifacts);

        // Nothing left to teach: record it as finished so this user is never
        // invited, and never has to dismiss an invite for work they have
        // already done.
        if (areAllMilestonesComplete(autoChecked)) {
          await NuxProgressClient.updateProgress({
            progressId: progress.progressId,
            data: { status: "completed", completedMilestones: autoChecked },
          });
          dispatch.hydrate({
            progressId: progress.progressId,
            status: "completed",
            completedMilestones: autoChecked,
          });
          return;
        }

        if (autoChecked.length > 0) {
          await NuxProgressClient.updateProgress({
            progressId: progress.progressId,
            data: { completedMilestones: autoChecked },
          });
        }

        dispatch.hydrate({
          progressId: progress.progressId,
          status: "not_started",
          completedMilestones: autoChecked,
        });
      })().catch(() => {
        // A failed hydrate means no tutorial, which is the correct degraded
        // state. It must never surface as an error to a brand-new user, and
        // `AnalyticsClient` already swallows its own failures.
        hasRunRef.current = false;
      });
    },
    [dispatch, state.isHydrated, workspace.id],
  );
}
```

Drop the `AnalyticsClient` import from this file: `NuxRoot` logs `nux.started` itself, at the point the user actually accepts.

- [ ] **Step 2: Write the persistence hook**

Create `src/components/Nux/NuxRoot/useNuxPersistence.ts`:

```ts
import { useEffect, useRef } from "react";
import { NuxProgressClient } from "@/clients/NuxProgressClient";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";

/**
 * Writes status and completed milestones back whenever they change.
 *
 * Writes are compared against the last value this hook itself wrote rather
 * than fired on every render, so expanding the panel or stepping through
 * tooltips costs nothing. Step index is deliberately never persisted.
 */
export function useNuxPersistence(): void {
  const state = NuxStateManager.useState();
  const lastWrittenRef = useRef<string | undefined>(undefined);

  useEffect(
    function persistNuxProgress() {
      if (!state.isHydrated || !state.progressId || !state.status) {
        return;
      }
      const signature = JSON.stringify({
        status: state.status,
        completedMilestones: state.completedMilestones,
      });
      if (lastWrittenRef.current === undefined) {
        // The first pass records what hydration already put in the database,
        // so a fresh mount does not write a row identical to the one it read.
        lastWrittenRef.current = signature;
        return;
      }
      if (lastWrittenRef.current === signature) {
        return;
      }
      lastWrittenRef.current = signature;
      void NuxProgressClient.updateProgress({
        progressId: state.progressId,
        data: {
          status: state.status,
          completedMilestones: state.completedMilestones,
        },
      }).catch(() => {
        // Losing a write costs at most a replayed milestone. It must never
        // interrupt what the user is doing.
      });
    },
    [
      state.isHydrated,
      state.progressId,
      state.status,
      state.completedMilestones,
    ],
  );
}
```

- [ ] **Step 3: Write the completion-event hook**

Create `src/components/Nux/NuxRoot/useNuxCompletionEvents.ts`:

```ts
import { useEffect } from "react";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { NuxEvents } from "@/components/Nux/nuxEvents";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { NuxEvent } from "@/components/Nux/nuxEvents";

/**
 * Advances the tutorial when a real outcome lands.
 *
 * The subscription exists only while the tutorial is mounted, which is what
 * makes `NuxEvents.emit` free for everyone else: with no subscriber, the four
 * production call sites do nothing at all.
 */
export function useNuxCompletionEvents(): void {
  const workspace = useCurrentWorkspace();
  const dispatch = NuxStateManager.useDispatch();

  useEffect(
    function subscribeToNuxEvents() {
      return NuxEvents.subscribe((event: NuxEvent) => {
        const milestone = FIRST_DASHBOARD_MILESTONES.find((candidate) => {
          return candidate.completionEvent === event.name;
        });
        if (!milestone) {
          return;
        }
        dispatch.completeMilestone({
          key: milestone.key,
          datasetId:
            event.name === "dataset.saved" ? event.payload.datasetId : undefined,
          dashboardId:
            event.name === "dashboard.created" ?
              event.payload.dashboardId
            : undefined,
        });
        void AnalyticsClient.logEvent({
          event: "nux.milestone_completed",
          workspaceId: workspace.id,
          payload: { milestoneKey: milestone.key },
        });
      });
    },
    [dispatch, workspace.id],
  );
}
```

- [ ] **Step 4: Write the navigation hook**

Create `src/components/Nux/NuxRoot/useNuxNavigation.ts`:

```ts
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { AppLinks } from "@/config/AppLinks";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { NuxMilestoneKey } from "$/models/Nux/NuxProgress.types";

/**
 * Routes to a milestone's starting place and opens it.
 *
 * This is where the tutorial's navigation lives, which is why no tooltip
 * spends itself telling the user to click a nav item.
 */
export function useNuxNavigation(): (key: NuxMilestoneKey) => void {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const state = NuxStateManager.useState();
  const dispatch = NuxStateManager.useDispatch();
  const chatPanelDispatch = ChatPanelStateManager.useDispatch();

  return useCallback(
    (key: NuxMilestoneKey) => {
      const milestone = FIRST_DASHBOARD_MILESTONES.find((candidate) => {
        return candidate.key === key;
      });
      dispatch.openMilestone(key);
      if (!milestone) {
        return;
      }

      if (milestone.route.kind === "data_import") {
        void navigate(AppLinks.dataImport(workspace.slug));
        return;
      }

      if (milestone.route.kind === "data_explorer") {
        // The chat panel remembers whether the user last had it open, so the
        // auto-open on mount cannot be relied on. Milestone 2 spotlights the
        // composer, so open it explicitly.
        chatPanelDispatch.open();
        const explorerLink = AppLinks.dataExplorer(workspace.slug);
        void navigate({
          to: explorerLink.to,
          params: explorerLink.params,
          // Preselects the dataset from milestone 1 through the explorer's
          // own `ds` search param, so the user does not have to find it again.
          search:
            state.recentDatasetId ? { ds: state.recentDatasetId } : {},
        });
        return;
      }

      if (milestone.route.kind === "dashboard_editor") {
        // `SaveToDashboardModal` does not navigate on create; it shows a toast
        // and closes. So milestone 4 has to route there itself, using the id
        // milestone 3 captured. Without an id there is nothing to open, and
        // the tooltips would spotlight a Share button that is not on screen.
        if (!state.recentDashboardId) {
          return;
        }
        void navigate({
          to: "/$workspaceSlug/dashboards/edit/$dashboardId",
          params: {
            workspaceSlug: workspace.slug,
            dashboardId: state.recentDashboardId,
          },
        });
      }
    },
    [
      chatPanelDispatch,
      dispatch,
      navigate,
      state.recentDatasetId,
      state.recentDashboardId,
      workspace.slug,
    ],
  );
}
```

- [ ] **Step 5: Write the root component**

Create `src/components/Nux/NuxRoot/NuxRoot.tsx`:

```tsx
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { NuxChecklistPanel } from "@/components/Nux/NuxChecklistPanel/NuxChecklistPanel";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { getFirstUnfinishedMilestoneKey } from "@/components/Nux/NuxStateManager/nuxSelectors";
import { NuxTourLazy } from "@/components/Nux/NuxTour/NuxTourLazy";
import { NuxWelcomeModal } from "@/components/Nux/NuxWelcomeModal/NuxWelcomeModal";
import { useNuxCompletionEvents } from "@/components/Nux/NuxRoot/useNuxCompletionEvents";
import { useNuxHydration } from "@/components/Nux/NuxRoot/useNuxHydration";
import { useNuxNavigation } from "@/components/Nux/NuxRoot/useNuxNavigation";
import { useNuxPersistence } from "@/components/Nux/NuxRoot/useNuxPersistence";
import { useNuxEligibility } from "@/components/Nux/useNuxEligibility";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { ReactNode } from "react";

/** Composes the tutorial's effects and surfaces. Assumes eligibility. */
function NuxRootContents(): ReactNode {
  const workspace = useCurrentWorkspace();
  const [state, dispatch] = NuxStateManager.useContext();
  const openMilestone = useNuxNavigation();

  useNuxHydration();
  useNuxPersistence();
  useNuxCompletionEvents();

  const isInviteOpen = state.isHydrated && state.status === "not_started";

  return (
    <>
      <NuxWelcomeModal
        isOpen={isInviteOpen}
        onStart={() => {
          const firstUnfinished = getFirstUnfinishedMilestoneKey(
            state.completedMilestones,
          );
          dispatch.startTour();
          void AnalyticsClient.logEvent({
            event: "nux.started",
            workspaceId: workspace.id,
            payload: {
              startedAtMilestone: firstUnfinished ?? "add_dataset",
            },
          });
          if (firstUnfinished) {
            openMilestone(firstUnfinished);
          }
        }}
        onDecline={() => {
          dispatch.declineInvite();
        }}
      />
      <NuxChecklistPanel onOpenMilestone={openMilestone} />
      {state.activeMilestoneKey ?
        <NuxTourLazy />
      : null}
    </>
  );
}

/**
 * The onboarding tutorial's entry point.
 *
 * Renders literally nothing for an ineligible user, which also means the
 * `react-joyride` chunk is never fetched for them.
 */
export function NuxRoot(): ReactNode {
  const isEligible = useNuxEligibility();
  if (!isEligible) {
    return null;
  }
  return <NuxRootContents />;
}
```

- [ ] **Step 6: Mount it**

In `src/components/layouts/RootLayout/WorkspaceLayoutContents.tsx`, add the import:

```ts
import { NuxRoot } from "@/components/Nux/NuxRoot/NuxRoot";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
```

Then replace the returned JSX:

```tsx
  return (
    <ModalsProvider modalProps={DEFAULT_MODAL_PROPS}>
      <DataExplorerStateManager.Provider>
        <DashboardEditorStateManager.Provider>
          <ChatPanelProvider>
            <AppDropzone>
              <AppShell
```

with:

```tsx
  return (
    <ModalsProvider modalProps={DEFAULT_MODAL_PROPS}>
      <DataExplorerStateManager.Provider>
        <DashboardEditorStateManager.Provider>
          <ChatPanelProvider>
            <NuxStateManager.Provider>
              <AppDropzone>
                <AppShell
```

and the closing tags:

```tsx
                {children}
              </AppShell>
            </AppDropzone>
          </ChatPanelProvider>
        </DashboardEditorStateManager.Provider>
      </DataExplorerStateManager.Provider>
    </ModalsProvider>
  );
```

with:

```tsx
                  {children}
                </AppShell>
                <NuxRoot />
              </AppDropzone>
            </NuxStateManager.Provider>
          </ChatPanelProvider>
        </DashboardEditorStateManager.Provider>
      </DataExplorerStateManager.Provider>
    </ModalsProvider>
  );
```

`NuxStateManager.Provider` sits inside `ChatPanelProvider` because `useNuxNavigation` dispatches to the chat panel. `<NuxRoot />` is a sibling of `<AppShell>` rather than a child, so its fixed-position panel is not clipped by the shell's layout.

- [ ] **Step 7: Type-check and lint**

```bash
pnpm type-check
pnpm lint
```

Expected: both exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/components/Nux/NuxRoot src/components/layouts/RootLayout/WorkspaceLayoutContents.tsx
git commit -m "feat(nux): wire hydration, persistence, events, and navigation"
```

---

# Phase 4: Integration with existing flows

## Task 17: Add the sample dataset

**Files:**
- Create: `public/samples/avandar-sample-sales.csv`

- [ ] **Step 1: Generate the file**

The columns are chosen so milestone 1's payoff tooltip has all three summary
visuals to point at (a date timeline, two text frequency bars, two numeric stat
blocks) and so "revenue by region" is the obvious first question in milestone 2.
The data is entirely invented; it contains no personal data.

Write this to the scratchpad as `makeSample.mjs`:

```js
import { writeFileSync } from "node:fs";

const REGIONS = ["North", "South", "East", "West"];
const CATEGORIES = ["Hardware", "Software", "Services", "Training", "Support"];

// A tiny seeded LCG, so regenerating the file produces byte-identical output
// and a diff never shows 200 changed rows for no reason.
let seed = 20260816;
function random() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function pick(items) {
  return items[Math.floor(random() * items.length)];
}

const rows = [["order_date", "region", "product_category", "units_sold", "revenue_usd"]];
for (let index = 0; index < 200; index += 1) {
  const day = new Date(Date.UTC(2025, 0, 1));
  day.setUTCDate(day.getUTCDate() + Math.floor(random() * 365));
  const units = 1 + Math.floor(random() * 60);
  const revenue = (units * (35 + random() * 165)).toFixed(2);
  rows.push([
    day.toISOString().slice(0, 10),
    pick(REGIONS),
    pick(CATEGORIES),
    String(units),
    revenue,
  ]);
}

writeFileSync(
  "public/samples/avandar-sample-sales.csv",
  rows.map((row) => row.join(",")).join("\n") + "\n",
);
```

Then run it from the repo root:

```bash
mkdir -p public/samples
node /private/tmp/claude-501/-Users-pablo-src-worktrees-avandar-feat-nux/db699ac3-d1fa-47a4-ba48-9b18e6dc4d1d/scratchpad/makeSample.mjs
```

- [ ] **Step 2: Verify the shape**

```bash
head -3 public/samples/avandar-sample-sales.csv
wc -l public/samples/avandar-sample-sales.csv
```

Expected: a header line reading `order_date,region,product_category,units_sold,revenue_usd`, then two data rows; 201 lines total.

- [ ] **Step 3: Verify it is served**

Run `pnpm dev`, then in another terminal:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5173/samples/avandar-sample-sales.csv
```

Expected: `200`. Anything else means the file is not under `public/` and `NuxTooltip`'s download link is dead.

- [ ] **Step 4: Commit**

```bash
git add public/samples/avandar-sample-sales.csv
git commit -m "feat(nux): add the sample sales dataset"
```

---

## Task 18: Add the milestone 1 anchors and event

**Files:**
- Modify: `src/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView.tsx`
- Modify: `src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/DatasetSummaryView.tsx`

- [ ] **Step 1: Anchor the upload form and the import form**

In `ManualUploadView.tsx`, add the imports:

```ts
import { NuxAnchors, nuxAnchorProps } from "@/components/Nux/nuxAnchors";
import { NuxEvents } from "@/components/Nux/nuxEvents";
```

Then replace the returned JSX:

```tsx
  return (
    <Box {...boxProps}>
      <Stack align="flex-start">
        <FileUploadForm
          label={t`Upload a spreadsheet`}
```

with:

```tsx
  return (
    <Box {...boxProps}>
      <Stack align="flex-start">
        <Box {...nuxAnchorProps(NuxAnchors.datasetUploadForm)}>
          <FileUploadForm
            label={t`Upload a spreadsheet`}
```

and close the new `Box` after `<FileUploadForm ... />`, replacing:

```tsx
          onSubmit={onFileSubmit}
        />

        {elements.importForm()}
```

with:

```tsx
            onSubmit={onFileSubmit}
          />
        </Box>

        <Box {...nuxAnchorProps(NuxAnchors.datasetImportForm)}>
          {elements.importForm()}
        </Box>
```

A wrapping `Box` rather than a prop on `FileUploadForm`, because that component comes from `@avandar/ui` and does not forward unknown props.

- [ ] **Step 2: Emit the saved event**

Still in `ManualUploadView.tsx`, replace:

```tsx
        <DatasetImportForm
          key={id}
          initialDatasetName={uploadedFile.name}
          rows={previewRows}
          dataSourceMetadata={dataSourceMetadata}
          parseOptions={parseOptions}
          onSaveSuccess={onSaveSuccess}
```

with:

```tsx
        <DatasetImportForm
          key={id}
          initialDatasetName={uploadedFile.name}
          rows={previewRows}
          dataSourceMetadata={dataSourceMetadata}
          parseOptions={parseOptions}
          onSaveSuccess={(savedDataset) => {
            // Advances the onboarding tutorial's first milestone. A no-op
            // when nobody is in the tutorial, which is the normal case.
            NuxEvents.emit("dataset.saved", { datasetId: savedDataset.id });
            onSaveSuccess?.(savedDataset);
          }}
```

- [ ] **Step 3: Anchor the summary view**

In `DatasetSummaryView.tsx`, add the import:

```ts
import { NuxAnchors, nuxAnchorProps } from "@/components/Nux/nuxAnchors";
```

Then replace the loaded-state return's opening tag:

```tsx
  return (
    <Box className={css.datasetSummaryViewLayout}>
```

with:

```tsx
  return (
    <Box
      className={css.datasetSummaryViewLayout}
      {...nuxAnchorProps(NuxAnchors.datasetSummary)}
    >
```

Deliberately the loaded return, not the `isLoadingMeta` skeleton branch above
it. Anchoring the skeleton would let milestone 1's payoff tooltip fire against
three grey rectangles, which is the opposite of the point.

- [ ] **Step 4: Verify all three anchors render**

Run `pnpm dev`, sign in, go to Import, upload `public/samples/avandar-sample-sales.csv`, save it. At each stage run this in the browser console:

```js
document.querySelectorAll("[data-nux]").forEach((el) => console.log(el.dataset.nux));
```

Expected: `dataset-upload-form` on the import page; `dataset-import-form` after the file parses; `dataset-summary` on the dataset page.

- [ ] **Step 5: Run the affected tests**

Run: `pnpm vitest run src/views/DataManagerApp`
Expected: PASS. `ManualUploadView.test.tsx` exercises this component; if the extra `Box` breaks a query, fix the test's selector rather than removing the anchor.

- [ ] **Step 6: Commit**

```bash
git add src/views/DataManagerApp
git commit -m "feat(nux): anchor the dataset import flow and emit dataset.saved"
```

---

## Task 19: Add the explorer anchors, the builder fix, and the query event

**Files:**
- Modify: `src/views/DataExplorerApp/DataExplorerApp.tsx`
- Modify: `src/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer.tsx`
- Modify: `src/components/ChatPanel/ChatThread/Composer/Composer.tsx`

- [ ] **Step 1: Fix the builder path**

This is the change described in spec §3.3.2. Today "Save to dashboard" and "Save as new dataset" are disabled unless `state.rawSql` is set, which only the chat panel, the SQL editor, and opening a saved dataset ever do. A query built in the guided builder therefore cannot be saved anywhere, which is a real gap independent of onboarding.

In `DataExplorerApp.tsx`, add the import:

```ts
import { selectSqlToExecute } from "@/views/DataExplorerApp/selectSqlToExecute/selectSqlToExecute";
```

Then, just after the `queryResultColumns` assignment, add:

```ts
  /**
   * The SQL behind whatever is currently on screen, whether it came from the
   * chat panel, the SQL editor, or the guided query builder.
   *
   * `state.rawSql` alone is not enough: the builder generates its SQL inside
   * `selectSqlToExecute` at execution time and never stores it, so gating the
   * save actions on `rawSql` left a chart the user had just built with no way
   * to keep it.
   */
  const savableSql = selectSqlToExecute({
    rawSql: state.rawSql,
    isStructuredQueryInSync: state.isStructuredQueryInSync,
    executionQuery: state.query,
  });
```

Then replace every use of `state.rawSql` in the two Menu.Item guards and their handlers. For the "Save as new dataset" item, replace:

```tsx
              <Menu.Item
                disabled={
                  queryResultData.length === 0 || state.rawSql === undefined
                }
                rightSection={
                  state.rawSql === undefined ?
                    <Tooltip label={t`Run an AI query first.`}>
                      <IconInfoCircle size={16} />
                    </Tooltip>
                  : null
                }
                onClick={() => {
                  if (!state.rawSql) {
                    return;
                  }
```

with:

```tsx
              <Menu.Item
                disabled={
                  queryResultData.length === 0 || savableSql === undefined
                }
                rightSection={
                  savableSql === undefined ?
                    <Tooltip label={t`Run a query first.`}>
                      <IconInfoCircle size={16} />
                    </Tooltip>
                  : null
                }
                onClick={() => {
                  if (!savableSql) {
                    return;
                  }
```

and inside that handler replace `rawSql={state.rawSql}` with `rawSql={savableSql}`.

Apply the identical change to the "Save to dashboard" item below it, including its `rawSql={state.rawSql}` prop on `<SaveToDashboardModal>`.

The tooltip copy changes from "Run an AI query first." to "Run a query first." because after this change an AI query is no longer the only kind that qualifies.

- [ ] **Step 2: Anchor the canvas and the save menu**

In the same file, add:

```ts
import { NuxAnchors, nuxAnchorProps } from "@/components/Nux/nuxAnchors";
import { NuxEvents } from "@/components/Nux/nuxEvents";
```

Spread `{...nuxAnchorProps(NuxAnchors.explorerSaveMenu)}` onto the `<Button>` inside `<Menu.Target>`, and `{...nuxAnchorProps(NuxAnchors.explorerCanvas)}` onto the `<Box ref={chartRef} ...>` that wraps `VisualizationContainer`.

- [ ] **Step 3: Emit the query event**

Still in `DataExplorerApp.tsx`, add this effect after the existing `syncLastQueryError` effect:

```ts
  useEffect(
    function announceSuccessfulQueryToNux() {
      if (isLoadingResults || dataQuery.isError) {
        return;
      }
      if ((queryResults?.data?.length ?? 0) === 0) {
        return;
      }
      // Advances the onboarding tutorial's second milestone. Rows, not just a
      // successful request: an empty result is not an answer.
      NuxEvents.emit("query.succeeded", {});
    },
    [isLoadingResults, dataQuery.isError, queryResults],
  );
```

- [ ] **Step 4: Anchor the visualizations tab**

In `DataExplorerDrawer.tsx`, add the import and spread the anchor onto the element wrapping the `Tabs`' list. The shared `Tabs` component from `@avandar/ui` renders tab headers from `renderTabHeader`, so the reliable anchor is the `classNames={{ list: css.drawerRail }}` element. Add a wrapping `<Box {...nuxAnchorProps(NuxAnchors.explorerVizTab)}>` around `<Tabs ...>` and confirm in the browser that the spotlight lands on the tab rail rather than the whole drawer. If it covers too much, anchor the `listRightSection`'s `DataExplorerDrawerRail` root instead.

- [ ] **Step 5: Anchor the chat composer**

In `src/components/ChatPanel/ChatThread/Composer/Composer.tsx`, spread `{...nuxAnchorProps(NuxAnchors.chatComposer)}` onto the component's outermost element.

- [ ] **Step 6: Verify the builder fix by hand**

Run `pnpm dev`. In the Data Explorer, without using the chat panel, pick a data source in the Query tab's manual form, choose a column, and run it. Open the Save menu.

Expected: "Save to dashboard" is **enabled**. Before this task it was disabled with the tooltip "Run an AI query first."

- [ ] **Step 7: Run the explorer tests**

```bash
pnpm vitest run src/views/DataExplorerApp
pnpm type-check
```

Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add src/views/DataExplorerApp src/components/ChatPanel
git commit -m "feat(nux): let builder queries save to a dashboard, and anchor the explorer"
```

---

## Task 20: Add the dashboard and share anchors and events

**Files:**
- Modify: `src/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardModal.tsx`
- Modify: `src/views/DashboardApp/DashboardShareModal/DashboardShareButton.tsx`
- Modify: `src/components/permissions/ShareResourceModal/ShareGeneralAccess/ShareGeneralAccess.tsx`

- [ ] **Step 1: Emit dashboard.created**

In `SaveToDashboardModal.tsx`, add:

```ts
import { NuxEvents } from "@/components/Nux/nuxEvents";
```

Replace the `insertDashboard` mutation's `onSuccess`:

```ts
  const [insertDashboard, isInsertingDashboard] = DashboardClient.useInsert({
    queryToInvalidate: DashboardClient.QueryKeys.getAll(),
    onSuccess: (createdDashboard) => {
      showOpenDashboardToast(
        createdDashboard.id,
        createdDashboard.name,
        "created",
      );
      onClose();
    },
```

with:

```ts
  const [insertDashboard, isInsertingDashboard] = DashboardClient.useInsert({
    queryToInvalidate: DashboardClient.QueryKeys.getAll(),
    onSuccess: (createdDashboard) => {
      showOpenDashboardToast(
        createdDashboard.id,
        createdDashboard.name,
        "created",
      );
      // Advances the onboarding tutorial's third milestone, and hands it the
      // id milestone 4 needs to route to the editor. This modal deliberately
      // does not navigate on create, so without the id the tutorial would have
      // no way to find the dashboard the user just made.
      NuxEvents.emit("dashboard.created", { dashboardId: createdDashboard.id });
      onClose();
    },
```

Only `insertDashboard`, not `updateDashboard`. Saving a chart into a dashboard
that already exists is not "build your first dashboard".

- [ ] **Step 2: Anchor the share button**

In `DashboardShareButton.tsx`, add the import, then replace:

```tsx
      <Button
        size={size}
        variant={isPublished ? "filled" : "default"}
```

with:

```tsx
      <Button
        {...nuxAnchorProps(NuxAnchors.dashboardShareButton)}
        size={size}
        variant={isPublished ? "filled" : "default"}
```

The anchor goes on the `Button` rather than the wrapping `Tooltip` from
`@avandar/ui`, so the spotlight traces the button and not the tooltip's
invisible wrapper.

- [ ] **Step 3: Anchor the general access controls**

In `ShareGeneralAccess.tsx`, add the import:

```ts
import { NuxAnchors, nuxAnchorProps } from "@/components/Nux/nuxAnchors";
```

Then wrap the two controls. Replace:

```tsx
      <Group wrap="nowrap" align="flex-end" gap="sm">
        <GeneralAccessSelect
```

with:

```tsx
      <Group wrap="nowrap" align="flex-end" gap="sm">
        <Box
          flex={1}
          {...nuxAnchorProps(NuxAnchors.generalAccessSelect)}
        >
          <GeneralAccessSelect
```

closing the `Box` after `onChange={onChange}` `/>`, and replace:

```tsx
        {value === "workspace" ?
          <ShareWorkspaceRoleSelect
            role={workspaceShareRole}
            isDisabled={isBusy}
            onChange={onWorkspaceRoleChange}
          />
        : null}
```

with:

```tsx
        {value === "workspace" ?
          <Box {...nuxAnchorProps(NuxAnchors.shareRoleSelect)}>
            <ShareWorkspaceRoleSelect
              role={workspaceShareRole}
              isDisabled={isBusy}
              onChange={onWorkspaceRoleChange}
            />
          </Box>
        : null}
```

Add `Box` to the existing `@mantine/core` import. `ShareWorkspaceRoleSelect` only mounts once access is `workspace`, which is exactly why milestone 4's role tooltip comes after its access tooltip: the target does not exist until the user has made the choice the previous tooltip asked for.

- [ ] **Step 4: Emit dashboard.sharedToWorkspace**

`ShareGeneralAccess` receives `onChange` from its parent and never sees the
resource id, so the emission belongs with the mutation. In
`src/components/permissions/ShareResourceModal/useShareResourceModalState/useResourceShareMutations.ts`,
add the import and give `useUpsertResourceShare` an `onSuccess` beside its
existing `onError`:

```ts
  const [upsertShare, isUpserting] = ResourceShareClient.useUpsertResourceShare(
    {
      queriesToInvalidate: invalidateKeys,
      onSuccess: (_result, variables) => {
        // Advances the onboarding tutorial's fourth and final milestone.
        //
        // Here rather than in `_applyWorkspaceAccess`, which calls this
        // mutation without awaiting it: emitting there would tick the
        // milestone off on a share that the shareable-dashboard limit is
        // about to reject in `onError` below.
        if (
          variables.principalType === "workspace" &&
          variables.resourceType === "dashboard"
        ) {
          NuxEvents.emit("dashboard.sharedToWorkspace", {
            dashboardId: variables.resourceId,
          });
        }
      },
      onError: (error: Error) => {
```

Confirm the `onSuccess` signature this client actually passes before relying on
`variables`:

```bash
grep -n "onSuccess" src/clients/permissions/ResourceShareClient.ts | head
grep -rn "onSuccess" packages/web/query-hooks/src --include=*.ts | head
```

If `onSuccess` receives only the result and not the variables, take
`resourceType` and `resourceId` from the `useResourceShareMutations` caller by
adding them as parameters to the hook, rather than emitting optimistically.

- [ ] **Step 5: Verify the anchors by hand**

Run `pnpm dev`, open a dashboard in the editor, click Share, and in the console run the `[data-nux]` query from Task 18 Step 4.

Expected: `dashboard-share-button` and `general-access-select` are present. Change General access to "Anyone in ..." and re-run: `share-role-select` appears.

- [ ] **Step 6: Run the affected tests**

```bash
pnpm vitest run src/components/permissions src/views/DashboardApp
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/permissions src/views/DashboardApp src/views/DataExplorerApp/SaveToDashboardModal
git commit -m "feat(nux): anchor the share modal and emit the dashboard milestones"
```

---

## Task 21: Handle a blocked final milestone

**Files:**
- Modify: `src/components/Nux/NuxStateManager/nuxActions.ts`
- Modify: `src/components/Nux/NuxStateManager/nuxActions.test.ts`
- Modify: `src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.tsx`
- Modify: `src/components/permissions/ShareResourceModal/useShareResourceModalState/useResourceShareMutations.ts`

Spec §8 requires this and nothing so far implements it. `FreePlanLimitsConfig.maxShareableDashboardsAllowed` is **1**, and sharing to the workspace consumes it. A user who already spent their one allowance cannot complete milestone 4, and without this task the tutorial parks on a step they can never finish, with a checklist stuck at 3/4 forever.

- [ ] **Step 1: Write the failing test**

Append to `src/components/Nux/NuxStateManager/nuxActions.test.ts`:

```ts
describe("nuxActions.skipActiveMilestone", () => {
  it("records the milestone so a blocked user is not stuck", () => {
    const next = nuxActions.skipActiveMilestone({
      ...HYDRATED,
      completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
      activeMilestoneKey: "share_dashboard",
      blockedReason: "Your plan allows 1 shared dashboard.",
    });
    expect(next.completedMilestones).toContain("share_dashboard");
    expect(next.status).toBe("completed");
    expect(next.blockedReason).toBeUndefined();
  });

  it("does nothing when no milestone is open", () => {
    const state = { ...HYDRATED, activeMilestoneKey: undefined };
    expect(nuxActions.skipActiveMilestone(state)).toBe(state);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/components/Nux/NuxStateManager/nuxActions.test.ts`
Expected: FAIL, `nuxActions.skipActiveMilestone is not a function`.

- [ ] **Step 3: Add the action**

In `nuxActions.ts`, add after `setBlockedReason`:

```ts
  /**
   * Marks the open milestone done without its real outcome having happened.
   *
   * The escape hatch for a milestone the user genuinely cannot finish, which
   * today means exactly one case: the free plan allows one shared dashboard
   * and this user already spent it. Without this the checklist would sit at
   * 3/4 forever, which is a worse experience than an honest "you've seen how
   * this works".
   */
  skipActiveMilestone: (state: NuxAppState): NuxAppState => {
    if (!state.activeMilestoneKey) {
      return state;
    }
    return nuxActions.completeMilestone(state, {
      key: state.activeMilestoneKey,
    });
  },
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `pnpm vitest run src/components/Nux/NuxStateManager/nuxActions.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Offer the skip in the panel**

In `NuxChecklistPanel.tsx`, replace:

```tsx
        {state.blockedReason ?
          <Text size="xs" c="dimmed">
            {state.blockedReason}
          </Text>
        : null}
```

with:

```tsx
        {state.blockedReason ?
          <Stack gap={4}>
            <Text size="xs" c="dimmed">
              {state.blockedReason}
            </Text>
            <Button
              variant="subtle"
              size="compact-xs"
              onClick={() => {
                dispatch.skipActiveMilestone();
              }}
            >
              <Trans>Skip this step</Trans>
            </Button>
          </Stack>
        : null}
```

- [ ] **Step 6: Set the reason when the plan refuses**

In `useResourceShareMutations.ts`, inside the `onError` you edited in Task 20, add to the `isShareableDashboardLimitError(error)` branch, before its `return`:

```ts
          // Tells the tutorial its final milestone cannot be finished on this
          // plan, so the checklist can offer a way out instead of parking on
          // a step the user is not allowed to complete.
          NuxEvents.emit("dashboard.shareBlocked", {
            reason:
              "Your plan does not allow sharing another dashboard. You can upgrade, or unshare another dashboard, and come back to this.",
          });
```

Then extend `src/components/Nux/nuxEvents.ts` with the new name and payload:

```ts
export type NuxEventName =
  | "dataset.saved"
  | "query.succeeded"
  | "dashboard.created"
  | "dashboard.sharedToWorkspace"
  | "dashboard.shareBlocked";

export type NuxEventPayloads = {
  "dataset.saved": { datasetId: string };
  "query.succeeded": Record<string, never>;
  "dashboard.created": { dashboardId: string };
  "dashboard.sharedToWorkspace": { dashboardId: string };
  /** Not a completion. Sets `blockedReason` so the panel can offer a skip. */
  "dashboard.shareBlocked": { reason: string };
};
```

The message is passed as a plain string rather than localised at the emit site
because `useResourceShareMutations` already holds a `t` from `useLingui()`.
Wrap it as t`...` using that existing binding so it reaches the catalogs.

- [ ] **Step 7: Route the new event to the reason, not to a completion**

In `useNuxCompletionEvents.ts`, add this before the milestone lookup:

```ts
        if (event.name === "dashboard.shareBlocked") {
          dispatch.setBlockedReason(event.payload.reason);
          return;
        }
```

`FIRST_DASHBOARD_MILESTONES.find` would return `undefined` for this event
anyway, since no milestone declares it as a completion event, but relying on
that would be relying on an accident.

- [ ] **Step 8: Verify by hand**

You need a free workspace that has already shared one dashboard. Share one, create a second, then try to share that one during the tutorial.

Expected: the share fails with the existing toast, the checklist shows the reason and a "Skip this step" button, and clicking it takes the checklist to 4/4 and hides the panel.

- [ ] **Step 9: Type-check and commit**

```bash
pnpm type-check
git add src/components/Nux src/components/permissions
git commit -m "feat(nux): let a plan-blocked final milestone be skipped"
```

---

## Task 22: Add the restart control to the profile page

**Files:**
- Create: `src/views/ProfileView/TutorialSection.tsx`
- Modify: `src/views/ProfileView/ProfileView.tsx`
- Test: `src/views/ProfileView/TutorialSection.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/views/ProfileView/TutorialSection.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { TutorialSection } from "@/views/ProfileView/TutorialSection";
import { fireEvent, render, screen } from "@/test-utils";

describe("TutorialSection", () => {
  it("offers to restart the tutorial", () => {
    render(<TutorialSection onRestart={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Restart tutorial" }),
    ).toBeInTheDocument();
  });

  it("never says Nux", () => {
    const { container } = render(<TutorialSection onRestart={vi.fn()} />);
    expect(container.textContent?.toLowerCase()).not.toContain("nux");
  });

  it("calls back on click", () => {
    const onRestart = vi.fn();
    render(<TutorialSection onRestart={onRestart} />);
    fireEvent.click(screen.getByRole("button", { name: "Restart tutorial" }));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});
```

The second test is a guard, not a formality: `Nux` is everywhere in this feature's code and it must never leak into copy.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/views/ProfileView/TutorialSection.test.tsx`
Expected: FAIL, cannot resolve `TutorialSection`.

- [ ] **Step 3: Write the section**

Create `src/views/ProfileView/TutorialSection.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Button, Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  onRestart: () => void;
};

/**
 * Lets a user replay the onboarding tutorial.
 *
 * A restart deliberately replays all four milestones rather than skipping the
 * ones the workspace already satisfies: someone who asks to see the tutorial
 * again wants the tutorial, not "you are already done".
 */
export function TutorialSection({ onRestart }: Readonly<Props>): ReactNode {
  return (
    <Stack gap="xs">
      <Title order={3} size="h5">
        <Trans>Tutorial</Trans>
      </Title>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Text c="dimmed" size="sm">
          <Trans>
            Walk through building and sharing a dashboard again, from the top.
          </Trans>
        </Text>
        <Button variant="default" onClick={onRestart}>
          <Trans>Restart tutorial</Trans>
        </Button>
      </Group>
    </Stack>
  );
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `pnpm vitest run src/views/ProfileView/TutorialSection.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Render it in the profile**

In `src/views/ProfileView/ProfileView.tsx`, add the imports:

```ts
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { getFirstUnfinishedMilestoneKey } from "@/components/Nux/NuxStateManager/nuxSelectors";
import { TutorialSection } from "@/views/ProfileView/TutorialSection";
```

Add this inside the component, above the early return:

```ts
  const nuxDispatch = NuxStateManager.useDispatch();
```

Then replace:

```tsx
          <PasswordSection
            onChangePassword={() => {
              navigate({
                to: AppLinks.updatePassword.to,
                search: { redirect: window.location.pathname },
              });
            }}
          />
        </Stack>
```

with:

```tsx
          <PasswordSection
            onChangePassword={() => {
              navigate({
                to: AppLinks.updatePassword.to,
                search: { redirect: window.location.pathname },
              });
            }}
          />

          <Divider />

          <TutorialSection
            onRestart={() => {
              nuxDispatch.restart();
              void AnalyticsClient.logEvent({
                event: "nux.restarted",
                workspaceId: workspace.id,
              });
              navigate(AppLinks.workspaceHome(workspace.slug));
            }}
          />
        </Stack>
```

`ProfileView` renders inside `WorkspaceLayoutContents`, so `NuxStateManager.Provider` is above it and this dispatch is safe. `useNuxPersistence` writes the cleared progress back; there is nothing to do here beyond dispatching and navigating.

- [ ] **Step 6: Verify by hand**

Run `pnpm dev`, finish or dismiss the tutorial, then go to Profile and click "Restart tutorial".

Expected: you land on the workspace home page with the checklist showing 0/4 expanded, and milestone 1's first tooltip open. Critically, the checklist must show **0/4** even though the workspace now has datasets, which is the auto-check bypass working.

- [ ] **Step 7: Commit**

```bash
git add src/views/ProfileView
git commit -m "feat(nux): add the restart control to the profile page"
```

---

# Phase 5: Verification

## Task 23: Log dismissal and completion

**Files:**
- Modify: `src/components/Nux/NuxRoot/NuxRoot.tsx`

The remaining two analytics events have no home yet. Without them the funnel has a start and a middle but no ends.

- [ ] **Step 1: Add the effects**

In `NuxRootContents`, add:

```ts
import { useEffect, useRef } from "react";
```

and inside the component, after the existing hook calls:

```ts
  const loggedTerminalStatusRef = useRef<string | undefined>(undefined);
  useEffect(
    function logTerminalNuxStatus() {
      if (!state.isHydrated || !state.status) {
        return;
      }
      if (state.status !== "completed" && state.status !== "dismissed") {
        return;
      }
      if (loggedTerminalStatusRef.current === state.status) {
        return;
      }
      loggedTerminalStatusRef.current = state.status;
      if (state.status === "completed") {
        void AnalyticsClient.logEvent({
          event: "nux.completed",
          workspaceId: workspace.id,
        });
        return;
      }
      void AnalyticsClient.logEvent({
        event: "nux.dismissed",
        workspaceId: workspace.id,
        payload: {
          milestoneKey: state.activeMilestoneKey ?? null,
          completedCount: state.completedMilestones.length,
        },
      });
    },
    [
      state.isHydrated,
      state.status,
      state.activeMilestoneKey,
      state.completedMilestones.length,
      workspace.id,
    ],
  );
```

The ref guard matters: hydration on a later page load reads `completed` from the database and would otherwise log a completion every time the user opens the app.

- [ ] **Step 2: Verify the rows land**

Run `pnpm dev`, dismiss the tutorial from the panel, then:

```bash
pnpm db:sql-cmd "select event_name, event_category, payload from public.usage_analytics_events where event_name like 'nux.%' order by created_at desc limit 5;"
```

Expected: at least a `nux.dismissed` row with `event_category` of `activation`. Zero rows means Task 5's RLS allowlist did not reach the database, since `AnalyticsClient` swallows the rejection silently.

- [ ] **Step 3: Commit**

```bash
git add src/components/Nux/NuxRoot/NuxRoot.tsx
git commit -m "feat(nux): log tutorial completion and dismissal"
```

---

## Task 24: End-to-end test for milestone 1

**Files:**
- Create: `tests/e2e/nux-first-milestone.spec.ts`

Milestone 1 is where abandonment costs the most and where the async-target risk is highest, so it gets the one e2e. Milestones 2 through 4 stay at the component level for now.

- [ ] **Step 1: Confirm the fixture surface**

The imports below are the ones `tests/e2e/csv-parse-options.spec.ts` already
uses, and they were verified against the exports: `test` and `expect` from
`./fixtures/e2e.fixture`, `signInWithEmailPassword` from `./helpers/auth`. Check
the one thing that was not verified, the signature `signInWithEmailPassword`
expects:

```bash
sed -n '18,42p' tests/e2e/helpers/auth.ts
```

If it takes credentials as well as the page, pass the worker credentials the
`e2e.fixture` exposes as `E2EWorkerCredentials`.

- [ ] **Step 2: Write the spec**

Create `tests/e2e/nux-first-milestone.spec.ts`:

```ts
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { SMALL_CALIFORNIA_CSV_PATH } from "./helpers/constants";
import { MEDIUM_WAIT } from "./helpers/timeouts";

/**
 * Milestone 1 from invite to payoff.
 *
 * Asserts the two things component tests cannot: that the tooltips find their
 * targets in a real browser across a real route change, and that the checklist
 * survives that route change with its progress intact.
 */
test.describe("onboarding tutorial, first milestone", () => {
  test("invites, guides an upload, and ticks over to 1/4", async ({ page }) => {
    await signInWithEmailPassword(page);

    // The invite. Both buttons write `in_progress`, so this is the only
    // chance to see it.
    const invite = page.getByText("Welcome to Avandar");
    await expect(invite).toBeVisible({ timeout: MEDIUM_WAIT });
    await page.getByRole("button", { name: "Start tour" }).click();

    // Tooltip 1 lands on the upload form after the checklist routes to Import.
    await expect(page.getByText("Start with a spreadsheet")).toBeVisible({
      timeout: MEDIUM_WAIT,
    });
    await expect(
      page.getByRole("link", { name: "Download our sample" }),
    ).toBeVisible();

    await page
      .locator('[data-nux="dataset-upload-form"] input[type="file"]')
      .setInputFiles(SMALL_CALIFORNIA_CSV_PATH);
    await page.getByRole("button", { name: "Upload", exact: true }).click();

    // Tooltip 2 waits for a target that only exists after parsing.
    await expect(page.getByText("Name it and save")).toBeVisible({
      timeout: MEDIUM_WAIT,
    });

    await page.getByRole("button", { name: /Save/ }).first().click();

    // Tooltip 3 is the payoff, on a different route.
    await expect(page.getByText("It profiled your data for you")).toBeVisible({
      timeout: MEDIUM_WAIT,
    });

    // The checklist survived two route changes and recorded the milestone.
    await expect(page.getByText("1 / 4")).toBeVisible();
  });
});
```

- [ ] **Step 3: Run it**

Run: `pnpm test:e2e nux-first-milestone`
Expected: PASS.

If the invite never appears, the test user is not the workspace owner or is not a Settings admin, which is the eligibility gate doing its job. Use the fixture's owner account.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/nux-first-milestone.spec.ts
git commit -m "test(nux): cover the first milestone end to end"
```

---

## Task 25: Full verification

**Files:** none

- [ ] **Step 1: Run every check**

```bash
pnpm type-check
pnpm lint
pnpm test:frontend
pnpm test:models
pnpm i18n:check
```

Expected: all five exit 0. `pnpm i18n:check` runs extraction and then fails on any diff, so if it fails, run `pnpm i18n:extract` and commit the updated catalogs.

- [ ] **Step 2: Confirm the schema loop is still closed**

```bash
supabase stop && PGSSLMODE=disable supabase db diff
```

Expected: empty output.

- [ ] **Step 3: Confirm "Nux" never reached the UI**

```bash
grep -rniE "\bnux\b" src --include=*.tsx | grep -vE "NuxAnchors|NuxEvents|NuxProgress|NuxState|NuxTour|NuxTooltip|NuxRoot|NuxChecklist|NuxWelcome|NuxAppState|nuxAnchor|nuxActions|nuxSelectors|useNux|data-nux|components/Nux|tutorials/firstDashboard"
```

Expected: no output. Any hit is a user-visible string containing the internal prefix.

- [ ] **Step 4: Confirm joyride is not in the main chunk**

```bash
pnpm build
grep -rl "joyride" dist/assets/*.js | head
```

Expected: one or more chunk files, none of which is the entry chunk named in `dist/index.html`. If the entry chunk matches, `NuxTourLazy`'s dynamic import got hoisted and the lazy boundary is not doing its job.

- [ ] **Step 5: Walk the whole flow by hand**

Run `pnpm dev` with a brand-new owner account and complete all four milestones with the sample CSV. Confirm at each step:

| Check | Why |
| --- | --- |
| The invite appears once, and never again after either button | the `in_progress`-on-both-paths rule |
| Tooltips in milestones 3 and 4 sit above the modal, not behind it | `NUX_TOUR_Z_INDEX` |
| Clicking the overlay does not end the tour | `overlayClickAction: false` |
| The role tooltip appears only after choosing workspace access | `ShareWorkspaceRoleSelect` mounts conditionally |
| The panel does not cover the Data Explorer drawer | the open item in spec §12 |
| The panel disappears after 4/4 | the completion state |

- [ ] **Step 6: Commit anything the checks changed**

```bash
git add -A
git commit -m "chore(nux): update catalogs and fix verification findings"
```

---

## Deferred, deliberately

These are named here so they are not mistaken for oversights. They are in spec §1.2 and §12.

- **Onboarding for non-admins.** Tracked outside this repo as brain task T468.
- **A tutorial catalog.** The schema's `(user_id, tutorial_key)` uniqueness makes it additive; no picker ships.
- **Teaching the Puck canvas.** It renders in an iframe Joyride cannot spotlight into.
- **Public publishing, slices, row filters, vanity slugs.** Milestone 4 stops at workspace access.
- **Mobile, tablet, Electron.** Suppressed by `useNuxEligibility`, not degraded.
- **e2e for milestones 2 through 4.** Component-level for now; milestone 2 in particular depends on an LLM response, which makes a stable assertion hard.
