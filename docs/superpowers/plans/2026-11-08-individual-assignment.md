# Individual assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Case Records editor assign a record to one workspace member, and give that member an Assigned to me queue.

**Architecture:** `individuals.assigned_to` already exists and Sync already leaves it alone. A before-trigger, matching the status trigger, allows a Case Records editor to set it to a member of the record's workspace or to empty. The record header saves through `IndividualClient.useUpdate`. Assigned to me is a sidebar route that pages records with `assigned_to = current user`, grouped by case type. The case type list adds an assignee filter by teaching the shared filter type a null check, because `eq` cannot express SQL null.

**Tech Stack:** Postgres triggers and pgTAP, Supabase declarative schema, `@avandar/utils` filters, `@avandar/clients` CRUD, React 19, Mantine 9, TanStack Router and Query, Lingui, Vitest.

**Design:** `docs/superpowers/specs/2026-11-08-individual-assignment-design.md`

**Already done on this branch:** the roadmap text. P5c.3, P5c.6, P5c.8, and the demo rehearsal item in `docs/production-plan-world-humanitarian-day.md`, and the assignment bullet in `docs/measles-demo/measles-outbreak-response.md`. Do not edit those again unless the design changes.

---

## File structure

| File | Responsibility |
| --- | --- |
| `supabase/schemas/20.individuals.sql` | Assignment trigger, execute revoke, assignee index |
| `supabase/tests/database/individuals__assignment.test.sql` | Who may assign, and to whom |
| `supabase/migrations/<generated>_individuals_assignment.sql` | Generated. Never hand-written |
| `packages/shared/utils/src/filters/filters.ts` | `is` operator, null only |
| `packages/shared/utils/src/filters/doesValuePassFilters/doesValuePassFilters.ts` | In-memory null check |
| `packages/shared/utils/src/filters/isSingleValueOperator/isSingleValueOperator.ts` | `is` is not a single-value operator |
| `packages/shared/utils/src/filters/isArrayValueOperator/isArrayValueOperator.ts` | `is` is not an array operator |
| `packages/shared/utils/src/filters/bucketFiltersByColumn/bucketFiltersByColumn.ts` | Operator-shaped `is` survives bucketing |
| `packages/shared/utils/src/filters/where/where.ts` | Overload for `is` |
| `packages/shared/clients/src/SupabaseCrudClient/createSupabaseCrudClient.ts` | `.is(column, null)` and `order` |
| `packages/shared/clients/src/SqliteCrudClient/createSqliteCrudClient.ts` | `is null` and `order by` |
| `packages/shared/clients/src/ModelCrudClient/ModelCrudClient.types.ts` | `orderBy` on `getPage` |
| `packages/shared/clients/src/ModelCrudClient/createModelCrudClient.ts` | Pass `orderBy` through |
| `src/views/IndividualManagerApp/makeRecordsListWhere/` | One filter object for the list, the count, and the query key |
| `src/views/IndividualManagerApp/invalidateCaseStatusQueries/` | Also refresh the assignee queue |
| `src/views/IndividualManagerApp/SingleIndividualView/useRecordAssigneeChange/` | Optimistic save |
| `src/views/IndividualManagerApp/SingleIndividualView/RecordAssigneeControl/` | Header menu, or plain text |
| `src/views/IndividualManagerApp/IndividualNavbar/AssigneeFilter/` | Anyone, Unassigned, or a member |
| `src/views/IndividualManagerApp/groupRecordsByCaseType/` | Queue sections |
| `src/views/IndividualManagerApp/AssignedToMeView/` | The queue |
| `src/routes/_auth/$workspaceSlug/individual-manager/assigned.tsx` | The route |
| `src/config/AppLinks/AppLinks.tsx`, `src/config/NavbarLinks/NavbarLinks.tsx`, `src/components/layouts/RootLayout/makeMainNavbarLinksFromPermissions.ts` | Sidebar entry |

Leave Sync, `generateIndividuals`, and `individuals__sync_upsert_contract.test.sql` untouched. That test already proves a sync does not clear `assigned_to`.

---

### Task 1: Assignment trigger

**Files:**

- Create: `supabase/tests/database/individuals__assignment.test.sql`
- Modify: `supabase/schemas/20.individuals.sql` (append after `tr_individuals__check_status_change`)
- Create: the generated migration only, via `pnpm db:new-migration`

- [ ] **Step 1: Write the failing test**

```sql
\set ON_ERROR_STOP on

/**
 * Assigning a record. A Case Records editor may set assigned_to to a member
 * of the record's workspace, or clear it. A Case Types editor may insert and
 * rename a record and may not assign it. Anyone outside the workspace is
 * not an assignee. service_role is trusted, as it is for status.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('a9000001-0000-4000-8000-000000000001'::uuid, 'assign_owner@test.dev', 'authenticated', 'authenticated'),
  ('a9000002-0000-4000-8000-000000000002'::uuid, 'assign_types@test.dev', 'authenticated', 'authenticated'),
  ('a9000003-0000-4000-8000-000000000003'::uuid, 'assign_records@test.dev', 'authenticated', 'authenticated'),
  ('a9000004-0000-4000-8000-000000000004'::uuid, 'assign_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values (
  'a9001001-0000-4000-8000-000000000001'::uuid,
  'a9000001-0000-4000-8000-000000000001'::uuid,
  'assignment ws',
  'assignment-ws'
)
on conflict (id) do nothing;

insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('a9003001-0000-4000-8000-000000000001'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'Case types only', false),
  ('a9003002-0000-4000-8000-000000000002'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'Case records only', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('a9003001-0000-4000-8000-000000000001'::uuid, 'case_types', 'editor'),
  ('a9003002-0000-4000-8000-000000000002'::uuid, 'case_records', 'editor');

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('a9002001-0000-4000-8000-000000000001'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000001-0000-4000-8000-000000000001'::uuid, null),
  ('a9002002-0000-4000-8000-000000000002'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000002-0000-4000-8000-000000000002'::uuid, 'a9003001-0000-4000-8000-000000000001'::uuid),
  ('a9002003-0000-4000-8000-000000000003'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000003-0000-4000-8000-000000000003'::uuid, 'a9003002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values (
  'a9004001-0000-4000-8000-000000000001'::uuid,
  'a9000001-0000-4000-8000-000000000001'::uuid,
  'a9001001-0000-4000-8000-000000000001'::uuid,
  'assignment case type',
  true,
  'a9005001-0000-4000-8000-000000000001'::uuid
);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values (
  'a9005001-0000-4000-8000-000000000001'::uuid,
  'a9001001-0000-4000-8000-000000000001'::uuid,
  'a9004001-0000-4000-8000-000000000001'::uuid,
  'Active',
  '#40c057',
  0
);

insert into public.individuals (id, workspace_id, concept_id, external_id, name)
values (
  'a9006001-0000-4000-8000-000000000001'::uuid,
  'a9001001-0000-4000-8000-000000000001'::uuid,
  'a9004001-0000-4000-8000-000000000001'::uuid,
  'ext-1',
  'Record one'
);

select plan (8);

-- 1.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.individuals (workspace_id, concept_id, external_id, name)
  values (
    'a9001001-0000-4000-8000-000000000001'::uuid,
    'a9004001-0000-4000-8000-000000000001'::uuid,
    'ext-2',
    'Record two'
  );
  reset role;
  do $chk$
  begin
    if (
      select assigned_to from public.individuals
      where concept_id = 'a9004001-0000-4000-8000-000000000001'::uuid
        and external_id = 'ext-2'
    ) is not null then
      raise exception 'a synced record was inserted with an assignee';
    end if;
  end $chk$;
  $t1$,
  'a Case Types editor syncs in a record with no assignee'
);

reset role;

-- 2.
select throws_ok (
  $t2$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.individuals
  set assigned_to = 'a9000003-0000-4000-8000-000000000003'::uuid
  where id = 'a9006001-0000-4000-8000-000000000001'::uuid;
  $t2$,
  '42501',
  'Only Case Records editors can assign a record',
  'a Case Types editor cannot assign a record'
);

reset role;

-- 3.
select lives_ok (
  $t3$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a9000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.individuals
  set assigned_to = 'a9000003-0000-4000-8000-000000000003'::uuid
  where id = 'a9006001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select assigned_to from public.individuals
      where id = 'a9006001-0000-4000-8000-000000000001'::uuid
    ) is distinct from 'a9000003-0000-4000-8000-000000000003'::uuid then
      raise exception 'the assignee did not land';
    end if;
  end $chk$;
  $t3$,
  'a Case Records editor assigns a record to a workspace member'
);

reset role;

-- 4.
select throws_ok (
  $t4$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a9000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.individuals
  set assigned_to = 'a9000004-0000-4000-8000-000000000004'::uuid
  where id = 'a9006001-0000-4000-8000-000000000001'::uuid;
  $t4$,
  '23514',
  'A record can only be assigned to a member of its workspace',
  'a record cannot be assigned to someone outside the workspace'
);

reset role;

-- 5.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.individuals
  set name = 'Record one renamed'
  where id = 'a9006001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select assigned_to from public.individuals
      where id = 'a9006001-0000-4000-8000-000000000001'::uuid
    ) is distinct from 'a9000003-0000-4000-8000-000000000003'::uuid then
      raise exception 'renaming cleared the assignee';
    end if;
  end $chk$;
  $t5$,
  'renaming a record leaves its assignee in place'
);

reset role;

-- 6.
select lives_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a9000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.individuals
  set assigned_to = null
  where id = 'a9006001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select assigned_to from public.individuals
      where id = 'a9006001-0000-4000-8000-000000000001'::uuid
    ) is not null then
      raise exception 'the record is still assigned';
    end if;
  end $chk$;
  $t6$,
  'a Case Records editor unassigns a record'
);

reset role;

-- 7.
select lives_ok (
  $t7$
  set local role service_role;
  update public.individuals
  set assigned_to = 'a9000003-0000-4000-8000-000000000003'::uuid
  where id = 'a9006001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select assigned_to from public.individuals
      where id = 'a9006001-0000-4000-8000-000000000001'::uuid
    ) is distinct from 'a9000003-0000-4000-8000-000000000003'::uuid then
      raise exception 'the service role''s assignee did not land';
    end if;
  end $chk$;
  $t7$,
  'the service role assigns a record'
);

reset role;

-- 8.
select has_index (
  'public',
  'individuals',
  'idx_individuals__workspace_id_assigned_to',
  'records can be listed by workspace and assignee'
);

select * from finish ();

rollback;
```

- [ ] **Step 2: Run the test and watch it fail**

On any branch other than `develop`, run `ava supabase status` first. Continue only when the first line names this branch's own project. If it says `This is the develop local Supabase`, run `ava supabase switch` and check again. Do not run the database command against the shared `avandar` stack.

```bash
supabase test db supabase/tests/database/individuals__assignment.test.sql
```

Expected: FAIL. Test 2's update succeeds, because nothing yet rejects a Case Types editor. Test 8 fails because the index is absent.

- [ ] **Step 3: Add the trigger and the index**

Append to `supabase/schemas/20.individuals.sql`:

```sql
/**
 * Refuses an assignee change by a signed-in user who is not a Case Records
 * editor, and refuses an assignee who is not a member of the record's
 * workspace. RLS lets Case Types editors update records so they can sync
 * them, and a policy cannot single out one column, so this trigger guards
 * `assigned_to`.
 *
 * An insert that leaves the assignee empty passes, which is how Sync inserts
 * a record. Only Data API requests (`current_user = 'authenticated'`) are
 * checked. `service_role` is trusted.
 */
create or replace function public.individuals__check_assignment_change () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.assigned_to is not distinct from old.assigned_to then
    return new;
  end if;

  if tg_op = 'INSERT' and new.assigned_to is null then
    return new;
  end if;

  if not public.util__auth_user_meets_min_app_role (
    new.workspace_id,
    'case_records'::public.app_type,
    'editor'::public.role_level
  ) then
    raise exception 'Only Case Records editors can assign a record'
      using errcode = '42501', hint = 'case_records_editor_required';
  end if;

  if new.assigned_to is not null and not exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = new.workspace_id
      and membership.user_id = new.assigned_to
  ) then
    raise exception 'A record can only be assigned to a member of its workspace'
      using errcode = '23514', hint = 'assignee_not_in_workspace';
  end if;

  return new;
end;
$$;

revoke
execute on function public.individuals__check_assignment_change ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr_individuals__check_assignment_change before insert or
update of assigned_to on public.individuals for each row
execute function public.individuals__check_assignment_change ();

create index idx_individuals__workspace_id_assigned_to on public.individuals (workspace_id, assigned_to);
```

- [ ] **Step 4: Generate the migration and re-run the test**

Same `ava supabase status` gate as Step 2.

```bash
pnpm db:reset
pnpm db:new-migration individuals_assignment
```

Read the generated file. If it drops anything this task did not add, stop. That is the shared-stack diff bug. Reset, regenerate, and compare before trusting it.

```bash
supabase test db supabase/tests/database/individuals__assignment.test.sql
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/schemas/20.individuals.sql supabase/tests/database/individuals__assignment.test.sql supabase/migrations
git commit -m "$(cat <<'EOF'
feat(cases): guard who a record can be assigned to

EOF
)"
```

---

### Task 2: Null filter

**Files:**

- Modify: `packages/shared/utils/src/filters/filters.ts`
- Modify: `packages/shared/utils/src/filters/doesValuePassFilters/doesValuePassFilters.ts`
- Modify: `packages/shared/utils/src/filters/doesValuePassFilters/doesValuePassFilters.test.ts`
- Modify: `packages/shared/utils/src/filters/applyFiltersToRows/applyFiltersToRows.test.ts`
- Modify: `packages/shared/utils/src/filters/isSingleValueOperator/isSingleValueOperator.ts`
- Modify: `packages/shared/utils/src/filters/isArrayValueOperator/isArrayValueOperator.ts`
- Modify: `packages/shared/utils/src/filters/bucketFiltersByColumn/bucketFiltersByColumn.ts`
- Modify: `packages/shared/utils/src/filters/where/where.ts`
- Modify: `packages/shared/clients/src/SupabaseCrudClient/createSupabaseCrudClient.ts`
- Modify: `packages/shared/clients/src/SqliteCrudClient/createSqliteCrudClient.ts`
- Modify: `packages/shared/clients/src/SqliteCrudClient/createSqliteCrudClient.test.ts`
- Modify: `packages/shared/utils/README.md` (`FilterOperator` row: "`eq`, `in`, and `is` (null only)")

`eq` with a null value does not become SQL `is null`. Unassigned needs its own operator. The value is always `null`. There is no `is not null` operator.

- [ ] **Step 1: Write the failing tests**

In `doesValuePassFilters.test.ts`:

```ts
it("treats is as a null check", () => {
  expect(doesValuePassFilters(null, "is", null)).toBe(true);
  expect(doesValuePassFilters(undefined, "is", null)).toBe(true);
  expect(doesValuePassFilters("user-1", "is", null)).toBe(false);
});
```

In `applyFiltersToRows.test.ts`:

```ts
it("keeps rows whose column is null when the filter is is", () => {
  const rows = [{ id: "1", assignee: null }, { id: "2", assignee: "user-1" }];
  expect(
    applyFiltersToRows(rows, { assignee: { is: null } }),
  ).toEqual([{ id: "1", assignee: null }]);
});

it("keeps nulls when is is written in the operator shape", () => {
  const rows = [{ id: "1", assignee: null }, { id: "2", assignee: "user-1" }];
  expect(
    applyFiltersToRows(rows, { is: [["assignee", null]] }),
  ).toEqual([{ id: "1", assignee: null }]);
});
```

In `createSqliteCrudClient.test.ts`, inside the existing `describe`:

```ts
it("getPage applies WHERE filters with is null and binds no value", async () => {
  let received: Record<string, unknown> | undefined;
  sqliteTransport.query.mockImplementation((payload) => {
    received = payload as Record<string, unknown>;
    return { rows: [] };
  });
  const client = makeClient();
  await client.getPage({
    pageSize: 10,
    pageNum: 0,
    where: { color: { is: null } },
  });
  expect(received?.sql).toMatch(/where "color" is null/);
  expect(received?.params).toEqual([10, 0]);
});
```

- [ ] **Step 2: Run the tests and watch them fail**

```bash
pnpm --filter @avandar/utils exec vitest run src/filters/doesValuePassFilters/doesValuePassFilters.test.ts src/filters/applyFiltersToRows/applyFiltersToRows.test.ts
pnpm --filter @avandar/clients exec vitest run src/SqliteCrudClient/createSqliteCrudClient.test.ts
```

Expected: FAIL. `doesValuePassFilters` does not accept `"is"`. The sqlite match is not exhaustive once the type includes it, or the SQL still uses `=`.

- [ ] **Step 3: Add the operator**

In `filters.ts`, add the operator and thread it through the records. Keep `eq` and `in` as they are.

```ts
export const NULL_OPERATORS = ["is"] as const;

export type NullOperator = (typeof NULL_OPERATORS)[number];

export type FilterOperator = SingleValueOperator | ArrayValueOperator | NullOperator;

export const FILTER_TYPES = [
  ...SINGLE_VALUE_OPERATORS,
  ...ARRAY_VALUE_OPERATORS,
  ...NULL_OPERATORS,
] as const;
```

Extend `FilterOperatorRecord`:

```ts
export type FilterOperatorRecord<TargetValue> = Partial<
  Record<SingleValueOperator, TargetValue | undefined>
> &
  Partial<Record<ArrayValueOperator, ReadonlyArray<TargetValue | undefined>>> &
  Partial<Record<NullOperator, null>>;
```

Extend `FiltersByOperator` with a null pair. A null pair is `[column, null]`.

```ts
type ColumnNullPairs<T extends UnknownObject> = Array<
  { [K in keyof T]: [column: K, targetValue: null] }[keyof T]
>;

export type FiltersByOperator<T extends UnknownObject> = Partial<
  Record<SingleValueOperator, ColumnTargetValuePairs<T>> &
    Record<ArrayValueOperator, ColumnTargetValueArrayPairs<T>> &
    Record<NullOperator, ColumnNullPairs<T>>
>;
```

`doesValuePassFilters`:

```ts
.with("is", () => {
  return value == null && targetValue == null;
})
```

`isSingleValueOperator` and `isArrayValueOperator` each gain:

```ts
.with("is", () => {
  return false;
})
```

`bucketFiltersByColumn`, inside the tuple loop, before the single-value branch:

```ts
if (operator === "is") {
  filtersByColumn[column].is = null;
  return;
}
```

`where.ts` gains an overload ahead of the implementation signature:

```ts
export function where<T extends UnknownObject, K extends keyof T>(
  column: K,
  operator: NullOperator,
  value: null,
): { where: FiltersByColumn<T> };
```

Import `NullOperator` in that file.

`createSupabaseCrudClient.ts`, in `_applyFiltersToSupabaseQuery`, add a match arm. Use `query`, not a copy, because the builder mutates and returns itself, which is what the `eq` arm already does.

```ts
.with("is", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newQuery = query.is(String(column), null);
})
```

`createSqliteCrudClient.ts`, in `_buildWhereClause`:

```ts
.with("is", () => {
  clauses.push(`${quotedColumn} is null`);
})
```

Update the comment above `_buildWhereClause` so it names `eq`, `in`, and `is`.

- [ ] **Step 4: Run the tests and watch them pass**

```bash
pnpm --filter @avandar/utils exec vitest run src/filters
pnpm --filter @avandar/clients exec vitest run src/SqliteCrudClient/createSqliteCrudClient.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/utils packages/shared/clients
git commit -m "$(cat <<'EOF'
feat(filters): match an empty column with is null

EOF
)"
```

---

### Task 3: Stable page order

**Files:**

- Modify: `packages/shared/clients/src/ModelCrudClient/ModelCrudClient.types.ts`
- Modify: `packages/shared/clients/src/ModelCrudClient/createModelCrudClient.ts`
- Modify: `packages/shared/clients/src/SupabaseCrudClient/createSupabaseCrudClient.ts`
- Modify: `packages/shared/clients/src/SqliteCrudClient/createSqliteCrudClient.ts`
- Modify: `packages/shared/clients/src/SqliteCrudClient/createSqliteCrudClient.test.ts`
- Modify: `packages/shared/clients/README.md` (`getPage` row gains `orderBy?`)

The queue groups by case type. Pages have to arrive ordered by `concept_id`, then `name`, or a case type splits across the list as the user loads more. Existing callers pass no `orderBy` and stay unordered.

- [ ] **Step 1: Write the failing test**

In `createSqliteCrudClient.test.ts`:

```ts
it("getPage orders by the requested columns before the page window", async () => {
  let received: Record<string, unknown> | undefined;
  sqliteTransport.query.mockImplementation((payload) => {
    received = payload as Record<string, unknown>;
    return { rows: [] };
  });
  const client = makeClient();
  await client.getPage({
    pageSize: 10,
    pageNum: 0,
    orderBy: [
      { column: "color", direction: "asc" },
      { column: "name", direction: "desc" },
    ],
  });
  expect(received?.sql).toMatch(/order by "color" asc, "name" desc limit \?/);
  expect(received?.params).toEqual([10, 0]);
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm --filter @avandar/clients exec vitest run src/SqliteCrudClient/createSqliteCrudClient.test.ts
```

Expected: FAIL. `getPage` does not accept `orderBy`.

- [ ] **Step 3: Thread `orderBy` through**

On `ModelCrudFunctions.getPage` and on the public `getPage` in `createModelCrudClient.ts`, add:

```ts
orderBy?: ReadonlyArray<{
  column: keyof M["DBRead"] & string;
  direction: "asc" | "desc";
}>;
```

`_getPage` takes the same optional field and passes it to `crudFunctions.getPage`. The public `getPage` passes `params.orderBy` into `_getPage`. `getAll` does not grow an `orderBy` argument.

Supabase `getPage`, after filters and before `.range`:

```ts
for (const order of params.orderBy ?? []) {
  query = query.order(String(order.column), {
    ascending: order.direction === "asc",
  });
}
```

SQLite, a helper next to `_ident`:

```ts
const ORDER_COLUMN = /^[a-z_][a-z0-9_]*$/;

function _orderByClause(
  orderBy:
    | ReadonlyArray<{ column: string; direction: "asc" | "desc" }>
    | undefined,
): string {
  if (!orderBy || orderBy.length === 0) {
    return "";
  }
  const parts = orderBy.map((order) => {
    if (!ORDER_COLUMN.test(order.column)) {
      throw new Error(`Unsupported order column: ${order.column}`);
    }
    return `${_ident(order.column)} ${order.direction}`;
  });
  return ` order by ${parts.join(", ")}`;
}
```

`getPage` SQL becomes:

```ts
const sql = `select * from ${table}${where}${_orderByClause(params.orderBy)} limit ? offset ?`;
```

The thrown `Error` is for a bad column name from our own call, not a message the UI shows.

- [ ] **Step 4: Run the test and watch it pass**

```bash
pnpm --filter @avandar/clients exec vitest run src/SqliteCrudClient/createSqliteCrudClient.test.ts
```

Expected: PASS, including the existing unordered `getPage` tests.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/clients
git commit -m "$(cat <<'EOF'
feat(clients): order a page when the caller names columns

EOF
)"
```

---

### Task 4: Records-list filter

**Files:**

- Create: `src/views/IndividualManagerApp/makeRecordsListWhere/makeRecordsListWhere.ts`
- Create: `src/views/IndividualManagerApp/makeRecordsListWhere/makeRecordsListWhere.test.ts`
- Delete: `src/views/IndividualManagerApp/makeRecordsWhereFromStatusFilter/` (after the imports move)
- Modify: `src/views/IndividualManagerApp/IndividualNavbar/IndividualNavbar.tsx`
- Modify: `src/views/IndividualManagerApp/useConceptIndividuals.ts`
- Modify: `src/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries.test.ts`

One function builds the `where` the list, the count, and the query key share. Assignee is anyone, unassigned, or one member.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { makeRecordsListWhere } from "@/views/IndividualManagerApp/makeRecordsListWhere/makeRecordsListWhere";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { User } from "$/models/User/User";

const CONCEPT_ID = "00000000-0000-4000-8000-0000000000c1" as Concept.Id;
const SUSPECTED_ID = "00000000-0000-4000-8000-0000000000a1" as ConceptStatus.Id;
const CONFIRMED_ID = "00000000-0000-4000-8000-0000000000a2" as ConceptStatus.Id;
const MEMBER_ID = "00000000-0000-4000-8000-0000000000b1" as User.Id;

describe("makeRecordsListWhere", () => {
  it("filters by case type alone when no status or assignee is chosen", () => {
    expect(
      makeRecordsListWhere({
        conceptId: CONCEPT_ID,
        statusIds: [],
        assignee: { kind: "anyone" },
      }),
    ).toEqual({ where: { concept_id: { eq: CONCEPT_ID } } });
  });

  it("lists the chosen statuses in one order however they were picked", () => {
    expect(
      makeRecordsListWhere({
        conceptId: CONCEPT_ID,
        statusIds: [CONFIRMED_ID, SUSPECTED_ID],
        assignee: { kind: "anyone" },
      }),
    ).toEqual({
      where: {
        concept_id: { eq: CONCEPT_ID },
        status_id: { in: [SUSPECTED_ID, CONFIRMED_ID] },
      },
    });
  });

  it("matches records with an empty assignee", () => {
    expect(
      makeRecordsListWhere({
        conceptId: CONCEPT_ID,
        statusIds: [],
        assignee: { kind: "unassigned" },
      }),
    ).toEqual({
      where: {
        concept_id: { eq: CONCEPT_ID },
        assigned_to: { is: null },
      },
    });
  });

  it("matches records assigned to one member, including a status filter", () => {
    expect(
      makeRecordsListWhere({
        conceptId: CONCEPT_ID,
        statusIds: [SUSPECTED_ID],
        assignee: { kind: "member", userId: MEMBER_ID },
      }),
    ).toEqual({
      where: {
        concept_id: { eq: CONCEPT_ID },
        status_id: { in: [SUSPECTED_ID] },
        assigned_to: { eq: MEMBER_ID },
      },
    });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm test:frontend src/views/IndividualManagerApp/makeRecordsListWhere/makeRecordsListWhere.test.ts
```

Expected: FAIL. The module does not exist.

- [ ] **Step 3: Implement the filter and retarget the callers**

```ts
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { User } from "$/models/User/User";
import type { FiltersByColumn } from "@avandar/utils";

/**
 * Who the records list is narrowed to.
 *
 * `anyone` adds no assignee clause. `unassigned` matches an empty
 * `assigned_to`. `member` matches that user's id.
 */
export type AssigneeFilter =
  | { kind: "anyone" }
  | { kind: "unassigned" }
  | { kind: "member"; userId: User.Id };

/**
 * The filter for one case type's records.
 *
 * The records list, its count, and both of their query keys use this one
 * filter, so the count in the list header always matches the rows under it.
 * Status ids are sorted so one selection picked in a different order shares
 * a query key.
 */
export function makeRecordsListWhere(
  options: Readonly<{
    conceptId: Concept.Id;
    statusIds: readonly ConceptStatus.Id[];
    assignee: AssigneeFilter;
  }>,
): { where: FiltersByColumn<Individual.T<"DBRead">> } {
  const { conceptId, statusIds, assignee } = options;
  const where: FiltersByColumn<Individual.T<"DBRead">> = {
    concept_id: { eq: conceptId },
  };
  if (statusIds.length > 0) {
    where.status_id = { in: [...statusIds].sort() };
  }
  if (assignee.kind === "unassigned") {
    where.assigned_to = { is: null };
  }
  if (assignee.kind === "member") {
    where.assigned_to = { eq: assignee.userId };
  }
  return { where };
}
```

Replace every `makeRecordsWhereFromStatusFilter` import with `makeRecordsListWhere`. Callers that only have statuses pass `assignee: { kind: "anyone" }`. That is `IndividualNavbar.tsx`, `useConceptIndividuals.ts`, and `invalidateCaseStatusQueries.test.ts`. `useConceptIndividuals` grows an `assignee` argument and forwards it. Default it to `{ kind: "anyone" }` so a caller that has not been updated still lists every assignee.

```ts
const ANYONE: AssigneeFilter = { kind: "anyone" };

export function useConceptIndividuals(
  options: Readonly<{
    conceptId: Concept.Id;
    statusIds?: readonly ConceptStatus.Id[];
    assignee?: AssigneeFilter;
  }>,
): ConceptIndividualsPage {
  const { conceptId, statusIds = NO_STATUS_IDS, assignee = ANYONE } = options;
  const recordsWhere = makeRecordsListWhere({ conceptId, statusIds, assignee });
  // query key and getPage stay as they are, spreading recordsWhere
}
```

Delete the old folder once nothing imports it.

- [ ] **Step 4: Run the tests**

```bash
pnpm test:frontend src/views/IndividualManagerApp/makeRecordsListWhere/makeRecordsListWhere.test.ts src/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/IndividualManagerApp
git commit -m "$(cat <<'EOF'
feat(cases): filter a case type's records by assignee

EOF
)"
```

---

### Task 5: Refresh the queue after a save

**Files:**

- Modify: `src/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries.ts`
- Modify: `src/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries.test.ts`

The queue's query key filters `assigned_to` and does not name a case type. The existing predicate only sees queries whose `where` names `concept_id`, so a save would leave Assigned to me stale.

- [ ] **Step 1: Write the failing test**

Add a key to the seeded cache:

```ts
assigneeQueue: IndividualClient.QueryKeys.getAll({
  where: {
    assigned_to: { eq: "00000000-0000-4000-8000-0000000000b1" },
  },
}),
```

Seed it the same way as the other keys. Add a test:

```ts
it("marks the assignee queue stale when a record's assignee changes, and leaves another case type's list alone", async () => {
  const { queryClient, keys } = _makeSeededCache();
  const router = _makeRouter();

  await invalidateCaseStatusQueries({
    queryClient,
    router,
    conceptId: CONCEPT_ID,
    change: "recordAssignment",
  });

  expect(_isStale(queryClient, keys.assigneeQueue)).toBe(true);
  expect(_isStale(queryClient, keys.filteredRecords)).toBe(true);
  expect(_isStale(queryClient, keys.otherCaseTypeRecords)).toBe(false);
  expect(router.invalidate).toHaveBeenCalledOnce();
});
```

A status change already marks `filteredRecords` stale and leaves `otherCaseTypeRecords` fresh. This test asks the same of an assignment change, plus the queue.

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm test:frontend src/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries.test.ts
```

Expected: FAIL. `"recordAssignment"` is not a `change` value.

- [ ] **Step 3: Invalidate assignee queries**

Extend `change` with `"recordAssignment"`. Add:

```ts
function _isAssigneeQuery(queryKey: QueryKey): boolean {
  const [clientName, , params] = queryKey;
  if (clientName !== IndividualClient.getClientName() || !isPlainObject(params)) {
    return false;
  }
  const { where } = params;
  return isPlainObject(where) && isPlainObject(where.assigned_to);
}
```

`recordAssignment` runs the same invalidations as `recordStatus` (this case type's individual queries, its statuses, every data query, and `router.invalidate`). It also pushes:

```ts
queryClient.invalidateQueries({
  predicate: (query) => {
    return _isAssigneeQuery(query.queryKey);
  },
});
```

A case type's own filtered list is already covered by the concept predicate, because its `where` still has `concept_id`. The extra predicate exists for the queue, which has no `concept_id`.

- [ ] **Step 4: Run the test and watch it pass**

```bash
pnpm test:frontend src/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries.test.ts
```

Expected: PASS, including the existing status tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/IndividualManagerApp/invalidateCaseStatusQueries
git commit -m "$(cat <<'EOF'
feat(cases): refresh assignee lists after a record is assigned

EOF
)"
```

---

### Task 6: Header control

**Files:**

- Create: `src/views/IndividualManagerApp/SingleIndividualView/useRecordAssigneeChange/useRecordAssigneeChange.ts`
- Create: `src/views/IndividualManagerApp/SingleIndividualView/useRecordAssigneeChange/useRecordAssigneeChange.test.tsx`
- Create: `src/views/IndividualManagerApp/SingleIndividualView/RecordAssigneeControl/RecordAssigneeControl.tsx`
- Create: `src/views/IndividualManagerApp/SingleIndividualView/RecordAssigneeControl/RecordAssigneeMenu.tsx`
- Create: `src/views/IndividualManagerApp/SingleIndividualView/RecordAssigneeControl/RecordAssigneeControl.module.css`
- Modify: `src/views/IndividualManagerApp/SingleIndividualView/index.tsx`

The parser already turns `assignedTo: undefined` into `assigned_to: null` and keeps that null (`excludeNullsExceptInProps`). Unassign is an update of `{ assignedTo: undefined }`. Do not add a second write path.

- [ ] **Step 1: Write the failing hook test**

Follow `useRecordStatusChange.test.tsx`: mock `IndividualClient.useUpdate`, `invalidateCaseStatusQueries`, and `notifyError`. Use the same `RECORD` fixture.

```ts
it("saves the picked member and ignores a second pick while that save is in flight", () => {
  isUpdatePendingRef.current = false;
  const { result } = renderHook(() => {
    return useRecordAssigneeChange(RECORD);
  });

  act(() => {
    result.current.changeAssignee(MEMBER_ID);
  });
  act(() => {
    result.current.changeAssignee(OTHER_MEMBER_ID);
  });

  expect(updateMock).toHaveBeenCalledTimes(1);
  expect(updateMock).toHaveBeenCalledWith({
    id: RECORD.id,
    data: { assignedTo: MEMBER_ID },
  });
  expect(result.current.displayedAssigneeId).toBe(MEMBER_ID);
});

it("clears the assignee when the pick is empty", () => {
  const assigned = { ...RECORD, assignedTo: MEMBER_ID };
  const { result } = renderHook(() => {
    return useRecordAssigneeChange(assigned);
  });

  act(() => {
    result.current.changeAssignee(undefined);
  });

  expect(updateMock).toHaveBeenCalledWith({
    id: RECORD.id,
    data: { assignedTo: undefined },
  });
  expect(result.current.displayedAssigneeId).toBeUndefined();
});

it("restores the previous assignee and says when the editor role is missing", () => {
  const { result } = renderHook(() => {
    return useRecordAssigneeChange(RECORD);
  });

  act(() => {
    result.current.changeAssignee(MEMBER_ID);
  });
  act(() => {
    updateOptionsRef.current?.onError({ hint: "case_records_editor_required" });
  });

  expect(result.current.displayedAssigneeId).toBeUndefined();
  expect(notifyErrorMock).toHaveBeenCalledWith(
    expect.objectContaining({
      message: expect.stringContaining("Case Records editor"),
    }),
  );
});
```

`MEMBER_ID` and `OTHER_MEMBER_ID` are `User.Id` constants. The role toast's exact sentence is `You need Case Records editor access to assign a record.` The generic failure sentence is `The record keeps its previous assignee. Try again in a moment.` Title: `Assignment not changed`. A hint of `assignee_not_in_workspace` uses `That person is not a member of this workspace.`

On success the hook calls `invalidateCaseStatusQueries` with `change: "recordAssignment"` and clears the pending value. The status hook test asserts that refresh. Assert it here too:

```ts
await act(async () => {
  await updateOptionsRef.current?.onSuccess();
});
expect(invalidateMock).toHaveBeenCalledWith(
  expect.objectContaining({
    conceptId: RECORD.conceptId,
    change: "recordAssignment",
  }),
);
expect(result.current.displayedAssigneeId).toBeUndefined();
```

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm test:frontend src/views/IndividualManagerApp/SingleIndividualView/useRecordAssigneeChange/useRecordAssigneeChange.test.tsx
```

Expected: FAIL. The hook does not exist.

- [ ] **Step 3: Implement the hook, the control, and mount it**

`useRecordAssigneeChange.ts`. Pending `null` means "saving an unassign". Pending `undefined` means nothing is in flight. A `User.Id` means that member is being saved.

The three toast sentences stay inline in `onError`. Lingui extracts `t` tagged templates at their own call site, and a helper that takes `t` hides them from the catalog. `_hint` reads the database hint and returns no copy.

```ts
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { Logger } from "@/utils/Logger";
import { notifyError } from "@/utils/notifications/notify";
import { invalidateCaseStatusQueries } from "@/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { User } from "$/models/User/User";

const RECORDS_EDITOR_REQUIRED_HINT = "case_records_editor_required";
const ASSIGNEE_NOT_IN_WORKSPACE_HINT = "assignee_not_in_workspace";

type RecordAssigneeChange = {
  /** The assignee to show. Empty while an unassign is being saved. */
  displayedAssigneeId: string | undefined;
  isSaving: boolean;
  changeAssignee: (userId: User.Id | undefined) => void;
};

function _hint(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "hint" in error) {
    const hint = error.hint;
    return typeof hint === "string" ? hint : undefined;
  }
  return undefined;
}

export function useRecordAssigneeChange(
  individual: Individual.T,
): RecordAssigneeChange {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pendingAssignee, setPendingAssignee] = useState<
    User.Id | null | undefined
  >();
  const [updateIndividual, isUpdatePending] = IndividualClient.useUpdate({
    onSuccess: async () => {
      await invalidateCaseStatusQueries({
        queryClient,
        router,
        conceptId: individual.conceptId,
        change: "recordAssignment",
      });
      setPendingAssignee(undefined);
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Changing a record's assignee failed" });
      setPendingAssignee(undefined);
      const hint = _hint(error);
      notifyError({
        title: t`Assignment not changed`,
        message:
          hint === RECORDS_EDITOR_REQUIRED_HINT
            ? t`You need Case Records editor access to assign a record.`
            : hint === ASSIGNEE_NOT_IN_WORKSPACE_HINT
              ? t`That person is not a member of this workspace.`
              : t`The record keeps its previous assignee. Try again in a moment.`,
      });
    },
  });
  const displayedAssigneeId =
    pendingAssignee === undefined
      ? individual.assignedTo
      : (pendingAssignee ?? undefined);
  const isSaving = isUpdatePending || pendingAssignee !== undefined;

  return {
    displayedAssigneeId,
    isSaving,
    changeAssignee: (userId) => {
      if (isSaving || userId === displayedAssigneeId) {
        return;
      }
      setPendingAssignee(userId ?? null);
      updateIndividual({ id: individual.id, data: { assignedTo: userId } });
    },
  };
}
```

`RecordAssigneeControl` takes `members: readonly UserProfile.WithRole[] | undefined` (`undefined` while they load), `isMembersError: boolean`, `assigneeId: string | undefined`, `canEdit`, `isSaving`, and `onChange: (userId: User.Id | undefined) => void`.

Label rules, in the component, with `<Trans>` or `t` at this call site:

- `assigneeId` empty: "Unassigned"
- members still loading: a `Skeleton` of height 14 and width 96, `aria-hidden`, and the button's accessible name is `t`Assigned to``
- members loaded, id missing, and the query did not fail: "Former member"
- members failed to load: "Unassigned" is wrong. Show `t`Assignee unavailable`` and do not open the menu
- otherwise: `member.displayName`

An editor gets `RecordAssigneeMenu`. Everyone else gets the label as `Text` size `sm`, with no chevron. Hidden-as-disabled is the status control's rule: a viewer is not shown a control that does nothing.

`RecordAssigneeMenu` copies `RecordStatusMenu`'s structure. `Menu` `position="bottom-start"` `width={260}`, disabled while `isSaving`. Target is an `UnstyledButton` whose accessible name is `t`Assigned to: ${label}``. `aria-busy={isSaving}`. Chevron `IconChevronDown` size 14. Dropdown label `<Trans>Assign to</Trans>`. First item is Unassigned (`onChange(undefined)`). Then members sorted by `displayName` with `localeCompare`. The current item sets `aria-current` and an `IconCheck`. Pick calls `onChange(member.userId)`.

CSS module, the same trigger treatment as the status control:

```css
.recordAssigneeControlTrigger {
  align-items: center;
  border-radius: var(--mantine-radius-sm);
  display: inline-flex;
  gap: var(--mantine-spacing-xxs);
  max-width: 16rem;
  padding: 2px var(--mantine-spacing-xxs) 2px 2px;
  transition: var(--ava-transition-interactive);
}

.recordAssigneeControlTrigger:hover,
.recordAssigneeControlTrigger[data-expanded] {
  background-color: var(--mantine-color-neutral-1);
}

.recordAssigneeControlLabel {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recordAssigneeControlChevron {
  color: var(--mantine-color-neutral-6);
  flex-shrink: 0;
}
```

In `SingleIndividualView`, the header accessory becomes a `Group` `gap="xs"` `wrap="nowrap"` containing `RecordStatusControl` and `RecordAssigneeControl`. The view already loads members. Pass `members`, `isMembersError` from the workspace-users query (the hook's error flag, not a new request), `canEdit={canChangeStatus}`, and the hook's displayed id, saving flag, and `changeAssignee`. `canChangeStatus` is `case_records__can_edit_record`. Reuse it. Do not add a permission key.

Keep each component at or under 45 lines. `RecordAssigneeMenu`'s member rows can be a `AssigneeMenuItem` in the same file if the menu function would pass that line.

- [ ] **Step 4: Run the hook test**

```bash
pnpm test:frontend src/views/IndividualManagerApp/SingleIndividualView/useRecordAssigneeChange/useRecordAssigneeChange.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/IndividualManagerApp/SingleIndividualView
git commit -m "$(cat <<'EOF'
feat(cases): assign a record from its header

EOF
)"
```

---

### Task 7: Assignee filter and row label

**Files:**

- Create: `src/views/IndividualManagerApp/IndividualNavbar/AssigneeFilter/AssigneeFilter.tsx`
- Modify: `src/views/IndividualManagerApp/IndividualNavbar/IndividualNavbar.tsx`
- Modify: `src/views/IndividualManagerApp/IndividualNavbar/IndividualNavbarRows.tsx`
- Modify: `src/views/IndividualManagerApp/useVirtualIndividualLinks.tsx`

- [ ] **Step 1: There is no new pure function here**

The filter value is `AssigneeFilter` from Task 4, and that task's tests cover the `where` it produces. This task is the control and the row. Do not add a test that only renders the select.

- [ ] **Step 2: Build the filter**

`AssigneeFilter` props: `members: readonly UserProfile.WithRole[] | undefined`, `value: AssigneeFilter`, `onChange: (assignee: AssigneeFilter) => void`.

Mantine `Select`, `size="xs"`, `searchable`, `clearable`. `aria-label={t`Filter by assignee`}`. `clearButtonProps={{ "aria-label": t`Show every assignee` }}`. Placeholder `t`Anyone` when `value.kind === "anyone"`.

The unassigned option's value is the string `"unassigned"`, which is not a user id. Members use `userId` as the value and `displayName` as the label, sorted with `localeCompare`. Data is `[{ value: "unassigned", label: t`Unassigned` }, ...memberOptions]`.

`onChange`: `null` becomes `{ kind: "anyone" }`. `"unassigned"` becomes `{ kind: "unassigned" }`. Any other string becomes `{ kind: "member", userId: uuid(that string) as User.Id }` using the project's `uuid` helper. The select's `value` is `null` for anyone, `"unassigned"`, or the member id.

While `members` is `undefined`, still render the select with only the Unassigned option and `disabled` on the member section by passing `data` of just Unassigned. Do not block the status filter on this load.

- [ ] **Step 3: Wire the list**

`IndividualNavbar` holds `assignee` in `useState<AssigneeFilter>({ kind: "anyone" })`, next to the status ids. Both the count and `useConceptIndividuals` receive it through `makeRecordsListWhere` / the hook argument.

The pane's `filter` is a `Stack` `gap="xs"` of `StatusFilter` then `AssigneeFilter`. Load members with `WorkspaceClient.useGetUsersForWorkspace` for `concept.workspaceId`. The concept type already carries `workspaceId`.

`IndividualNavbarRows` replaces the `isFiltered` boolean with `emptyMessage?: ReactNode`. When there are no records and the first page is not loading, render `emptyMessage` if it was passed, otherwise `<Trans>No records yet</Trans>`. The parent passes:

- no status and anyone: `undefined`
- status and an assignee filter together: `<Trans>No records match these filters</Trans>`
- unassigned only: `<Trans>No records are unassigned</Trans>`
- a member only: `<Trans>No records are assigned to this person</Trans>`
- status only: `<Trans>No records have these statuses</Trans>`

Those `<Trans>` nodes are created in `IndividualNavbar`, not in a module that receives `t`.

`useVirtualIndividualLinks` takes `membersById: ReadonlyMap<string, UserProfile.WithRole> | undefined`. Each record link sets `description` to:

- map `undefined`: omit the description (members are still loading)
- `assignedTo` empty: the already-translated string from `t`Unassigned`` inside the hook, which calls `useLingui` today
- id present in the map: `displayName`
- id missing: `t`Former member``

`ROW_HEIGHT_PX` becomes 64 so the description line fits. The description is a string prop on the `NavLink`, not a second color.

- [ ] **Step 4: Run the list filter tests**

```bash
pnpm test:frontend src/views/IndividualManagerApp/makeRecordsListWhere/makeRecordsListWhere.test.ts src/views/IndividualManagerApp/IndividualNavbar
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/IndividualManagerApp/IndividualNavbar src/views/IndividualManagerApp/useVirtualIndividualLinks.tsx
git commit -m "$(cat <<'EOF'
feat(cases): show and filter who a record is assigned to

EOF
)"
```

---

### Task 8: Assigned to me

**Files:**

- Create: `src/views/IndividualManagerApp/groupRecordsByCaseType/groupRecordsByCaseType.ts`
- Create: `src/views/IndividualManagerApp/groupRecordsByCaseType/groupRecordsByCaseType.test.ts`
- Create: `src/views/IndividualManagerApp/AssignedToMeView/AssignedToMeView.tsx`
- Create: `src/views/IndividualManagerApp/AssignedToMeView/useAssignedRecords.ts`
- Create: `src/routes/_auth/$workspaceSlug/individual-manager/assigned.tsx`
- Modify: `src/config/AppLinks/AppLinks.tsx`
- Modify: `src/config/NavbarLinks/NavbarLinks.tsx`
- Modify: `src/components/layouts/RootLayout/makeMainNavbarLinksFromPermissions.ts`
- Modify: `src/components/layouts/RootLayout/WorkspaceLayout/WorkspaceLayout.test.ts`
- Modify: `src/routeTree.gen.ts` by regenerating it, never by hand

- [ ] **Step 1: Write the failing tests**

`groupRecordsByCaseType.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { groupRecordsByCaseType } from "@/views/IndividualManagerApp/groupRecordsByCaseType/groupRecordsByCaseType";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Individual } from "$/models/ontology/Individual/Individual";

const CASES = "00000000-0000-4000-8000-0000000000c1" as Concept.Id;
const CONTACTS = "00000000-0000-4000-8000-0000000000c2" as Concept.Id;

function _record(id: string, conceptId: Concept.Id): Individual.T {
  return {
    assignedTo: "00000000-0000-4000-8000-0000000000b1",
    conceptId,
    createdAt: "2026-11-01T00:00:00.000Z",
    externalId: id,
    id: id as Individual.Id,
    missingFromSourceAt: undefined,
    name: id,
    statusId: "00000000-0000-4000-8000-0000000000a1" as Individual.T["statusId"],
    updatedAt: "2026-11-01T00:00:00.000Z",
    workspaceId: "00000000-0000-4000-8000-0000000000e1" as Individual.T["workspaceId"],
  };
}

describe("groupRecordsByCaseType", () => {
  it("keeps the first case type first and appends later rows of it", () => {
    const groups = groupRecordsByCaseType([
      _record("a", CASES),
      _record("b", CONTACTS),
      _record("c", CASES),
    ]);

    expect(groups.map((group) => group.conceptId)).toEqual([CASES, CONTACTS]);
    expect(groups[0]?.records.map((record) => record.name)).toEqual(["a", "c"]);
    expect(groups[1]?.records.map((record) => record.name)).toEqual(["b"]);
  });

  it("returns no groups for no records", () => {
    expect(groupRecordsByCaseType([])).toEqual([]);
  });
});
```

In `WorkspaceLayout.test.ts`:

```ts
it("puts Assigned to me ahead of the case types when the user can view records", () => {
  const links = makeMainNavbarLinksFromPermissions({
    ...NO_APP_ACCESS,
    canAccessCaseRecords: true,
    individualManagerLinks: [COUNTY_RECORDS_LINK],
  });
  const paths = links.map(prop("link.to"));

  expect(paths).toContain("/$workspaceSlug/individual-manager/assigned");
  expect(paths.indexOf("/$workspaceSlug/individual-manager/assigned")).toBeLessThan(
    paths.indexOf(COUNTY_RECORDS_LINK.link.to),
  );
});

it("omits Assigned to me when the user cannot view records", () => {
  const links = makeMainNavbarLinksFromPermissions({
    ...NO_APP_ACCESS,
    individualManagerLinks: [COUNTY_RECORDS_LINK],
  });

  expect(links.map(prop("link.to"))).not.toContain(
    "/$workspaceSlug/individual-manager/assigned",
  );
});
```

- [ ] **Step 2: Run them and watch them fail**

```bash
pnpm test:frontend src/views/IndividualManagerApp/groupRecordsByCaseType/groupRecordsByCaseType.test.ts src/components/layouts/RootLayout/WorkspaceLayout/WorkspaceLayout.test.ts
```

Expected: FAIL. The group function and the route are missing.

- [ ] **Step 3: Group, query, view, route, link**

```ts
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Individual } from "$/models/ontology/Individual/Individual";

/** The loaded records of one case type, in the order they were given. */
export type CaseTypeRecordGroup = {
  conceptId: Concept.Id;
  records: Individual.T[];
};

/**
 * Groups records by case type, in the order each case type first appears.
 *
 * The queue asks the database for `concept_id` then `name`, so a case type's
 * rows arrive together. The map still appends if a later page repeats one,
 * which keeps a split page in the section it already opened.
 */
export function groupRecordsByCaseType(
  records: readonly Individual.T[],
): CaseTypeRecordGroup[] {
  const groups: CaseTypeRecordGroup[] = [];
  const indexByConceptId = new Map<Concept.Id, number>();
  for (const record of records) {
    const existingIndex = indexByConceptId.get(record.conceptId);
    if (existingIndex === undefined) {
      indexByConceptId.set(record.conceptId, groups.length);
      groups.push({ conceptId: record.conceptId, records: [record] });
      continue;
    }
    groups[existingIndex]?.records.push(record);
  }
  return groups;
}
```

`useAssignedRecords(userId: User.Id | undefined)` uses `useInfiniteQuery`. `enabled: userId !== undefined`. Query key:

```ts
IndividualClient.QueryKeys.getAll({
  where: { assigned_to: { eq: userId } },
})
```

`queryFn` calls `IndividualClient.getPage` with that `where`, `pageSize: 20`, `pageNum: ctx.pageParam`, and:

```ts
orderBy: [
  { column: "concept_id", direction: "asc" },
  { column: "name", direction: "asc" },
]
```

`initialPageParam: 0`. `getNextPageParam` is `lastPage.nextPage`. `placeholderData: keepPreviousData`. Return the flat records, `hasNextPage`, `isLoading`, `isError`, `isFetchingNextPage`, `fetchNextPage`, and `refetch`.

Count, separately, so the header fact is the full count and not the loaded page:

```ts
IndividualClient.useGetCount({
  where: { assigned_to: { eq: userId } },
  useQueryOptions: { enabled: userId !== undefined },
})
```

Put the count hook in the view, not in `useAssignedRecords`, so the page hook stays about paging.

`AssignedToMeView`:

```tsx
export function AssignedToMeView(): ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const user = useCurrentUser();
  const records = useAssignedRecords(user?.id);
  const [concepts] = ConceptClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
```

Call `useCurrentWorkspace()` at the top. Build `conceptsById` with `makeIdLookupMap`. Groups come from `groupRecordsByCaseType(records.records)`.

Shell:

```tsx
<AppSlate title={t`Assigned to me`}>
  <AppView>
    <AppViewHeader
      title={t`Assigned to me`}
      facts={
        count === undefined ? undefined : [t`${count} records`]
      }
    />
    <AppViewBody>
      {/* states below */}
    </AppViewBody>
  </AppView>
</AppSlate>
```

No rail.

States, in order:

- `isLoading` and no rows: three `Skeleton` rows, `aria-hidden` is wrong here because the region needs a name. Wrap them in a `Stack` with `aria-busy` and `aria-label={t`Loading records`}`.
- `isError`: `Callout` title `t`These records failed to load``, message `t`Try again in a moment, or reach out to support if it keeps happening.``, and a `Button` `<Trans>Try again</Trans>` that calls `refetch`. This is the record page's failure copy, reused because the failure is the same kind.
- no rows: `AppSlateEmptyState` is the slate's empty state and this view is already inside a slate. Use a quiet block instead, matching `IndividualNavbarRows`: `IconInbox`, and `<Trans>Nothing is assigned to you.</Trans>`. No second bordered card.
- otherwise: one `AppViewSection` per group. `title` is the concept's `name`. `meta` is the group's loaded length as a string. If the concept is missing from the map, title `<Trans>Case type</Trans>` rather than the id. Rows are `NavLink`s from `AppLinks.individualManagerIndividualView`, with the status dot loaded the same way the records list loads it: `ConceptStatusClient.useGetAll` is per case type, which would be a hook in a loop. Do not do that. The queue row is the record name only. The case type is the section title. Status stays on the record page. That keeps this view off a variable number of status queries.

Under the sections, when `hasNextPage`, a `Button` `variant="default"` `size="compact-sm"` `loading={isFetchingNextPage}` `<Trans>Show more</Trans>` calling `fetchNextPage`.

`assigned.tsx`:

```tsx
export const Route = createFileRoute(
  "/_auth/$workspaceSlug/individual-manager/assigned",
)({
  beforeLoad: RouteMiddleware.BeforeLoad.checkUserPermissions({
    permissionKey: "case_records__can_view_record",
    appLabel: () => {
      return appLabel("case_records");
    },
  }),
  component: AssignedToMeView,
});
```

Static segment `assigned` must stay a sibling file of `$conceptId`, not a child of it. TanStack matches the static path ahead of the param.

`AppLinks.assignedToMe(workspaceSlug)` returns `to: "/$workspaceSlug/individual-manager/assigned"`, `label: () => t`Assigned to me``, `isAvailableOffline: false`, key `"assigned-to-me"`.

`NavbarLinks.assignedToMe` uses `IconUser` at the same size and stroke as the other icons (`IconUser` is already imported in `Navbar.tsx`; import it in `NavbarLinks.tsx` from `@tabler/icons-react`). Size 18, stroke 1.5. Same `isEnabled` flag check as `individualManagerHome` (`FeatureFlag.DisableProfileManager`).

`makeMainNavbarLinksFromPermissions`: when `canAccessCaseRecords`, spread `NavbarLinks.assignedToMe(workspaceSlug)` and then `individualManagerLinks`. When not, spread nothing, as today.

Regenerate the route tree. Do not edit `src/routeTree.gen.ts` by hand.

```bash
pnpm exec vite build
```

Expected: exit 0, and `src/routeTree.gen.ts` contains `individual-manager/assigned`.

- [ ] **Step 4: Run the tests**

```bash
pnpm test:frontend src/views/IndividualManagerApp/groupRecordsByCaseType/groupRecordsByCaseType.test.ts src/components/layouts/RootLayout/WorkspaceLayout/WorkspaceLayout.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/IndividualManagerApp/groupRecordsByCaseType src/views/IndividualManagerApp/AssignedToMeView src/routes/_auth/\$workspaceSlug/individual-manager/assigned.tsx src/config/AppLinks/AppLinks.tsx src/config/NavbarLinks/NavbarLinks.tsx src/components/layouts/RootLayout src/routeTree.gen.ts
git commit -m "$(cat <<'EOF'
feat(cases): list the records assigned to the signed-in user

EOF
)"
```

---

### Task 9: Catalogs

**Files:**

- Modify: `src/i18n/locales/*/messages.po` and the generated `messages.ts` beside them, by the extractor only

- [ ] **Step 1: Extract**

```bash
pnpm i18n:extract
```

Expected: the new sentences from Tasks 6 to 8 appear in `src/i18n/locales/en/messages.po`. Do not translate the other catalogs by hand. Do not edit `messages.ts` except as the extractor writes it.

- [ ] **Step 2: Check**

```bash
pnpm i18n:check
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/i18n/locales
git commit -m "$(cat <<'EOF'
feat(cases): add assignment copy to the message catalogs

EOF
)"
```

---

## Self-review

Spec coverage:

- One member or unassigned, header control, editor versus viewer: Task 6, backed by the trigger in Task 1.
- Outside-workspace rejection and the Case Types editor bypass: Task 1.
- Assigned to me, grouped, opening the existing record: Task 8.
- Assignee filter and the name on each case-type row: Tasks 4 and 7.
- Queue and filtered lists refresh together: Task 5.
- Notifications, email, activity log, user groups: no task. They stay P5c.8, P5c.5, and P5c.9.
- Sync leaves `assigned_to` alone: no task. Existing contract test.

Builder constraints already fixed in the design: no new permission key, no second write path, rail stays free of actions, `assigned` is a static route beside `$conceptId`.
