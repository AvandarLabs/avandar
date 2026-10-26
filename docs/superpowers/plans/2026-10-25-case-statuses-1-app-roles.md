# Case Statuses 1: App Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make case types and records permissioned apps: `case_types` and `case_records` in the `app_type` enum, seeded and backfilled role rows so no existing member loses access, RLS on the four case tables that checks those roles, route guards on the Case Manager, its create form, and the Records pages, navigation and Spotlight gating, hidden controls for anything a role cannot do, and a row each in the Settings role matrix.

**Architecture:** `AppType` is a Postgres enum mirrored by a TypeScript union. Every exhaustive site over the union (`PermissionRegistry`, the preset matrices, `RESTRICTABLE_APPS`, `appLabel`, test fixtures) fails to compile until it names both new apps, so the compiler builds the checklist. The database side ships seven migrations in a fixed order: the enum labels alone (Postgres error `55P04`), the generated seeding function, a hand-written backfill, then one generated policy migration per table. Write policies call `util__auth_user_meets_min_app_role` with the row's own `workspace_id`; SELECT stays membership-based so the Data Explorer and chat keep reading case types. The UI hides, rather than disables, every control whose permission key the user lacks.

**Tech Stack:** Postgres (Supabase declarative schema, pgTAP, migration upgrade tests), TypeScript, React, Mantine, TanStack Router, Lingui, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-25-case-statuses-design.md` §4 except §4.5, plus the `docs/permissions-architecture.md` item of §14. **Overview and shared names:** `docs/superpowers/plans/2026-10-25-case-statuses.md`

---

## Required skill

**`supabase-declarative-schema` is MANDATORY for Tasks 1 to 7.** Load it (`agent-skills/public-skills/skills/supabase-declarative-schema/SKILL.md`) before editing any SQL. `docs/rules/sql.md` also asks for `supabase-postgres-best-practices` on schema and RLS work. This plan relies on the skill's two documented exceptions to "never hand-write a migration":

1. **Enum label additions** need `alter type ... add value`, and a new label cannot be used in the transaction that added it (`55P04`). `supabase/migrations/20260814010030_add_gis_app_type_enum_value.sql` is the in-repo precedent.
2. **DML is never emitted by `db diff`**, so the backfill is hand-written, exactly like `supabase/migrations/20260814010032_backfill_gis_role_group_app_roles.sql`.

Every other migration is generated with `pnpm db:reset` immediately followed by `pnpm db:new-migration <name>`. Never hand-edit a generated migration.

No task here creates or replaces a surface, so the `impeccable` skill is not needed. Task 10 edits files under `src/components/layouts/`, so its first step is reading `docs/design/app-view-layout.md` and the Named Rules in `DESIGN.md`, as `CLAUDE.md` requires.

## Before you start

- Work in the `feat/statuses` worktree. Do not create another one.
- Follow the overview's ground rules. In particular: append the `Co-Authored-By` trailer your session asks for to every commit message below, commit by path, never `git add -A`, and never stage `supabase/config.toml`.
- **Switch check.** Every step that says "Switch check" means: run `ava supabase status` and confirm the first line reads `✅ SWITCHED This worktree runs its own local Supabase: feat-statuses (branch feat/statuses).` If it is yellow or names `avandar`, stop and run `ava supabase switch`, then check again. If `ava` is missing, run `pnpm build:ava-cli`.
- `pnpm desktop:sqlite:gen-migrations` needs `uv` on the machine (see `apps/desktop/migrations/README.md`). Every Postgres migration gets a matching `apps/desktop/migrations/<same-stem>.gen.sql`, and CI's `desktop:sqlite:check-migrations` fails without it.
- Run one pgTAP file with `supabase test db supabase/tests/database/00_setup_pgtap.test.sql <file>`. The setup file goes first because it installs pgTAP.
- Do not run `pnpm dev` while running E2E specs: Playwright starts its own Vite and refuses a busy port.

## Migration order (do not deviate)

| Order | File | Task | Contents | Why separate |
| --- | --- | --- | --- | --- |
| 1 | `<ts>_add_case_app_type_enum_values.sql` (hand-written) | 1 | two `alter type public.app_type add value` | Labels must be committed before anything uses them (`55P04`) |
| 2 | `<ts>_case_app_role_group_seeding.sql` (generated) | 2 | replaced `util__seed_builtin_role_groups_for_workspace` | Function body names the new labels |
| 3 | `<ts>_backfill_case_app_role_group_app_roles.sql` (hand-written) | 3 | re-seed built-ins, mirror custom groups' `data_sources` role | `db diff` never emits DML |
| 4 | `<ts>_case_types_rls_on_concepts.sql` (generated) | 4 | three `concepts` write policies | Must follow the backfill so no member loses write access in between |
| 5 | `<ts>_case_types_rls_on_concept_attributes.sql` (generated) | 5 | three `concept_attributes` write policies | One table per red/green cycle |
| 6 | `<ts>_case_types_rls_on_attribute_mappings.sql` (generated) | 6 | write policies on both mapping tables | Same |
| 7 | `<ts>_case_app_rls_on_individuals.sql` (generated) | 7 | three `individuals` write policies | Same |

## Decisions this plan locks in

- **Enum values** `case_types` then `case_records`, appended after `gis`, per the enum's docstring.
- **Seeding:** Global Admin gets `admin`, Global Editor `editor`, Global Viewer `viewer`, for both apps.
- **Backfill:** re-run the seeding helper for every workspace, then give every custom group a `case_types` row and a `case_records` row copying its `data_sources` role. A group with no `data_sources` row gets neither. A case row a group already holds is left alone.
- **Policy names are kept byte for byte**, including the historical leading and trailing newlines inside some of them (`"\n  User can INSERT concepts\n"`). Only the predicates change, so each generated migration is a plain drop and create of the same three policies.
- **The Records guard sits on `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/route.tsx`**, the layout over the records list and every record page. There is no `individual-manager/route.tsx`, and `individual-manager/index.tsx` only redirects to the Case Manager, which has its own guard. Not adding a route file means `src/routeTree.gen.ts` does not change.
- **Spotlight has no per-case-type Records links today**, so Spotlight gating covers its two Case Manager entries: "Case Manager" (view key) and "New case type" (create key).
- **Cross-links are gated like navigation:** View records on the case type page needs `case_records__can_view_record`; Edit case type in the Records toolbar and Open case type in the empty records state need `case_types__can_view_case_type`. Each would otherwise lead straight to the access-denied page.
- **pgTAP role users are non-owner members** with one custom role group each, granting exactly one level, because workspace owners pass every app-role check (`rls_connections.test.sql` is the pattern copied).
- **Each RLS test file keeps its concept seed in one separated block**, and the `individuals` seeds stop naming the `status` column (its default fills it), because plan 2 adds a status to every seeded concept and drops `individuals.status`.

## Names this plan introduces

Later plans may use these. They are not in the overview's Shared names.

| Name | Where | What |
| --- | --- | --- |
| `makeHasPermissionFromAppRoles(roles)` | `src/test-utils/makeHasPermissionFromAppRoles.ts`, re-exported from `@/test-utils` | Stand-in for `useHasPermission` in tests, answering from a partial `UserAppRolesMatrix` |
| `insertE2ECaseType`, `deleteE2ECaseTypes` | `tests/e2e/helpers/insertE2ECaseType.ts` | Seed and tear down a case type as E2E pre-test setup |
| `WORKSPACE_APP_ROUTES.caseTypes`, `.caseRecords` | `tests/e2e/helpers/workspaceAppRouteExpectations.ts` | Labels "Case Types" and "Case Records" |
| `canAccessCaseTypes`, `canAccessCaseRecords` | inputs of `makeMainNavbarLinksFromPermissions` | Navbar gating |
| `onCreate?` (now optional) | `CaseTypeHome` and `CaseTypeDraftCard` props | Omitted hides the create control |
| `case_app_roles.test.sql` | `supabase/tests/database/permissions/` | Enum labels and built-in seeding |
| `case_app_roles_backfill` | `supabase/migration-upgrade-tests/` | Backfill replay scenario |

---

### Task 1: Add the case app enum values

**Files:**
- Create: `supabase/tests/database/permissions/case_app_roles.test.sql`
- Modify: `supabase/schemas/00.enum.app_type.sql` (whole file, 15 lines)
- Create: `supabase/migrations/<ts>_add_case_app_type_enum_values.sql` (via `supabase migration new`)
- Create: `apps/desktop/migrations/<ts>_add_case_app_type_enum_values.gen.sql` (generated)
- Modify: `shared/types/database.types.ts` (regenerated by `pnpm db:reset`, never hand-edited)

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/database/permissions/case_app_roles.test.sql`:

```sql
\set ON_ERROR_STOP on

/**
 * The `case_types` and `case_records` apps exist in `app_type`, and a new
 * workspace's built-in role groups are seeded with both.
 */
begin;

set search_path to extensions, public;

select plan(2);

select ok(
  'case_types' = any (
    select enumlabel::text
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'app_type'
  ),
  'app_type includes case_types'
);

select ok(
  'case_records' = any (
    select enumlabel::text
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'app_type'
  ),
  'app_type includes case_records'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run it and watch it fail**

Switch check, then:

```bash
supabase test db supabase/tests/database/00_setup_pgtap.test.sql supabase/tests/database/permissions/case_app_roles.test.sql
```

Expected: FAIL with `not ok 1 - app_type includes case_types` and `not ok 2 - app_type includes case_records`.

- [ ] **Step 3: Update the declarative enum**

`supabase/schemas/00.enum.app_type.sql` becomes:

```sql
/**
 * One app in the product. Scopes a role group's role to a section of the UI.
 *
 * Note: Values sort in the order they were added, not a logical grouping, so
 * `gis`, `case_types`, and `case_records` sort after `settings`. Keep new
 * values at the end. Moving one is not a rename, it forces a full rebuild of
 * the type and a rewrite of every column using it.
 */
create type public.app_type as enum(
  'data_sources',
  'data_explorer',
  'dashboards',
  'settings',
  'gis',
  'case_types',
  'case_records'
);
```

- [ ] **Step 4: Hand-write the enum migration**

```bash
supabase migration new add_case_app_type_enum_values
```

Put exactly this in the created file, and nothing else:

```sql
-- New enum labels must be committed before they can be used (PG 55P04), so
-- this migration adds the labels and nothing that references them.
alter type public.app_type
add value if not exists 'case_types';

alter type public.app_type
add value if not exists 'case_records';
```

- [ ] **Step 5: Apply and watch it pass**

Switch check, then:

```bash
pnpm db:reset
supabase test db supabase/tests/database/00_setup_pgtap.test.sql supabase/tests/database/permissions/case_app_roles.test.sql
```

Expected: the reset applies every migration and regenerates `shared/types/database.types.ts`; the test prints `All tests successful.`

Run `git diff shared/types/database.types.ts`. Expected: only `"case_types"` and `"case_records"` added to `app_type`, in both the `Enums` type and `Constants`. Anything else means the reset ran against a different project: stop and redo the switch check.

- [ ] **Step 6: Generate the desktop migration**

```bash
pnpm desktop:sqlite:gen-migrations
git status --short apps/desktop/migrations
```

Expected: one new untracked file, `apps/desktop/migrations/<ts>_add_case_app_type_enum_values.gen.sql`, whose header says `Schema-shape statements emitted: 0`. If any tracked `.gen.sql` shows as modified, it is unrelated drift: restore it with `git checkout -- <that file>`.

- [ ] **Step 7: Commit**

```bash
git add supabase/schemas/00.enum.app_type.sql \
  supabase/migrations/*_add_case_app_type_enum_values.sql \
  apps/desktop/migrations/*_add_case_app_type_enum_values.gen.sql \
  supabase/tests/database/permissions/case_app_roles.test.sql \
  shared/types/database.types.ts
git commit -m "feat(case-statuses): add case_types and case_records to app_type"
```

---

### Task 2: Seed both case apps for built-in role groups

**Files:**
- Modify: `supabase/tests/database/permissions/case_app_roles.test.sql`
- Modify: `supabase/schemas/05.utils.seed-workspace-role-groups.sql:57-60, 104-107, 147-150` (the three `gis` rows)
- Create: `supabase/migrations/<ts>_case_app_role_group_seeding.sql` (generated)
- Create: `apps/desktop/migrations/<ts>_case_app_role_group_seeding.gen.sql` (generated)

- [ ] **Step 1: Add the failing seeding assertion**

In `case_app_roles.test.sql`, replace `select plan(2);` with `select plan(3);`, then insert this immediately before `select * from finish();`:

```sql
-- A new workspace's built-in groups get both case apps at their own tier.
insert into auth.users (id, email, aud, role)
values (
  'ca100001-0000-4000-8000-000000000001'::uuid,
  'case_app_roles@test.dev',
  'authenticated',
  'authenticated'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'ca101001-0000-4000-8000-000000000001'::uuid,
  'ca100001-0000-4000-8000-000000000001'::uuid,
  'case app roles pgtap workspace',
  'case-app-roles-pgtap-workspace'
);

select results_eq(
  $$
    select rg.name, rgar.app::text, rgar.role::text
    from public.role_groups rg
      join public.role_group_app_roles rgar on rgar.role_group_id = rg.id
    where
      rg.workspace_id = 'ca101001-0000-4000-8000-000000000001'::uuid and
      rgar.app::text in ('case_types', 'case_records')
    order by rg.name, rgar.app::text
  $$,
  $$
    values
      ('Global Admin'::text, 'case_records'::text, 'admin'::text),
      ('Global Admin', 'case_types', 'admin'),
      ('Global Editor', 'case_records', 'editor'),
      ('Global Editor', 'case_types', 'editor'),
      ('Global Viewer', 'case_records', 'viewer'),
      ('Global Viewer', 'case_types', 'viewer')
  $$,
  'built-in role groups are seeded with both case apps at their own tier'
);
```

- [ ] **Step 2: Run it and watch it fail**

Switch check, then:

```bash
supabase test db supabase/tests/database/00_setup_pgtap.test.sql supabase/tests/database/permissions/case_app_roles.test.sql
```

Expected: FAIL with `not ok 3 - built-in role groups are seeded with both case apps at their own tier`, the diagnostics showing zero rows returned.

- [ ] **Step 3: Add both apps to the three built-in matrices**

In `supabase/schemas/05.utils.seed-workspace-role-groups.sql`, add two rows after each `gis` row, so the file reads in the same app order as `RESTRICTABLE_APPS`.

Global Admin. Before:

```sql
        (
          'gis'::public.app_type,
          'admin'::public.role_level
        ),
        (
          'settings'::public.app_type,
          'admin'::public.role_level
        )
```

After:

```sql
        (
          'gis'::public.app_type,
          'admin'::public.role_level
        ),
        (
          'case_types'::public.app_type,
          'admin'::public.role_level
        ),
        (
          'case_records'::public.app_type,
          'admin'::public.role_level
        ),
        (
          'settings'::public.app_type,
          'admin'::public.role_level
        )
```

Global Editor. Before:

```sql
        (
          'gis'::public.app_type,
          'editor'::public.role_level
        )
    ) as a (
```

After:

```sql
        (
          'gis'::public.app_type,
          'editor'::public.role_level
        ),
        (
          'case_types'::public.app_type,
          'editor'::public.role_level
        ),
        (
          'case_records'::public.app_type,
          'editor'::public.role_level
        )
    ) as a (
```

Global Viewer. Before:

```sql
        (
          'gis'::public.app_type,
          'viewer'::public.role_level
        )
    ) as a (
```

After:

```sql
        (
          'gis'::public.app_type,
          'viewer'::public.role_level
        ),
        (
          'case_types'::public.app_type,
          'viewer'::public.role_level
        ),
        (
          'case_records'::public.app_type,
          'viewer'::public.role_level
        )
    ) as a (
```

- [ ] **Step 4: Generate the migration**

Switch check, then:

```bash
pnpm db:reset
pnpm db:new-migration case_app_role_group_seeding
```

Expected: the command ends with `==> Done.` and writes `supabase/migrations/<ts>_case_app_role_group_seeding.sql`.

- [ ] **Step 5: Review the generated migration**

Expected: a single `CREATE OR REPLACE FUNCTION public.util__seed_builtin_role_groups_for_workspace(p_workspace_id uuid)` carrying the six new `values` rows. Stop and fix the declarative file if the diff contains anything else, in particular any `drop`, any `alter type` (an enum rebuild means Step 3 of Task 1 put the labels in a different order from the migration), or any change to a table you did not touch.

- [ ] **Step 6: Run the test and watch it pass**

`pnpm db:new-migration` leaves the database reset with every migration applied. Switch check, then:

```bash
supabase test db supabase/tests/database/00_setup_pgtap.test.sql supabase/tests/database/permissions/case_app_roles.test.sql
```

Expected: `All tests successful.`

- [ ] **Step 7: Generate the desktop migration**

```bash
pnpm desktop:sqlite:gen-migrations
git status --short apps/desktop/migrations
```

Expected: one new untracked `*_case_app_role_group_seeding.gen.sql`. Restore any modified tracked file with `git checkout -- <that file>`.

- [ ] **Step 8: Commit**

```bash
git add supabase/schemas/05.utils.seed-workspace-role-groups.sql \
  supabase/migrations/*_case_app_role_group_seeding.sql \
  apps/desktop/migrations/*_case_app_role_group_seeding.gen.sql \
  supabase/tests/database/permissions/case_app_roles.test.sql
git commit -m "feat(case-statuses): seed case app roles for built-in role groups"
```

---

### Task 3: Backfill case app roles for existing role groups

Without this, `UserAppRolesMatrix` reads the missing rows as "no access", every existing member loses the Case Manager and Records the moment Task 9's guards ship, and Tasks 4 to 7 refuse their writes.

**Files:**
- Create: `supabase/migrations/<ts>_backfill_case_app_role_group_app_roles.sql` (via `supabase migration new`)
- Create: `supabase/migration-upgrade-tests/case_app_roles_backfill.prelude.sql`
- Create: `supabase/migration-upgrade-tests/case_app_roles_backfill.assertions.sql`
- Modify: `scripts/test-dashboard-publishing-migrations.sh` (append one `run_migration_replay` call at the end)
- Create: `apps/desktop/migrations/<ts>_backfill_case_app_role_group_app_roles.gen.sql` (generated)

- [ ] **Step 1: Create the empty migration**

```bash
supabase migration new backfill_case_app_role_group_app_roles
ls supabase/migrations/*_backfill_case_app_role_group_app_roles.sql
```

Note the exact filename; Step 4 names it.

- [ ] **Step 2: Write the prelude**

Create `supabase/migration-upgrade-tests/case_app_roles_backfill.prelude.sql`:

```sql
-- Role groups the way they look before the case apps existed: built-in
-- groups with no case_types or case_records row, a custom group holding a
-- data_sources role, a custom group holding none, and a custom group that
-- already holds a case_types role of its own. Identifiers are `ca0`-prefixed
-- so the assertions read these fixtures only, whatever else the database
-- holds.
begin;

insert into auth.users (id, email, aud, role)
values (
  'ca000001-0000-4000-8000-000000000001'::uuid,
  'case_app_roles_backfill@test.dev',
  'authenticated',
  'authenticated'
);

-- Creating the workspace seeds its built-in groups with the case apps
-- already, so those rows are removed to recreate the shape the backfill
-- meets on an existing workspace.
insert into public.workspaces (id, owner_id, name, slug)
values (
  'ca001001-0000-4000-8000-000000000001'::uuid,
  'ca000001-0000-4000-8000-000000000001'::uuid,
  'case app roles backfill',
  'case-app-roles-backfill'
);

delete from public.role_group_app_roles rgar
using public.role_groups rg
where
  rg.id = rgar.role_group_id and
  rg.workspace_id = 'ca001001-0000-4000-8000-000000000001'::uuid and
  rgar.app::text in ('case_types', 'case_records');

insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('ca002001-0000-4000-8000-000000000001'::uuid, 'ca001001-0000-4000-8000-000000000001'::uuid, 'Backfill data editor', false),
  ('ca002002-0000-4000-8000-000000000002'::uuid, 'ca001001-0000-4000-8000-000000000001'::uuid, 'Backfill dashboards only', false),
  ('ca002003-0000-4000-8000-000000000003'::uuid, 'ca001001-0000-4000-8000-000000000001'::uuid, 'Backfill existing case role', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('ca002001-0000-4000-8000-000000000001'::uuid, 'data_sources', 'editor'),
  ('ca002002-0000-4000-8000-000000000002'::uuid, 'dashboards', 'viewer'),
  ('ca002003-0000-4000-8000-000000000003'::uuid, 'data_sources', 'admin'),
  ('ca002003-0000-4000-8000-000000000003'::uuid, 'case_types', 'viewer');
```

- [ ] **Step 3: Write the assertions**

Create `supabase/migration-upgrade-tests/case_app_roles_backfill.assertions.sql`:

```sql
-- Verify the backfill re-seeds the built-in groups with both case apps at
-- their tier, mirrors a custom group's data_sources role into both case apps,
-- gives no case role to a custom group with no data_sources role, and keeps a
-- case role a custom group already held.
do $$
begin
  if (
    select
      array_agg(
        rg.name || ':' || rgar.app::text || ':' || rgar.role::text
        order by rg.name, rgar.app::text
      )
    from
      public.role_groups rg
      join public.role_group_app_roles rgar on rgar.role_group_id = rg.id
    where
      rg.workspace_id = 'ca001001-0000-4000-8000-000000000001'::uuid and
      rg.is_builtin and
      rgar.app::text in ('case_types', 'case_records')
  ) is distinct from array[
    'Global Admin:case_records:admin',
    'Global Admin:case_types:admin',
    'Global Editor:case_records:editor',
    'Global Editor:case_types:editor',
    'Global Viewer:case_records:viewer',
    'Global Viewer:case_types:viewer'
  ] then
    raise exception 'built-in groups were not re-seeded with their case roles';
  end if;

  if (
    select array_agg(rgar.app::text || ':' || rgar.role::text order by rgar.app::text)
    from public.role_group_app_roles rgar
    where
      rgar.role_group_id = 'ca002001-0000-4000-8000-000000000001'::uuid and
      rgar.app::text in ('case_types', 'case_records')
  ) is distinct from array['case_records:editor', 'case_types:editor'] then
    raise exception 'a custom group did not mirror its data_sources role into both case apps';
  end if;

  if exists (
    select 1
    from public.role_group_app_roles rgar
    where
      rgar.role_group_id = 'ca002002-0000-4000-8000-000000000002'::uuid and
      rgar.app::text in ('case_types', 'case_records')
  ) then
    raise exception 'a custom group with no data_sources role was given a case role';
  end if;

  if (
    select array_agg(rgar.app::text || ':' || rgar.role::text order by rgar.app::text)
    from public.role_group_app_roles rgar
    where
      rgar.role_group_id = 'ca002003-0000-4000-8000-000000000003'::uuid and
      rgar.app::text in ('case_types', 'case_records')
  ) is distinct from array['case_records:admin', 'case_types:viewer'] then
    raise exception 'a case role a custom group already held was overwritten';
  end if;
end;
$$;

rollback;
```

- [ ] **Step 4: Register the scenario**

Append to `scripts/test-dashboard-publishing-migrations.sh`, replacing `<ts>` with the timestamp from Step 1:

```bash

# Case app role backfill: re-seed built-in groups with both case apps, and
# mirror each custom group's data_sources role into case_types and
# case_records.
run_migration_replay \
  "$repo_root/supabase/migration-upgrade-tests/case_app_roles_backfill.prelude.sql" \
  "$repo_root/supabase/migrations/<ts>_backfill_case_app_role_group_app_roles.sql" \
  "$repo_root/supabase/migration-upgrade-tests/case_app_roles_backfill.assertions.sql"
```

- [ ] **Step 5: Run it and watch it fail**

Switch check, then:

```bash
./scripts/test-dashboard-publishing-migrations.sh
```

Expected: FAIL with `ERROR:  built-in groups were not re-seeded with their case roles`, because the migration is still empty.

- [ ] **Step 6: Write the backfill**

Put exactly this in the migration from Step 1:

```sql
-- Backfills `case_types` and `case_records` rows in role_group_app_roles for
-- role groups that predate those apps. Without this, `UserAppRolesMatrix`
-- reads the missing rows as "no access", existing members lose the Case
-- Manager and the Records pages, and their case-type and record writes fail
-- RLS.
--
-- Built-in groups are re-seeded through the seeding helper, which is
-- idempotent. Custom groups mirror their `data_sources` role into both apps,
-- because case types and their records are built from workspace data. A
-- group with no `data_sources` row deliberately gets neither row: it was
-- never granted the data its case types read.

-- Built-in role groups: the seeding helper now includes both case apps and
-- does nothing to rows that already exist.
do $$
declare
  v_workspace_id uuid;
begin
  for v_workspace_id in
    select id from public.workspaces
  loop
    perform public.util__seed_builtin_role_groups_for_workspace (v_workspace_id);
  end loop;
end;
$$;

-- Custom (non-built-in) role groups: mirror the group's data_sources role
-- into both case apps. A case row the group already holds is left alone.
insert into
  public.role_group_app_roles (
    role_group_id,
    app,
    role
  )
select
  data_sources_role.role_group_id,
  case_app.app,
  data_sources_role.role
from
  public.role_group_app_roles data_sources_role
  join public.role_groups rg on rg.id = data_sources_role.role_group_id
  cross join (
    values
      ('case_types'::public.app_type),
      ('case_records'::public.app_type)
  ) as case_app (app)
where
  data_sources_role.app = 'data_sources'::public.app_type and
  not rg.is_builtin
on conflict (
  role_group_id,
  app
) do nothing;
```

- [ ] **Step 7: Run it and watch it pass**

Switch check, then:

```bash
./scripts/test-dashboard-publishing-migrations.sh
pnpm db:reset
pnpm test:db
```

Expected: the replay script exits 0 with no `ERROR`; the reset applies the backfill cleanly (it finds no workspaces at migration time and does nothing); `pnpm test:db` passes, including the new replay.

- [ ] **Step 8: Generate the desktop migration**

```bash
pnpm desktop:sqlite:gen-migrations
git status --short apps/desktop/migrations
```

Expected: one new untracked `*_backfill_case_app_role_group_app_roles.gen.sql`. Restore any modified tracked file with `git checkout -- <that file>`.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/*_backfill_case_app_role_group_app_roles.sql \
  apps/desktop/migrations/*_backfill_case_app_role_group_app_roles.gen.sql \
  supabase/migration-upgrade-tests/case_app_roles_backfill.prelude.sql \
  supabase/migration-upgrade-tests/case_app_roles_backfill.assertions.sql \
  scripts/test-dashboard-publishing-migrations.sh
git commit -m "feat(case-statuses): backfill case app roles for existing role groups"
```

---

### Task 4: Gate `concepts` writes on `case_types`

**Files:**
- Modify: `supabase/tests/database/permissions/rls_concepts.test.sql`
- Modify: `supabase/schemas/10.concepts.sql:32-80` (the policies)
- Create: `supabase/migrations/<ts>_case_types_rls_on_concepts.sql` (generated)
- Create: `apps/desktop/migrations/<ts>_case_types_rls_on_concepts.gen.sql` (generated)

- [ ] **Step 1: Replace the file head**

In `rls_concepts.test.sql`, replace everything from the first line through `select plan (6);` with:

```sql
\set ON_ERROR_STOP on

/**
 * RLS for `concepts`.
 *
 * Every workspace member reads the table, whatever their case roles, so the
 * Data Explorer and chat can query case types. Creating and editing a case
 * type requires `case_types` editor, and deleting one requires `case_types`
 * admin. A member of another workspace can do none of it, and `anon` cannot
 * reach the table at all.
 *
 * Workspace owners pass every app-role check, so the role-level cases use
 * non-owner members whose custom role groups grant exactly one level.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('f1000001-0000-4000-8000-000000000001'::uuid, 'concepts_insider@test.dev', 'authenticated', 'authenticated'),
  ('f1000002-0000-4000-8000-000000000002'::uuid, 'concepts_outsider@test.dev', 'authenticated', 'authenticated'),
  ('f1000003-0000-4000-8000-000000000003'::uuid, 'concepts_types_viewer@test.dev', 'authenticated', 'authenticated'),
  ('f1000004-0000-4000-8000-000000000004'::uuid, 'concepts_types_editor@test.dev', 'authenticated', 'authenticated'),
  ('f1000005-0000-4000-8000-000000000005'::uuid, 'concepts_types_admin@test.dev', 'authenticated', 'authenticated'),
  ('f1000006-0000-4000-8000-000000000006'::uuid, 'concepts_no_case_role@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('f1001001-0000-4000-8000-000000000001'::uuid, 'f1000001-0000-4000-8000-000000000001'::uuid, 'concepts ws a', 'concepts-ws-a'),
  ('f1001002-0000-4000-8000-000000000002'::uuid, 'f1000002-0000-4000-8000-000000000002'::uuid, 'concepts ws b', 'concepts-ws-b')
on conflict (id) do nothing;

-- One custom role group per member below, each granting exactly the role a
-- test names.
insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('f1004003-0000-4000-8000-000000000003'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'concepts types viewer', false),
  ('f1004004-0000-4000-8000-000000000004'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'concepts types editor', false),
  ('f1004005-0000-4000-8000-000000000005'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'concepts types admin', false),
  ('f1004006-0000-4000-8000-000000000006'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'concepts no case role', false)
on conflict (id) do nothing;

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('f1004003-0000-4000-8000-000000000003'::uuid, 'case_types'::public.app_type, 'viewer'::public.role_level),
  ('f1004004-0000-4000-8000-000000000004'::uuid, 'case_types'::public.app_type, 'editor'::public.role_level),
  ('f1004005-0000-4000-8000-000000000005'::uuid, 'case_types'::public.app_type, 'admin'::public.role_level),
  ('f1004006-0000-4000-8000-000000000006'::uuid, 'data_explorer'::public.app_type, 'viewer'::public.role_level)
on conflict do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('f1002001-0000-4000-8000-000000000001'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1000001-0000-4000-8000-000000000001'::uuid, null),
  ('f1002002-0000-4000-8000-000000000002'::uuid, 'f1001002-0000-4000-8000-000000000002'::uuid, 'f1000002-0000-4000-8000-000000000002'::uuid, null),
  ('f1002003-0000-4000-8000-000000000003'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1000003-0000-4000-8000-000000000003'::uuid, 'f1004003-0000-4000-8000-000000000003'::uuid),
  ('f1002004-0000-4000-8000-000000000004'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1000004-0000-4000-8000-000000000004'::uuid, 'f1004004-0000-4000-8000-000000000004'::uuid),
  ('f1002005-0000-4000-8000-000000000005'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1000005-0000-4000-8000-000000000005'::uuid, 'f1004005-0000-4000-8000-000000000005'::uuid),
  ('f1002006-0000-4000-8000-000000000006'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1000006-0000-4000-8000-000000000006'::uuid, 'f1004006-0000-4000-8000-000000000006'::uuid)
on conflict (id) do nothing;

-- Case types the tests below read and write. Every seeded concept is in this
-- one block.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values
  ('f100a001-0000-4000-8000-000000000001'::uuid, 'f1000001-0000-4000-8000-000000000001'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'ws a concept', false),
  ('f100a002-0000-4000-8000-000000000002'::uuid, 'f1000001-0000-4000-8000-000000000001'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'disposable concept', false),
  ('f100a003-0000-4000-8000-000000000003'::uuid, 'f1000001-0000-4000-8000-000000000001'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'editable concept', false)
on conflict (id) do nothing;

select plan (14);
```

Tests 1 to 6 stay exactly as they are.

- [ ] **Step 2: Append the role-level tests**

Insert immediately before `select * from finish ();`:

```sql
-- 7. Reads stay open to every member: one with no case_types role still
-- reads the row.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000006-0000-4000-8000-000000000006","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.concepts t
      where t.id = 'f100a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'a member with no case_types role cannot read a concepts row';
    end if;
  end $chk$;
  reset role;
  $t7$,
  'a member with no case_types role still selects the concepts row'
);

-- 8. A case_types viewer cannot create a case type.
select throws_ok (
  $t8$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
  values ('f100b002-0000-4000-8000-000000000002'::uuid, 'f1000003-0000-4000-8000-000000000003'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'viewer concept', false);
  $t8$,
  '42501',
  null,
  'a case_types viewer cannot insert a concepts row'
);

-- 9. A case_types editor creates a case type.
select lives_ok (
  $t9$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
  values ('f100b003-0000-4000-8000-000000000003'::uuid, 'f1000004-0000-4000-8000-000000000004'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'editor concept', false);
  reset role;
  $t9$,
  'a case_types editor inserts a concepts row'
);

-- 10. The USING clause filters a case_types viewer's UPDATE, so the row is
-- untouched.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  update public.concepts
  set name = 'viewer tried update'
  where id = 'f100a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concepts t
      where t.id = 'f100a003-0000-4000-8000-000000000003'::uuid and t.name = 'editable concept'
    ) <> 1 then
      raise exception 'a case_types viewer updated a concepts row';
    end if;
  end $chk$;
  $t10$,
  'a case_types viewer cannot update a concepts row'
);

-- 11. A case_types editor edits a case type.
select lives_ok (
  $t11$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.concepts
  set name = 'renamed by editor'
  where id = 'f100a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concepts t
      where t.id = 'f100a003-0000-4000-8000-000000000003'::uuid and t.name = 'renamed by editor'
    ) <> 1 then
      raise exception 'a case_types editor could not update a concepts row';
    end if;
  end $chk$;
  $t11$,
  'a case_types editor updates a concepts row'
);

-- 12. The WITH CHECK clause stops an editor moving a case type into a
-- workspace where they hold no role.
select throws_ok (
  $t12$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.concepts
  set workspace_id = 'f1001002-0000-4000-8000-000000000002'::uuid
  where id = 'f100a003-0000-4000-8000-000000000003'::uuid;
  $t12$,
  '42501',
  null,
  'a case_types editor cannot move a concepts row into another workspace'
);

-- 13. Deleting a case type needs admin, so an editor's DELETE is filtered and
-- the row survives.
select lives_ok (
  $t13$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  delete from public.concepts where id = 'f100a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concepts t
      where t.id = 'f100a002-0000-4000-8000-000000000002'::uuid
    ) <> 1 then
      raise exception 'a case_types editor deleted a concepts row';
    end if;
  end $chk$;
  $t13$,
  'a case_types editor cannot delete a concepts row'
);

-- 14. A case_types admin deletes a case type.
select lives_ok (
  $t14$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000005-0000-4000-8000-000000000005","role":"authenticated"}',
    true
  );
  delete from public.concepts where id = 'f100a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concepts t
      where t.id = 'f100a002-0000-4000-8000-000000000002'::uuid
    ) <> 0 then
      raise exception 'a case_types admin could not delete a concepts row';
    end if;
  end $chk$;
  $t14$,
  'a case_types admin deletes a concepts row'
);
```

- [ ] **Step 3: Run it and watch it fail**

Switch check, then:

```bash
supabase test db supabase/tests/database/00_setup_pgtap.test.sql supabase/tests/database/permissions/rls_concepts.test.sql
```

Expected: FAIL with `not ok 8` (the membership-only INSERT policy lets a viewer in), `not ok 11` and `not ok 12` (the UPDATE policy has no `using`, so every update matches zero rows and nothing raises), and `not ok 13` (any member may delete).

- [ ] **Step 4: Rewrite the write policies**

In `supabase/schemas/10.concepts.sql`, replace everything from `-- Policies` through the end of the DELETE policy (the line before `create trigger tr_concept__set_updated_at`) with:

```sql
-- Policies
create policy "User can SELECT concepts" on public.concepts for
select
  to authenticated using (
    public.concepts.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

-- Creating and editing a case type requires `case_types` editor, and deleting
-- one requires `case_types` admin. Reads stay open to every member so the Data
-- Explorer and chat can query case types.
create policy "
  User can INSERT concepts
" on public.concepts for insert to authenticated
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.concepts.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "User can UPDATE concepts" on public.concepts
for update
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.concepts.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  )
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.concepts.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "
  User can DELETE concepts
" on public.concepts for delete to authenticated using (
  public.util__auth_user_meets_min_app_role (
    public.concepts.workspace_id,
    'case_types'::public.app_type,
    'admin'::public.role_level
  )
);
```

Keep the policy names byte for byte, including the newlines inside the INSERT and DELETE names.

- [ ] **Step 5: Generate and review the migration**

Switch check, then:

```bash
pnpm db:reset
pnpm db:new-migration case_types_rls_on_concepts
```

Expected migration contents: three `drop policy` statements (INSERT, UPDATE, DELETE on `"public"."concepts"`) and three matching `create policy` statements calling `util__auth_user_meets_min_app_role`. Nothing else. A `drop` of anything you did not touch means the diff ran against the wrong database: switch check, reset, and regenerate.

- [ ] **Step 6: Run the test and watch it pass**

Switch check, then:

```bash
supabase test db supabase/tests/database/00_setup_pgtap.test.sql supabase/tests/database/permissions/rls_concepts.test.sql
pnpm test:db
```

Expected: `All tests successful.` for the file, then `pnpm test:db` passes overall.

- [ ] **Step 7: Generate the desktop migration**

```bash
pnpm desktop:sqlite:gen-migrations
git status --short apps/desktop/migrations
```

Expected: one new untracked `*_case_types_rls_on_concepts.gen.sql`. Restore any modified tracked file with `git checkout -- <that file>`.

- [ ] **Step 8: Commit**

```bash
git add supabase/schemas/10.concepts.sql \
  supabase/migrations/*_case_types_rls_on_concepts.sql \
  apps/desktop/migrations/*_case_types_rls_on_concepts.gen.sql \
  supabase/tests/database/permissions/rls_concepts.test.sql
git commit -m "feat(case-statuses): require case_types roles to write concepts"
```

---

### Task 5: Gate `concept_attributes` writes on `case_types`

**Files:**
- Modify: `supabase/tests/database/permissions/rls_concept_attributes.test.sql`
- Modify: `supabase/schemas/20.concept_attributes.sql:35-87` (the policies)
- Create: `supabase/migrations/<ts>_case_types_rls_on_concept_attributes.sql` (generated)
- Create: `apps/desktop/migrations/<ts>_case_types_rls_on_concept_attributes.gen.sql` (generated)

- [ ] **Step 1: Replace the file head**

In `rls_concept_attributes.test.sql`, replace everything from the first line through `select plan (6);` with:

```sql
\set ON_ERROR_STOP on

/**
 * RLS for `concept_attributes`.
 *
 * Every workspace member reads the table, whatever their case roles. Writing
 * an attribute is case type design, so INSERT, UPDATE, and DELETE require
 * `case_types` editor. A member of another workspace can do none of it, and
 * `anon` cannot reach the table at all.
 *
 * Workspace owners pass every app-role check, so the role-level cases use
 * non-owner members whose custom role groups grant exactly one level.
 *
 * The label/identifier trigger requires exactly one `is_label` attribute per
 * concept, so every attribute here except the first is deliberately not a
 * label.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('f2000001-0000-4000-8000-000000000001'::uuid, 'conceptattrs_insider@test.dev', 'authenticated', 'authenticated'),
  ('f2000002-0000-4000-8000-000000000002'::uuid, 'conceptattrs_outsider@test.dev', 'authenticated', 'authenticated'),
  ('f2000003-0000-4000-8000-000000000003'::uuid, 'conceptattrs_types_viewer@test.dev', 'authenticated', 'authenticated'),
  ('f2000004-0000-4000-8000-000000000004'::uuid, 'conceptattrs_types_editor@test.dev', 'authenticated', 'authenticated'),
  ('f2000005-0000-4000-8000-000000000005'::uuid, 'conceptattrs_no_case_role@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('f2001001-0000-4000-8000-000000000001'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'conceptattrs ws a', 'conceptattrs-ws-a'),
  ('f2001002-0000-4000-8000-000000000002'::uuid, 'f2000002-0000-4000-8000-000000000002'::uuid, 'conceptattrs ws b', 'conceptattrs-ws-b')
on conflict (id) do nothing;

-- One custom role group per member below, each granting exactly the role a
-- test names.
insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('f2004003-0000-4000-8000-000000000003'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'conceptattrs types viewer', false),
  ('f2004004-0000-4000-8000-000000000004'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'conceptattrs types editor', false),
  ('f2004005-0000-4000-8000-000000000005'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'conceptattrs no case role', false)
on conflict (id) do nothing;

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('f2004003-0000-4000-8000-000000000003'::uuid, 'case_types'::public.app_type, 'viewer'::public.role_level),
  ('f2004004-0000-4000-8000-000000000004'::uuid, 'case_types'::public.app_type, 'editor'::public.role_level),
  ('f2004005-0000-4000-8000-000000000005'::uuid, 'data_explorer'::public.app_type, 'viewer'::public.role_level)
on conflict do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('f2002001-0000-4000-8000-000000000001'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, null),
  ('f2002002-0000-4000-8000-000000000002'::uuid, 'f2001002-0000-4000-8000-000000000002'::uuid, 'f2000002-0000-4000-8000-000000000002'::uuid, null),
  ('f2002003-0000-4000-8000-000000000003'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2000003-0000-4000-8000-000000000003'::uuid, 'f2004003-0000-4000-8000-000000000003'::uuid),
  ('f2002004-0000-4000-8000-000000000004'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2000004-0000-4000-8000-000000000004'::uuid, 'f2004004-0000-4000-8000-000000000004'::uuid),
  ('f2002005-0000-4000-8000-000000000005'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2000005-0000-4000-8000-000000000005'::uuid, 'f2004005-0000-4000-8000-000000000005'::uuid)
on conflict (id) do nothing;

-- Case types the tests below read and write. Every seeded concept is in this
-- one block.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values ('f200b003-0000-4000-8000-000000000003'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'host concept', true)
on conflict (id) do nothing;

insert into public.concept_attributes (
  id, workspace_id, concept_id, name, data_type, mapping_type,
  is_label, is_identifier, is_array, allow_manual_edit
)
values
  ('f200a001-0000-4000-8000-000000000001'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f200b003-0000-4000-8000-000000000003'::uuid, 'ws a attribute',
   'varchar'::public.datasets__ava_data_type, 'manual_entry'::public.concept_attributes__mapping_type, true, false, false, true),
  ('f200a002-0000-4000-8000-000000000002'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f200b003-0000-4000-8000-000000000003'::uuid, 'editable attribute',
   'varchar'::public.datasets__ava_data_type, 'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true),
  ('f200a003-0000-4000-8000-000000000003'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f200b003-0000-4000-8000-000000000003'::uuid, 'disposable attribute',
   'varchar'::public.datasets__ava_data_type, 'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true)
on conflict (id) do nothing;

select plan (14);
```

Tests 1 to 6 stay exactly as they are.

- [ ] **Step 2: Append the role-level tests**

Insert immediately before `select * from finish ();`:

```sql
-- 7. Reads stay open to every member: one with no case_types role still
-- reads the row.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000005-0000-4000-8000-000000000005","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.concept_attributes t
      where t.id = 'f200a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'a member with no case_types role cannot read a concept_attributes row';
    end if;
  end $chk$;
  reset role;
  $t7$,
  'a member with no case_types role still selects the concept_attributes row'
);

-- 8. A case_types viewer cannot add an attribute.
select throws_ok (
  $t8$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  insert into public.concept_attributes (id, workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit)
  values ('f200c002-0000-4000-8000-000000000002'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f200b003-0000-4000-8000-000000000003'::uuid, 'viewer attribute', 'varchar'::public.datasets__ava_data_type, 'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true);
  $t8$,
  '42501',
  null,
  'a case_types viewer cannot insert a concept_attributes row'
);

-- 9. A case_types editor adds an attribute.
select lives_ok (
  $t9$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  insert into public.concept_attributes (id, workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit)
  values ('f200c003-0000-4000-8000-000000000003'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f200b003-0000-4000-8000-000000000003'::uuid, 'editor attribute', 'varchar'::public.datasets__ava_data_type, 'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true);
  reset role;
  $t9$,
  'a case_types editor inserts a concept_attributes row'
);

-- 10. The USING clause filters a case_types viewer's UPDATE, so the row is
-- untouched.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  update public.concept_attributes
  set name = 'viewer tried update'
  where id = 'f200a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concept_attributes t
      where t.id = 'f200a002-0000-4000-8000-000000000002'::uuid and t.name = 'editable attribute'
    ) <> 1 then
      raise exception 'a case_types viewer updated a concept_attributes row';
    end if;
  end $chk$;
  $t10$,
  'a case_types viewer cannot update a concept_attributes row'
);

-- 11. A case_types editor renames an attribute.
select lives_ok (
  $t11$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.concept_attributes
  set name = 'renamed by editor'
  where id = 'f200a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concept_attributes t
      where t.id = 'f200a002-0000-4000-8000-000000000002'::uuid and t.name = 'renamed by editor'
    ) <> 1 then
      raise exception 'a case_types editor could not update a concept_attributes row';
    end if;
  end $chk$;
  $t11$,
  'a case_types editor updates a concept_attributes row'
);

-- 12. The WITH CHECK clause stops an editor moving an attribute into a
-- workspace where they hold no role.
select throws_ok (
  $t12$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.concept_attributes
  set workspace_id = 'f2001002-0000-4000-8000-000000000002'::uuid
  where id = 'f200a002-0000-4000-8000-000000000002'::uuid;
  $t12$,
  '42501',
  null,
  'a case_types editor cannot move a concept_attributes row into another workspace'
);

-- 13. A case_types viewer's DELETE is filtered, so the row survives.
select lives_ok (
  $t13$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  delete from public.concept_attributes where id = 'f200a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concept_attributes t
      where t.id = 'f200a003-0000-4000-8000-000000000003'::uuid
    ) <> 1 then
      raise exception 'a case_types viewer deleted a concept_attributes row';
    end if;
  end $chk$;
  $t13$,
  'a case_types viewer cannot delete a concept_attributes row'
);

-- 14. A case_types editor removes an attribute.
select lives_ok (
  $t14$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  delete from public.concept_attributes where id = 'f200a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concept_attributes t
      where t.id = 'f200a003-0000-4000-8000-000000000003'::uuid
    ) <> 0 then
      raise exception 'a case_types editor could not delete a concept_attributes row';
    end if;
  end $chk$;
  $t14$,
  'a case_types editor deletes a concept_attributes row'
);
```

- [ ] **Step 3: Run it and watch it fail**

Switch check, then:

```bash
supabase test db supabase/tests/database/00_setup_pgtap.test.sql supabase/tests/database/permissions/rls_concept_attributes.test.sql
```

Expected: FAIL with `not ok 8`, `not ok 11`, `not ok 12`, and `not ok 13`, for the same reasons as Task 4 Step 3.

- [ ] **Step 4: Rewrite the write policies**

In `supabase/schemas/20.concept_attributes.sql`, replace everything from `-- Policies` through the end of the DELETE policy (the line before `create trigger tr_concept_attribute__set_updated_at`) with:

```sql
-- Policies
create policy "
  User can SELECT concept_attributes
" on public.concept_attributes for
select
  to authenticated using (
    public.concept_attributes.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

-- Attributes are part of a case type's design, so every write requires
-- `case_types` editor.
create policy "
  User can INSERT concept_attributes
" on public.concept_attributes for insert to authenticated
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.concept_attributes.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "
  User can UPDATE concept_attributes
" on public.concept_attributes
for update
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.concept_attributes.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  )
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.concept_attributes.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "
  User can DELETE concept_attributes
" on public.concept_attributes for delete to authenticated using (
  public.util__auth_user_meets_min_app_role (
    public.concept_attributes.workspace_id,
    'case_types'::public.app_type,
    'editor'::public.role_level
  )
);
```

- [ ] **Step 5: Generate and review the migration**

Switch check, then:

```bash
pnpm db:reset
pnpm db:new-migration case_types_rls_on_concept_attributes
```

Expected migration contents: three `drop policy` and three `create policy` statements for the INSERT, UPDATE, and DELETE policies on `"public"."concept_attributes"`, and nothing else.

- [ ] **Step 6: Run the test and watch it pass**

Switch check, then:

```bash
supabase test db supabase/tests/database/00_setup_pgtap.test.sql supabase/tests/database/permissions/rls_concept_attributes.test.sql
pnpm test:db
```

Expected: `All tests successful.`, then `pnpm test:db` passes overall.

- [ ] **Step 7: Generate the desktop migration**

```bash
pnpm desktop:sqlite:gen-migrations
git status --short apps/desktop/migrations
```

Expected: one new untracked `*_case_types_rls_on_concept_attributes.gen.sql`. Restore any modified tracked file with `git checkout -- <that file>`.

- [ ] **Step 8: Commit**

```bash
git add supabase/schemas/20.concept_attributes.sql \
  supabase/migrations/*_case_types_rls_on_concept_attributes.sql \
  apps/desktop/migrations/*_case_types_rls_on_concept_attributes.gen.sql \
  supabase/tests/database/permissions/rls_concept_attributes.test.sql
git commit -m "feat(case-statuses): require case_types editor to write case type attributes"
```

---

### Task 6: Gate attribute mapping writes on `case_types`

**Files:**
- Modify: `supabase/tests/database/permissions/rls_attribute_mappings__dataset_column.test.sql`
- Modify: `supabase/tests/database/permissions/rls_attribute_mappings__manual_entry.test.sql`
- Modify: `supabase/schemas/30.attribute_mappings__dataset_column.sql:35-87` (the policies)
- Modify: `supabase/schemas/30.attribute_mappings__manual_entry.sql:22-74` (the policies)
- Create: `supabase/migrations/<ts>_case_types_rls_on_attribute_mappings.sql` (generated)
- Create: `apps/desktop/migrations/<ts>_case_types_rls_on_attribute_mappings.gen.sql` (generated)

- [ ] **Step 1: Replace the dataset-column file head**

In `rls_attribute_mappings__dataset_column.test.sql`, replace everything from the first line through `select plan (6);` with:

```sql
\set ON_ERROR_STOP on

/**
 * RLS for `attribute_mappings__dataset_column`.
 *
 * Every workspace member reads the table, whatever their case roles. A
 * mapping is part of a case type's design, so INSERT, UPDATE, and DELETE
 * require `case_types` editor. A member of another workspace can do none of
 * it, and `anon` cannot reach the table at all.
 *
 * Workspace owners pass every app-role check, so the role-level cases use
 * non-owner members whose custom role groups grant exactly one level.
 *
 * `concept_attribute_id` is unique, so every mapping and every insert attempt
 * uses its own attribute. Attributes are inserted before any mapping so the
 * label/identifier trigger sees a consistent concept.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('f5000001-0000-4000-8000-000000000001'::uuid, 'attrmapds_insider@test.dev', 'authenticated', 'authenticated'),
  ('f5000002-0000-4000-8000-000000000002'::uuid, 'attrmapds_outsider@test.dev', 'authenticated', 'authenticated'),
  ('f5000003-0000-4000-8000-000000000003'::uuid, 'attrmapds_types_viewer@test.dev', 'authenticated', 'authenticated'),
  ('f5000004-0000-4000-8000-000000000004'::uuid, 'attrmapds_types_editor@test.dev', 'authenticated', 'authenticated'),
  ('f5000005-0000-4000-8000-000000000005'::uuid, 'attrmapds_no_case_role@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('f5001001-0000-4000-8000-000000000001'::uuid, 'f5000001-0000-4000-8000-000000000001'::uuid, 'attrmapds ws a', 'attrmapds-ws-a'),
  ('f5001002-0000-4000-8000-000000000002'::uuid, 'f5000002-0000-4000-8000-000000000002'::uuid, 'attrmapds ws b', 'attrmapds-ws-b')
on conflict (id) do nothing;

-- One custom role group per member below, each granting exactly the role a
-- test names.
insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('f5004003-0000-4000-8000-000000000003'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'attrmapds types viewer', false),
  ('f5004004-0000-4000-8000-000000000004'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'attrmapds types editor', false),
  ('f5004005-0000-4000-8000-000000000005'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'attrmapds no case role', false)
on conflict (id) do nothing;

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('f5004003-0000-4000-8000-000000000003'::uuid, 'case_types'::public.app_type, 'viewer'::public.role_level),
  ('f5004004-0000-4000-8000-000000000004'::uuid, 'case_types'::public.app_type, 'editor'::public.role_level),
  ('f5004005-0000-4000-8000-000000000005'::uuid, 'data_explorer'::public.app_type, 'viewer'::public.role_level)
on conflict do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('f5002001-0000-4000-8000-000000000001'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'f5000001-0000-4000-8000-000000000001'::uuid, null),
  ('f5002002-0000-4000-8000-000000000002'::uuid, 'f5001002-0000-4000-8000-000000000002'::uuid, 'f5000002-0000-4000-8000-000000000002'::uuid, null),
  ('f5002003-0000-4000-8000-000000000003'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'f5000003-0000-4000-8000-000000000003'::uuid, 'f5004003-0000-4000-8000-000000000003'::uuid),
  ('f5002004-0000-4000-8000-000000000004'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'f5000004-0000-4000-8000-000000000004'::uuid, 'f5004004-0000-4000-8000-000000000004'::uuid),
  ('f5002005-0000-4000-8000-000000000005'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'f5000005-0000-4000-8000-000000000005'::uuid, 'f5004005-0000-4000-8000-000000000005'::uuid)
on conflict (id) do nothing;

-- Case types the tests below read and write. Every seeded concept is in this
-- one block.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values ('f500b003-0000-4000-8000-000000000003'::uuid, 'f5000001-0000-4000-8000-000000000001'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'host concept', true)
on conflict (id) do nothing;

insert into public.concept_attributes (
  id, workspace_id, concept_id, name, data_type, mapping_type,
  is_label, is_identifier, is_array, allow_manual_edit
)
values
  ('f500b001-0000-4000-8000-000000000001'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'f500b003-0000-4000-8000-000000000003'::uuid, 'mapped attribute',
   'varchar'::public.datasets__ava_data_type,
   'dataset_column'::public.concept_attributes__mapping_type, true, true, false, true),
  ('f500b002-0000-4000-8000-000000000002'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'f500b003-0000-4000-8000-000000000003'::uuid, 'spare attribute',
   'varchar'::public.datasets__ava_data_type,
   'dataset_column'::public.concept_attributes__mapping_type, false, false, false, true),
  ('f500b004-0000-4000-8000-000000000004'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'f500b003-0000-4000-8000-000000000003'::uuid, 'editor attribute',
   'varchar'::public.datasets__ava_data_type,
   'dataset_column'::public.concept_attributes__mapping_type, false, false, false, true),
  ('f500b005-0000-4000-8000-000000000005'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'f500b003-0000-4000-8000-000000000003'::uuid, 'editable mapping attribute',
   'varchar'::public.datasets__ava_data_type,
   'dataset_column'::public.concept_attributes__mapping_type, false, false, false, true),
  ('f500b006-0000-4000-8000-000000000006'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'f500b003-0000-4000-8000-000000000003'::uuid, 'disposable mapping attribute',
   'varchar'::public.datasets__ava_data_type,
   'dataset_column'::public.concept_attributes__mapping_type, false, false, false, true)
on conflict (id) do nothing;

insert into public.attribute_mappings__dataset_column (
  id, workspace_id, concept_attribute_id, value_picker_rule_type,
  dataset_id, dataset_column_id
)
values
  ('f500a001-0000-4000-8000-000000000001'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'f500b001-0000-4000-8000-000000000001'::uuid,
   'first'::public.attribute_mappings__value_picker_rule_type,
   'f5001001-0000-4000-8000-000000000001'::uuid, 'f5001002-0000-4000-8000-000000000002'::uuid),
  ('f500a002-0000-4000-8000-000000000002'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'f500b005-0000-4000-8000-000000000005'::uuid,
   'first'::public.attribute_mappings__value_picker_rule_type,
   'f5001001-0000-4000-8000-000000000001'::uuid, 'f5001002-0000-4000-8000-000000000002'::uuid),
  ('f500a003-0000-4000-8000-000000000003'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'f500b006-0000-4000-8000-000000000006'::uuid,
   'first'::public.attribute_mappings__value_picker_rule_type,
   'f5001001-0000-4000-8000-000000000001'::uuid, 'f5001002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

select plan (14);
```

Tests 1 to 6 stay exactly as they are.

- [ ] **Step 2: Append the dataset-column role-level tests**

Insert immediately before `select * from finish ();`:

```sql
-- 7. Reads stay open to every member: one with no case_types role still
-- reads the row.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f5000005-0000-4000-8000-000000000005","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__dataset_column t
      where t.id = 'f500a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'a member with no case_types role cannot read a attribute_mappings__dataset_column row';
    end if;
  end $chk$;
  reset role;
  $t7$,
  'a member with no case_types role still selects the attribute_mappings__dataset_column row'
);

-- 8. A case_types viewer cannot add a mapping.
select throws_ok (
  $t8$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f5000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  insert into public.attribute_mappings__dataset_column (id, workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id)
  values ('f500c002-0000-4000-8000-000000000002'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'f500b002-0000-4000-8000-000000000002'::uuid, 'first'::public.attribute_mappings__value_picker_rule_type, 'f5001001-0000-4000-8000-000000000001'::uuid, 'f5001002-0000-4000-8000-000000000002'::uuid);
  $t8$,
  '42501',
  null,
  'a case_types viewer cannot insert a attribute_mappings__dataset_column row'
);

-- 9. A case_types editor adds a mapping.
select lives_ok (
  $t9$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f5000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  insert into public.attribute_mappings__dataset_column (id, workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id)
  values ('f500c003-0000-4000-8000-000000000003'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'f500b004-0000-4000-8000-000000000004'::uuid, 'first'::public.attribute_mappings__value_picker_rule_type, 'f5001001-0000-4000-8000-000000000001'::uuid, 'f5001002-0000-4000-8000-000000000002'::uuid);
  reset role;
  $t9$,
  'a case_types editor inserts a attribute_mappings__dataset_column row'
);

-- 10. The USING clause filters a case_types viewer's UPDATE, so the row is
-- untouched.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f5000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  update public.attribute_mappings__dataset_column
  set value_picker_rule_type = 'sum'::public.attribute_mappings__value_picker_rule_type
  where id = 'f500a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__dataset_column t
      where t.id = 'f500a002-0000-4000-8000-000000000002'::uuid and t.value_picker_rule_type = 'first'::public.attribute_mappings__value_picker_rule_type
    ) <> 1 then
      raise exception 'a case_types viewer updated a attribute_mappings__dataset_column row';
    end if;
  end $chk$;
  $t10$,
  'a case_types viewer cannot update a attribute_mappings__dataset_column row'
);

-- 11. A case_types editor changes a mapping's value picker.
select lives_ok (
  $t11$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f5000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.attribute_mappings__dataset_column
  set value_picker_rule_type = 'sum'::public.attribute_mappings__value_picker_rule_type
  where id = 'f500a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__dataset_column t
      where t.id = 'f500a002-0000-4000-8000-000000000002'::uuid and t.value_picker_rule_type = 'sum'::public.attribute_mappings__value_picker_rule_type
    ) <> 1 then
      raise exception 'a case_types editor could not update a attribute_mappings__dataset_column row';
    end if;
  end $chk$;
  $t11$,
  'a case_types editor updates a attribute_mappings__dataset_column row'
);

-- 12. The WITH CHECK clause stops an editor moving a mapping into a workspace
-- where they hold no role.
select throws_ok (
  $t12$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f5000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.attribute_mappings__dataset_column
  set workspace_id = 'f5001002-0000-4000-8000-000000000002'::uuid
  where id = 'f500a002-0000-4000-8000-000000000002'::uuid;
  $t12$,
  '42501',
  null,
  'a case_types editor cannot move a attribute_mappings__dataset_column row into another workspace'
);

-- 13. A case_types viewer's DELETE is filtered, so the row survives.
select lives_ok (
  $t13$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f5000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  delete from public.attribute_mappings__dataset_column where id = 'f500a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__dataset_column t
      where t.id = 'f500a003-0000-4000-8000-000000000003'::uuid
    ) <> 1 then
      raise exception 'a case_types viewer deleted a attribute_mappings__dataset_column row';
    end if;
  end $chk$;
  $t13$,
  'a case_types viewer cannot delete a attribute_mappings__dataset_column row'
);

-- 14. A case_types editor removes a mapping.
select lives_ok (
  $t14$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f5000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  delete from public.attribute_mappings__dataset_column where id = 'f500a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__dataset_column t
      where t.id = 'f500a003-0000-4000-8000-000000000003'::uuid
    ) <> 0 then
      raise exception 'a case_types editor could not delete a attribute_mappings__dataset_column row';
    end if;
  end $chk$;
  $t14$,
  'a case_types editor deletes a attribute_mappings__dataset_column row'
);
```

- [ ] **Step 3: Replace the manual-entry file head**

In `rls_attribute_mappings__manual_entry.test.sql`, replace everything from the first line through `select plan (6);` with:

```sql
\set ON_ERROR_STOP on

/**
 * RLS for `attribute_mappings__manual_entry`.
 *
 * Every workspace member reads the table, whatever their case roles. A
 * mapping is part of a case type's design, so INSERT, UPDATE, and DELETE
 * require `case_types` editor. A member of another workspace can do none of
 * it, and `anon` cannot reach the table at all.
 *
 * Workspace owners pass every app-role check, so the role-level cases use
 * non-owner members whose custom role groups grant exactly one level.
 *
 * `concept_attribute_id` is unique, so every mapping, every insert attempt,
 * and the repoint target uses its own attribute.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('f6000001-0000-4000-8000-000000000001'::uuid, 'attrmapman_insider@test.dev', 'authenticated', 'authenticated'),
  ('f6000002-0000-4000-8000-000000000002'::uuid, 'attrmapman_outsider@test.dev', 'authenticated', 'authenticated'),
  ('f6000003-0000-4000-8000-000000000003'::uuid, 'attrmapman_types_viewer@test.dev', 'authenticated', 'authenticated'),
  ('f6000004-0000-4000-8000-000000000004'::uuid, 'attrmapman_types_editor@test.dev', 'authenticated', 'authenticated'),
  ('f6000005-0000-4000-8000-000000000005'::uuid, 'attrmapman_no_case_role@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('f6001001-0000-4000-8000-000000000001'::uuid, 'f6000001-0000-4000-8000-000000000001'::uuid, 'attrmapman ws a', 'attrmapman-ws-a'),
  ('f6001002-0000-4000-8000-000000000002'::uuid, 'f6000002-0000-4000-8000-000000000002'::uuid, 'attrmapman ws b', 'attrmapman-ws-b')
on conflict (id) do nothing;

-- One custom role group per member below, each granting exactly the role a
-- test names.
insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('f6004003-0000-4000-8000-000000000003'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'attrmapman types viewer', false),
  ('f6004004-0000-4000-8000-000000000004'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'attrmapman types editor', false),
  ('f6004005-0000-4000-8000-000000000005'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'attrmapman no case role', false)
on conflict (id) do nothing;

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('f6004003-0000-4000-8000-000000000003'::uuid, 'case_types'::public.app_type, 'viewer'::public.role_level),
  ('f6004004-0000-4000-8000-000000000004'::uuid, 'case_types'::public.app_type, 'editor'::public.role_level),
  ('f6004005-0000-4000-8000-000000000005'::uuid, 'data_explorer'::public.app_type, 'viewer'::public.role_level)
on conflict do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('f6002001-0000-4000-8000-000000000001'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f6000001-0000-4000-8000-000000000001'::uuid, null),
  ('f6002002-0000-4000-8000-000000000002'::uuid, 'f6001002-0000-4000-8000-000000000002'::uuid, 'f6000002-0000-4000-8000-000000000002'::uuid, null),
  ('f6002003-0000-4000-8000-000000000003'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f6000003-0000-4000-8000-000000000003'::uuid, 'f6004003-0000-4000-8000-000000000003'::uuid),
  ('f6002004-0000-4000-8000-000000000004'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f6000004-0000-4000-8000-000000000004'::uuid, 'f6004004-0000-4000-8000-000000000004'::uuid),
  ('f6002005-0000-4000-8000-000000000005'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f6000005-0000-4000-8000-000000000005'::uuid, 'f6004005-0000-4000-8000-000000000005'::uuid)
on conflict (id) do nothing;

-- Case types the tests below read and write. Every seeded concept is in this
-- one block.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values ('f600b003-0000-4000-8000-000000000003'::uuid, 'f6000001-0000-4000-8000-000000000001'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'host concept', true)
on conflict (id) do nothing;

insert into public.concept_attributes (
  id, workspace_id, concept_id, name, data_type, mapping_type,
  is_label, is_identifier, is_array, allow_manual_edit
)
values
  ('f600b001-0000-4000-8000-000000000001'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b003-0000-4000-8000-000000000003'::uuid, 'mapped attribute',
   'varchar'::public.datasets__ava_data_type,
   'manual_entry'::public.concept_attributes__mapping_type, true, false, false, true),
  ('f600b002-0000-4000-8000-000000000002'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b003-0000-4000-8000-000000000003'::uuid, 'spare attribute',
   'varchar'::public.datasets__ava_data_type,
   'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true),
  ('f600b004-0000-4000-8000-000000000004'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b003-0000-4000-8000-000000000003'::uuid, 'editor attribute',
   'varchar'::public.datasets__ava_data_type,
   'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true),
  ('f600b005-0000-4000-8000-000000000005'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b003-0000-4000-8000-000000000003'::uuid, 'editable mapping attribute',
   'varchar'::public.datasets__ava_data_type,
   'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true),
  ('f600b006-0000-4000-8000-000000000006'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b003-0000-4000-8000-000000000003'::uuid, 'disposable mapping attribute',
   'varchar'::public.datasets__ava_data_type,
   'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true),
  ('f600b007-0000-4000-8000-000000000007'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b003-0000-4000-8000-000000000003'::uuid, 'repoint target attribute',
   'varchar'::public.datasets__ava_data_type,
   'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true)
on conflict (id) do nothing;

insert into public.attribute_mappings__manual_entry (
  id, workspace_id, concept_attribute_id
)
values
  ('f600a001-0000-4000-8000-000000000001'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b001-0000-4000-8000-000000000001'::uuid),
  ('f600a002-0000-4000-8000-000000000002'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b005-0000-4000-8000-000000000005'::uuid),
  ('f600a003-0000-4000-8000-000000000003'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b006-0000-4000-8000-000000000006'::uuid)
on conflict (id) do nothing;

select plan (14);
```

Tests 1 to 6 stay exactly as they are.

- [ ] **Step 4: Append the manual-entry role-level tests**

Insert immediately before `select * from finish ();`:

```sql
-- 7. Reads stay open to every member: one with no case_types role still
-- reads the row.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000005-0000-4000-8000-000000000005","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__manual_entry t
      where t.id = 'f600a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'a member with no case_types role cannot read a attribute_mappings__manual_entry row';
    end if;
  end $chk$;
  reset role;
  $t7$,
  'a member with no case_types role still selects the attribute_mappings__manual_entry row'
);

-- 8. A case_types viewer cannot add a mapping.
select throws_ok (
  $t8$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  insert into public.attribute_mappings__manual_entry (id, workspace_id, concept_attribute_id)
  values ('f600c002-0000-4000-8000-000000000002'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b002-0000-4000-8000-000000000002'::uuid);
  $t8$,
  '42501',
  null,
  'a case_types viewer cannot insert a attribute_mappings__manual_entry row'
);

-- 9. A case_types editor adds a mapping.
select lives_ok (
  $t9$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  insert into public.attribute_mappings__manual_entry (id, workspace_id, concept_attribute_id)
  values ('f600c003-0000-4000-8000-000000000003'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b004-0000-4000-8000-000000000004'::uuid);
  reset role;
  $t9$,
  'a case_types editor inserts a attribute_mappings__manual_entry row'
);

-- 10. The USING clause filters a case_types viewer's UPDATE, so the row is
-- untouched.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  update public.attribute_mappings__manual_entry
  set concept_attribute_id = 'f600b007-0000-4000-8000-000000000007'::uuid
  where id = 'f600a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__manual_entry t
      where t.id = 'f600a002-0000-4000-8000-000000000002'::uuid and t.concept_attribute_id = 'f600b005-0000-4000-8000-000000000005'::uuid
    ) <> 1 then
      raise exception 'a case_types viewer updated a attribute_mappings__manual_entry row';
    end if;
  end $chk$;
  $t10$,
  'a case_types viewer cannot update a attribute_mappings__manual_entry row'
);

-- 11. A case_types editor repoints a mapping at another attribute.
select lives_ok (
  $t11$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.attribute_mappings__manual_entry
  set concept_attribute_id = 'f600b007-0000-4000-8000-000000000007'::uuid
  where id = 'f600a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__manual_entry t
      where t.id = 'f600a002-0000-4000-8000-000000000002'::uuid and t.concept_attribute_id = 'f600b007-0000-4000-8000-000000000007'::uuid
    ) <> 1 then
      raise exception 'a case_types editor could not update a attribute_mappings__manual_entry row';
    end if;
  end $chk$;
  $t11$,
  'a case_types editor updates a attribute_mappings__manual_entry row'
);

-- 12. The WITH CHECK clause stops an editor moving a mapping into a workspace
-- where they hold no role.
select throws_ok (
  $t12$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.attribute_mappings__manual_entry
  set workspace_id = 'f6001002-0000-4000-8000-000000000002'::uuid
  where id = 'f600a002-0000-4000-8000-000000000002'::uuid;
  $t12$,
  '42501',
  null,
  'a case_types editor cannot move a attribute_mappings__manual_entry row into another workspace'
);

-- 13. A case_types viewer's DELETE is filtered, so the row survives.
select lives_ok (
  $t13$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  delete from public.attribute_mappings__manual_entry where id = 'f600a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__manual_entry t
      where t.id = 'f600a003-0000-4000-8000-000000000003'::uuid
    ) <> 1 then
      raise exception 'a case_types viewer deleted a attribute_mappings__manual_entry row';
    end if;
  end $chk$;
  $t13$,
  'a case_types viewer cannot delete a attribute_mappings__manual_entry row'
);

-- 14. A case_types editor removes a mapping.
select lives_ok (
  $t14$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  delete from public.attribute_mappings__manual_entry where id = 'f600a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__manual_entry t
      where t.id = 'f600a003-0000-4000-8000-000000000003'::uuid
    ) <> 0 then
      raise exception 'a case_types editor could not delete a attribute_mappings__manual_entry row';
    end if;
  end $chk$;
  $t14$,
  'a case_types editor deletes a attribute_mappings__manual_entry row'
);
```

- [ ] **Step 5: Run both and watch them fail**

Switch check, then:

```bash
supabase test db supabase/tests/database/00_setup_pgtap.test.sql \
  supabase/tests/database/permissions/rls_attribute_mappings__dataset_column.test.sql \
  supabase/tests/database/permissions/rls_attribute_mappings__manual_entry.test.sql
```

Expected: FAIL in both files with `not ok 8`, `not ok 11`, `not ok 12`, and `not ok 13`.

- [ ] **Step 6: Rewrite the dataset-column write policies**

In `supabase/schemas/30.attribute_mappings__dataset_column.sql`, replace everything from `-- Policies` through the end of the DELETE policy (the line before `create trigger tr_attribute_mappings__dataset_column_set_updated_at`) with:

```sql
-- Policies
create policy "
  User can SELECT attribute_mappings__dataset_column
" on public.attribute_mappings__dataset_column for
select
  to authenticated using (
    public.attribute_mappings__dataset_column.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

-- Mappings are part of a case type's design, so every write requires
-- `case_types` editor.
create policy "
  User can INSERT attribute_mappings__dataset_column
" on public.attribute_mappings__dataset_column for insert to authenticated
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.attribute_mappings__dataset_column.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "
  User can UPDATE attribute_mappings__dataset_column
" on public.attribute_mappings__dataset_column
for update
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.attribute_mappings__dataset_column.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  )
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.attribute_mappings__dataset_column.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "
  User can DELETE attribute_mappings__dataset_column
" on public.attribute_mappings__dataset_column for delete to authenticated using (
  public.util__auth_user_meets_min_app_role (
    public.attribute_mappings__dataset_column.workspace_id,
    'case_types'::public.app_type,
    'editor'::public.role_level
  )
);
```

- [ ] **Step 7: Rewrite the manual-entry write policies**

In `supabase/schemas/30.attribute_mappings__manual_entry.sql`, replace everything from `-- Policies` through the end of the DELETE policy (the line before `create trigger tr_attribute_mappings__manual_entry_set_updated_at`) with:

```sql
-- Policies
create policy "
  User can SELECT attribute_mappings__manual_entry
" on public.attribute_mappings__manual_entry for
select
  to authenticated using (
    public.attribute_mappings__manual_entry.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

-- Mappings are part of a case type's design, so every write requires
-- `case_types` editor.
create policy "
  User can INSERT attribute_mappings__manual_entry
" on public.attribute_mappings__manual_entry for insert to authenticated
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.attribute_mappings__manual_entry.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "
  User can UPDATE attribute_mappings__manual_entry
" on public.attribute_mappings__manual_entry
for update
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.attribute_mappings__manual_entry.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  )
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.attribute_mappings__manual_entry.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "
  User can DELETE attribute_mappings__manual_entry
" on public.attribute_mappings__manual_entry for delete to authenticated using (
  public.util__auth_user_meets_min_app_role (
    public.attribute_mappings__manual_entry.workspace_id,
    'case_types'::public.app_type,
    'editor'::public.role_level
  )
);
```

- [ ] **Step 8: Generate and review the migration**

Switch check, then:

```bash
pnpm db:reset
pnpm db:new-migration case_types_rls_on_attribute_mappings
```

Expected migration contents: six `drop policy` and six `create policy` statements, three per mapping table, and nothing else.

- [ ] **Step 9: Run both and watch them pass**

Switch check, then:

```bash
supabase test db supabase/tests/database/00_setup_pgtap.test.sql \
  supabase/tests/database/permissions/rls_attribute_mappings__dataset_column.test.sql \
  supabase/tests/database/permissions/rls_attribute_mappings__manual_entry.test.sql
pnpm test:db
```

Expected: `All tests successful.`, then `pnpm test:db` passes overall.

- [ ] **Step 10: Generate the desktop migration**

```bash
pnpm desktop:sqlite:gen-migrations
git status --short apps/desktop/migrations
```

Expected: one new untracked `*_case_types_rls_on_attribute_mappings.gen.sql`. Restore any modified tracked file with `git checkout -- <that file>`.

- [ ] **Step 11: Commit**

```bash
git add supabase/schemas/30.attribute_mappings__dataset_column.sql \
  supabase/schemas/30.attribute_mappings__manual_entry.sql \
  supabase/migrations/*_case_types_rls_on_attribute_mappings.sql \
  apps/desktop/migrations/*_case_types_rls_on_attribute_mappings.gen.sql \
  supabase/tests/database/permissions/rls_attribute_mappings__dataset_column.test.sql \
  supabase/tests/database/permissions/rls_attribute_mappings__manual_entry.test.sql
git commit -m "feat(case-statuses): require case_types editor to write attribute mappings"
```

---

### Task 7: Gate `individuals` writes on either case app

**Files:**
- Modify: `supabase/tests/database/permissions/rls_individuals.test.sql`
- Modify: `supabase/schemas/20.individuals.sql:43-85` (the policies)
- Create: `supabase/migrations/<ts>_case_app_rls_on_individuals.sql` (generated)
- Create: `apps/desktop/migrations/<ts>_case_app_rls_on_individuals.gen.sql` (generated)

- [ ] **Step 1: Replace the file head**

In `rls_individuals.test.sql`, replace everything from the first line through `select plan (6);` with:

```sql
\set ON_ERROR_STOP on

/**
 * RLS for `individuals`.
 *
 * Every workspace member reads the table, whatever their case roles. A
 * refresh writes records as a `case_types` editor and the people working the
 * records write them as a `case_records` editor, so either role may insert
 * and update a record. Deleting one requires `case_records` admin. A member
 * of another workspace can do none of it, and `anon` cannot reach the table
 * at all.
 *
 * Workspace owners pass every app-role check, so the role-level cases use
 * non-owner members whose custom role groups grant exactly one role.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('f3000001-0000-4000-8000-000000000001'::uuid, 'individuals_insider@test.dev', 'authenticated', 'authenticated'),
  ('f3000002-0000-4000-8000-000000000002'::uuid, 'individuals_outsider@test.dev', 'authenticated', 'authenticated'),
  ('f3000003-0000-4000-8000-000000000003'::uuid, 'individuals_types_editor@test.dev', 'authenticated', 'authenticated'),
  ('f3000004-0000-4000-8000-000000000004'::uuid, 'individuals_records_editor@test.dev', 'authenticated', 'authenticated'),
  ('f3000005-0000-4000-8000-000000000005'::uuid, 'individuals_records_viewer@test.dev', 'authenticated', 'authenticated'),
  ('f3000006-0000-4000-8000-000000000006'::uuid, 'individuals_records_admin@test.dev', 'authenticated', 'authenticated'),
  ('f3000007-0000-4000-8000-000000000007'::uuid, 'individuals_types_admin@test.dev', 'authenticated', 'authenticated'),
  ('f3000008-0000-4000-8000-000000000008'::uuid, 'individuals_no_case_role@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('f3001001-0000-4000-8000-000000000001'::uuid, 'f3000001-0000-4000-8000-000000000001'::uuid, 'individuals ws a', 'individuals-ws-a'),
  ('f3001002-0000-4000-8000-000000000002'::uuid, 'f3000002-0000-4000-8000-000000000002'::uuid, 'individuals ws b', 'individuals-ws-b')
on conflict (id) do nothing;

-- One custom role group per member below, each granting exactly the role a
-- test names.
insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('f3004003-0000-4000-8000-000000000003'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'individuals types editor', false),
  ('f3004004-0000-4000-8000-000000000004'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'individuals records editor', false),
  ('f3004005-0000-4000-8000-000000000005'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'individuals records viewer', false),
  ('f3004006-0000-4000-8000-000000000006'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'individuals records admin', false),
  ('f3004007-0000-4000-8000-000000000007'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'individuals types admin', false),
  ('f3004008-0000-4000-8000-000000000008'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'individuals no case role', false)
on conflict (id) do nothing;

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('f3004003-0000-4000-8000-000000000003'::uuid, 'case_types'::public.app_type, 'editor'::public.role_level),
  ('f3004004-0000-4000-8000-000000000004'::uuid, 'case_records'::public.app_type, 'editor'::public.role_level),
  ('f3004005-0000-4000-8000-000000000005'::uuid, 'case_records'::public.app_type, 'viewer'::public.role_level),
  ('f3004006-0000-4000-8000-000000000006'::uuid, 'case_records'::public.app_type, 'admin'::public.role_level),
  ('f3004007-0000-4000-8000-000000000007'::uuid, 'case_types'::public.app_type, 'admin'::public.role_level),
  ('f3004008-0000-4000-8000-000000000008'::uuid, 'data_explorer'::public.app_type, 'viewer'::public.role_level)
on conflict do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('f3002001-0000-4000-8000-000000000001'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'f3000001-0000-4000-8000-000000000001'::uuid, null),
  ('f3002002-0000-4000-8000-000000000002'::uuid, 'f3001002-0000-4000-8000-000000000002'::uuid, 'f3000002-0000-4000-8000-000000000002'::uuid, null),
  ('f3002003-0000-4000-8000-000000000003'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'f3000003-0000-4000-8000-000000000003'::uuid, 'f3004003-0000-4000-8000-000000000003'::uuid),
  ('f3002004-0000-4000-8000-000000000004'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'f3000004-0000-4000-8000-000000000004'::uuid, 'f3004004-0000-4000-8000-000000000004'::uuid),
  ('f3002005-0000-4000-8000-000000000005'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'f3000005-0000-4000-8000-000000000005'::uuid, 'f3004005-0000-4000-8000-000000000005'::uuid),
  ('f3002006-0000-4000-8000-000000000006'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'f3000006-0000-4000-8000-000000000006'::uuid, 'f3004006-0000-4000-8000-000000000006'::uuid),
  ('f3002007-0000-4000-8000-000000000007'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'f3000007-0000-4000-8000-000000000007'::uuid, 'f3004007-0000-4000-8000-000000000007'::uuid),
  ('f3002008-0000-4000-8000-000000000008'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'f3000008-0000-4000-8000-000000000008'::uuid, 'f3004008-0000-4000-8000-000000000008'::uuid)
on conflict (id) do nothing;

-- Case types the tests below read and write. Every seeded concept is in this
-- one block.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values ('f300b003-0000-4000-8000-000000000003'::uuid, 'f3000001-0000-4000-8000-000000000001'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'host concept', true)
on conflict (id) do nothing;

insert into public.individuals (id, workspace_id, name, concept_id, external_id)
values
  ('f300a001-0000-4000-8000-000000000001'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'ws a individual', 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-1'),
  ('f300a002-0000-4000-8000-000000000002'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'editable individual', 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-2'),
  ('f300a003-0000-4000-8000-000000000003'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'disposable individual', 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-3'),
  ('f300a004-0000-4000-8000-000000000004'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'synced individual', 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-4')
on conflict (id) do nothing;

select plan (18);
```

- [ ] **Step 2: Drop `status` from the outsider's insert in test 3**

Before:

```sql
  insert into public.individuals (id, workspace_id, name, concept_id, external_id, status)
  values ('f300b001-0000-4000-8000-000000000001'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'smuggled individual', 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-2', 'active');
```

After:

```sql
  insert into public.individuals (id, workspace_id, name, concept_id, external_id)
  values ('f300b001-0000-4000-8000-000000000001'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'smuggled individual', 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-smuggled');
```

Tests 1 to 6 otherwise stay exactly as they are.

- [ ] **Step 3: Append the role-level tests**

Insert immediately before `select * from finish ();`:

```sql
-- 7. Reads stay open to every member: one with no case role still reads the
-- row.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000008-0000-4000-8000-000000000008","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'a member with no case role cannot read a individuals row';
    end if;
  end $chk$;
  reset role;
  $t7$,
  'a member with no case role still selects the individuals row'
);

-- 8. A case_records viewer cannot add a record.
select throws_ok (
  $t8$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000005-0000-4000-8000-000000000005","role":"authenticated"}',
    true
  );
  insert into public.individuals (id, workspace_id, name, concept_id, external_id)
  values ('f300c005-0000-4000-8000-000000000005'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'viewer individual', 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-c5');
  $t8$,
  '42501',
  null,
  'a case_records viewer cannot insert a individuals row'
);

-- 9. A case_types editor with no case_records role adds a record, as a
-- refresh does.
select lives_ok (
  $t9$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  insert into public.individuals (id, workspace_id, name, concept_id, external_id)
  values ('f300c003-0000-4000-8000-000000000003'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'refresh individual', 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-c3');
  reset role;
  $t9$,
  'a case_types editor with no case_records role inserts a individuals row'
);

-- 10. A case_records editor with no case_types role adds a record.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  insert into public.individuals (id, workspace_id, name, concept_id, external_id)
  values ('f300c004-0000-4000-8000-000000000004'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'records editor individual', 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-c4');
  reset role;
  $t10$,
  'a case_records editor with no case_types role inserts a individuals row'
);

-- 11. The USING clause filters a case_records viewer's UPDATE, so the row is
-- untouched.
select lives_ok (
  $t11$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000005-0000-4000-8000-000000000005","role":"authenticated"}',
    true
  );
  update public.individuals
  set name = 'viewer tried update'
  where id = 'f300a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a002-0000-4000-8000-000000000002'::uuid and t.name = 'editable individual'
    ) <> 1 then
      raise exception 'a case_records viewer updated a individuals row';
    end if;
  end $chk$;
  $t11$,
  'a case_records viewer cannot update a individuals row'
);

-- 12. A case_types editor with no case_records role updates a record.
select lives_ok (
  $t12$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  update public.individuals
  set name = 'renamed by refresh'
  where id = 'f300a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a002-0000-4000-8000-000000000002'::uuid and t.name = 'renamed by refresh'
    ) <> 1 then
      raise exception 'a case_types editor could not update a individuals row';
    end if;
  end $chk$;
  $t12$,
  'a case_types editor with no case_records role updates a individuals row'
);

-- 13. A case_records editor with no case_types role updates a record.
select lives_ok (
  $t13$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.individuals
  set name = 'renamed by records editor'
  where id = 'f300a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a002-0000-4000-8000-000000000002'::uuid and t.name = 'renamed by records editor'
    ) <> 1 then
      raise exception 'a case_records editor could not update a individuals row';
    end if;
  end $chk$;
  $t13$,
  'a case_records editor with no case_types role updates a individuals row'
);

-- 14. The WITH CHECK clause stops an editor moving a record into a workspace
-- where they hold no role.
select throws_ok (
  $t14$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.individuals
  set workspace_id = 'f3001002-0000-4000-8000-000000000002'::uuid
  where id = 'f300a002-0000-4000-8000-000000000002'::uuid;
  $t14$,
  '42501',
  null,
  'a case_records editor cannot move a individuals row into another workspace'
);

-- 15. A refresh's upsert, the exact shape `generateIndividuals` sends, works
-- for a case_types editor with no case_records role.
select lives_ok (
  $t15$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  insert into public.individuals (workspace_id, concept_id, external_id, name, missing_from_source_at)
  values ('f3001001-0000-4000-8000-000000000001'::uuid, 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-4', 'synced by refresh', null)
  on conflict (concept_id, external_id) do update set
    name = excluded.name,
    missing_from_source_at = excluded.missing_from_source_at;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a004-0000-4000-8000-000000000004'::uuid and t.name = 'synced by refresh'
    ) <> 1 then
      raise exception 'a case_types editor refresh upsert did not update a individuals row';
    end if;
  end $chk$;
  $t15$,
  'a case_types editor refresh upserts a individuals row'
);

-- 16. Deleting a record needs case_records admin, so a case_records editor's
-- DELETE is filtered and the row survives.
select lives_ok (
  $t16$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  delete from public.individuals where id = 'f300a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a003-0000-4000-8000-000000000003'::uuid
    ) <> 1 then
      raise exception 'a case_records editor deleted a individuals row';
    end if;
  end $chk$;
  $t16$,
  'a case_records editor cannot delete a individuals row'
);

-- 17. A case_types admin holds no case_records role, so their DELETE is
-- filtered too.
select lives_ok (
  $t17$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000007-0000-4000-8000-000000000007","role":"authenticated"}',
    true
  );
  delete from public.individuals where id = 'f300a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a003-0000-4000-8000-000000000003'::uuid
    ) <> 1 then
      raise exception 'a case_types admin deleted a individuals row';
    end if;
  end $chk$;
  $t17$,
  'a case_types admin cannot delete a individuals row'
);

-- 18. A case_records admin deletes a record.
select lives_ok (
  $t18$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000006-0000-4000-8000-000000000006","role":"authenticated"}',
    true
  );
  delete from public.individuals where id = 'f300a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a003-0000-4000-8000-000000000003'::uuid
    ) <> 0 then
      raise exception 'a case_records admin could not delete a individuals row';
    end if;
  end $chk$;
  $t18$,
  'a case_records admin deletes a individuals row'
);
```

- [ ] **Step 4: Run it and watch it fail**

Switch check, then:

```bash
supabase test db supabase/tests/database/00_setup_pgtap.test.sql supabase/tests/database/permissions/rls_individuals.test.sql
```

Expected: FAIL with `not ok 8` (any member may insert), `not ok 11` (any member may update), `not ok 16` (any member may delete), and `not ok 17` (the row test 16 deleted is gone).

- [ ] **Step 5: Rewrite the write policies**

In `supabase/schemas/20.individuals.sql`, replace everything from `-- Policies` through the end of the DELETE policy (the line before `create trigger tr_individuals__set_updated_at`) with:

```sql
-- Policies
create policy "User can SELECT individuals in their workspace" on public.individuals for
select
  to authenticated using (
    public.individuals.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

-- A refresh writes records as a `case_types` editor, and the people working
-- the records write them as a `case_records` editor, so either role may insert
-- and update a record. Deleting one requires `case_records` admin.
create policy "User can INSERT individuals in their workspace" on public.individuals for insert to authenticated
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.individuals.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    ) or
    public.util__auth_user_meets_min_app_role (
      public.individuals.workspace_id,
      'case_records'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "User can UPDATE individuals in their workspace" on public.individuals
for update
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.individuals.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    ) or
    public.util__auth_user_meets_min_app_role (
      public.individuals.workspace_id,
      'case_records'::public.app_type,
      'editor'::public.role_level
    )
  )
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.individuals.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    ) or
    public.util__auth_user_meets_min_app_role (
      public.individuals.workspace_id,
      'case_records'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "User can DELETE individuals in their workspace" on public.individuals for delete to authenticated using (
  public.util__auth_user_meets_min_app_role (
    public.individuals.workspace_id,
    'case_records'::public.app_type,
    'admin'::public.role_level
  )
);
```

- [ ] **Step 6: Generate and review the migration**

Switch check, then:

```bash
pnpm db:reset
pnpm db:new-migration case_app_rls_on_individuals
```

Expected migration contents: three `drop policy` and three `create policy` statements for the INSERT, UPDATE, and DELETE policies on `"public"."individuals"`, and nothing else.

- [ ] **Step 7: Run it and watch it pass**

Switch check, then:

```bash
supabase test db supabase/tests/database/00_setup_pgtap.test.sql supabase/tests/database/permissions/rls_individuals.test.sql
pnpm test:db
```

Expected: `All tests successful.`, then `pnpm test:db` passes overall, including `individuals__sync_upsert_contract.test.sql` (it runs as the superuser and is untouched by RLS).

- [ ] **Step 8: Confirm every touched UPDATE policy has both clauses**

Switch check, then run against the **local** database (`psql "$(supabase status -o json | jq -er '.DB_URL')"`):

```sql
select tablename, qual is not null as has_using, with_check is not null as has_with_check
from pg_policies
where
  schemaname = 'public' and
  cmd = 'UPDATE' and
  tablename in (
    'concepts',
    'concept_attributes',
    'attribute_mappings__dataset_column',
    'attribute_mappings__manual_entry',
    'individuals'
  )
order by tablename;
```

Expected: five rows, every one `t | t`.

- [ ] **Step 9: Generate the desktop migration**

```bash
pnpm desktop:sqlite:gen-migrations
git status --short apps/desktop/migrations
```

Expected: one new untracked `*_case_app_rls_on_individuals.gen.sql`. Restore any modified tracked file with `git checkout -- <that file>`.

- [ ] **Step 10: Commit**

```bash
git add supabase/schemas/20.individuals.sql \
  supabase/migrations/*_case_app_rls_on_individuals.sql \
  apps/desktop/migrations/*_case_app_rls_on_individuals.gen.sql \
  supabase/tests/database/permissions/rls_individuals.test.sql
git commit -m "feat(case-statuses): require a case app editor to write records"
```

---

### Task 8: TypeScript `AppType`, permission keys, matrices, and labels

One union member pair added; the compiler names every remaining site (`docs/rules/typescript.md`, "Widening a string literal union").

**Files:**
- Modify: `shared/models/Permissions/PermissionsModule/__tests__/PermissionsModule.appAccess.test.ts:9-35` and append a `describe`
- Modify: `supabase/functions/workspaces/makeRoleGroupIdFromAcceptedInvite/makeRoleGroupIdFromAcceptedInvite.test.ts`
- Modify: `shared/models/Permissions/Permissions.types.ts:1-82`
- Modify: `shared/models/Permissions/PermissionsModule/PermissionRegistry.ts:74-88` (after the `gis` block)
- Modify: `shared/models/Permissions/PermissionsModule/RolesMatrixModule/preset-role-matrices.ts` (whole file)
- Modify: `shared/copy/appLabel.ts` (whole file)
- Modify: `src/hooks/permissions/useHasPermission/useHasPermission.test.tsx`
- Modify: `src/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin.test.tsx`
- Modify: `src/views/WorkspaceSettingsPage/WorkspaceRolesTab/WorkspaceRolesTab.tsx:59-65`
- Modify: `tests/e2e/helpers/assignE2ESecondaryMemberRole.ts:198-238`
- Modify: `tests/e2e/workspace-app-permissions-matrix.spec.ts:28-37`
- Modify: `supabase/schemas/30.usage_analytics_events.sql:25-27` (comment only, no migration)
- Modify: `src/i18n/locales/*/messages.po`, `src/i18n/locales/*/messages.ts` (generated)

- [ ] **Step 1: Write the failing permission tests**

In `PermissionsModule.appAccess.test.ts`, replace `PERMISSIONS_THAT_DEFINE_ROUTE_ACCESS` and `rolesMatrixWithAppRole` with:

```ts
const PERMISSIONS_THAT_DEFINE_ROUTE_ACCESS = {
  data_sources: "data_sources__can_list_sources",
  data_explorer: "data_explorer__can_run_query",
  dashboards: "dashboards__can_view_dashboard",
  gis: "gis__can_view_map",
  case_types: "case_types__can_view_case_type",
  case_records: "case_records__can_view_record",
  settings: "settings__can_manage_workspace_users",
} as const satisfies Record<AppType, PermissionKey>;
```

```ts
function rolesMatrixWithAppRole(
  app: AppType,
  role: "viewer" | "editor" | "admin" | undefined,
): UserAppRolesMatrix {
  return {
    data_sources: app === "data_sources" ? role : undefined,
    data_explorer: app === "data_explorer" ? role : undefined,
    dashboards: app === "dashboards" ? role : undefined,
    gis: app === "gis" ? role : undefined,
    case_types: app === "case_types" ? role : undefined,
    case_records: app === "case_records" ? role : undefined,
    settings: app === "settings" ? role : undefined,
  };
}
```

Then add, after the `gis app permissions` describe:

```ts
describe("case app permissions", () => {
  it("grants case type creation and editing at case_types editor", () => {
    const editorRoles = rolesMatrixWithAppRole("case_types", "editor");

    expect(
      Permissions.rolesMatrixHasPermission({
        roles: editorRoles,
        permissionKey: "case_types__can_create_case_type",
      }),
    ).toBe(true);
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: editorRoles,
        permissionKey: "case_types__can_edit_case_type",
      }),
    ).toBe(true);
  });

  it("withholds case type deletion until case_types admin", () => {
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: rolesMatrixWithAppRole("case_types", "editor"),
        permissionKey: "case_types__can_delete_case_type",
      }),
    ).toBe(false);
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: rolesMatrixWithAppRole("case_types", "admin"),
        permissionKey: "case_types__can_delete_case_type",
      }),
    ).toBe(true);
  });

  it("grants record syncing to an editor of either case app", () => {
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: rolesMatrixWithAppRole("case_types", "editor"),
        permissionKey: "case_types__can_sync_records",
      }),
    ).toBe(true);
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: rolesMatrixWithAppRole("case_records", "editor"),
        permissionKey: "case_records__can_sync_records",
      }),
    ).toBe(true);
  });

  it("withholds record syncing from a case_records viewer", () => {
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: rolesMatrixWithAppRole("case_records", "viewer"),
        permissionKey: "case_records__can_sync_records",
      }),
    ).toBe(false);
  });

  it("withholds record deletion until case_records admin", () => {
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: rolesMatrixWithAppRole("case_records", "editor"),
        permissionKey: "case_records__can_delete_record",
      }),
    ).toBe(false);
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: rolesMatrixWithAppRole("case_records", "admin"),
        permissionKey: "case_records__can_delete_record",
      }),
    ).toBe(true);
  });

  it("keeps Records closed to a case_types admin with no case_records role", () => {
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: rolesMatrixWithAppRole("case_types", "admin"),
        permissionKey: "case_records__can_view_record",
      }),
    ).toBe(false);
  });
});
```

The `workspace app route catalog permissions` describe iterates `Permissions.RestrictableApps`, so once Step 6 adds both apps it also generates the unset, viewer, editor, and admin route-key cases for them from `PERMISSIONS_THAT_DEFINE_ROUTE_ACCESS`.

In `makeRoleGroupIdFromAcceptedInvite.test.ts`, add inside the existing `describe`:

```ts
  it("accepts role overrides for both case apps", () => {
    expect(
      WorkspaceInviteRoleOverrideSchema.safeParse({
        app: "case_types",
        role: "editor",
      }).success,
    ).toBe(true);
    expect(
      WorkspaceInviteRoleOverrideSchema.safeParse({
        app: "case_records",
        role: "admin",
      }).success,
    ).toBe(true);
  });
```

That schema reads `Permissions.RestrictableApps`, so accepting an invite carries case-app overrides once Step 6 lands.

- [ ] **Step 2: Run them and watch them fail**

```bash
pnpm test:frontend PermissionsModule makeRoleGroupIdFromAcceptedInvite
```

Expected: FAIL. `grants case type creation and editing at case_types editor` reports `expected false to be true` (no app owns the `case_types__` prefix yet), and `accepts role overrides for both case apps` fails the same way.

- [ ] **Step 3: Add both apps to `AppType` and its docstrings**

Replace lines 1 to 82 of `shared/models/Permissions/Permissions.types.ts` (from the `AppType` docstring through the `UserAppRolesList` declaration) with:

```ts
/**
 * Workspace application surface (matches `public.app_type`).
 */
export type AppType =
  | "data_sources"
  | "data_explorer"
  | "dashboards"
  | "gis"
  | "case_types"
  | "case_records"
  | "settings";

/**
 * Role ordering matches Postgres enum `public.role_level`.
 */
export type RoleLevel = "viewer" | "editor" | "admin";

/**
 * Derived UI gate key (`${app}__${capability}`). SQL still enforces
 * `role_level` only.
 */
export type PermissionKey = `${AppType}__${string}`;

/**
 * Per-app role for the current user in one workspace, derived from
 * `workspace_memberships.role_group_id` and `role_group_app_roles`.
 *
 * Each `app_type` can differ; `undefined` means no row for that app in the
 * member’s role group matrix.
 *
 * @example Global Admin (seven `role_group_app_roles` rows, all `admin`):
 * ```ts
 * {
 *   data_sources: "admin",
 *   data_explorer: "admin",
 *   dashboards: "admin",
 *   gis: "admin",
 *   case_types: "admin",
 *   case_records: "admin",
 *   settings: "admin",
 * }
 * ```
 *
 * @example Global Viewer (six rows, no `settings` app;
 * `useIsGlobalAdmin()` is false):
 * ```ts
 * {
 *   data_sources: "viewer",
 *   data_explorer: "viewer",
 *   dashboards: "viewer",
 *   gis: "viewer",
 *   case_types: "viewer",
 *   case_records: "viewer",
 *   settings: undefined,
 * }
 * ```
 *
 * @example Custom role group matrix (non-built-in `role_groups` row):
 * ```ts
 * {
 *   data_sources: "editor",
 *   data_explorer: "viewer",
 *   dashboards: "viewer",
 *   gis: "viewer",
 *   case_types: "viewer",
 *   case_records: "editor",
 *   settings: undefined,
 * }
 * ```
 */
export type UserAppRolesMatrix = Record<AppType, RoleLevel | undefined>;

/**
 * List of app roles for a user.
 *
 * Unlike in the `UserAppRolesMatrix`, no role can be left undefined.
 * Only defined roles are included in the list.
 *
 * @example
 * ```ts
 * [
 *   { app: "data_sources", role: "editor" },
 *   { app: "data_explorer", role: "viewer" },
 *   { app: "dashboards", role: "viewer" },
 *   { app: "gis", role: "viewer" },
 *   { app: "case_types", role: "viewer" },
 *   { app: "case_records", role: "editor" },
 *   { app: "settings", role: "admin" },
 * ]
 * ```
 */
export type UserAppRolesList = Array<{ app: AppType; role: RoleLevel }>;
```

- [ ] **Step 4: Let the compiler enumerate the rest**

```bash
pnpm type-check
```

Expected: FAIL. This is the list it reports, each to be fixed in the steps below. Do not silence any with a cast.

| File | Why it errors | Fixed in |
| --- | --- | --- |
| `shared/models/Permissions/PermissionsModule/PermissionRegistry.ts` | `satisfies PermissionRegistryType` needs a key per app | Step 5 |
| `.../RolesMatrixModule/preset-role-matrices.ts` | `registry<AppType>().keys` is exhaustive, and four `satisfies UserAppRolesMatrix` records | Step 6 |
| `shared/copy/appLabel.ts` | `matchLiteral` is exhaustive | Step 7 |
| `src/hooks/permissions/useHasPermission/useHasPermission.test.tsx` | three mocked matrices | Step 8 |
| `src/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin.test.tsx` | two mocked matrices | Step 8 |
| `src/views/WorkspaceSettingsPage/WorkspaceRolesTab/WorkspaceRolesTab.tsx` | `INITIAL_EDITOR_STATE.matrixDraft` | Step 9 |
| `tests/e2e/helpers/assignE2ESecondaryMemberRole.ts` | three single-app matrix builders | Step 10 |
| `tests/e2e/workspace-app-permissions-matrix.spec.ts` | `Record<AppType, ...>` in `_appRouteForType` | Step 10 |

If it names a file not in this table, give that site both apps the same way.

- [ ] **Step 5: Add the permission keys**

In `shared/models/Permissions/PermissionsModule/PermissionRegistry.ts`, insert between the closing `},` of `gis` and `settings: {`:

```ts
  case_types: {
    viewer: ["case_types__can_view_case_type"] as const,
    editor: [
      "case_types__can_view_case_type",
      "case_types__can_create_case_type",
      "case_types__can_edit_case_type",
      // Server-side counterpart: the `individuals` INSERT and UPDATE policies
      // accept a `case_types` editor, so a refresh can write records.
      "case_types__can_sync_records",
    ] as const,
    admin: [
      "case_types__can_view_case_type",
      "case_types__can_create_case_type",
      "case_types__can_edit_case_type",
      "case_types__can_sync_records",
      "case_types__can_delete_case_type",
    ] as const,
  },
  case_records: {
    viewer: ["case_records__can_view_record"] as const,
    editor: [
      "case_records__can_view_record",
      "case_records__can_edit_record",
      "case_records__can_sync_records",
    ] as const,
    admin: [
      "case_records__can_view_record",
      "case_records__can_edit_record",
      "case_records__can_sync_records",
      "case_records__can_delete_record",
    ] as const,
  },
```

- [ ] **Step 6: Add both apps to the preset matrices**

`shared/models/Permissions/PermissionsModule/RolesMatrixModule/preset-role-matrices.ts` becomes:

```ts
import { registry } from "@avandar/utils";
import type {
  AppType,
  UserAppRolesMatrix,
} from "$/models/Permissions/Permissions.types.ts";

/** Apps shown in the workspace permissions matrix (order = UI rows). */
export const RESTRICTABLE_APPS = registry<AppType>().keys(
  "data_sources",
  "data_explorer",
  "dashboards",
  "gis",
  "case_types",
  "case_records",
  "settings",
);

export const EMPTY_USER_APP_ROLES_MATRIX = {
  data_sources: undefined,
  data_explorer: undefined,
  dashboards: undefined,
  gis: undefined,
  case_types: undefined,
  case_records: undefined,
  settings: undefined,
} as const satisfies UserAppRolesMatrix;

/** Built-in role group names seeded per workspace. */
export const BUILTIN_ROLE_GROUP_NAMES = {
  globalAdmin: "Global Admin",
  globalEditor: "Global Editor",
  globalViewer: "Global Viewer",
} as const;

/** Matrix matching a built-in Global Admin role group (seven admin rows). */
export const BUILTIN_GLOBAL_ADMIN_MATRIX = {
  data_sources: "admin",
  data_explorer: "admin",
  dashboards: "admin",
  gis: "admin",
  case_types: "admin",
  case_records: "admin",
  settings: "admin",
} as const satisfies UserAppRolesMatrix;

/** Matrix matching a built-in Global Editor role group. */
export const BUILTIN_GLOBAL_EDITOR_MATRIX = {
  data_sources: "editor",
  data_explorer: "editor",
  dashboards: "editor",
  gis: "editor",
  case_types: "editor",
  case_records: "editor",
  settings: undefined,
} as const satisfies UserAppRolesMatrix;

/** Matrix matching a built-in Global Viewer role group. */
export const BUILTIN_GLOBAL_VIEWER_MATRIX = {
  data_sources: "viewer",
  data_explorer: "viewer",
  dashboards: "viewer",
  gis: "viewer",
  case_types: "viewer",
  case_records: "viewer",
  settings: undefined,
} as const satisfies UserAppRolesMatrix;
```

These must agree with the SQL in Task 2, or the Settings UI will disagree with the database and invites will compute the wrong overrides.

- [ ] **Step 7: Add the user-facing labels**

`shared/copy/appLabel.ts` becomes:

```ts
import { matchLiteral } from "@avandar/utils";
import { t } from "@lingui/core/macro";
import type { AppType } from "$/models/Permissions/Permissions.types.ts";

/**
 * Returns the human-readable label for a workspace app ("Data Sources",
 * "Dashboards", …). Shared copy used anywhere an `AppType` is surfaced to
 * the user (share modal general-access copy, role matrix, tooltips).
 */
export function appLabel(app: AppType): string {
  return matchLiteral(app, {
    data_sources: () => {
      return t`Data Sources`;
    },
    dashboards: () => {
      return t`Dashboards`;
    },
    data_explorer: () => {
      return t`Data Explorer`;
    },
    gis: () => {
      return t`Maps`;
    },
    case_types: () => {
      return t`Case Types`;
    },
    case_records: () => {
      return t`Case Records`;
    },
    settings: () => {
      return t`Settings`;
    },
  });
}
```

The labels name what the user is doing, not the `concepts` and `individuals` tables (`CLAUDE.md`, Copy and nomenclature).

- [ ] **Step 8: Complete the mocked matrices in the hook tests**

In `src/hooks/permissions/useHasPermission/useHasPermission.test.tsx`, the first two matrices each become:

```ts
      {
        data_sources: undefined,
        data_explorer: undefined,
        dashboards: "viewer",
        gis: undefined,
        case_types: undefined,
        case_records: undefined,
        settings: undefined,
      },
```

and the third becomes:

```ts
      {
        data_sources: "admin",
        data_explorer: "admin",
        dashboards: "admin",
        gis: "admin",
        case_types: "admin",
        case_records: "admin",
        settings: undefined,
      },
```

In `src/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin.test.tsx`, the first matrix becomes:

```ts
      {
        data_sources: "viewer",
        data_explorer: "viewer",
        dashboards: "viewer",
        gis: "viewer",
        case_types: "viewer",
        case_records: "viewer",
        settings: "admin",
      },
```

and the second becomes:

```ts
      {
        data_sources: "admin",
        data_explorer: "admin",
        dashboards: "admin",
        gis: "admin",
        case_types: "admin",
        case_records: "admin",
        settings: undefined,
      },
```

- [ ] **Step 9: Complete the Roles tab's empty draft**

In `src/views/WorkspaceSettingsPage/WorkspaceRolesTab/WorkspaceRolesTab.tsx`, `INITIAL_EDITOR_STATE.matrixDraft` becomes:

```ts
  matrixDraft: {
    data_sources: undefined,
    data_explorer: undefined,
    dashboards: undefined,
    gis: undefined,
    case_types: undefined,
    case_records: undefined,
    settings: undefined,
  },
```

- [ ] **Step 10: Complete the E2E matrix builders and route record**

In `tests/e2e/helpers/assignE2ESecondaryMemberRole.ts`, the three builders become:

```ts
export function createSingleAppViewerRolesMatrix(
  app: AppType,
): UserAppRolesMatrix {
  return {
    data_sources: app === "data_sources" ? "viewer" : undefined,
    data_explorer: app === "data_explorer" ? "viewer" : undefined,
    dashboards: app === "dashboards" ? "viewer" : undefined,
    gis: app === "gis" ? "viewer" : undefined,
    case_types: app === "case_types" ? "viewer" : undefined,
    case_records: app === "case_records" ? "viewer" : undefined,
    settings: app === "settings" ? "viewer" : undefined,
  };
}
```

```ts
export function createSingleAppEditorRolesMatrix(
  app: AppType,
): UserAppRolesMatrix {
  const role: RoleLevel = "editor";
  return {
    data_sources: app === "data_sources" ? role : undefined,
    data_explorer: app === "data_explorer" ? role : undefined,
    dashboards: app === "dashboards" ? role : undefined,
    gis: app === "gis" ? role : undefined,
    case_types: app === "case_types" ? role : undefined,
    case_records: app === "case_records" ? role : undefined,
    settings: undefined,
  };
}
```

```ts
export function createSingleAppAdminRolesMatrix(
  app: AppType,
): UserAppRolesMatrix {
  return {
    data_sources: app === "data_sources" ? "admin" : undefined,
    data_explorer: app === "data_explorer" ? "admin" : undefined,
    dashboards: app === "dashboards" ? "admin" : undefined,
    gis: app === "gis" ? "admin" : undefined,
    case_types: app === "case_types" ? "admin" : undefined,
    case_records: app === "case_records" ? "admin" : undefined,
    settings: app === "settings" ? "admin" : undefined,
  };
}
```

Keep each builder's existing docstring above it.

In `tests/e2e/workspace-app-permissions-matrix.spec.ts`, `_appRouteForType`'s record becomes (Task 14 maps `case_types` to a real route):

```ts
  const routes: Record<AppType, WorkspaceAppRouteCase | undefined> = {
    data_sources: WORKSPACE_APP_ROUTES.dataSources,
    data_explorer: WORKSPACE_APP_ROUTES.dataExplorer,
    dashboards: WORKSPACE_APP_ROUTES.dashboards,
    gis: undefined,
    case_types: undefined,
    case_records: undefined,
    settings: undefined,
  };
```

- [ ] **Step 11: Update the analytics comment**

In `supabase/schemas/30.usage_analytics_events.sql`, the `app` column comment becomes:

```sql
  -- Optional app surface where the event originated (data_sources,
  -- data_explorer, dashboards, gis, case_types, case_records, settings). Null
  -- for events that aren't bound to a specific app surface.
```

A comment inside `create table` never reaches the database, so this needs no migration.

- [ ] **Step 12: Extract and compile the catalogs**

```bash
pnpm i18n:extract && pnpm i18n:compile
```

Expected: `src/i18n/locales/en/messages.po` gains `msgid "Case Types"` and `msgid "Case Records"`, each with a `#: shared/copy/appLabel.ts` reference.

- [ ] **Step 13: Run the tests and the type check**

```bash
pnpm test:frontend PermissionsModule RolesMatrixModule makeRoleGroupIdFromAcceptedInvite useHasPermission useIsGlobalAdmin
pnpm type-check
pnpm lint
```

Expected: all PASS, with the `case app permissions` tests and the generated `case_types` and `case_records` route-key cases among them.

- [ ] **Step 14: Check the Settings role matrix**

Start `pnpm dev`. With the Playwright MCP (headless), sign in with `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` from `seed/SeedData.ts`, open `/<TEST_WORKSPACE_SLUG>/settings`, go to the Roles tab, and open a role group editor. Save a screenshot to `.temp/feat-statuses/settings-role-matrix-case-apps.png`.

Expected: rows labelled "Case Types" and "Case Records" between "Maps" and "Settings", each with viewer, editor, and admin options, because `WorkspaceAppRoleMatrixForm` renders `RESTRICTABLE_APPS` through `appLabel`. Stop `pnpm dev` afterwards.

- [ ] **Step 15: Commit**

```bash
git add shared/models/Permissions shared/copy/appLabel.ts \
  src/hooks/permissions/useHasPermission/useHasPermission.test.tsx \
  src/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin.test.tsx \
  src/views/WorkspaceSettingsPage/WorkspaceRolesTab/WorkspaceRolesTab.tsx \
  tests/e2e/helpers/assignE2ESecondaryMemberRole.ts \
  tests/e2e/workspace-app-permissions-matrix.spec.ts \
  supabase/functions/workspaces/makeRoleGroupIdFromAcceptedInvite/makeRoleGroupIdFromAcceptedInvite.test.ts \
  supabase/schemas/30.usage_analytics_events.sql \
  src/i18n/locales
git commit -m "feat(case-statuses): add the case apps to roles, keys, and labels"
```

---

### Task 9: Guard the Case Manager, create form, and Records routes

**Files:**
- Create: `src/routes/_auth/$workspaceSlug/-caseAppRouteGuards.test.tsx`
- Modify: `src/routes/_auth/$workspaceSlug/ontology-designer/route.tsx` (whole file)
- Modify: `src/routes/_auth/$workspaceSlug/ontology-designer/concept-creator.tsx:1-12`
- Modify: `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/route.tsx:1-30`

The test exercises three route modules, so it sits at their lowest common directory (`docs/rules/testing.md`, integration tests). The `-` prefix keeps TanStack Router from treating it as a route.

- [ ] **Step 1: Write the failing test**

Create `src/routes/_auth/$workspaceSlug/-caseAppRouteGuards.test.tsx`:

```tsx
/**
 * Route guards on the Case Manager, the create-case-type form, and Records:
 * which app role opens each one, and which app the access-denied page names
 * when the role is missing.
 */
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permissions } from "$/models/Permissions/Permissions";
import type { UserAppRolesMatrix } from "$/models/Permissions/Permissions";

vi.mock("$/env/getSupabaseApiUrl.ts", () => {
  return {
    getSupabaseApiUrl: () => {
      return "http://test.local";
    },
  };
});

vi.mock("$/env/getSupabaseApiKey.ts", () => {
  return {
    getSupabaseApiKey: () => {
      return "test-anon-key";
    },
  };
});

const {
  getWorkspacesOfCurrentUserMock,
  getCurrentSessionMock,
  getUserAppRolesMock,
} = vi.hoisted(() => {
  return {
    getWorkspacesOfCurrentUserMock: vi.fn(),
    getCurrentSessionMock: vi.fn(),
    getUserAppRolesMock: vi.fn(),
  };
});

vi.mock("@/clients/WorkspaceClient", () => {
  return {
    WorkspaceClient: {
      withCache: () => {
        return {
          withFetchQuery: () => {
            return {
              getWorkspacesOfCurrentUser: getWorkspacesOfCurrentUserMock,
            };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/AuthClient/AuthClient", () => {
  return { AuthClient: { getCurrentSession: getCurrentSessionMock } };
});

vi.mock("@/clients/UserClient", () => {
  return {
    UserClient: {
      withCache: () => {
        return {
          withFetchQuery: () => {
            return { getUserAppRoles: getUserAppRolesMock };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/ontology/ConceptClient", () => {
  return { ConceptClient: { getById: vi.fn() } };
});

vi.mock("@/views/OntologyDesignerApp", () => {
  return { OntologyDesignerApp: vi.fn() };
});

vi.mock("@/views/OntologyDesignerApp/ConceptCreatorView", () => {
  return { ConceptCreatorView: vi.fn() };
});

vi.mock(
  "@/views/OntologyDesignerApp/ConceptCreatorView/ConceptCreatorStore",
  () => {
    return { ConceptCreatorStore: { Provider: vi.fn() } };
  },
);

vi.mock("@/views/IndividualManagerApp", () => {
  return { IndividualManagerApp: vi.fn() };
});

const { Route: caseManagerRoute } = await import("./ontology-designer/route");
const { Route: caseTypeCreatorRoute } = await import(
  "./ontology-designer/concept-creator"
);
const { Route: caseRecordsRoute } = await import(
  "./individual-manager/$conceptId/route"
);

type GuardedRoute = { options: { beforeLoad?: unknown } };
type BeforeLoad = (args: {
  context: { queryClient: QueryClient };
  params: { workspaceSlug: string; conceptId: string };
}) => Promise<void>;

const WORKSPACE = { id: "22222222-2222-4222-8222-222222222222", slug: "acme" };

function _getBeforeLoad(route: GuardedRoute): BeforeLoad {
  if (route.options.beforeLoad === undefined) {
    throw new Error("The route must define beforeLoad.");
  }
  return route.options.beforeLoad as BeforeLoad;
}

function _runGuard(options: {
  route: GuardedRoute;
  roles: Partial<UserAppRolesMatrix>;
}): Promise<void> {
  getUserAppRolesMock.mockResolvedValue({
    ...Permissions.RolesMatrix.Builtins.EmptyMatrix,
    ...options.roles,
  });
  return _getBeforeLoad(options.route)({
    context: { queryClient: new QueryClient() },
    params: {
      workspaceSlug: WORKSPACE.slug,
      conceptId: "33333333-3333-4333-8333-333333333333",
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getWorkspacesOfCurrentUserMock.mockResolvedValue([WORKSPACE]);
  getCurrentSessionMock.mockResolvedValue({ user: { id: "user-1" } });
});

describe("Case Manager route guard", () => {
  it("sends a member with no case_types role to the Case Types access-denied page", async () => {
    await expect(
      _runGuard({ route: caseManagerRoute, roles: { case_records: "admin" } }),
    ).rejects.toMatchObject({
      options: {
        to: "/$workspaceSlug/access-denied",
        search: { app: "Case Types" },
      },
    });
  });

  it("opens the Case Manager for a case_types viewer", async () => {
    await expect(
      _runGuard({ route: caseManagerRoute, roles: { case_types: "viewer" } }),
    ).resolves.toBeUndefined();
  });
});

describe("create case type route guard", () => {
  it("sends a case_types viewer to the Case Types access-denied page", async () => {
    await expect(
      _runGuard({
        route: caseTypeCreatorRoute,
        roles: { case_types: "viewer" },
      }),
    ).rejects.toMatchObject({
      options: {
        to: "/$workspaceSlug/access-denied",
        search: { app: "Case Types" },
      },
    });
  });

  it("opens the create form for a case_types editor", async () => {
    await expect(
      _runGuard({
        route: caseTypeCreatorRoute,
        roles: { case_types: "editor" },
      }),
    ).resolves.toBeUndefined();
  });
});

describe("Records route guard", () => {
  it("sends a member with no case_records role to the Case Records access-denied page", async () => {
    await expect(
      _runGuard({ route: caseRecordsRoute, roles: { case_types: "admin" } }),
    ).rejects.toMatchObject({
      options: {
        to: "/$workspaceSlug/access-denied",
        search: { app: "Case Records" },
      },
    });
  });

  it("opens Records for a case_records viewer", async () => {
    await expect(
      _runGuard({
        route: caseRecordsRoute,
        roles: { case_records: "viewer" },
      }),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm test:frontend caseAppRouteGuards
```

Expected: FAIL. Every test throws `The route must define beforeLoad.`, since none of the three routes has a guard yet.

- [ ] **Step 3: Guard the Case Manager**

`src/routes/_auth/$workspaceSlug/ontology-designer/route.tsx` becomes:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { appLabel } from "$/copy/appLabel";
import { RouteMiddleware } from "@/utils/RouteMiddleware";
import { OntologyDesignerApp } from "@/views/OntologyDesignerApp";

export const Route = createFileRoute("/_auth/$workspaceSlug/ontology-designer")(
  {
    beforeLoad: RouteMiddleware.BeforeLoad.checkUserPermissions({
      permissionKey: "case_types__can_view_case_type",
      appLabel: () => {
        return appLabel("case_types");
      },
    }),
    component: OntologyDesignerApp,
  },
);
```

- [ ] **Step 4: Guard the create form**

In `src/routes/_auth/$workspaceSlug/ontology-designer/concept-creator.tsx`, replace the imports and the `Route` declaration with:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { appLabel } from "$/copy/appLabel";
import { RouteMiddleware } from "@/utils/RouteMiddleware";
import { ConceptCreatorView } from "@/views/OntologyDesignerApp/ConceptCreatorView";
import { ConceptCreatorStore } from "@/views/OntologyDesignerApp/ConceptCreatorView/ConceptCreatorStore";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/ontology-designer/concept-creator",
)({
  beforeLoad: RouteMiddleware.BeforeLoad.checkUserPermissions({
    permissionKey: "case_types__can_create_case_type",
    appLabel: () => {
      return appLabel("case_types");
    },
  }),
  component: ConceptCreatorRouteComponent,
});
```

`ConceptCreatorRouteComponent` stays as it is. The parent route's view guard runs first, then this one.

- [ ] **Step 5: Guard Records**

In `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/route.tsx`, add these two imports in sorted position:

```tsx
import { appLabel } from "$/copy/appLabel";
```

```tsx
import { RouteMiddleware } from "@/utils/RouteMiddleware";
```

and add `beforeLoad` as the first option of `createFileRoute(...)({`:

```tsx
  beforeLoad: RouteMiddleware.BeforeLoad.checkUserPermissions({
    permissionKey: "case_records__can_view_record",
    appLabel: () => {
      return appLabel("case_records");
    },
  }),
```

Leave `component`, `loader`, `errorComponent`, and both components unchanged. This layout wraps the records list and every record page, so one guard covers all of Records.

- [ ] **Step 6: Run it and watch it pass**

```bash
pnpm test:frontend caseAppRouteGuards RouteMiddleware
pnpm type-check
```

Expected: PASS, six tests in `-caseAppRouteGuards.test.tsx`, and `src/routeTree.gen.ts` unchanged (`git status` does not list it).

- [ ] **Step 7: Commit**

```bash
git add "src/routes/_auth/\$workspaceSlug/-caseAppRouteGuards.test.tsx" \
  "src/routes/_auth/\$workspaceSlug/ontology-designer/route.tsx" \
  "src/routes/_auth/\$workspaceSlug/ontology-designer/concept-creator.tsx" \
  "src/routes/_auth/\$workspaceSlug/individual-manager/\$conceptId/route.tsx"
git commit -m "feat(case-statuses): guard the Case Manager and Records routes on case app roles"
```

---

### Task 10: Gate navigation and Spotlight

**Files:**
- Create: `src/test-utils/makeHasPermissionFromAppRoles.ts`
- Modify: `src/test-utils/index.ts` (one re-export)
- Modify: `src/components/layouts/RootLayout/WorkspaceLayout/WorkspaceLayout.test.ts` (whole file)
- Modify: `src/components/layouts/RootLayout/makeMainNavbarLinksFromPermissions.ts` (whole file)
- Modify: `src/components/layouts/RootLayout/WorkspaceLayout/WorkspaceLayout.tsx:32-75`
- Modify: `src/components/layouts/RootLayout/useSpotlightActions/useSpotlightActions.test.tsx`
- Modify: `src/components/layouts/RootLayout/useSpotlightActions/useSpotlightActions.tsx:1-55`

- [ ] **Step 1: Read the layout rules**

Read `docs/design/app-view-layout.md` and the Named Rules in `DESIGN.md`, as `CLAUDE.md` requires before editing `src/components/layouts/`. This task changes which links render, not how any of them look.

- [ ] **Step 2: Add the permission test helper**

Create `src/test-utils/makeHasPermissionFromAppRoles.ts`:

```ts
import { Permissions } from "$/models/Permissions/Permissions";
import type {
  PermissionKey,
  UserAppRolesMatrix,
} from "$/models/Permissions/Permissions";

/**
 * Builds a stand-in for `useHasPermission` that answers from an app-role
 * matrix, so a test grants roles rather than listing permission keys. Apps
 * missing from `roles` have no role.
 */
export function makeHasPermissionFromAppRoles(
  roles: Partial<UserAppRolesMatrix>,
): (permissionKey: PermissionKey) => boolean {
  const rolesMatrix = {
    ...Permissions.RolesMatrix.Builtins.EmptyMatrix,
    ...roles,
  };
  return (permissionKey) => {
    return Permissions.rolesMatrixHasPermission({
      roles: rolesMatrix,
      permissionKey,
    });
  };
}
```

In `src/test-utils/index.ts`, add after the `render` re-export:

```ts
export { makeHasPermissionFromAppRoles } from "./makeHasPermissionFromAppRoles";
```

- [ ] **Step 3: Write the failing navbar tests**

`src/components/layouts/RootLayout/WorkspaceLayout/WorkspaceLayout.test.ts` becomes:

```ts
import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { makeMainNavbarLinksFromPermissions } from "@/components/layouts/RootLayout/makeMainNavbarLinksFromPermissions";
import { NavbarLinks } from "@/config/NavbarLinks/NavbarLinks";

const NO_APP_ACCESS: Parameters<typeof makeMainNavbarLinksFromPermissions>[0] =
  {
    workspaceSlug: "workspace-slug",
    canAccessDataSources: false,
    canAccessDataExplorer: false,
    canAccessDashboards: false,
    canAccessMaps: false,
    canAccessCaseTypes: false,
    canAccessCaseRecords: false,
    individualManagerLinks: [],
  };

const COUNTY_RECORDS_LINK = NavbarLinks.individualManagerHome({
  workspaceSlug: "workspace-slug",
  conceptId: "c1",
  conceptName: "County",
});

describe("workspace navigation permissions", () => {
  it("includes Maps when the user can view maps", () => {
    const links = makeMainNavbarLinksFromPermissions({
      ...NO_APP_ACCESS,
      canAccessMaps: true,
    });

    expect(links.map(prop("link.to"))).toContain("/$workspaceSlug/map");
  });

  it("omits Maps when the user cannot view maps", () => {
    const links = makeMainNavbarLinksFromPermissions(NO_APP_ACCESS);

    expect(links.map(prop("link.to"))).not.toContain("/$workspaceSlug/map");
  });

  it("includes Case Manager when the user can view case types", () => {
    const links = makeMainNavbarLinksFromPermissions({
      ...NO_APP_ACCESS,
      canAccessCaseTypes: true,
    });

    expect(links.map(prop("link.to"))).toContain(
      "/$workspaceSlug/ontology-designer",
    );
  });

  it("omits Case Manager when the user cannot view case types", () => {
    const links = makeMainNavbarLinksFromPermissions(NO_APP_ACCESS);

    expect(links.map(prop("link.to"))).not.toContain(
      "/$workspaceSlug/ontology-designer",
    );
  });

  it("includes each case type's Records link when the user can view records", () => {
    const links = makeMainNavbarLinksFromPermissions({
      ...NO_APP_ACCESS,
      canAccessCaseRecords: true,
      individualManagerLinks: [COUNTY_RECORDS_LINK],
    });

    expect(links).toContain(COUNTY_RECORDS_LINK);
  });

  it("omits every Records link when the user cannot view records", () => {
    const links = makeMainNavbarLinksFromPermissions({
      ...NO_APP_ACCESS,
      individualManagerLinks: [COUNTY_RECORDS_LINK],
    });

    expect(links).not.toContain(COUNTY_RECORDS_LINK);
  });
});
```

- [ ] **Step 4: Write the failing Spotlight tests**

In `useSpotlightActions.test.tsx`, add `PermissionKey` and the helper to the imports:

```tsx
import { makeHasPermissionFromAppRoles } from "@/test-utils";
import type { PermissionKey } from "$/models/Permissions/Permissions";
```

Add after the `vi.mock("@/db/dexie/AvaDexie", ...)` block:

```tsx
const { hasPermissionMock } = vi.hoisted(() => {
  return {
    hasPermissionMock: vi.fn<(permissionKey: PermissionKey) => boolean>(),
  };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return { useHasPermission: hasPermissionMock };
});
```

Add `hasPermissionMock.mockReset();` as the first line of the existing `afterEach` callback, and append:

```tsx
async function _searchSpotlightForCase(): Promise<void> {
  _renderSpotlight();
  fireEvent.change(await screen.findByRole("textbox"), {
    target: { value: "case" },
  });
}

describe("Spotlight case type commands", () => {
  it("offers Case Manager and New case type to a case_types editor", async () => {
    hasPermissionMock.mockImplementation(
      makeHasPermissionFromAppRoles({ case_types: "editor" }),
    );
    await _searchSpotlightForCase();

    expect(
      await screen.findByRole("button", { name: /^Case Manager/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^New case type/ }),
    ).toBeInTheDocument();
  });

  it("offers Case Manager without New case type to a case_types viewer", async () => {
    hasPermissionMock.mockImplementation(
      makeHasPermissionFromAppRoles({ case_types: "viewer" }),
    );
    await _searchSpotlightForCase();

    expect(
      await screen.findByRole("button", { name: /^Case Manager/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^New case type/ }),
    ).not.toBeInTheDocument();
  });

  it("offers no case type command to a member with no case_types role", async () => {
    hasPermissionMock.mockImplementation(
      makeHasPermissionFromAppRoles({ case_records: "admin" }),
    );
    await _searchSpotlightForCase();

    expect(
      screen.queryByRole("button", { name: /^Case Manager/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^New case type/ }),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run them and watch them fail**

```bash
pnpm test:frontend WorkspaceLayout useSpotlightActions
```

Expected: FAIL. `omits Case Manager when the user cannot view case types` and `omits every Records link when the user cannot view records` fail because both are always included; `offers Case Manager without New case type to a case_types viewer` and `offers no case type command to a member with no case_types role` fail because Spotlight ignores roles. The two version-command tests still pass.

- [ ] **Step 6: Gate the navbar links**

`src/components/layouts/RootLayout/makeMainNavbarLinksFromPermissions.ts` becomes:

```ts
import { isDefined } from "@avandar/utils";
import { NavbarLinks } from "@/config/NavbarLinks/NavbarLinks";
import type { NavbarLink } from "@/config/NavbarLinks/NavbarLinks";

type MakeMainNavbarLinksInput = {
  workspaceSlug: string;
  canAccessDataSources: boolean;
  canAccessDataExplorer: boolean;
  canAccessDashboards: boolean;
  canAccessMaps: boolean;
  canAccessCaseTypes: boolean;
  canAccessCaseRecords: boolean;
  individualManagerLinks: NavbarLink[];
};

/** Builds main workspace navigation links from access permissions. */
export function makeMainNavbarLinksFromPermissions({
  workspaceSlug,
  canAccessDataSources,
  canAccessDataExplorer,
  canAccessDashboards,
  canAccessMaps,
  canAccessCaseTypes,
  canAccessCaseRecords,
  individualManagerLinks,
}: MakeMainNavbarLinksInput): NavbarLink[] {
  return [
    NavbarLinks.workspaceHome(workspaceSlug),
    canAccessDataSources ? NavbarLinks.dataImport(workspaceSlug) : undefined,
    canAccessDataExplorer ? NavbarLinks.dataExplorer(workspaceSlug) : undefined,
    canAccessDashboards ? NavbarLinks.dashboards(workspaceSlug) : undefined,
    canAccessMaps ? NavbarLinks.map(workspaceSlug) : undefined,
    canAccessCaseTypes
      ? NavbarLinks.ontologyDesignerHome(workspaceSlug)
      : undefined,
    ...(canAccessCaseRecords ? individualManagerLinks : []),
  ].filter(isDefined);
}
```

Both links keep their `isEnabled` check on `DisableProfileManager` in `NavbarLinks`, so the flag still applies on top of the role.

In `src/components/layouts/RootLayout/WorkspaceLayout/WorkspaceLayout.tsx`, after `const canAccessMaps = useHasPermission("gis__can_view_map");` add:

```tsx
  const canAccessCaseTypes = useHasPermission(
    "case_types__can_view_case_type",
  );
  const canAccessCaseRecords = useHasPermission(
    "case_records__can_view_record",
  );
```

and the `makeMainNavbarLinksFromPermissions` call becomes:

```tsx
  const mainNavBarLinks = makeMainNavbarLinksFromPermissions({
    workspaceSlug: workspace.slug,
    canAccessDataSources,
    canAccessDataExplorer,
    canAccessDashboards,
    canAccessMaps,
    canAccessCaseTypes,
    canAccessCaseRecords,
    individualManagerLinks,
  });
```

- [ ] **Step 7: Gate the Spotlight commands**

In `useSpotlightActions.tsx`, add the imports in sorted position:

```tsx
import { isDefined } from "@avandar/utils";
```

```tsx
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
```

Then replace the start of the hook through the end of the `navigationActions` `useMemo` with:

```tsx
/** Returns workspace navigation, app information, and development commands. */
export function useSpotlightActions(
  workspaceSlug: string,
): Array<SpotlightActionData | SpotlightActionGroupData> {
  const router = useRouter();
  const { t } = useLingui();
  const appVersion = import.meta.env.VITE_APP_VERSION;
  const canViewCaseTypes = useHasPermission("case_types__can_view_case_type");
  const canCreateCaseType = useHasPermission(
    "case_types__can_create_case_type",
  );

  const navigationActions = useMemo(() => {
    const spotlightLinks = [
      SpotlightLinks.home,
      SpotlightLinks.profile(workspaceSlug),
      SpotlightLinks.dataManagerHome(workspaceSlug),
      SpotlightLinks.dataImport(workspaceSlug),
      SpotlightLinks.dataExplorer(workspaceSlug),
      canViewCaseTypes
        ? SpotlightLinks.ontologyDesignerHome(workspaceSlug)
        : undefined,
      canCreateCaseType
        ? SpotlightLinks.ontologyDesignerCreatorView(workspaceSlug)
        : undefined,
    ].filter(isDefined);

    return spotlightLinks.map(
      ({
        link,
        spotlightDescription,
        icon,
      }): SpotlightActionData | SpotlightActionGroupData => {
        return {
          id: link.key,
          label: link.label(),
          description: spotlightDescription,
          leftSection: icon,
          onClick: () => {
            router.navigate({ to: link.to, params: { workspaceSlug } });
          },
        };
      },
    );
  }, [router, workspaceSlug, canViewCaseTypes, canCreateCaseType]);
```

- [ ] **Step 8: Run them and watch them pass**

```bash
pnpm test:frontend WorkspaceLayout useSpotlightActions
pnpm type-check
```

Expected: PASS, six navbar tests and five Spotlight tests.

- [ ] **Step 9: Commit**

```bash
git add src/test-utils/makeHasPermissionFromAppRoles.ts src/test-utils/index.ts \
  src/components/layouts/RootLayout/makeMainNavbarLinksFromPermissions.ts \
  src/components/layouts/RootLayout/WorkspaceLayout/WorkspaceLayout.tsx \
  src/components/layouts/RootLayout/WorkspaceLayout/WorkspaceLayout.test.ts \
  src/components/layouts/RootLayout/useSpotlightActions/useSpotlightActions.tsx \
  src/components/layouts/RootLayout/useSpotlightActions/useSpotlightActions.test.tsx
git commit -m "feat(case-statuses): show case navigation only to members with a case role"
```

---

### Task 11: Hide Case Manager controls a role cannot use

**Files:**
- Create: `src/views/OntologyDesignerApp/NewCaseTypeButton.test.tsx`
- Modify: `src/views/OntologyDesignerApp/NewCaseTypeButton.tsx` (whole file)
- Modify: `src/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome.test.tsx` (one test)
- Modify: `src/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome.tsx:14-24, 63`
- Create: `src/routes/_auth/$workspaceSlug/ontology-designer/-index.test.tsx`
- Modify: `src/routes/_auth/$workspaceSlug/ontology-designer/index.tsx:1-14, 27-36, 80-85`
- Create: `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActions.test.tsx`
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActions.tsx:1-38`

- [ ] **Step 1: Write the failing tests**

Create `src/views/OntologyDesignerApp/NewCaseTypeButton.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeHasPermissionFromAppRoles, render, screen } from "@/test-utils";
import { NewCaseTypeButton } from "@/views/OntologyDesignerApp/NewCaseTypeButton";
import type { PermissionKey } from "$/models/Permissions/Permissions";

const { hasPermissionMock } = vi.hoisted(() => {
  return {
    hasPermissionMock: vi.fn<(permissionKey: PermissionKey) => boolean>(),
  };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return { useHasPermission: hasPermissionMock };
});

vi.mock(
  "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager",
  () => {
    return {
      ChatPanelStateManager: {
        useDispatch: () => {
          return { beginCaseDesign: vi.fn() };
        },
      },
    };
  },
);

describe("NewCaseTypeButton", () => {
  beforeEach(() => {
    hasPermissionMock.mockReset();
  });

  it("offers New case type to a case_types editor", () => {
    hasPermissionMock.mockImplementation(
      makeHasPermissionFromAppRoles({ case_types: "editor" }),
    );
    render(<NewCaseTypeButton />);

    expect(
      screen.getByRole("button", { name: "New case type" }),
    ).toBeInTheDocument();
  });

  it("renders nothing for a case_types viewer", () => {
    hasPermissionMock.mockImplementation(
      makeHasPermissionFromAppRoles({ case_types: "viewer" }),
    );
    render(<NewCaseTypeButton />);

    expect(
      screen.queryByRole("button", { name: "New case type" }),
    ).not.toBeInTheDocument();
  });
});
```

Append to the `describe` in `CaseTypeHome.test.tsx`:

```tsx
  it("offers no new-case-type card when the caller handles no creation", () => {
    render(
      <CaseTypeHome
        caseTypes={[{ id: "c1", name: "County", description: undefined }]}
        onOpenCaseType={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /new case type/i }),
    ).not.toBeInTheDocument();
  });
```

Create `src/routes/_auth/$workspaceSlug/ontology-designer/-index.test.tsx`:

```tsx
/** Route-adapter coverage for which home controls each case_types role gets. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeHasPermissionFromAppRoles, render } from "@/test-utils";
import type { PermissionKey } from "$/models/Permissions/Permissions";
import type { ReactNode } from "react";

const { caseTypeHomeMock, hasPermissionMock } = vi.hoisted(() => {
  return {
    caseTypeHomeMock: vi.fn(),
    hasPermissionMock: vi.fn<(permissionKey: PermissionKey) => boolean>(),
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: (): ReturnType<typeof vi.fn> => {
      return vi.fn();
    },
  };
});

vi.mock("@/clients/ontology/ConceptClient", () => {
  return {
    ConceptClient: {
      useGetAll: () => {
        return [[], false];
      },
      useDelete: () => {
        return [vi.fn(), false];
      },
      QueryKeys: {
        getAll: () => {
          return ["Concept", "getAll"];
        },
      },
    },
  };
});

vi.mock(
  "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager",
  () => {
    return {
      ChatPanelStateManager: {
        useDispatch: () => {
          return { beginCaseDesign: vi.fn() };
        },
      },
    };
  },
);

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "acme", name: "Acme" };
    },
  };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return { useHasPermission: hasPermissionMock };
});

vi.mock("@/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome", () => {
  return {
    CaseTypeHome: (props: unknown): ReactNode => {
      caseTypeHomeMock(props);
      return null;
    },
  };
});

const { Route } = await import("./index");

type CaseTypeHomeHandlers = {
  onCreate?: unknown;
  onDeleteCaseType?: unknown;
};

function _renderHomeFor(
  roles: Parameters<typeof makeHasPermissionFromAppRoles>[0],
): CaseTypeHomeHandlers {
  hasPermissionMock.mockImplementation(makeHasPermissionFromAppRoles(roles));
  const Component = Route.options.component as () => ReactNode;
  render(<Component />);
  const [props] = caseTypeHomeMock.mock.lastCall as [CaseTypeHomeHandlers];
  return props;
}

describe("/$workspaceSlug/ontology-designer/", () => {
  beforeEach(() => {
    caseTypeHomeMock.mockReset();
    hasPermissionMock.mockReset();
  });

  it("hands a case_types viewer's home no create action", () => {
    expect(_renderHomeFor({ case_types: "viewer" }).onCreate).toBeUndefined();
  });

  it("hands a case_types editor's home a create action", () => {
    expect(_renderHomeFor({ case_types: "editor" }).onCreate).toBeTypeOf(
      "function",
    );
  });

  it("hands a case_types editor's home no delete action", () => {
    expect(
      _renderHomeFor({ case_types: "editor" }).onDeleteCaseType,
    ).toBeUndefined();
  });

  it("hands a case_types admin's home a delete action", () => {
    expect(
      _renderHomeFor({ case_types: "admin" }).onDeleteCaseType,
    ).toBeTypeOf("function");
  });
});
```

Create `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActions.test.tsx`:

```tsx
import { Model } from "@avandar/models";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { makeHasPermissionFromAppRoles, render, screen } from "@/test-utils";
import { CaseTypeActions } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActions";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { PermissionKey } from "$/models/Permissions/Permissions";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

const { hasPermissionMock } = vi.hoisted(() => {
  return {
    hasPermissionMock: vi.fn<(permissionKey: PermissionKey) => boolean>(),
  };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return { useHasPermission: hasPermissionMock };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "acme" };
    },
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: (): ReturnType<typeof vi.fn> => {
      return vi.fn();
    },
  };
});

vi.mock("@/clients/ontology/ConceptClient", () => {
  return {
    ConceptClient: {
      useDelete: () => {
        return [vi.fn(), false];
      },
      QueryKeys: {
        getAll: () => {
          return ["Concept", "getAll"];
        },
      },
    },
  };
});

vi.mock(
  "@/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals",
  () => {
    return { generateIndividuals: vi.fn(), getAttributesWithMapping: vi.fn() };
  },
);

/** An honest `Concept.T`, built through `Model.make` with no cast. */
function _createConcept(): Concept.T {
  const now = new Date().toISOString();
  return Model.make("Concept", {
    id: uuid<Concept.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    ownerId: uuid<User.Id>(),
    name: "County",
    description: undefined,
    createdAt: now,
    updatedAt: now,
    allowManualCreation: false,
  });
}

function _renderActionsFor(
  roles: Parameters<typeof makeHasPermissionFromAppRoles>[0],
): void {
  hasPermissionMock.mockImplementation(makeHasPermissionFromAppRoles(roles));
  const concept = _createConcept();
  render(<CaseTypeActions concept={concept} fullConcept={concept} />);
}

describe("CaseTypeActions", () => {
  beforeEach(() => {
    hasPermissionMock.mockReset();
  });

  it("shows Refresh records to a case_types editor", () => {
    _renderActionsFor({ case_types: "editor" });

    expect(
      screen.getByRole("button", { name: "Refresh County records" }),
    ).toBeInTheDocument();
  });

  it("shows Refresh records to a case_records editor who only views case types", () => {
    _renderActionsFor({ case_types: "viewer", case_records: "editor" });

    expect(
      screen.getByRole("button", { name: "Refresh County records" }),
    ).toBeInTheDocument();
  });

  it("hides Refresh records from a viewer of both case apps", () => {
    _renderActionsFor({ case_types: "viewer", case_records: "viewer" });

    expect(
      screen.queryByRole("button", { name: "Refresh County records" }),
    ).not.toBeInTheDocument();
  });

  it("hides Delete from a case_types editor", () => {
    _renderActionsFor({ case_types: "editor" });

    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });

  it("shows Delete to a case_types admin", () => {
    _renderActionsFor({ case_types: "admin" });

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("hides View records from a member with no case_records role", () => {
    _renderActionsFor({ case_types: "admin" });

    expect(
      screen.queryByRole("button", { name: "View records" }),
    ).not.toBeInTheDocument();
  });

  it("shows View records to a case_records viewer", () => {
    _renderActionsFor({ case_types: "viewer", case_records: "viewer" });

    expect(
      screen.getByRole("button", { name: "View records" }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

```bash
pnpm test:frontend NewCaseTypeButton CaseTypeHome ontology-designer/-index CaseTypeActions
```

Expected: FAIL in the seven negative cases, because every control still renders for every role: `renders nothing for a case_types viewer`, `offers no new-case-type card when the caller handles no creation`, `hands a case_types viewer's home no create action`, `hands a case_types editor's home no delete action`, `hides Refresh records from a viewer of both case apps`, `hides Delete from a case_types editor`, and `hides View records from a member with no case_records role`. The positive cases pass already.

- [ ] **Step 3: Hide New case type in the toolbar**

`src/views/OntologyDesignerApp/NewCaseTypeButton.tsx` becomes:

```tsx
import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import type { ReactNode } from "react";

/**
 * Opens chat in the case-type designer session. Renders nothing for a user
 * who cannot create case types.
 */
export function NewCaseTypeButton(): ReactNode {
  const dispatch = ChatPanelStateManager.useDispatch();
  const canCreateCaseType = useHasPermission(
    "case_types__can_create_case_type",
  );

  if (!canCreateCaseType) {
    return null;
  }

  return (
    <Button
      leftSection={<IconPlus size={18} aria-hidden />}
      onClick={dispatch.beginCaseDesign}
      size="compact-sm"
      variant="light"
    >
      <Trans>New case type</Trans>
    </Button>
  );
}
```

- [ ] **Step 4: Make the home's create card optional**

In `src/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome.tsx`, `Props` becomes:

```tsx
type Props = {
  caseTypes: readonly CaseTypeHomeItem[];
  /** Omitted when the user cannot create case types. */
  onCreate?: () => void;
  onOpenCaseType: (caseType: CaseTypeHomeItem) => void;
  /** Omitted when the caller does not support deleting case types. */
  onDeleteCaseType?: (caseType: CaseTypeHomeItem) => void;
  isLoading?: boolean;
};
```

the component docstring becomes:

```tsx
/**
 * Case Manager home: a card grid of case types, plus a dashed create card
 * when the caller handles creation.
 */
```

and `<NewCaseTypeCard onCreate={onCreate} />` becomes:

```tsx
          {onCreate ? <NewCaseTypeCard onCreate={onCreate} /> : null}
```

- [ ] **Step 5: Wire the home to the user's roles**

In `src/routes/_auth/$workspaceSlug/ontology-designer/index.tsx`, add the import before `@/hooks/workspaces/useCurrentWorkspace`:

```tsx
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
```

After the `ConceptClient.useDelete` call, add:

```tsx
  const canCreateCaseType = useHasPermission(
    "case_types__can_create_case_type",
  );
  const canDeleteCaseType = useHasPermission(
    "case_types__can_delete_case_type",
  );
```

and the returned `CaseTypeHome` becomes:

```tsx
    <CaseTypeHome
      caseTypes={concepts ?? []}
      onCreate={canCreateCaseType ? dispatch.beginCaseDesign : undefined}
      onDeleteCaseType={canDeleteCaseType ? confirmDeleteCaseType : undefined}
      onOpenCaseType={(caseType) => {
        navigate(
          AppLinks.ontologyDesignerConceptView({
            workspaceSlug: workspace.slug,
            conceptId: caseType.id,
            conceptName: caseType.name,
          }),
        );
      }}
    />
```

Both hooks sit above the `if (isLoading)` early return, so the hook order never changes.

- [ ] **Step 6: Gate the case type page's actions**

In `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActions.tsx`, add the import before `@/hooks/workspaces/useCurrentWorkspace`:

```tsx
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
```

and `CaseTypeActions` becomes:

```tsx
/**
 * Records, sync, and delete actions for a case type. Each renders only for a
 * user whose role lets them use it.
 */
export function CaseTypeActions({ concept, fullConcept }: Props): ReactNode {
  const canViewRecords = useHasPermission("case_records__can_view_record");
  const canSyncAsCaseTypesEditor = useHasPermission(
    "case_types__can_sync_records",
  );
  const canSyncAsCaseRecordsEditor = useHasPermission(
    "case_records__can_sync_records",
  );
  const canDeleteCaseType = useHasPermission(
    "case_types__can_delete_case_type",
  );

  return (
    <Group gap="xs" wrap="nowrap">
      {canViewRecords ? <ViewRecordsButton concept={concept} /> : null}
      {canSyncAsCaseTypesEditor || canSyncAsCaseRecordsEditor ? (
        <SyncRecordsButton concept={concept} fullConcept={fullConcept} />
      ) : null}
      {canDeleteCaseType ? <DeleteCaseTypeButton concept={concept} /> : null}
    </Group>
  );
}
```

`SyncRecordsButton` and `DeleteCaseTypeButton` stay as they are.

- [ ] **Step 7: Run them and watch them pass**

```bash
pnpm test:frontend NewCaseTypeButton CaseTypeHome ontology-designer/-index CaseTypeActions
pnpm type-check
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/views/OntologyDesignerApp/NewCaseTypeButton.tsx \
  src/views/OntologyDesignerApp/NewCaseTypeButton.test.tsx \
  src/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome.tsx \
  src/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome.test.tsx \
  "src/routes/_auth/\$workspaceSlug/ontology-designer/index.tsx" \
  "src/routes/_auth/\$workspaceSlug/ontology-designer/-index.test.tsx" \
  src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActions.tsx \
  src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActions.test.tsx
git commit -m "feat(case-statuses): hide case type controls a role cannot use"
```

---

### Task 12: Hide Create case type in the chat draft card

**Files:**
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.test.tsx:6-33, 144-155` and append one test
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.tsx:1-10, 36, 62-64`
- Modify: `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftCard.tsx:24-25, 118-125`

The legacy chat path that creates case types without a card (`applyChatModelTurnResponse.ts` calling `applyCreatedCaseTypes`) is deliberately unchanged. For a user without `case_types` editor, the concept insert fails RLS with `42501`, and its existing `.catch` shows "Could not create those case types". No new UI is added for it.

- [ ] **Step 1: Write the failing test**

In `CaseTypeDraftBlock.test.tsx`, change the `@/test-utils` import to:

```tsx
import {
  fireEvent,
  makeHasPermissionFromAppRoles,
  render,
  screen,
  waitFor,
} from "@/test-utils";
```

add `import type { PermissionKey } from "$/models/Permissions/Permissions";` beside the other type imports, and replace the `vi.hoisted` block with:

```tsx
const {
  applyCreatedCaseTypesMock,
  hasPermissionMock,
  setPendingCaseTypeDraftMock,
  useChatPanelStateMock,
} = vi.hoisted(() => {
  return {
    applyCreatedCaseTypesMock: vi.fn().mockResolvedValue(undefined),
    hasPermissionMock: vi.fn<(permissionKey: PermissionKey) => boolean>(),
    setPendingCaseTypeDraftMock: vi.fn(),
    useChatPanelStateMock: vi.fn(),
  };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return { useHasPermission: hasPermissionMock };
});
```

In the `beforeEach`, after `applyCreatedCaseTypesMock.mockResolvedValue(undefined);`, add:

```tsx
    hasPermissionMock.mockImplementation(
      makeHasPermissionFromAppRoles({ case_types: "editor" }),
    );
```

and append to the `describe`:

```tsx
  it("hides Create case type from a case_types viewer", () => {
    hasPermissionMock.mockImplementation(
      makeHasPermissionFromAppRoles({ case_types: "viewer" }),
    );
    render(<CaseTypeDraftBlock />);

    expect(
      screen.queryByRole("button", { name: "Create case type" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm test:frontend CaseTypeDraftBlock
```

Expected: FAIL only in `hides Create case type from a case_types viewer`; every existing test still passes.

- [ ] **Step 3: Make the card's create action optional**

In `CaseTypeDraftCard.tsx`, `onCreate: () => void;` in `Props` becomes:

```tsx
  /** Omitted when the user cannot create case types. */
  onCreate?: () => void;
```

and the create button becomes:

```tsx
          {onCreate ? (
            <Button
              size="xs"
              loading={isCreating}
              disabled={!editor.canCreate}
              onClick={onCreate}
            >
              <Trans>Create case type</Trans>
            </Button>
          ) : null}
```

- [ ] **Step 4: Pass it only to a user who can create**

In `CaseTypeDraftBlock.tsx`, add the import before `@/hooks/workspaces/useCurrentWorkspace`:

```tsx
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
```

after `const { isCreating, createCaseType } = useCaseTypeDraftCreation(workspace.id);` add:

```tsx
  const canCreateCaseType = useHasPermission(
    "case_types__can_create_case_type",
  );
```

and the `onCreate` prop becomes:

```tsx
        onCreate={
          canCreateCaseType
            ? () => {
                void createCaseType(editor.draft);
              }
            : undefined
        }
```

- [ ] **Step 5: Run it and watch it pass**

```bash
pnpm test:frontend CaseTypeDraftBlock
pnpm type-check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.tsx \
  src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftCard.tsx \
  src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.test.tsx
git commit -m "feat(case-statuses): hide Create case type in the draft card without case_types editor"
```

---

### Task 13: Hide Case Manager links on Records pages

**Files:**
- Create: `src/views/IndividualManagerApp/EditCaseTypeButton.test.tsx`
- Modify: `src/views/IndividualManagerApp/EditCaseTypeButton.tsx` (whole file)
- Create: `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/-index.test.tsx`
- Modify: `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/index.tsx:1-12, 26-66`

- [ ] **Step 1: Write the failing tests**

Create `src/views/IndividualManagerApp/EditCaseTypeButton.test.tsx`:

```tsx
import { Model } from "@avandar/models";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { makeHasPermissionFromAppRoles, render, screen } from "@/test-utils";
import { EditCaseTypeButton } from "@/views/IndividualManagerApp/EditCaseTypeButton";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { PermissionKey } from "$/models/Permissions/Permissions";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

const { hasPermissionMock } = vi.hoisted(() => {
  return {
    hasPermissionMock: vi.fn<(permissionKey: PermissionKey) => boolean>(),
  };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return { useHasPermission: hasPermissionMock };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "acme" };
    },
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: (): ReturnType<typeof vi.fn> => {
      return vi.fn();
    },
  };
});

/** An honest `Concept.T`, built through `Model.make` with no cast. */
function _createConcept(): Concept.T {
  const now = new Date().toISOString();
  return Model.make("Concept", {
    id: uuid<Concept.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    ownerId: uuid<User.Id>(),
    name: "County",
    description: undefined,
    createdAt: now,
    updatedAt: now,
    allowManualCreation: false,
  });
}

describe("EditCaseTypeButton", () => {
  beforeEach(() => {
    hasPermissionMock.mockReset();
  });

  it("offers Edit case type to a case_types viewer", () => {
    hasPermissionMock.mockImplementation(
      makeHasPermissionFromAppRoles({ case_types: "viewer" }),
    );
    render(<EditCaseTypeButton concept={_createConcept()} />);

    expect(
      screen.getByRole("button", { name: "Edit case type" }),
    ).toBeInTheDocument();
  });

  it("renders nothing for a member with no case_types role", () => {
    hasPermissionMock.mockImplementation(
      makeHasPermissionFromAppRoles({ case_records: "admin" }),
    );
    render(<EditCaseTypeButton concept={_createConcept()} />);

    expect(
      screen.queryByRole("button", { name: "Edit case type" }),
    ).not.toBeInTheDocument();
  });
});
```

Create `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/-index.test.tsx`:

```tsx
/** Route-adapter coverage for the empty records state's case type link. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeHasPermissionFromAppRoles, render, screen } from "@/test-utils";
import type { PermissionKey } from "$/models/Permissions/Permissions";
import type { ReactNode } from "react";

const { hasPermissionMock } = vi.hoisted(() => {
  return {
    hasPermissionMock: vi.fn<(permissionKey: PermissionKey) => boolean>(),
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    getRouteApi: () => {
      return {
        useLoaderData: () => {
          return { id: "concept-1", name: "County" };
        },
      };
    },
    useNavigate: (): ReturnType<typeof vi.fn> => {
      return vi.fn();
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "acme" };
    },
  };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return { useHasPermission: hasPermissionMock };
});

vi.mock("@/views/IndividualManagerApp/useConceptIndividuals", () => {
  return {
    useConceptIndividuals: () => {
      return { allIndividuals: [], isLoading: false };
    },
  };
});

const { Route } = await import("./index");

function _renderEmptyCaseTypeFor(
  roles: Parameters<typeof makeHasPermissionFromAppRoles>[0],
): void {
  hasPermissionMock.mockImplementation(makeHasPermissionFromAppRoles(roles));
  const Component = Route.options.component as () => ReactNode;
  render(<Component />);
}

describe("/$workspaceSlug/individual-manager/$conceptId/", () => {
  beforeEach(() => {
    hasPermissionMock.mockReset();
  });

  it("offers Open case type on an empty case type to a case_types viewer", () => {
    _renderEmptyCaseTypeFor({ case_types: "viewer", case_records: "viewer" });

    expect(
      screen.getByRole("button", { name: "Open case type" }),
    ).toBeInTheDocument();
  });

  it("offers no Open case type to a member with no case_types role", () => {
    _renderEmptyCaseTypeFor({ case_records: "viewer" });

    expect(
      screen.queryByRole("button", { name: "Open case type" }),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

```bash
pnpm test:frontend EditCaseTypeButton individual-manager
```

Expected: FAIL in `renders nothing for a member with no case_types role` and `offers no Open case type to a member with no case_types role`; the two positive cases pass.

- [ ] **Step 3: Hide Edit case type**

`src/views/IndividualManagerApp/EditCaseTypeButton.tsx` becomes:

```tsx
import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconAdjustments } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
};

/**
 * Opens this case type in Case Manager so the user can edit attributes or
 * sync records. Renders nothing for a user who cannot open the Case Manager.
 */
export function EditCaseTypeButton({ concept }: Readonly<Props>): ReactNode {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const canViewCaseType = useHasPermission("case_types__can_view_case_type");

  if (!canViewCaseType) {
    return null;
  }

  return (
    <Button
      leftSection={<IconAdjustments size={18} aria-hidden />}
      onClick={() => {
        navigate(
          AppLinks.ontologyDesignerConceptView({
            workspaceSlug: workspace.slug,
            conceptId: concept.id,
            conceptName: concept.name,
          }),
        );
      }}
      size="compact-sm"
      variant="light"
    >
      <Trans>Edit case type</Trans>
    </Button>
  );
}
```

- [ ] **Step 4: Hide Open case type in the empty state**

In `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/index.tsx`, add the import after `@/config/AppLinks/AppLinks`:

```tsx
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
```

after `const { allIndividuals, isLoading } = useConceptIndividuals(concept.id);` add:

```tsx
  const canViewCaseType = useHasPermission("case_types__can_view_case_type");
```

and the `action` prop's condition becomes:

```tsx
        action={
          hasRecords || !canViewCaseType ? undefined : (
```

leaving the `<Button>` inside it unchanged.

- [ ] **Step 5: Run them and watch them pass**

```bash
pnpm test:frontend EditCaseTypeButton individual-manager
pnpm type-check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/IndividualManagerApp/EditCaseTypeButton.tsx \
  src/views/IndividualManagerApp/EditCaseTypeButton.test.tsx \
  "src/routes/_auth/\$workspaceSlug/individual-manager/\$conceptId/index.tsx" \
  "src/routes/_auth/\$workspaceSlug/individual-manager/\$conceptId/-index.test.tsx"
git commit -m "feat(case-statuses): hide Case Manager links on Records pages without case_types access"
```

---

### Task 14: End-to-end route coverage

Do **not** write a new spec. `tests/e2e/workspace-app-permissions-matrix.spec.ts` already iterates `Permissions.RestrictableApps` against every role level, so mapping `case_types` to a route gives the Case Manager the same allow and deny coverage as the other apps, exactly as the `gis` plan did. A Records page lives under one case type, so its path cannot be static: `case_records` gets a describe block of its own in the same spec, shaped like the existing GIS block, that seeds one case type per test.

**Files:**
- Create: `tests/e2e/helpers/insertE2ECaseType.ts`
- Modify: `tests/e2e/helpers/workspaceAppRouteExpectations.ts:22-48`
- Modify: `tests/e2e/workspace-app-permissions-matrix.spec.ts` (imports, `_appRouteForType`, and one new describe after the GIS describe)

- [ ] **Step 1: Read the conventions**

Read `docs/rules/e2e-testing.md`, then the spec end to end, so you can see how `_appRouteForType`, `WORKSPACE_APP_ROUTES`, `expectWorkspaceAppAccessAllowed`, and `expectWorkspaceAppAccessDenied` compose. Seeding the case type through the service-role client counts as pre-test setup (spec §12): it happens before the first page load and is deleted in `finally`.

- [ ] **Step 2: Add the seeding helper**

Create `tests/e2e/helpers/insertE2ECaseType.ts`:

```ts
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/**
 * Inserts a case type with no attributes, owned by the workspace owner, for a
 * spec that needs one to exist before the page loads.
 */
export async function insertE2ECaseType(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  name: string;
}): Promise<{ id: string; name: string }> {
  const { data: workspaceRow, error: workspaceError } =
    await options.supabaseAdminClient
      .from("workspaces")
      .select("owner_id")
      .eq("id", options.workspaceId)
      .single();

  if (workspaceError || !workspaceRow?.owner_id) {
    throw new Error(
      `[e2e] workspace owner missing: ${workspaceError?.message ?? ""}`,
    );
  }

  const { data: caseType, error: caseTypeError } =
    await options.supabaseAdminClient
      .from("concepts")
      .insert({
        workspace_id: options.workspaceId,
        owner_id: workspaceRow.owner_id,
        name: options.name,
        allow_manual_creation: false,
      })
      .select("id, name")
      .single();

  if (caseTypeError || !caseType) {
    throw new Error(
      `[e2e] case type insert failed: ${caseTypeError?.message ?? ""}`,
    );
  }

  return caseType;
}

/** Deletes case types a spec seeded, with everything that cascades from them. */
export async function deleteE2ECaseTypes(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  ids: readonly string[];
}): Promise<void> {
  const { error } = await options.supabaseAdminClient
    .from("concepts")
    .delete()
    .in("id", [...options.ids]);

  if (error) {
    throw new Error(`[e2e] case type delete failed: ${error.message}`);
  }
}
```

- [ ] **Step 3: Add the two route cases**

In `tests/e2e/helpers/workspaceAppRouteExpectations.ts`, add to `WORKSPACE_APP_ROUTES` between `gis` and `settings`:

```ts
  caseTypes: {
    label: "Case Types",
    path: "/ontology-designer",
    allowedUrlPattern: /\/ontology-designer/,
  },
  caseRecords: {
    label: "Case Records",
    path: "/individual-manager",
    allowedUrlPattern: /\/individual-manager\//,
  },
```

The labels match `appLabel("case_types")` and `appLabel("case_records")`. `caseRecords.path` is the prefix; the spec appends the seeded case type's id.

- [ ] **Step 4: Map `case_types` into the generic loop**

In `workspace-app-permissions-matrix.spec.ts`, `_appRouteForType`'s record becomes:

```ts
  const routes: Record<AppType, WorkspaceAppRouteCase | undefined> = {
    data_sources: WORKSPACE_APP_ROUTES.dataSources,
    data_explorer: WORKSPACE_APP_ROUTES.dataExplorer,
    dashboards: WORKSPACE_APP_ROUTES.dashboards,
    gis: undefined,
    case_types: WORKSPACE_APP_ROUTES.caseTypes,
    case_records: undefined,
    settings: undefined,
  };
```

- [ ] **Step 5: Add the Records describe**

Add the import beside the other helpers:

```ts
import {
  deleteE2ECaseTypes,
  insertE2ECaseType,
} from "./helpers/insertE2ECaseType";
```

Then add after the `GIS route permission matrix` describe:

```ts
type CaseRecordsRouteCase = {
  title: string;
  matrix: UserAppRolesMatrix;
  isAllowed: boolean;
};

const CASE_RECORDS_ROUTE_CASES: CaseRecordsRouteCase[] = [
  {
    title: "denies Case Records when member lacks case_records viewer",
    matrix: createRolesMatrixWithoutApp("case_records"),
    isAllowed: false,
  },
  {
    title: "allows Case Records for case_records viewer only",
    matrix: createSingleAppViewerRolesMatrix("case_records"),
    isAllowed: true,
  },
  {
    title: "allows Case Records for case_records editor",
    matrix: createSingleAppEditorRolesMatrix("case_records"),
    isAllowed: true,
  },
  {
    title: "allows Case Records for case_records admin",
    matrix: createSingleAppAdminRolesMatrix("case_records"),
    isAllowed: true,
  },
];

test.describe("Case Records route permission matrix", () => {
  CASE_RECORDS_ROUTE_CASES.forEach(({ title, matrix, isAllowed }) => {
    test(title, async ({ page, e2eWorkerDb, e2eViewerMembership }) => {
      const { admin, workspaceId, viewerUserId } = e2eViewerMembership;
      const caseType = await insertE2ECaseType({
        supabaseAdminClient: admin,
        workspaceId,
        name: "E2E case records route",
      });

      try {
        const assignResult = await assignE2ESecondaryMemberCustomMatrix({
          supabaseAdminClient: admin,
          workspaceId,
          viewerUserId,
          matrix,
        });

        try {
          await signInWithEmailPassword(page, {
            email: e2eWorkerDb.secondaryUser.email,
            password: e2eWorkerDb.secondaryUser.password,
            workspaceSlug: e2eWorkerDb.workspaceSlug,
          });
          const expectationOptions = {
            workspaceSlug: e2eWorkerDb.workspaceSlug,
            appPath: `${WORKSPACE_APP_ROUTES.caseRecords.path}/${caseType.id}`,
          };
          if (isAllowed) {
            await expectWorkspaceAppAccessAllowed(page, {
              ...expectationOptions,
              allowedUrlPattern:
                WORKSPACE_APP_ROUTES.caseRecords.allowedUrlPattern,
            });
          } else {
            await expectWorkspaceAppAccessDenied(page, expectationOptions);
          }
        } finally {
          await restoreE2ESecondaryMemberRoleGroup({
            supabaseAdminClient: admin,
            workspaceId,
            viewerUserId,
            ...assignResult,
          });
        }
      } finally {
        await deleteE2ECaseTypes({
          supabaseAdminClient: admin,
          ids: [caseType.id],
        });
      }
    });
  });
});
```

- [ ] **Step 6: Run the new cases**

Switch check (the spec needs the local stack running), then:

```bash
pnpm test:e2e workspace-app-permissions-matrix.spec.ts --grep "Case Types|Case Records"
```

Expected: PASS, eight tests: `denies Case Types when member lacks case_types viewer`, `allows Case Types for case_types viewer only`, `... editor`, `... admin`, and the four `Case Records route permission matrix` tests.

A failure on a denied case usually means a Task 9 guard is missing or names a different permission key. A failure on an allowed case usually means a Task 2 or Task 8 matrix disagrees with the SQL seeding.

- [ ] **Step 7: Run the whole spec once**

```bash
pnpm test:e2e workspace-app-permissions-matrix.spec.ts
```

Expected: PASS, with every existing case still green.

- [ ] **Step 8: Commit**

```bash
git add tests/e2e/helpers/insertE2ECaseType.ts \
  tests/e2e/helpers/workspaceAppRouteExpectations.ts \
  tests/e2e/workspace-app-permissions-matrix.spec.ts
git commit -m "test(case-statuses): cover Case Manager and Records route permissions"
```

---

### Task 15: Document the case apps in `permissions-architecture.md`

**Files:**
- Modify: `docs/permissions-architecture.md:34-37` (Vocabulary), `:335` (Schema map enum list), and §9 Common scenarios (after "Whole workspace viewer on one resource")

- [ ] **Step 1: Update the app list in Vocabulary**

Before:

```markdown
**App (`app_type`)** - A product surface within a workspace whose access is
granted independently. v1 values: `data_sources`, `data_explorer`,
`dashboards`, `settings`. Example: a user can be `editor` in `dashboards` and
`viewer` in `data_sources`.
```

After:

```markdown
**App (`app_type`)** - A product surface within a workspace whose access is
granted independently. Values: `data_sources`, `data_explorer`, `dashboards`,
`gis` (Maps), `case_types` (the Case Manager, where case types are designed),
`case_records` (the Records pages, where a case type's records are worked),
and `settings`. Example: a user can be `editor` in `dashboards` and `viewer`
in `data_sources`.
```

- [ ] **Step 2: Update the same list in the Schema map**

Before:

```markdown
- `app_type`: `data_sources`, `data_explorer`, `dashboards`, `settings`
```

After:

```markdown
- `app_type`: `data_sources`, `data_explorer`, `dashboards`, `settings`,
  `gis`, `case_types`, `case_records` (enum order; new values are appended)
```

- [ ] **Step 3: Add the case scenarios**

In §9, after the "Whole workspace viewer on one resource" entry and before the `---` that opens §10, add:

```markdown
**Someone designs case types but does not work their records**

- Give them a role group with `case_types` at `editor` and no `case_records`
  row. They can create case types, edit them, and refresh their records, but
  cannot open a Records page. Refreshing writes records, which is why the
  `individuals` INSERT and UPDATE policies accept a `case_types` editor as
  well as a `case_records` editor. Deleting a case type needs `case_types` at
  `admin`.

**Someone works the records but cannot change case types**

- Give them `case_records` at `editor` and `case_types` at `viewer`. They open
  Records and can refresh a case type's records from its Case Manager page,
  but cannot create, edit, or delete a case type. Without the `case_types`
  row they lose the Case Manager entirely and reach Records from the
  navigation only. Deleting a record needs `case_records` at `admin`.

**Querying case types without a case role**

- Nothing to set up. Every workspace member reads case types, their
  attributes and mappings, and their records whatever their case roles,
  because the Data Explorer and chat query them. The route guards and the
  navigation, not RLS, keep the Case Manager and Records pages from members
  without the matching role. Workspace owners pass every case-role check
  through `util__auth_user_meets_min_app_role`.
```

- [ ] **Step 4: Commit**

```bash
git add docs/permissions-architecture.md
git commit -m "docs(case-statuses): document the case_types and case_records apps"
```

---

## Known gaps after this plan

1. **`rollbackConceptFormInsert` no longer cleans up for a non-admin editor.** Deleting a concept now needs `case_types` admin, so after a failed creation the rollback's concept DELETE is filtered by RLS without an error: the attributes are removed, and the concept row stays behind with none. Plan 2 replaces the client-side chain with `rpc_concepts__create` and deletes the rollback. This plan does not fix it.
2. **The legacy chat creation path keeps its current error handling.** `applyChatModelTurnResponse.ts` calls `applyCreatedCaseTypes`; for a user without `case_types` editor the insert fails with `42501` and the existing "Could not create those case types" toast is all they see. No new UI is added.
3. **The Case Manager chat still starts a case-design session for any role.** `ChatPanel`'s new-chat action in the Case Manager calls `beginCaseDesign`; only the draft card's create button is hidden (Task 12).

## Handoff to plan 2

- Each RLS test file seeds its concepts in one block headed "Case types the tests below read and write". Plan 2 adds a status to every concept there. `rls_concepts.test.sql` also inserts concepts in tests 3, 8, and 9; those inserts need `default_status_id` once the column is `not null`.
- The `individuals` seeds and inserts in `rls_individuals.test.sql` no longer name `status`, so dropping that column needs no change there.
- `insertE2ECaseType` must insert the case type's statuses and default once `concepts.default_status_id` is `not null`.
- The `Model.make("Concept", ...)` fixtures in `CaseTypeActions.test.tsx` and `EditCaseTypeButton.test.tsx` gain `defaultStatusId`; the compiler lists them.
- `docs/ontology-architecture.md` still says access to the case tables is membership only and that their UPDATE policies have no `using`. Both stop being true here; plan 2 owns that document.

## Verification checklist

- [ ] Switch check is green, then `pnpm test:db` passes: `case_app_roles.test.sql`, the five rewritten RLS files, the privilege reconcile, and the `case_app_roles_backfill` replay.
- [ ] `pnpm test:frontend` passes.
- [ ] `pnpm type-check` and `pnpm lint` pass.
- [ ] `pnpm test:e2e workspace-app-permissions-matrix.spec.ts` passes, including the four Case Types and four Case Records cases.
- [ ] `pnpm i18n:check` is clean.
- [ ] `pnpm desktop:sqlite:check-migrations` passes.
- [ ] The seven migrations exist in the order of the table above; the enum migration holds only the two `alter type` statements; each generated policy migration holds only drop and create of its table's three write policies.
- [ ] Task 7 Step 8's `pg_policies` query returns five rows, all `t | t`.
- [ ] Workspace settings shows "Case Types" and "Case Records" rows in the role matrix.
- [ ] `shared/types/database.types.ts` and the catalogs were regenerated, not hand-edited.
- [ ] `git status` shows only `supabase/config.toml` modified.
- [ ] Nothing in this plan was run against production.
