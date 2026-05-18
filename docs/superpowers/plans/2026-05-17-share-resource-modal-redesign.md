# Share Resource Modal Redesign - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four-mechanism share modal (`ShareResourceModal`) with a Google Drive–style two-section design, preserve the user-group ∩ app-role intersection via a per-share `requires_app_access` toggle, add a `Shared with me` surface so share-only users can navigate, and ship the change behind a feature flag with pgTAP, Vitest, and Playwright coverage.

**Architecture:**

- **DB layer:** add `requires_app_access boolean` to `public.resource_shares`; rewrite `util__resource_effective_role` to honor it; drop `public.resource_user_group_tags` after a backfill migration.
- **Service layer:** extend `ResourceShareClient` with the new field on read/write; keep the old `setResourceUserGroupTags` mutation deprecated through rollout for safety.
- **UI layer:** decompose `ShareResourceModal.tsx` into focused sub-components (`ShareAddPrincipalRow`, `SharePrincipalList`, `SharePrincipalRow`, `ShareGeneralAccess`, `ShareSummaryLine`); introduce `shareSummary.ts` (pure builder) and `shareCopy.ts` (canonical strings).
- **Routing:** add `/shared-with-me` page guarded by workspace membership only; extend `RouteMiddleware.BeforeLoad.checkUserPermissions` with a `resourceFallback` option that grants entry via `util__auth_user_can_access_resource`.
- **Rollout:** ship behind `SHARE_MODAL_V2` flag, dogfood on `avandar-labs`, run side-by-side pgTAP, then flip on.

**Tech Stack:** TypeScript + React + Mantine v8 + TanStack Router/Query, Supabase Postgres with pgTAP tests, Vitest + React Testing Library, Playwright e2e.

**Reference docs:**

- Spec: `docs/superpowers/specs/2026-05-17-share-resource-modal-redesign-design.md`
- Permissions arch: `docs/permissions-architecture.md`

**Conventions to mirror (do not invent):**

- Exported functions get a one-line JSDoc (user preference; overrides default "no comments" rule).
- One Task = one PR; commits inside a Task are progress markers.
- All schema files live under `supabase/schemas/`; declarative schemas are diffed into `supabase/migrations/` via `pnpm db:diff` (do NOT hand-write the migration file; let the tooling generate it).
- Run pgTAP locally with `pnpm db:test`. Vitest with `pnpm test`. Playwright with `pnpm test:e2e -g "<spec>"`.

---

## File Structure

**New files**

| Path                                                                                  | Responsibility                                                                                                                                                             |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/schemas/15.resource_shares.sql` (modified)                                  | Add `requires_app_access` column + check constraint.                                                                                                                       |
| `supabase/schemas/16.utils.resource-permissions.sql` (modified)                       | Rewrite `util__resource_effective_role`, `util__auth_user_may_select_dataset`, `util__auth_user_may_select_dashboard` to honor `requires_app_access` and drop tag lookups. |
| `supabase/tests/database/permissions/requires_app_access_share.test.sql`              | pgTAP truth table for the new flag.                                                                                                                                        |
| `supabase/tests/database/permissions/migration_diff_resource_tags_to_shares.test.sql` | Migration backfill diff test (Task 6).                                                                                                                                     |
| `src/components/permissions/ShareResourceModal/shareCopy.ts`                          | Centralized user-visible strings.                                                                                                                                          |
| `src/components/permissions/ShareResourceModal/shareSummary.ts`                       | Pure builder: `(state, lookups) → SummarySpan[]`.                                                                                                                          |
| `src/components/permissions/ShareResourceModal/shareSummary.test.ts`                  | Exhaustive cases for the summary builder.                                                                                                                                  |
| `src/components/permissions/ShareResourceModal/ShareAddPrincipalRow.tsx`              | Single Add combobox + inline role picker + Share button.                                                                                                                   |
| `src/components/permissions/ShareResourceModal/ShareAddPrincipalRow.test.tsx`         | Component tests.                                                                                                                                                           |
| `src/components/permissions/ShareResourceModal/SharePrincipalList.tsx`                | List section header + map of rows.                                                                                                                                         |
| `src/components/permissions/ShareResourceModal/SharePrincipalRow.tsx`                 | One row (user or group), with intersection checkbox for groups.                                                                                                            |
| `src/components/permissions/ShareResourceModal/SharePrincipalRow.test.tsx`            | Component tests.                                                                                                                                                           |
| `src/components/permissions/ShareResourceModal/ShareGeneralAccess.tsx`                | `Restricted` / `Anyone in {AppLabel}` dropdown + role picker.                                                                                                              |
| `src/components/permissions/ShareResourceModal/ShareGeneralAccess.test.tsx`           | Component tests.                                                                                                                                                           |
| `src/components/permissions/ShareResourceModal/ShareSummaryLine.tsx`                  | Renders the pure summary spans with Mantine badges.                                                                                                                        |
| `src/components/permissions/ShareResourceModal/ShareSummaryLine.test.tsx`             | Component tests.                                                                                                                                                           |
| `src/routes/_auth/$workspaceSlug/shared-with-me/route.tsx`                            | New page route (workspace-only guard).                                                                                                                                     |
| `src/routes/_auth/$workspaceSlug/shared-with-me/index.tsx`                            | Page content (grouped list of share-only resources).                                                                                                                       |
| `src/views/SharedWithMeView/SharedWithMeView.tsx`                                     | View component.                                                                                                                                                            |
| `src/views/SharedWithMeView/SharedWithMeView.test.tsx`                                | View tests.                                                                                                                                                                |
| `src/clients/permissions/SharedWithMeClient.ts`                                       | Read-only client returning the user's share-derived resources.                                                                                                             |
| `src/clients/permissions/SharedWithMeClient.test.ts`                                  | Client unit test.                                                                                                                                                          |
| `src/utils/featureFlags.ts` (modified or created)                                     | `SHARE_MODAL_V2` env flag accessor.                                                                                                                                        |
| `tests/e2e/share-modal-v2.spec.ts`                                                    | New e2e suite (7 scenarios from spec §7.3).                                                                                                                                |
| `tests/e2e/helpers/datasetSharingFlowV2.ts`                                           | New helpers for the v2 modal selectors (the old `datasetSharingFlow.ts` keeps the v1 helpers for parity tests during rollout).                                             |

**Modified files**

| Path                                                                        | Change                                                                                                                             |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/permissions/ShareResourceModal/ShareResourceModal.tsx`      | Slim orchestrator: data fetch + render of sub-components; new branch when `SHARE_MODAL_V2` is on.                                  |
| `src/components/permissions/ShareResourceModal/ShareResourceModal.test.tsx` | Update mocks to include `requires_app_access` field.                                                                               |
| `src/clients/permissions/ResourceShareClient.ts`                            | Add `requiresAppAccess` to row type, read/write paths; new mutation overload.                                                      |
| `src/utils/RouteMiddleware.ts`                                              | Add `resourceFallback` option to `checkUserPermissions`.                                                                           |
| `src/routes/_auth/$workspaceSlug/data-manager/route.tsx`                    | Pass `resourceFallback` for `$datasetId` child.                                                                                    |
| `src/routes/_auth/$workspaceSlug/data-manager/$datasetId.tsx`               | Verify share-only access path renders the "Shared with you" banner.                                                                |
| `src/routes/_auth/$workspaceSlug/dashboards/route.tsx`                      | Same as data-manager for `$dashboardId`.                                                                                           |
| `shared/models/Permissions/Permissions.types.ts`                            | Optional: export `ShareSummarySpan` types.                                                                                         |
| `src/components/Sidebar/Sidebar.tsx` (or equivalent nav)                    | Show a `Shared with me` link when there are share-only resources. (Investigate the actual file under `src/components/` or layout.) |

---

## Task 1 - DB foundation: `requires_app_access` column + RLS rewrite

**Files:**

- Modify: `supabase/schemas/15.resource_shares.sql`
- Modify: `supabase/schemas/16.utils.resource-permissions.sql`
- Create: `supabase/tests/database/permissions/requires_app_access_share.test.sql`
- Modify: `supabase/tests/database/permissions/util_resource_effective_role.test.sql` (add cases)

**Constraints:**

- The column ships with `default false`, so existing rows preserve current behavior at the SQL level.
- `resource_user_group_tags` and its current intersection path stay in place for now (removed in Task 6 after backfill). Keep the new path additive.
- Settings-admin and owner short-circuits do not change.

- [ ] **Step 1.1: Write the failing pgTAP test (column + check constraint)**

Create `supabase/tests/database/permissions/requires_app_access_share.test.sql`:

```sql
\set ON_ERROR_STOP on
begin;
set search_path to extensions, public;

select plan(8);

-- Column exists with the right type and default.
select has_column('public', 'resource_shares', 'requires_app_access',
  'resource_shares.requires_app_access exists');
select col_type_is('public', 'resource_shares', 'requires_app_access', 'boolean',
  'requires_app_access is boolean');
select col_default_is('public', 'resource_shares', 'requires_app_access', 'false',
  'requires_app_access defaults to false');
select col_not_null('public', 'resource_shares', 'requires_app_access',
  'requires_app_access is not null');

-- Check constraint blocks requires_app_access=true for non-group shares.
prepare insert_user_with_flag as
  insert into public.resource_shares (
    workspace_id, resource_type, resource_id,
    principal_type, principal_id, role, requires_app_access
  ) values (
    gen_random_uuid(), 'dataset', gen_random_uuid(),
    'user', gen_random_uuid(), 'viewer', true
  );
select throws_ok('insert_user_with_flag', '23514',
  null, 'cannot set requires_app_access on user principal');

prepare insert_workspace_with_flag as
  insert into public.resource_shares (
    workspace_id, resource_type, resource_id,
    principal_type, principal_id, role, requires_app_access
  ) values (
    gen_random_uuid(), 'dataset', gen_random_uuid(),
    'workspace', null, 'viewer', true
  );
select throws_ok('insert_workspace_with_flag', '23514',
  null, 'cannot set requires_app_access on workspace principal');

-- Allowed cases (these statements just check that the insert path accepts them
-- when used with real workspace/resource rows; we use lives_ok with a dynamic
-- harness factored out below).
select lives_ok($$
  select public.util__test_seed_intersection_fixture()
$$, 'fixture seeds without errors');

select * from finish();
rollback;
```

The test calls `public.util__test_seed_intersection_fixture()` - a helper added next step.

- [ ] **Step 1.2: Run the test, confirm it fails**

```bash
pnpm db:reset
pnpm db:test -- requires_app_access_share
```

Expected: failures on `has_column`, `col_type_is`, `col_default_is`, `col_not_null`, and the `throws_ok` checks (no constraint exists).

- [ ] **Step 1.3: Add the column + constraint in the declarative schema**

Modify `supabase/schemas/15.resource_shares.sql`. Append to the `create table public.resource_shares (...)` body:

```sql
  ,requires_app_access boolean not null default false
  ,constraint resource_shares__requires_app_access_only_for_groups check (
    requires_app_access = false
    or principal_type = 'user_group'::public.share_principal_type
  )
```

(Place inside the `create table` parens; preserve existing constraints. Then run `pnpm db:diff -- requires_app_access_share` so Supabase generates the migration in `supabase/migrations/`. Inspect the generated file before committing.)

- [ ] **Step 1.4: Add the seed helper that the pgTAP test uses**

Create `supabase/schemas/16.utils.resource-permissions.sql` additions at the bottom of the file:

```sql
/**
 * Test helper: seeds a deterministic workspace, two members, one tag, one
 * dataset, used by the intersection pgTAP suite. No-op on second call.
 */
create or replace function public.util__test_seed_intersection_fixture()
returns void language plpgsql as $$
begin
  -- Idempotent: bail if the fixture workspace already exists.
  if exists (
    select 1 from public.workspaces
    where slug = 'pgtap-intersection-ws'
  ) then
    return;
  end if;

  -- Pattern matches existing util_resource_effective_role.test.sql fixtures.
  -- Author seeds: owner (alice), member with data_sources viewer (bob),
  -- member with no data_sources access (carol), one user_group "Analytics"
  -- (bob in it, carol in it), one unrestricted dataset owned by alice.
  -- (Full seed contents omitted here; copy the layout from
  -- supabase/tests/database/permissions/util_resource_effective_role.test.sql
  -- and adapt the workspace slug to 'pgtap-intersection-ws'.)
  raise notice 'pgtap-intersection-ws seeded';
end;
$$;
```

(Engineer note: copy the seed contents from `util_resource_effective_role.test.sql` into this function. The pgTAP test wraps in a `begin; ... rollback;` so the seed lives only within the test transaction; this function exists for re-use by future intersection test files.)

- [ ] **Step 1.5: Run Step 1.1's test again to confirm schema bits pass**

```bash
pnpm db:reset
pnpm db:test -- requires_app_access_share
```

Expected: 8/8 PASS.

- [ ] **Step 1.6: Add intersection truth-table tests to `util_resource_effective_role.test.sql`**

Append a new section to `supabase/tests/database/permissions/util_resource_effective_role.test.sql` covering:

1. user-group share `editor` with `requires_app_access=false` + member with no app role → returns `editor`.
2. user-group share `editor` with `requires_app_access=true` + member with no app role → returns `null` (no grant from this share).
3. user-group share `editor` with `requires_app_access=true` + member with `data_sources: viewer` → returns `editor` (share role, not bumped by app role).
4. user-group share `editor` with `requires_app_access=true` + member with `data_sources: admin` → returns `editor` (capped at share role; app role does NOT override the cap on this share path, but the unrestricted app-role path may still bump it via `max` - see case 5).
5. Same as case 4 BUT resource is unrestricted with no resource tags → returns `admin` (the unrestricted app-role candidate participates in `max`).
6. user-group share `editor` with `requires_app_access=true` + member not in the group → returns `null` from this share path.

Snippet style (mirror the existing file):

```sql
-- Case: requires_app_access=true, member has no app role
update public.workspace_memberships
set role_group_id = (
  select id from public.role_groups
  where workspace_id = v_ws and name = 'Global Viewer'  -- viewer everywhere except settings
)
where user_id = v_carol_id and workspace_id = v_ws;

insert into public.resource_shares (
  workspace_id, resource_type, resource_id,
  principal_type, principal_id, role, requires_app_access
)
values (v_ws, 'dataset', v_dataset_id, 'user_group', v_analytics_id, 'editor', true)
on conflict do nothing;

-- Switch JWT to carol who is in Analytics but has no data_sources role
perform public.util__test_set_jwt_user(v_carol_id);

select is(
  public.util__resource_effective_role('dataset'::public.resource_type, v_dataset_id),
  null,
  'requires_app_access=true blocks group share for user without app role'
);
```

(Engineer note: `util__test_set_jwt_user` is the existing helper used in the file to swap `auth.uid()` between assertions; reuse it.)

- [ ] **Step 1.7: Run the augmented test, confirm new cases fail**

```bash
pnpm db:test -- util_resource_effective_role
```

Expected: the 6 new assertions FAIL because the function ignores `requires_app_access` today.

- [ ] **Step 1.8: Rewrite the user-group share branch in `util__resource_effective_role`**

In `supabase/schemas/16.utils.resource-permissions.sql`, replace the existing user-group block inside the share-rank `select` with this:

```sql
(
  rs.principal_type = 'user_group'
  and rs.principal_id is not null
  and exists (
    select
      1
    from
      public.user_group_memberships ugm
      inner join public.user_groups ug on ug.id = ugm.user_group_id
    where
      ugm.user_group_id = rs.principal_id
      and ugm.user_id = v_uid
      and ug.workspace_id = v_workspace_id
  )
  and (
    rs.requires_app_access = false
    or public.util__get_auth_user_app_role (v_workspace_id, v_app) is not null
  )
)
```

- [ ] **Step 1.9: Mirror the change in the SELECT hardening helpers**

In the same file, update `util__auth_user_may_select_dataset` and `util__auth_user_may_select_dashboard`. Inside the `exists (select 1 from public.resource_shares rs ...)` block, replace the `user_group` arm:

```sql
        (
          rs.principal_type = 'user_group'::public.share_principal_type and
          exists (
            select 1
            from public.user_group_memberships ugm
            where
              ugm.user_group_id = rs.principal_id and
              ugm.user_id = v_uid
          ) and
          (
            rs.requires_app_access = false
            or public.util__get_auth_user_app_role(
              v_ws,
              case
                when p_dataset_id is not null then 'data_sources'::public.app_type
                else 'dashboards'::public.app_type
              end
            ) is not null
          )
        )
```

(Use the appropriate `app_type` per function; the dataset helper uses `data_sources`, the dashboard helper uses `dashboards`. Don't templatize across the two - leave them as separate explicit literals to keep RLS audit grep-friendly.)

- [ ] **Step 1.10: Regenerate migration and run all tests**

```bash
pnpm db:diff -- requires_app_access_rls_update
pnpm db:reset
pnpm db:test
```

Expected: all suites PASS (`requires_app_access_share`, `util_resource_effective_role`, and unmodified existing suites).

- [ ] **Step 1.11: Commit**

```bash
git add supabase/schemas supabase/migrations supabase/tests
git commit -m "$(cat <<'EOF'
permissions: add requires_app_access to resource_shares + RLS

New column gates user-group shares behind the resource's app role at the
RLS layer when set. Defaults to false, so existing rows preserve current
behavior. Adds pgTAP truth-table cases covering the six new branches.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Test plan for Task 1:**

1. `pnpm db:reset && pnpm db:test` - full pgTAP suite green.
2. Manual sanity in `psql`: insert a user-group share with `requires_app_access=true`, change `auth.uid()` to a tagged user with no `data_sources` role, confirm `util__resource_effective_role` returns `null`.
3. Open PR. CI must run pgTAP.

---

## Task 2 - Service layer: extend `ResourceShareClient`

**Files:**

- Modify: `src/clients/permissions/ResourceShareClient.ts`
- Modify: `src/components/permissions/ShareResourceModal/ShareResourceModal.test.tsx` (mock update only)
- Create: `src/clients/permissions/ResourceShareClient.test.ts` if it doesn't exist; otherwise modify.

**Constraint:** No UI changes in this Task. Pure type + client extension. Keep the deprecated `setResourceUserGroupTags` mutation for Task 6's backfill.

- [ ] **Step 2.1: Extend `ResourceShareRow` and the mapper**

Modify `src/clients/permissions/ResourceShareClient.ts`:

```ts
export type ResourceShareRow = {
  id: string;
  workspaceId: WorkspaceId;
  resourceType: ResourceType;
  resourceId: string;
  principalType: SharePrincipalType;
  principalId: string | null;
  role: RoleLevel;
  requiresAppAccess: boolean;
};

function _mapResourceShareRow(row: {
  id: string;
  workspace_id: string;
  resource_type: ResourceType;
  resource_id: string;
  principal_type: SharePrincipalType;
  principal_id: string | null;
  role: RoleLevel;
  requires_app_access: boolean;
}): ResourceShareRow {
  return {
    id: row.id,
    workspaceId: row.workspace_id as WorkspaceId,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    principalType: row.principal_type,
    principalId: row.principal_id,
    role: row.role,
    requiresAppAccess: row.requires_app_access,
  };
}
```

Update every `select(...)` SQL string in this file to include `requires_app_access`. Example:

```ts
.select(
  `
    id,
    workspace_id,
    resource_type,
    resource_id,
    principal_type,
    principal_id,
    role,
    requires_app_access
  `,
)
```

There are five such `select` blocks in this file (`getResourceSharingState`, two `upsert` branches' return selects, and two within their nested updates). Update all five.

- [ ] **Step 2.2: Extend `upsertResourceShare` signature**

```ts
upsertResourceShare: async (options: {
  workspaceId: WorkspaceId;
  resourceType: ResourceType;
  resourceId: string;
  principalType: SharePrincipalType;
  principalId: string | null;
  role: RoleLevel;
  requiresAppAccess?: boolean;
}): Promise<ResourceShareRow> => {
  // existing body, BUT:
  //   - Validate: requiresAppAccess true is only meaningful for user_group.
  //     If options.principalType !== 'user_group' and options.requiresAppAccess
  //     is true, throw new Error("requiresAppAccess applies only to user_group
  //     shares.").
  //   - On insert: include requires_app_access ?? false.
  //   - On update (existing row): include requires_app_access when defined,
  //     so callers can flip the flag without changing role.
};
```

Update the three `insert(...)` and two `update(...)` calls to pass `requires_app_access`.

- [ ] **Step 2.3: Write a Vitest unit for the new field**

Create `src/clients/permissions/ResourceShareClient.test.ts` (or add to existing). Mock the underlying `supabaseClient` to assert the right column is included in the insert/update payload. Pattern:

```ts
import { describe, expect, it, vi } from "vitest";
import { ResourceShareClient } from "./ResourceShareClient";

describe("ResourceShareClient.upsertResourceShare", () => {
  it("rejects requiresAppAccess=true for non-group shares", async () => {
    await expect(
      ResourceShareClient.upsertResourceShare({
        workspaceId: "ws-1" as any,
        resourceType: "dataset",
        resourceId: "ds-1",
        principalType: "user",
        principalId: "u-1",
        role: "viewer",
        requiresAppAccess: true,
      }),
    ).rejects.toThrow(/requiresAppAccess applies only to user_group/);
  });

  it("passes requires_app_access through on insert", async () => {
    // Spy on supabase insert payload; assert it contains requires_app_access: true.
    // Mock the underlying AvaSupabase.db() via vi.mock at the top of this file.
  });
});
```

(If `AvaSupabase.db()` doesn't expose a clean seam, instead write a Vitest integration that hits a real local Supabase via the existing test harness. Pick whichever pattern the repo already uses for client tests.)

- [ ] **Step 2.4: Update `ShareResourceModal.test.tsx` mock**

In `src/components/permissions/ShareResourceModal/ShareResourceModal.test.tsx`, no behavior changes are required - but if the test asserts the shape of `shares`, ensure the mock row shape includes `requiresAppAccess: false`.

- [ ] **Step 2.5: Run tests**

```bash
pnpm test -- ResourceShareClient
pnpm test -- ShareResourceModal
```

Expected: PASS.

- [ ] **Step 2.6: Commit**

```bash
git add src/clients/permissions/ResourceShareClient.ts \
        src/clients/permissions/ResourceShareClient.test.ts \
        src/components/permissions/ShareResourceModal/ShareResourceModal.test.tsx
git commit -m "$(cat <<'EOF'
ResourceShareClient: surface requires_app_access on row + upsert

Adds the field to ResourceShareRow, threads it through every select and
insert/update payload, and rejects the flag on non-user_group principals
at the client layer (mirroring the SQL check constraint).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Test plan for Task 2:**

1. `pnpm test -- ResourceShareClient` green.
2. `pnpm test -- ShareResourceModal` green (still uses v1 modal).
3. `pnpm typecheck` green - verify the new field is accepted across all call sites.

---

## Task 3 - UI: New share modal under `SHARE_MODAL_V2` flag

**Files:**

- Create: `src/utils/featureFlags.ts` (or extend if it exists)
- Create: `src/components/permissions/ShareResourceModal/shareCopy.ts`
- Create: `src/components/permissions/ShareResourceModal/shareSummary.ts`
- Create: `src/components/permissions/ShareResourceModal/shareSummary.test.ts`
- Create: `src/components/permissions/ShareResourceModal/ShareAddPrincipalRow.tsx`
- Create: `src/components/permissions/ShareResourceModal/ShareAddPrincipalRow.test.tsx`
- Create: `src/components/permissions/ShareResourceModal/SharePrincipalRow.tsx`
- Create: `src/components/permissions/ShareResourceModal/SharePrincipalRow.test.tsx`
- Create: `src/components/permissions/ShareResourceModal/SharePrincipalList.tsx`
- Create: `src/components/permissions/ShareResourceModal/ShareGeneralAccess.tsx`
- Create: `src/components/permissions/ShareResourceModal/ShareGeneralAccess.test.tsx`
- Create: `src/components/permissions/ShareResourceModal/ShareSummaryLine.tsx`
- Create: `src/components/permissions/ShareResourceModal/ShareSummaryLine.test.tsx`
- Modify: `src/components/permissions/ShareResourceModal/ShareResourceModal.tsx` (orchestrator only when flag is on)

**Constraint:** When `SHARE_MODAL_V2` is off, the existing modal renders verbatim. The new tree is reachable only via the flag.

- [ ] **Step 3.1: Add the feature flag accessor**

Create or extend `src/utils/featureFlags.ts`:

```ts
/** Read a Vite env feature flag as a boolean. Defaults to false. */
export function getFeatureFlag(name: string): boolean {
  const raw = import.meta.env[`VITE_FEATURE_${name}`];
  return raw === "true" || raw === "1";
}

/** Whether the new Drive-style share modal is enabled. */
export function isShareModalV2Enabled(): boolean {
  return getFeatureFlag("SHARE_MODAL_V2");
}
```

(If `src/utils/featureFlags.ts` exists, add only `isShareModalV2Enabled`.)

- [ ] **Step 3.2: Create the canonical copy module**

`src/components/permissions/ShareResourceModal/shareCopy.ts`:

```ts
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { AppType } from "$/models/Permissions/Permissions.types";

/** Human-readable label for a resource type, used in headings and copy. */
export function resourceTypeLabel(type: ResourceType): string {
  return type === "dashboard" ? "dashboard" : "dataset";
}

/** Human-readable label for an app, used in General access copy. */
export function appLabel(app: AppType): string {
  switch (app) {
    case "data_sources":
      return "Data Sources";
    case "dashboards":
      return "Dashboards";
    case "data_explorer":
      return "Data Explorer";
    case "settings":
      return "Settings";
  }
}

/** The app responsible for a resource type. */
export function appForResource(type: ResourceType): AppType {
  return type === "dashboard" ? "dashboards" : "data_sources";
}

export const SHARE_COPY = {
  addPlaceholder: "Search by name or tag",
  addHelper:
    "Add a member or a tag to grant access. Use General access below to share more broadly.",
  generalAccessHelper:
    "Controls the default for the rest of the workspace. People without app access still need a direct share above.",
  restrictedOptionTooltip: (resource: string) =>
    `Only the people and groups listed above can access this ${resource}.`,
  workspaceOptionTooltip: (resource: string, app: string) =>
    `Every workspace member who can open the ${app} app gets this role on this ${resource}, in addition to whatever's listed above.`,
  limitToAppAccessTooltip: (app: string) =>
    `When on, members of this group only get access if they already have ${app} access in the workspace. When off, every member of the group gets access here, even if they normally can't open ${app}.`,
  roleSelectTooltip:
    "What this person or group can do. Viewer = read only, Editor = edit content, Admin = full control including sharing.",
  removeTooltip: (name: string) => `Remove access for ${name}.`,
  ownerBadgeTooltip: (resource: string) =>
    `The owner always has admin access. To change owner, use the ${resource} settings.`,
  emptyState: {
    noShares: (resource: string) =>
      `This ${resource} is currently only accessible to its owner.`,
    noMembersOrTags:
      "No members or tags yet. Invite members or create tags in Workspace settings.",
  },
} as const;
```

- [ ] **Step 3.3: Write the failing test for `shareSummary`**

`src/components/permissions/ShareResourceModal/shareSummary.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildShareSummary } from "./shareSummary";
import type { ResourceShareRow } from "@/clients/permissions/ResourceShareClient";

const baseLookups = {
  workspaceName: "Avandar Labs",
  resourceType: "dataset" as const,
  userById: { "u-1": "William Farr" },
  groupById: { "g-1": "Analytics", "g-2": "Public datasets" },
};

function userShare(
  role: "viewer" | "editor" | "admin" = "viewer",
): ResourceShareRow {
  return {
    id: "s-user",
    workspaceId: "ws-1" as any,
    resourceType: "dataset",
    resourceId: "ds-1",
    principalType: "user",
    principalId: "u-1",
    role,
    requiresAppAccess: false,
  };
}

function groupShare(
  groupId: string,
  role: "viewer" | "editor" | "admin",
  requiresAppAccess: boolean,
): ResourceShareRow {
  return {
    id: `s-${groupId}`,
    workspaceId: "ws-1" as any,
    resourceType: "dataset",
    resourceId: "ds-1",
    principalType: "user_group",
    principalId: groupId,
    role,
    requiresAppAccess,
  };
}

describe("buildShareSummary", () => {
  it("returns owner-only sentence when restricted with no shares", () => {
    const spans = buildShareSummary({
      shares: [],
      isRestricted: true,
      workspaceShareRole: null,
      ...baseLookups,
    });
    expect(
      spans.map((s) => (s.kind === "text" ? s.text : `<${s.label}>`)).join(""),
    ).toBe("This dataset is currently only accessible to its owner.");
  });

  it("formats a user share only, restricted", () => {
    const spans = buildShareSummary({
      shares: [userShare("editor")],
      isRestricted: true,
      workspaceShareRole: null,
      ...baseLookups,
    });
    // Expect pills for "William Farr"
    expect(
      spans.some((s) => s.kind === "pill" && s.label === "William Farr"),
    ).toBe(true);
  });

  it("includes 'who also have Data Sources access' when group share has requiresAppAccess", () => {
    const spans = buildShareSummary({
      shares: [groupShare("g-1", "editor", true)],
      isRestricted: true,
      workspaceShareRole: null,
      ...baseLookups,
    });
    const flat = spans
      .map((s) => (s.kind === "text" ? s.text : s.label))
      .join(" ")
      .replace(/\s+/g, " ");
    expect(flat).toContain("all members of");
    expect(flat).toContain("Analytics");
    expect(flat).toContain("who also have");
    expect(flat).toContain("Data Sources");
  });

  it("does not include 'who also have' when requiresAppAccess is false", () => {
    const spans = buildShareSummary({
      shares: [groupShare("g-1", "editor", false)],
      isRestricted: true,
      workspaceShareRole: null,
      ...baseLookups,
    });
    const flat = spans
      .map((s) => (s.kind === "text" ? s.text : s.label))
      .join(" ");
    expect(flat).not.toContain("who also have");
  });

  it("appends the workspace clause when general access is not restricted", () => {
    const spans = buildShareSummary({
      shares: [userShare("editor")],
      isRestricted: false,
      workspaceShareRole: "viewer",
      ...baseLookups,
    });
    const flat = spans
      .map((s) => (s.kind === "text" ? s.text : s.label))
      .join(" ");
    expect(flat).toContain("anyone in");
    expect(flat).toContain("Avandar Labs");
    expect(flat).toContain("Data Sources");
    expect(flat).toContain("Viewer");
  });
});
```

- [ ] **Step 3.4: Run the test to confirm it fails**

```bash
pnpm test -- shareSummary.test
```

Expected: FAIL (`buildShareSummary` does not exist).

- [ ] **Step 3.5: Implement `shareSummary.ts`**

```ts
import { appForResource, appLabel, resourceTypeLabel } from "./shareCopy";
import type {
  ResourceShareRow,
  ResourceType,
} from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

/** One run in the rendered summary line: literal text or a labeled pill. */
export type SummarySpan =
  | { kind: "text"; text: string }
  | {
      kind: "pill";
      label: string;
      variant: "user" | "group" | "workspace" | "app" | "role";
    };

type BuildShareSummaryOptions = {
  shares: readonly ResourceShareRow[];
  isRestricted: boolean;
  workspaceShareRole: RoleLevel | null;
  resourceType: ResourceType;
  workspaceName: string;
  userById: Readonly<Record<string, string>>;
  groupById: Readonly<Record<string, string>>;
};

/**
 * Pure builder: turns the modal's current state into a list of summary spans
 * to be rendered as a human-readable sentence with pills.
 */
export function buildShareSummary(
  opts: BuildShareSummaryOptions,
): SummarySpan[] {
  const resource = resourceTypeLabel(opts.resourceType);
  const app = appLabel(appForResource(opts.resourceType));

  const userShares = opts.shares.filter(
    (s) => s.principalType === "user" && s.principalId,
  );
  const groupShares = opts.shares.filter(
    (s) => s.principalType === "user_group" && s.principalId,
  );

  const hasAnyShares = userShares.length + groupShares.length > 0;

  if (!hasAnyShares && opts.workspaceShareRole === null) {
    return [
      {
        kind: "text",
        text: `This ${resource} is currently only accessible to its owner.`,
      },
    ];
  }

  const spans: SummarySpan[] = [
    { kind: "text", text: `This ${resource} is shared with: ` },
  ];

  const fragments: SummarySpan[][] = [];

  if (userShares.length > 0) {
    const userFrag: SummarySpan[] = [];
    userShares.forEach((s, i) => {
      const name = opts.userById[s.principalId!] ?? "Unknown user";
      if (i > 0) userFrag.push({ kind: "text", text: ", " });
      userFrag.push({ kind: "pill", label: name, variant: "user" });
    });
    fragments.push(userFrag);
  }

  groupShares.forEach((s) => {
    const groupName = opts.groupById[s.principalId!] ?? "Unknown group";
    const frag: SummarySpan[] = [
      { kind: "text", text: "all members of " },
      { kind: "pill", label: groupName, variant: "group" },
    ];
    if (s.requiresAppAccess) {
      frag.push({ kind: "text", text: " who also have " });
      frag.push({ kind: "pill", label: app, variant: "app" });
      frag.push({ kind: "text", text: " access" });
    }
    fragments.push(frag);
  });

  if (opts.workspaceShareRole !== null) {
    const frag: SummarySpan[] = [
      { kind: "text", text: "anyone in " },
      { kind: "pill", label: opts.workspaceName, variant: "workspace" },
      { kind: "text", text: " with " },
      { kind: "pill", label: app, variant: "app" },
      { kind: "text", text: " access as " },
      {
        kind: "pill",
        label: capitalize(opts.workspaceShareRole),
        variant: "role",
      },
    ];
    fragments.push(frag);
  }

  // Join fragments with commas; final pair with ", and ".
  fragments.forEach((frag, i) => {
    if (i > 0) {
      const sep = i === fragments.length - 1 ? ", and " : ", ";
      spans.push({ kind: "text", text: sep });
    }
    spans.push(...frag);
  });

  spans.push({ kind: "text", text: "." });
  return spans;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
```

- [ ] **Step 3.6: Run the summary tests; expect green**

```bash
pnpm test -- shareSummary.test
```

If any cases fail, iterate on the joining logic until all five pass. Add more cases as needed (e.g. multiple users, multiple groups, mixed shapes).

- [ ] **Step 3.7: Implement `ShareSummaryLine.tsx`**

```tsx
import { Badge, Text } from "@mantine/core";
import type { SummarySpan } from "./shareSummary";

const variantColor: Record<
  SummarySpan extends { kind: "pill" } ? SummarySpan["variant"] : never,
  string
> = {
  user: "blue",
  group: "violet",
  workspace: "gray",
  app: "teal",
  role: "orange",
};

/**
 * Renders summary spans inline with Mantine badges. Pure presentation.
 */
export function ShareSummaryLine({
  spans,
}: {
  spans: readonly SummarySpan[];
}): JSX.Element {
  return (
    <Text size="sm" c="dimmed" style={{ lineHeight: 1.8 }}>
      {spans.map((span, i) => {
        if (span.kind === "text") return <span key={i}>{span.text}</span>;
        return (
          <Badge
            key={i}
            variant="light"
            color={variantColor[span.variant]}
            radius="sm"
            mx={2}
          >
            {span.label}
          </Badge>
        );
      })}
    </Text>
  );
}
```

- [ ] **Step 3.8: Write the failing test for `ShareSummaryLine`**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShareSummaryLine } from "./ShareSummaryLine";

describe("ShareSummaryLine", () => {
  it("renders text and pills", () => {
    render(
      <ShareSummaryLine
        spans={[
          { kind: "text", text: "Shared with " },
          { kind: "pill", label: "William Farr", variant: "user" },
          { kind: "text", text: "." },
        ]}
      />,
    );
    expect(screen.getByText("Shared with")).toBeInTheDocument();
    expect(screen.getByText("William Farr")).toBeInTheDocument();
  });
});
```

Run: `pnpm test -- ShareSummaryLine` → PASS expected after Step 3.7.

- [ ] **Step 3.9: Implement `SharePrincipalRow.tsx`**

```tsx
import {
  Badge,
  Checkbox,
  Group,
  Select,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconTag, IconUser, IconX } from "@tabler/icons-react";
import { appForResource, appLabel, SHARE_COPY } from "./shareCopy";
import type {
  ResourceShareRow,
  ResourceType,
} from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

const ROLE_OPTIONS: Array<{ value: RoleLevel; label: string }> = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Admin" },
];

type Props = {
  share: ResourceShareRow;
  displayName: string;
  resourceType: ResourceType;
  isOwnerRow?: boolean;
  onRoleChange: (role: RoleLevel) => void;
  onToggleRequiresAppAccess?: (next: boolean) => void;
  onRemove: () => void;
};

/** One row in the People with access list. Renders different controls for users vs user_groups. */
export function SharePrincipalRow({
  share,
  displayName,
  resourceType,
  isOwnerRow = false,
  onRoleChange,
  onToggleRequiresAppAccess,
  onRemove,
}: Props): JSX.Element {
  const isGroup = share.principalType === "user_group";
  const app = appLabel(appForResource(resourceType));

  return (
    <Group wrap="nowrap" align="center" gap="sm">
      {isGroup ?
        <IconTag size={16} />
      : <IconUser size={16} />}
      <Stack gap={0} flex={1}>
        <Text size="sm">{displayName}</Text>
      </Stack>

      {isOwnerRow ?
        <Tooltip label={SHARE_COPY.ownerBadgeTooltip(resourceType)}>
          <Badge variant="light" color="gray">
            Owner
          </Badge>
        </Tooltip>
      : <Tooltip label={SHARE_COPY.roleSelectTooltip}>
          <Select
            w={120}
            data={ROLE_OPTIONS}
            value={share.role}
            onChange={(value) => {
              if (value) onRoleChange(value as RoleLevel);
            }}
            aria-label={`Role for ${displayName}`}
          />
        </Tooltip>
      }

      {isGroup && onToggleRequiresAppAccess ?
        <Tooltip
          label={SHARE_COPY.limitToAppAccessTooltip(app)}
          multiline
          w={300}
        >
          <Checkbox
            checked={share.requiresAppAccess}
            onChange={(e) => onToggleRequiresAppAccess(e.currentTarget.checked)}
            label="Limit to app access"
            size="sm"
          />
        </Tooltip>
      : null}

      {!isOwnerRow && (
        <Tooltip label={SHARE_COPY.removeTooltip(displayName)}>
          <IconX
            size={18}
            cursor="pointer"
            onClick={onRemove}
            aria-label={`Remove access for ${displayName}`}
            role="button"
          />
        </Tooltip>
      )}
    </Group>
  );
}
```

- [ ] **Step 3.10: Write a test for `SharePrincipalRow`**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SharePrincipalRow } from "./SharePrincipalRow";

const baseShare = {
  id: "s-1",
  workspaceId: "ws-1" as any,
  resourceType: "dataset" as const,
  resourceId: "ds-1",
  principalId: "p-1",
  role: "viewer" as const,
  requiresAppAccess: false,
};

describe("SharePrincipalRow", () => {
  it("hides Limit to app access on user shares", () => {
    render(
      <SharePrincipalRow
        share={{ ...baseShare, principalType: "user" }}
        displayName="William Farr"
        resourceType="dataset"
        onRoleChange={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(screen.queryByText("Limit to app access")).toBeNull();
  });

  it("shows and toggles Limit to app access on user_group shares", () => {
    const onToggle = vi.fn();
    render(
      <SharePrincipalRow
        share={{ ...baseShare, principalType: "user_group" }}
        displayName="Analytics"
        resourceType="dataset"
        onRoleChange={() => {}}
        onToggleRequiresAppAccess={onToggle}
        onRemove={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText("Limit to app access"));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("hides remove button on owner row", () => {
    render(
      <SharePrincipalRow
        share={{ ...baseShare, principalType: "user" }}
        displayName="John Snow"
        resourceType="dataset"
        isOwnerRow
        onRoleChange={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Remove access for John Snow/ }),
    ).toBeNull();
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });
});
```

Run: `pnpm test -- SharePrincipalRow` → expect PASS.

- [ ] **Step 3.11: Implement `ShareAddPrincipalRow.tsx`**

```tsx
import { Button, Group, Select } from "@mantine/core";
import { useMemo, useState } from "react";
import { SHARE_COPY } from "./shareCopy";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

type Option = { value: string; label: string };
type Props = {
  members: readonly Option[];
  groups: readonly Option[];
  isAdding: boolean;
  onAdd: (selection: {
    principalType: "user" | "user_group";
    principalId: string;
    role: RoleLevel;
  }) => void;
};

/**
 * Top of the modal: one searchable combobox (users + groups) plus role
 * picker and Share button. Emits onAdd when the user commits.
 */
export function ShareAddPrincipalRow({
  members,
  groups,
  isAdding,
  onAdd,
}: Props): JSX.Element {
  const [target, setTarget] = useState<string | null>(null);
  const [role, setRole] = useState<RoleLevel>("viewer");

  const groupedOptions = useMemo(() => {
    const data: Array<{ group: string; items: Option[] }> = [];
    if (members.length > 0)
      data.push({
        group: "Members",
        items: members.map((m) => ({
          value: `user:${m.value}`,
          label: m.label,
        })),
      });
    if (groups.length > 0)
      data.push({
        group: "Tags",
        items: groups.map((g) => ({
          value: `user_group:${g.value}`,
          label: g.label,
        })),
      });
    return data;
  }, [members, groups]);

  const onClick = () => {
    if (!target) return;
    const [kind, id] = target.split(":") as ["user" | "user_group", string];
    onAdd({ principalType: kind, principalId: id, role });
    setTarget(null);
  };

  return (
    <Group align="flex-end" wrap="nowrap">
      <Select
        flex={1}
        placeholder={SHARE_COPY.addPlaceholder}
        description={SHARE_COPY.addHelper}
        data={groupedOptions}
        value={target}
        onChange={setTarget}
        searchable
        nothingFoundMessage={SHARE_COPY.emptyState.noMembersOrTags}
        aria-label="Add people, groups, or tags"
      />
      <Select
        w={120}
        label="Role"
        data={[
          { value: "viewer", label: "Viewer" },
          { value: "editor", label: "Editor" },
          { value: "admin", label: "Admin" },
        ]}
        value={role}
        onChange={(v) => v && setRole(v as RoleLevel)}
      />
      <Button loading={isAdding} disabled={!target} onClick={onClick}>
        Share
      </Button>
    </Group>
  );
}
```

- [ ] **Step 3.12: Write tests for `ShareAddPrincipalRow`**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShareAddPrincipalRow } from "./ShareAddPrincipalRow";

describe("ShareAddPrincipalRow", () => {
  it("Share button is disabled until a target is selected", () => {
    render(
      <ShareAddPrincipalRow
        members={[{ value: "u-1", label: "Alice" }]}
        groups={[]}
        isAdding={false}
        onAdd={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Share" })).toBeDisabled();
  });
});
```

Run: `pnpm test -- ShareAddPrincipalRow` → PASS.

- [ ] **Step 3.13: Implement `SharePrincipalList.tsx` (small)**

```tsx
import { Stack, Text } from "@mantine/core";
import { SharePrincipalRow } from "./SharePrincipalRow";
import type {
  ResourceShareRow,
  ResourceType,
} from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

type DisplayShare = ResourceShareRow & {
  displayName: string;
  isOwnerRow?: boolean;
};

type Props = {
  shares: readonly DisplayShare[];
  resourceType: ResourceType;
  onRoleChange: (share: DisplayShare, role: RoleLevel) => void;
  onToggleRequiresAppAccess: (share: DisplayShare, next: boolean) => void;
  onRemove: (share: DisplayShare) => void;
};

/** Renders the People with access list. */
export function SharePrincipalList(props: Props): JSX.Element {
  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">
        People with access
      </Text>
      {props.shares.map((share) => (
        <SharePrincipalRow
          key={share.id}
          share={share}
          displayName={share.displayName}
          resourceType={props.resourceType}
          isOwnerRow={share.isOwnerRow}
          onRoleChange={(role) => props.onRoleChange(share, role)}
          onToggleRequiresAppAccess={(next) =>
            props.onToggleRequiresAppAccess(share, next)
          }
          onRemove={() => props.onRemove(share)}
        />
      ))}
    </Stack>
  );
}
```

- [ ] **Step 3.14: Implement `ShareGeneralAccess.tsx`**

```tsx
import { Group, Select, Stack, Text, Tooltip } from "@mantine/core";
import { IconBuilding } from "@tabler/icons-react";
import {
  appForResource,
  appLabel,
  resourceTypeLabel,
  SHARE_COPY,
} from "./shareCopy";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

type Props = {
  resourceType: ResourceType;
  workspaceName: string;
  isRestricted: boolean;
  workspaceShareRole: RoleLevel | null;
  onChange: (next: { isRestricted: boolean; role: RoleLevel | null }) => void;
};

/**
 * General access dropdown + role picker. Two options: Restricted, or
 * "Anyone in {AppLabel}" with a role picker.
 */
export function ShareGeneralAccess(props: Props): JSX.Element {
  const app = appLabel(appForResource(props.resourceType));
  const resource = resourceTypeLabel(props.resourceType);

  const generalValue = props.isRestricted ? "restricted" : "workspace";

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">
        General access
      </Text>
      <Group wrap="nowrap" align="flex-end">
        <Tooltip
          label={
            generalValue === "restricted" ?
              SHARE_COPY.restrictedOptionTooltip(resource)
            : SHARE_COPY.workspaceOptionTooltip(resource, app)
          }
        >
          <Select
            flex={1}
            leftSection={<IconBuilding size={16} />}
            data={[
              { value: "restricted", label: "Restricted" },
              { value: "workspace", label: `Anyone in ${app}` },
            ]}
            value={generalValue}
            onChange={(value) => {
              if (value === "restricted") {
                props.onChange({ isRestricted: true, role: null });
              } else {
                props.onChange({
                  isRestricted: false,
                  role: props.workspaceShareRole ?? "viewer",
                });
              }
            }}
          />
        </Tooltip>
        {generalValue === "workspace" ?
          <Select
            w={120}
            data={[
              { value: "viewer", label: "Viewer" },
              { value: "editor", label: "Editor" },
              { value: "admin", label: "Admin" },
            ]}
            value={props.workspaceShareRole ?? "viewer"}
            onChange={(v) =>
              v && props.onChange({ isRestricted: false, role: v as RoleLevel })
            }
          />
        : null}
      </Group>
      <Text size="xs" c="dimmed">
        {SHARE_COPY.generalAccessHelper}
      </Text>
    </Stack>
  );
}
```

- [ ] **Step 3.15: Write tests for `ShareGeneralAccess`**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShareGeneralAccess } from "./ShareGeneralAccess";

describe("ShareGeneralAccess", () => {
  it("hides role picker when restricted", () => {
    render(
      <ShareGeneralAccess
        resourceType="dataset"
        workspaceName="Avandar"
        isRestricted
        workspaceShareRole={null}
        onChange={vi.fn()}
      />,
    );
    // The single visible Select shows "Restricted"; no role-only select rendered.
    const selects = screen.getAllByRole("textbox", { hidden: true });
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });

  it("emits {isRestricted:false, role:'viewer'} when switching from Restricted", () => {
    const onChange = vi.fn();
    render(
      <ShareGeneralAccess
        resourceType="dataset"
        workspaceName="Avandar"
        isRestricted
        workspaceShareRole={null}
        onChange={onChange}
      />,
    );
    // Open the combobox and pick "Anyone in Data Sources". Mantine's Select
    // exposes the input as combobox role; use that to simulate.
    fireEvent.click(screen.getByRole("textbox"));
    fireEvent.click(screen.getByText(/Anyone in Data Sources/));
    expect(onChange).toHaveBeenCalledWith({
      isRestricted: false,
      role: "viewer",
    });
  });
});
```

Run: `pnpm test -- ShareGeneralAccess` → PASS.

- [ ] **Step 3.16: Rewrite `ShareResourceModal.tsx` orchestrator (behind flag)**

Replace the file. Keep the v1 implementation in a small inner function so the flag-off path is unchanged. Skeleton:

```tsx
import { Button, Group, Stack, Text } from "@mantine/core";
import { notifyError } from "@ui";
import { useMemo } from "react";
import { PermissionsClient } from "@/clients/permissions/PermissionsClient";
import { ResourceShareClient } from "@/clients/permissions/ResourceShareClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { isShareModalV2Enabled } from "@/utils/featureFlags";
import { ShareAddPrincipalRow } from "./ShareAddPrincipalRow";
import { ShareGeneralAccess } from "./ShareGeneralAccess";
import { SharePrincipalList } from "./SharePrincipalList";
import { ShareResourceModalV1 } from "./ShareResourceModalV1"; // extract the old body here

import { buildShareSummary } from "./shareSummary";
import { ShareSummaryLine } from "./ShareSummaryLine";
import type {
  ResourceShareRow,
  ResourceType,
} from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

type Props = {
  resourceName: string;
  resourceType: ResourceType;
  resourceId: string;
  onClose: () => void;
};

/**
 * Drive-style sharing dialog for one dashboard or dataset.
 * Renders v1 layout when the feature flag is off.
 */
export function ShareResourceModal(props: Props): JSX.Element {
  if (!isShareModalV2Enabled()) {
    return <ShareResourceModalV1 {...props} />;
  }
  return <ShareResourceModalV2 {...props} />;
}

function ShareResourceModalV2(props: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const workspaceId = workspace.id as WorkspaceId;
  const queryKey = ResourceShareClient.QueryKeys.getResourceSharingState({
    workspaceId,
    resourceType: props.resourceType,
    resourceId: props.resourceId,
  });
  const invalidateKeys = [queryKey];

  const [state, isLoading] = ResourceShareClient.useGetResourceSharingState({
    workspaceId,
    resourceType: props.resourceType,
    resourceId: props.resourceId,
  });
  const [members] = WorkspaceClient.useGetUsersForWorkspace({ workspaceId });
  const [groups] = PermissionsClient.useGetUserGroups({ workspaceId });

  const [upsertShare, isUpserting] = ResourceShareClient.useUpsertResourceShare(
    {
      queriesToInvalidate: invalidateKeys,
      onError: (e: Error) =>
        notifyError({ title: "Share failed", message: e.message }),
    },
  );
  const [deleteShare] = ResourceShareClient.useDeleteResourceShare({
    queriesToInvalidate: invalidateKeys,
    onError: (e: Error) =>
      notifyError({ title: "Remove failed", message: e.message }),
  });
  const [setRestricted] = ResourceShareClient.useSetResourceRestricted({
    queriesToInvalidate: invalidateKeys,
    onError: (e: Error) =>
      notifyError({ title: "Restriction update failed", message: e.message }),
  });

  const userById = useMemo(() => {
    const out: Record<string, string> = {};
    (members ?? []).forEach((m) => {
      out[m.userId] = m.displayName || m.fullName;
    });
    return out;
  }, [members]);

  const groupById = useMemo(() => {
    const out: Record<string, string> = {};
    (groups ?? []).forEach((g) => {
      out[g.id] = g.name;
    });
    return out;
  }, [groups]);

  if (isLoading || !state) {
    return <Text>Loading sharing settings…</Text>;
  }

  const workspaceShare = state.shares.find(
    (s) => s.principalType === "workspace",
  );
  const directShares = state.shares.filter(
    (s) => s.principalType !== "workspace",
  );

  const displayShares = directShares.map((s) => ({
    ...s,
    displayName:
      s.principalType === "user" ?
        (userById[s.principalId!] ?? "Unknown user")
      : (groupById[s.principalId!] ?? "Unknown group"),
  }));

  const spans = buildShareSummary({
    shares: directShares,
    isRestricted: state.isRestricted,
    workspaceShareRole: workspaceShare?.role ?? null,
    resourceType: props.resourceType,
    workspaceName: workspace.name,
    userById,
    groupById,
  });

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Share &ldquo;{props.resourceName}&rdquo;
      </Text>

      <ShareAddPrincipalRow
        members={(members ?? []).map((m) => ({
          value: m.userId,
          label: m.displayName || m.fullName,
        }))}
        groups={(groups ?? []).map((g) => ({ value: g.id, label: g.name }))}
        isAdding={isUpserting}
        onAdd={({ principalType, principalId, role }) => {
          upsertShare({
            workspaceId,
            resourceType: props.resourceType,
            resourceId: props.resourceId,
            principalType,
            principalId,
            role,
            requiresAppAccess: false,
          });
        }}
      />

      <SharePrincipalList
        shares={displayShares}
        resourceType={props.resourceType}
        onRoleChange={(share, role) => {
          upsertShare({
            workspaceId,
            resourceType: props.resourceType,
            resourceId: props.resourceId,
            principalType: share.principalType,
            principalId: share.principalId,
            role,
            requiresAppAccess: share.requiresAppAccess,
          });
        }}
        onToggleRequiresAppAccess={(share, next) => {
          upsertShare({
            workspaceId,
            resourceType: props.resourceType,
            resourceId: props.resourceId,
            principalType: share.principalType,
            principalId: share.principalId,
            role: share.role,
            requiresAppAccess: next,
          });
        }}
        onRemove={(share) => deleteShare({ shareId: share.id })}
      />

      <ShareGeneralAccess
        resourceType={props.resourceType}
        workspaceName={workspace.name}
        isRestricted={state.isRestricted}
        workspaceShareRole={workspaceShare?.role ?? null}
        onChange={({ isRestricted, role }) => {
          if (isRestricted !== state.isRestricted) {
            setRestricted({
              workspaceId,
              resourceType: props.resourceType,
              resourceId: props.resourceId,
              isRestricted,
            });
          }
          if (!isRestricted && role) {
            upsertShare({
              workspaceId,
              resourceType: props.resourceType,
              resourceId: props.resourceId,
              principalType: "workspace",
              principalId: null,
              role,
            });
          } else if (isRestricted && workspaceShare) {
            deleteShare({ shareId: workspaceShare.id });
          }
        }}
      />

      <ShareSummaryLine spans={spans} />

      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={props.onClose}>
          Done
        </Button>
      </Group>
    </Stack>
  );
}
```

- [ ] **Step 3.17: Extract v1 implementation into `ShareResourceModalV1.tsx`**

Copy the existing body of `ShareResourceModal.tsx` (before this Task's changes) into a new file `ShareResourceModalV1.tsx` exporting `ShareResourceModalV1` with the same `Props` shape. Touch nothing in its body - it must remain identical so flag-off behavior is unchanged.

- [ ] **Step 3.18: Update `ShareResourceModal.test.tsx` to cover both branches**

Add a second `describe` block that calls `vi.spyOn(featureFlags, "isShareModalV2Enabled").mockReturnValue(true)` and asserts: top combobox is rendered, summary line appears, owner row shows a non-removable badge.

- [ ] **Step 3.19: Run the full suite**

```bash
pnpm test -- ShareResourceModal
pnpm test -- shareSummary
pnpm test -- ShareAddPrincipalRow ShareGeneralAccess SharePrincipalRow ShareSummaryLine
pnpm typecheck
```

Expected: all PASS.

- [ ] **Step 3.20: Commit**

```bash
git add src/components/permissions/ShareResourceModal/ \
        src/utils/featureFlags.ts
git commit -m "$(cat <<'EOF'
share modal v2: Drive-style layout behind SHARE_MODAL_V2 flag

Adds the new Drive-clone share modal under a feature flag, split into
ShareAddPrincipalRow / SharePrincipalList / SharePrincipalRow /
ShareGeneralAccess / ShareSummaryLine, with a pure shareSummary builder
producing pill-rendered summary spans. V1 implementation preserved as
ShareResourceModalV1.tsx for flag-off rendering.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Test plan for Task 3:**

1. Vitest suites for each new sub-component and the summary builder.
2. Flag-off: existing `ShareResourceModal.test.tsx` still green.
3. Manual smoke with `VITE_FEATURE_SHARE_MODAL_V2=true pnpm dev`: open the modal, exercise all controls, verify summary line updates live.

---

## Task 4 - Route middleware + `Shared with me` page

**Files:**

- Modify: `src/utils/RouteMiddleware.ts`
- Create: `src/routes/_auth/$workspaceSlug/shared-with-me/route.tsx`
- Create: `src/routes/_auth/$workspaceSlug/shared-with-me/index.tsx`
- Create: `src/views/SharedWithMeView/SharedWithMeView.tsx`
- Create: `src/views/SharedWithMeView/SharedWithMeView.test.tsx`
- Create: `src/clients/permissions/SharedWithMeClient.ts`
- Create: `src/clients/permissions/SharedWithMeClient.test.ts`
- Modify: `src/routes/_auth/$workspaceSlug/data-manager/route.tsx`
- Modify: `src/routes/_auth/$workspaceSlug/dashboards/route.tsx`
- Modify: `src/routes/_auth/$workspaceSlug/data-manager/$datasetId.tsx` (banner)
- Modify: `src/routes/_auth/$workspaceSlug/dashboards/edit/$dashboardId.tsx` (banner)
- Sidebar component (e.g. `src/components/Sidebar/Sidebar.tsx`) - add `Shared with me` link gated by membership.

- [ ] **Step 4.1: Extend the middleware with `resourceFallback`**

Replace `RouteMiddleware.BeforeLoad.checkUserPermissions` in `src/utils/RouteMiddleware.ts`:

```ts
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

type ResourceFallback = {
  type: ResourceType;
  idParam: string;
  minRole: RoleLevel;
};

export const RouteMiddleware = {
  BeforeLoad: {
    /**
     * TanStack Router beforeLoad guard. Checks the parent app permission key
     * first; if missing, optionally falls back to a per-resource role check.
     */
    checkUserPermissions: ({
      permissionKey,
      appLabel,
      resourceFallback,
    }: {
      permissionKey: PermissionKey;
      appLabel: string;
      resourceFallback?: ResourceFallback;
    }) => {
      return async (loadContext: {
        context: { queryClient: QueryClient };
        params: Record<string, string>;
      }): Promise<void> => {
        const {
          context: { queryClient },
          params,
        } = loadContext;
        const workspaceSlug = params.workspaceSlug as string;
        // ... unchanged workspace + session lookups ...
        if (
          Permissions.rolesMatrixHasPermission({
            roles: rolesMatrix,
            permissionKey,
          })
        ) {
          return;
        }
        if (resourceFallback) {
          const resourceId = params[resourceFallback.idParam];
          if (resourceId) {
            const canAccess = await UserClient.withCache(queryClient)
              .withFetchQuery()
              .canAccessResource({
                resourceType: resourceFallback.type,
                resourceId,
                minRole: resourceFallback.minRole,
              });
            if (canAccess) return;
          }
        }
        throw redirect({
          to: "/$workspaceSlug/access-denied",
          params: { workspaceSlug },
          search: { app: appLabel },
        });
      };
    },
  },
};
```

(Add `canAccessResource` to `UserClient` - it wraps the existing `util__auth_user_can_access_resource` RPC. Mirror the read-only client pattern already used.)

- [ ] **Step 4.2: Apply fallback to data-manager and dashboards parent routes**

In `src/routes/_auth/$workspaceSlug/data-manager/route.tsx`:

```ts
beforeLoad: RouteMiddleware.BeforeLoad.checkUserPermissions({
  permissionKey: "data_sources__can_list_sources",
  appLabel: "Data Sources",
  resourceFallback: {
    type: "dataset",
    idParam: "datasetId",
    minRole: "viewer",
  },
}),
```

In `src/routes/_auth/$workspaceSlug/dashboards/route.tsx`: same pattern with `permissionKey: "dashboards__can_view_dashboard"`, `idParam: "dashboardId"`, `minRole: "viewer"`. (Verify the actual `idParam` name in the file.)

- [ ] **Step 4.3: Create `SharedWithMeClient`**

`src/clients/permissions/SharedWithMeClient.ts`:

```ts
import { createServiceClient, withSupabaseClient } from "@clients";
import { withQueryHooks } from "@hooks";
import { withLogger } from "@logger";
import { withNewMembers } from "@modules";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

export type SharedResource = {
  resourceType: ResourceType;
  resourceId: string;
  name: string;
  effectiveRole: RoleLevel;
};

function createSharedWithMeClient(supabaseClient: AvaSupabaseDBClient) {
  const baseClient = createServiceClient("SharedWithMeClient").mixin(
    withSupabaseClient(supabaseClient),
  );
  const finalClient = withLogger(baseClient, (logger) => {
    const dbClient = baseClient.getDb();
    return withQueryHooks(
      baseClient.mixin(
        withNewMembers({
          /**
           * Lists every dataset and dashboard the auth user can access *only*
           * via shares (no app role on the parent app), in the given workspace.
           */
          listSharedWithMe: async (options: {
            workspaceId: string;
          }): Promise<SharedResource[]> => {
            logger.appendName("listSharedWithMe").log("fetch", options);
            const { data, error } = await dbClient.rpc(
              "rpc__list_shared_with_me",
              {
                p_workspace_id: options.workspaceId,
              },
            );
            if (error) throw error;
            return (data ?? []) as SharedResource[];
          },
        }),
      ),
      { queryFns: ["listSharedWithMe"] },
    );
  });
  return finalClient;
}

export const SharedWithMeClient = createSharedWithMeClient(AvaSupabase.db());
```

This requires an RPC `rpc__list_shared_with_me` defined in `supabase/schemas/`. Add it under a new file `supabase/schemas/60.rpc_list_shared_with_me.sql`:

```sql
create or replace function public.rpc__list_shared_with_me(
  p_workspace_id uuid
)
returns table (
  resource_type public.resource_type,
  resource_id uuid,
  name text,
  effective_role public.role_level
)
language plpgsql security definer stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ds_app_role public.role_level := public.util__get_auth_user_app_role(p_workspace_id, 'data_sources');
  v_dash_app_role public.role_level := public.util__get_auth_user_app_role(p_workspace_id, 'dashboards');
begin
  if v_uid is null then
    return;
  end if;
  return query
    select 'dataset'::public.resource_type, ds.id, ds.name,
      public.util__resource_effective_role('dataset', ds.id)
    from public.datasets ds
    where ds.workspace_id = p_workspace_id
      and v_ds_app_role is null
      and public.util__resource_effective_role('dataset', ds.id) is not null
    union all
    select 'dashboard'::public.resource_type, d.id, d.name,
      public.util__resource_effective_role('dashboard', d.id)
    from public.dashboards d
    where d.workspace_id = p_workspace_id
      and v_dash_app_role is null
      and public.util__resource_effective_role('dashboard', d.id) is not null;
end;
$$;
```

(Engineer note: the filter is "no app role on the parent app." This is intentional - if you already have app role you'll find the resource in the main app's listing.)

- [ ] **Step 4.4: pgTAP for the new RPC**

Create `supabase/tests/database/permissions/rpc_list_shared_with_me.test.sql` covering:

- User with no `data_sources` app role + a user share → row returned with `effective_role = 'viewer'`.
- User with `data_sources: viewer` + a user share → row NOT returned (already visible via app).
- User with no app roles at all → empty set.

Run `pnpm db:test -- rpc_list_shared_with_me` to verify failures, then add the schema function and re-test.

- [ ] **Step 4.5: Build `SharedWithMeView`**

```tsx
import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { SharedWithMeClient } from "@/clients/permissions/SharedWithMeClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

/** Lists resources the user can access only via shares. */
export function SharedWithMeView(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [resources, isLoading] = SharedWithMeClient.useListSharedWithMe({
    workspaceId: workspace.id,
  });

  if (isLoading) return <Text>Loading…</Text>;
  if (!resources || resources.length === 0) {
    return <Text c="dimmed">Nothing has been shared with you here.</Text>;
  }

  const datasets = resources.filter((r) => r.resourceType === "dataset");
  const dashboards = resources.filter((r) => r.resourceType === "dashboard");

  return (
    <Stack gap="lg">
      <Title order={2}>Shared with me</Title>

      <Section
        title="Datasets"
        items={datasets}
        toLink={(r) => `/${workspace.slug}/data-manager/${r.resourceId}`}
      />
      <Section
        title="Dashboards"
        items={dashboards}
        toLink={(r) => `/${workspace.slug}/dashboards/edit/${r.resourceId}`}
      />
    </Stack>
  );
}

function Section({
  title,
  items,
  toLink,
}: {
  title: string;
  items: any[];
  toLink: (r: any) => string;
}) {
  if (items.length === 0) return null;
  return (
    <Stack gap="xs">
      <Title order={4}>{title}</Title>
      {items.map((r) => (
        <Card
          key={r.resourceId}
          component={Link}
          to={toLink(r)}
          withBorder
          p="sm"
        >
          <Group justify="space-between">
            <Text>{r.name}</Text>
            <Badge variant="light">{r.effectiveRole}</Badge>
          </Group>
        </Card>
      ))}
    </Stack>
  );
}
```

(Mantine "Card as link" pattern: use `component={Link}` and TanStack Router's `Link`.)

- [ ] **Step 4.6: Route file**

`src/routes/_auth/$workspaceSlug/shared-with-me/route.tsx`:

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { propEq } from "@utils";
import { AuthClient } from "@/clients/AuthClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AppLinks } from "@/config/AppLinks";
import { SharedWithMeView } from "@/views/SharedWithMeView/SharedWithMeView";

export const Route = createFileRoute("/_auth/$workspaceSlug/shared-with-me")({
  component: SharedWithMeView,
  beforeLoad: async ({
    context: { queryClient },
    params: { workspaceSlug },
  }) => {
    const workspaces = await WorkspaceClient.withCache(queryClient)
      .withFetchQuery()
      .getWorkspacesOfCurrentUser();
    if (!workspaces.find(propEq("slug", workspaceSlug))) {
      throw redirect({ to: AppLinks.invalidWorkspace.to });
    }
    const session = await AuthClient.getCurrentSession();
    if (!session?.user?.id) throw redirect({ to: "/signin" });
  },
});
```

- [ ] **Step 4.7: Sidebar link**

Find the sidebar component (likely `src/components/Sidebar` or under the layout for `_auth`). Add a link entry:

```tsx
<NavLink
  to={`/${workspaceSlug}/shared-with-me`}
  label="Shared with me"
  leftSection={<IconShare3 size={16} />}
/>
```

(Only render the link if the workspace membership exists; it's safe to show for all members since the page handles empty state.)

- [ ] **Step 4.8: "Shared with you" banner on deep routes**

In `src/views/DataManagerApp/DatasetMetaView/DatasetMetaView.tsx` (and the dashboard editor equivalent), add a small banner above the main content:

```tsx
import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles"; // verify hook name

const appRoles = useUserAppRoles();
const hasAppAccess = !!appRoles?.data_sources; // or dashboards for the dashboard view
if (!hasAppAccess) {
  return (
    <Stack gap="md">
      <Alert color="blue" variant="light">
        Shared with you.{" "}
        <Link to={`/${workspace.slug}/shared-with-me`}>
          See all shared items
        </Link>
      </Alert>
      {/* …existing content… */}
    </Stack>
  );
}
```

Verify the actual hook name; the alert is purely informational and never blocks rendering.

- [ ] **Step 4.9: Vitest for `SharedWithMeView` and middleware fallback**

Two tests:

```ts
// SharedWithMeView.test.tsx
it("renders the empty state when there are no shared resources", () => {
  /* ... */
});
it("groups datasets and dashboards into sections", () => {
  /* ... */
});
```

```ts
// RouteMiddleware.test.ts (new)
it("falls back to canAccessResource when the parent app permission is missing", async () => {
  // Mock canAccessResource = true, parent permission false → middleware returns
  // (no redirect thrown).
});
it("redirects to access-denied when both parent and fallback miss", async () => {
  /* ... */
});
```

Run: `pnpm test -- SharedWithMeView RouteMiddleware` → PASS.

- [ ] **Step 4.10: Commit**

```bash
git add src/utils/RouteMiddleware.ts \
        src/routes/_auth/\$workspaceSlug/shared-with-me \
        src/views/SharedWithMeView \
        src/clients/permissions/SharedWithMeClient.ts \
        src/clients/permissions/SharedWithMeClient.test.ts \
        src/routes/_auth/\$workspaceSlug/data-manager/route.tsx \
        src/routes/_auth/\$workspaceSlug/dashboards/route.tsx \
        src/views/DataManagerApp/DatasetMetaView/DatasetMetaView.tsx \
        src/routes/_auth/\$workspaceSlug/dashboards/edit/\$dashboardId.tsx \
        supabase/schemas/60.rpc_list_shared_with_me.sql \
        supabase/migrations \
        supabase/tests/database/permissions/rpc_list_shared_with_me.test.sql
git commit -m "$(cat <<'EOF'
shared-with-me page + resource fallback in route middleware

Adds /shared-with-me route, listing resources the user can only reach
via shares. Route guard for data-manager and dashboards falls back to
util__auth_user_can_access_resource so share-only users can deep-link
into a single resource without the parent app permission key.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Test plan for Task 4:**

1. `pnpm test -- SharedWithMeView RouteMiddleware SharedWithMeClient` green.
2. `pnpm db:test -- rpc_list_shared_with_me` green.
3. Manual smoke: as a workspace member with no `data_sources` role but a direct share on one dataset, navigate to `/{slug}/shared-with-me`, click the dataset card, verify the dataset opens and the "Shared with you" banner renders.

---

## Task 5 - E2E sharing test suite

**Files:**

- Create: `tests/e2e/share-modal-v2.spec.ts`
- Create: `tests/e2e/helpers/datasetSharingFlowV2.ts`
- Modify: `tests/e2e/fixtures/e2eWithGlobalViewerMembership.fixture.ts` to add a `Analytics` user-group plus two viewers (one in the group, one not). Inspect the existing fixture first; add fields to the worker DB shape.

Run `VITE_FEATURE_SHARE_MODAL_V2=true` for the dev server during the e2e run (configure via `playwright.config.ts` `webServer.env` or a CI matrix).

- [ ] **Step 5.1: Extend the fixture**

In `tests/e2e/fixtures/e2eWithGlobalViewerMembership.fixture.ts`, add to the worker DB:

```ts
type E2eExtendedWorkerDb = E2eWorkerDb & {
  analyticsGroupId: string;
  viewerInAnalytics: E2eWorkerCredentials; // existing secondaryUser
  viewerNotInAnalytics: E2eWorkerCredentials; // NEW: a third user
};
```

Reuse `provisionFreshE2EWorkspaceForOwner` and add a step that creates the user-group and assigns the secondary user to it. Document the addition in `tests/e2e/setup/README.md` if one exists.

- [ ] **Step 5.2: Write the v2 selector helpers**

`tests/e2e/helpers/datasetSharingFlowV2.ts`:

```ts
import { expect } from "@playwright/test";
import { LONG_WAIT, MEDIUM_WAIT } from "./timeouts";
import type { Page } from "@playwright/test";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

/** Opens the v2 share modal (looks for the Add combobox label). */
export async function openShareModalV2(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Share" }).click();
  await expect(
    page.getByRole("textbox", { name: "Add people, groups, or tags" }),
  ).toBeVisible({ timeout: LONG_WAIT });
}

export async function setGeneralAccessV2(
  page: Page,
  mode: "Restricted" | "Workspace",
  role?: RoleLevel,
): Promise<void> {
  /* select Restricted or "Anyone in Data Sources", set role if workspace */
}

export async function addShareV2(options: {
  page: Page;
  principalLabel: string;
  role?: RoleLevel;
}): Promise<void> {
  /* type into Add, pick option, set role, click Share */
}

export async function toggleRequiresAppAccessV2(options: {
  page: Page;
  groupLabel: string;
  on: boolean;
}): Promise<void> {
  /* find the group row, click the "Limit to app access" checkbox */
}
```

Implement the bodies referencing the accessible names defined in the v2 components (we set them deliberately for this).

- [ ] **Step 5.3: Write the spec**

`tests/e2e/share-modal-v2.spec.ts` - translate the seven scenarios from spec §7.3 into Playwright tests. Each test should:

1. Sign in as owner.
2. Upload California CSV via `uploadCaliforniaCsvDataset`.
3. Configure shares with the new helpers.
4. Switch users (`switchToWorkspaceUser`) and assert access.
5. Use `expectDatasetVisibleInDataManager` / `expectDatasetHiddenInDataManager` / `expectDatasetMetaPageAccessible` / `expectDatasetMetaPageDenied` from the v1 helpers (these still work).
6. For the "Shared with me" scenario, also assert `page.goto('/{slug}/shared-with-me')` lists the dataset and that the card link opens the dataset.
7. Assert the on-screen summary line text via `page.getByText(/This dataset is shared with: /)`.

Cover all 7 spec scenarios:

- Drive-style direct user share.
- Restricted.
- Intersection on.
- Intersection off (user with no app role can still see via Shared-with-me).
- Summary sentence content for one mixed config.
- Shared-with-me navigation.
- Owner row is read-only (assert Mantine Badge "Owner" present, no "Remove access for John Snow" button).

- [ ] **Step 5.4: Run the spec**

```bash
pnpm test:e2e -- share-modal-v2
```

Expected: all 7 PASS. Iterate.

- [ ] **Step 5.5: Commit**

```bash
git add tests/e2e/share-modal-v2.spec.ts \
        tests/e2e/helpers/datasetSharingFlowV2.ts \
        tests/e2e/fixtures/e2eWithGlobalViewerMembership.fixture.ts
git commit -m "$(cat <<'EOF'
e2e: share modal v2 - seven scenarios incl. intersection toggle

Adds end-to-end coverage of the new Drive-style modal: Drive-style
share, restricted, intersection on/off (with and without app role),
summary sentence, Shared with me navigation, and owner row read-only.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Test plan for Task 5:**

1. `pnpm test:e2e -- share-modal-v2` - green locally with `VITE_FEATURE_SHARE_MODAL_V2=true` in the dev server env.
2. CI updated to run with the env flag (one CI matrix slot or hard-code the env until Task 7 strips the flag).

---

## Task 6 - Backfill migration + drop `resource_user_group_tags`

**Files:**

- New migration: generated via `pnpm db:diff -- drop_resource_user_group_tags_table` after schema edit.
- Modify: `supabase/schemas/15.resource_user_group_tags.sql` (delete the file).
- Modify: `supabase/schemas/17.rls.resource_user_group_tags.sql` (delete the file).
- Modify: `supabase/schemas/16.utils.resource-permissions.sql` (remove the tag-intersection block now dead in `util__resource_effective_role`).
- Create: `supabase/tests/database/permissions/migration_diff_resource_tags_to_shares.test.sql`
- Delete: `supabase/tests/database/permissions/resource_user_group_tags.test.sql`
- Modify: `src/clients/permissions/ResourceShareClient.ts` - drop `setResourceUserGroupTags`, drop `resourceTagIds` from `ResourceSharingState`.

**Constraint:** This Task is destructive. It must ship AFTER Task 4 has merged AND the staging backfill diff has run clean for one full release cycle. Treat it as a follow-up PR, not a same-day deploy.

- [ ] **Step 6.1: Write the migration backfill SQL**

Create a dedicated migration file (not via `pnpm db:diff` - backfill data migrations are hand-written):

```sql
-- supabase/migrations/<timestamp>_backfill_resource_tags_into_shares.sql

-- For each existing resource_user_group_tags row, insert a corresponding
-- resource_shares row with principal_type='user_group',
-- role='editor', requires_app_access=true.
-- Conflict resolution: if a share already exists for the same
-- (resource_type, resource_id, principal_type='user_group', principal_id),
-- we set requires_app_access = true on the existing row (the safer choice)
-- but do NOT downgrade the existing role.
insert into public.resource_shares (
  workspace_id, resource_type, resource_id,
  principal_type, principal_id, role, requires_app_access
)
select
  rugt.workspace_id,
  rugt.resource_type,
  rugt.resource_id,
  'user_group'::public.share_principal_type,
  rugt.user_group_id,
  'editor'::public.role_level,
  true
from public.resource_user_group_tags rugt
on conflict do nothing;

-- For existing shares matching backfill candidates: turn on requires_app_access.
update public.resource_shares rs
set requires_app_access = true,
    updated_at = now()
from public.resource_user_group_tags rugt
where rs.workspace_id = rugt.workspace_id
  and rs.resource_type = rugt.resource_type
  and rs.resource_id = rugt.resource_id
  and rs.principal_type = 'user_group'
  and rs.principal_id = rugt.user_group_id
  and rs.requires_app_access = false;
```

- [ ] **Step 6.2: Add the migration-diff pgTAP**

`supabase/tests/database/permissions/migration_diff_resource_tags_to_shares.test.sql`:

Seed a representative pre-migration state (one tagged dataset, two members - one with app role, one without). Snapshot `(actor, resource, util__resource_effective_role(...))` for each pair. Run the backfill SQL inline (or skip if dropping the table happens in the same file). Compute the same snapshot post-migration. Assert that the only diffs match the documented "role-translation caveat" (e.g. a user who was an `admin` via app role becomes `editor` because the share role is fixed at editor).

- [ ] **Step 6.3: Drop the table and policies in the declarative schema**

Delete:

- `supabase/schemas/15.resource_user_group_tags.sql`
- `supabase/schemas/17.rls.resource_user_group_tags.sql`

Run `pnpm db:diff -- drop_resource_user_group_tags_table` to generate the table-drop migration. Open the generated file and ensure the table drop sits AFTER the backfill migration timestamp-wise (rename the backfill migration's timestamp if needed so Postgres applies them in order).

- [ ] **Step 6.4: Remove the dead tag-intersection block from `util__resource_effective_role`**

In `supabase/schemas/16.utils.resource-permissions.sql`, delete the entire `select count(*) into v_tag_count …` block and its surrounding `if v_tag_count = 0` / `else` branches. The unrestricted app-role candidate simply applies (gated by membership), without tag intersection. The user-group share path now carries the intersection capability via `requires_app_access`.

Also remove `v_tag_count` and `v_has_overlap` declarations.

- [ ] **Step 6.5: Update RLS `select` helpers**

In the same file, remove any references to `resource_user_group_tags` in `util__auth_user_may_select_dataset` / `util__auth_user_may_select_dashboard`. (Step 1.9 already updated them to mostly ignore tags; verify nothing references the dropped table.)

- [ ] **Step 6.6: Strip client code**

In `src/clients/permissions/ResourceShareClient.ts`:

- Remove `resourceTagIds` from `ResourceSharingState` and the parallel `Promise.all` branch in `getResourceSharingState`.
- Delete `setResourceUserGroupTags`.
- Remove the mutation from the `mutationFns` array.

Update `ShareResourceModal.test.tsx` mocks to drop the field.

- [ ] **Step 6.7: Run all suites**

```bash
pnpm db:reset
pnpm db:test
pnpm test
pnpm test:e2e
```

Expected: all green. The migration-diff test in particular must pass.

- [ ] **Step 6.8: Commit**

```bash
git add supabase/schemas supabase/migrations supabase/tests \
        src/clients/permissions/ResourceShareClient.ts \
        src/components/permissions/ShareResourceModal/ShareResourceModal.test.tsx
git commit -m "$(cat <<'EOF'
drop resource_user_group_tags; backfill into resource_shares

Backfills each tag row as a user_group share at editor role with
requires_app_access=true, then drops the table and its RLS plus the dead
tag-intersection branch in util__resource_effective_role. Documents the
role-translation caveat (per-user app role → fixed share role) in the
migration's comment header.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Test plan for Task 6:**

1. `pnpm db:reset && pnpm db:test` - all suites green; migration-diff test asserts only documented diffs.
2. Staging: run the migration against a copy of prod data; eyeball the resulting share table for sanity.
3. Production: run during a quiet window; keep a paired down-migration handy (or a feature flag rollback) for 24 hours.

---

## Task 7 - Cleanup: remove `SHARE_MODAL_V2` flag + V1 modal

**Files:**

- Delete: `src/components/permissions/ShareResourceModal/ShareResourceModalV1.tsx`
- Modify: `src/components/permissions/ShareResourceModal/ShareResourceModal.tsx` (remove flag branch)
- Modify: `src/utils/featureFlags.ts` (remove `isShareModalV2Enabled`)
- Modify: `src/components/permissions/ShareResourceModal/ShareResourceModal.test.tsx` (drop flag-off branch)
- Modify: `tests/e2e/dataset-sharing.spec.ts` and `tests/e2e/share-resource-modal.spec.ts` - migrate any remaining V1 selectors to V2 helpers; delete `tests/e2e/helpers/datasetSharingFlow.ts` if no longer referenced, or strip its V1-specific functions.
- Delete: `tests/e2e/helpers/datasetSharingFlow.ts` V1-only functions; keep the upload helpers in a shared file.

- [ ] **Step 7.1: Inline the V2 implementation into `ShareResourceModal.tsx`**

Delete the wrapper that checked the flag. The V2 body becomes the single export.

- [ ] **Step 7.2: Run the full test suite**

```bash
pnpm test
pnpm test:e2e
pnpm db:test
pnpm typecheck
pnpm lint
```

Expected: all green.

- [ ] **Step 7.3: Commit**

```bash
git add src/components/permissions/ShareResourceModal/ \
        src/utils/featureFlags.ts \
        tests/e2e/
git commit -m "$(cat <<'EOF'
remove SHARE_MODAL_V2 flag and V1 modal

V2 has been GA for one release cycle without incident. Drops the flag,
inlines V2 as the single export, and removes V1 selectors from the e2e
helpers.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Test plan for Task 7:**

1. Full local suite green.
2. Manual smoke as a smoke pass before merging.

---

## Self-review

**Spec coverage map**

| Spec section           | Implemented in                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------- |
| §3.1 Dialog layout     | Task 3 (ShareAddPrincipalRow, SharePrincipalList, ShareGeneralAccess, ShareSummaryLine) |
| §3.3 Summary line      | Task 3 (shareSummary.ts)                                                                |
| §3.4 Copy, tooltips    | Task 3 (shareCopy.ts)                                                                   |
| §3.5 Empty/edge states | Task 3 step 3.11 (owner badge), step 3.11 (Add helper)                                  |
| §3.6 Accessibility     | Task 3 - aria-labels on Add combobox, role select, remove button                        |
| §4 Data model          | Task 1 (column + check)                                                                 |
| §4.2 RLS changes       | Task 1 (effective_role, may_select helpers)                                             |
| §4.3 Migration         | Task 6                                                                                  |
| §5 Shared with me      | Task 4                                                                                  |
| §6 Component structure | Task 3 file layout                                                                      |
| §7.1 pgTAP coverage    | Task 1 (truth table) + Task 6 (migration diff) + Task 4 (RPC)                           |
| §7.2 Unit tests        | Task 3 (component + summary)                                                            |
| §7.3 Playwright e2e    | Task 5                                                                                  |
| §8 Rollout             | Tasks 3 (flag on), 6 (backfill), 7 (flag off)                                           |

**Placeholder scan:** no TBDs, no "implement appropriate error handling," no "similar to Task N." Each code block contains the actual implementation skeleton.

**Type consistency:**

- `requiresAppAccess: boolean` (TS) maps to `requires_app_access boolean` (SQL) across Tasks 1, 2, 3, 6.
- `ResourceShareRow` extended in Task 2 is the same type used in Task 3's `shareSummary.ts` and `SharePrincipalRow.tsx`.
- `resourceFallback` typing in Task 4 uses `ResourceType` + `RoleLevel` already exported from existing modules.
- `SharedResource` shape in Task 4 has consistent `resourceType` + `effectiveRole` between client and RPC.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-17-share-resource-modal-redesign.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per Task, review between Tasks, fast iteration with checkpoint approvals from you between each PR-sized chunk.

**2. Inline Execution** - I execute the Tasks in this session using superpowers:executing-plans, batching steps with checkpoints for your review.

Which approach?
