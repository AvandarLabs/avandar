# Gadget References (2a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a case comment reference any gadget (dashboard, dashboard tile, dataset, map, case type, case) through the `@` menu, rendered as an inline link chip or a framed embed card with key facts.

**Architecture:** A `gadget_type` enum and a security-invoker search RPC give the `@` menu one server-side search across six types, filtered by RLS. Two TipTap atom nodes (`gadgetLink`, `gadgetEmbed`) store only `{ gadgetType, gadgetId, subId }`; a `GadgetRegistry` resolves each ref on read through the existing CRUD clients into a loading, unavailable, or available summary. A trigger mirrors references into `comment_gadget_refs` for future backlinks.

**Tech Stack:** Supabase Postgres (declarative schemas, RLS, pg_trgm, pgTAP), TypeScript, React 19, Mantine 9, TipTap 3.23.4, TanStack Query and Router, zod 4, Lingui, Vitest, Playwright.

**Spec:** [gadget-references-design.md](gadget-references-design.md). Read it first. Refinements made while planning are listed at the end of this file and override the spec where they differ.

---

## Before you start

Read once:

- `AGENTS.md` (root; `CLAUDE.md` is a symlink to it): scope, naming, comments, i18n, the Supabase switch stop condition, e2e rules.
- `docs/rules/typescript.md`, `docs/rules/sql.md`, `docs/rules/testing.md`, `docs/rules/i18n.md`.
- `docs/measles-demo/case-activity-architecture.md` (the Phase 1 system this extends).
- `docs/design/app-view-layout.md` and `DESIGN.md` Named Rules (before UI work).

House conventions:

- `shared/` imports siblings with `.ts` and never imports `src/`. `src/` imports shared via `$/` without the extension.
- Import a model's entry file and use its namespace (`Gadget.Ref`, `Dashboard.T`).
- Every user-facing string goes through Lingui. No em dashes anywhere.
- Component tests use `render`, `screen`, `fireEvent`, `waitFor`, `act` from `@/test-utils`; wrap query-using components in a `QueryClientProvider` via `render(ui, { wrapper })`.
- Run one Vitest file: `pnpm vitest run <path>`.
- `pnpm format` only covers committed changes. Before each commit run `pnpm exec oxfmt --ignore-path .oxfmtignore <ts files>`, `pnpm exec eslint --fix <files>`, `pnpm exec stylelint <css files>`, and `pnpm exec prettier --write <sql files>`.
- Commit by explicit path, never `git add -A`; never stage `supabase/config.toml`. End each commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- TipTap tests that run a suggestion command in jsdom need `window.getSelection()?.selectAllChildren(editingArea)` first (see `RichTextComposer.test.tsx`).

## File structure

| File | Responsibility |
| --- | --- |
| `supabase/schemas/00.enum.gadget_type.sql` | Gadget types |
| `supabase/schemas/22.comment_gadget_refs.sql` | References mirrored from comment bodies |
| `supabase/schemas/23.comments__audit_triggers.sql` | Modify: add `comments__sync_gadget_refs` |
| `supabase/schemas/50.rpc_gadgets__search.sql` | One search across six types, RLS-filtered |
| `supabase/tests/database/gadgets/comment_gadget_refs.test.sql` | Trigger and RLS for the refs table |
| `supabase/tests/database/gadgets/gadgets_search.test.sql` | Search RPC |
| `supabase/tests/database/permissions/exact_data_api_grants.test.sql` | Modify: new select-only table |
| `shared/models/gadgets/Gadget/Gadget.ts` (+ test) | `Gadget` namespace, `GADGET_TYPES`, ref parser |
| `shared/models/RichTextDocument/RichTextDocument.ts` (+ test) | Modify: `gadgetLink`, `gadgetEmbed` nodes and plain text |
| `src/clients/gadgets/searchGadgets/searchGadgets.ts` (+ test) | Calls the RPC, parses rows |
| `src/clients/dashboards/findDashboardTile/findDashboardTile.ts` (+ test) | Finds and counts DataViz blocks in a dashboard config |
| `src/hooks/datasets/useDatasetSourceLabels.ts` | Translated dataset source labels, extracted from `DatasetMetaView` |
| `src/components/RichText/Gadget/gadgetRegistry.ts` (+ test) | Icon, noun, summary hook per type |
| `src/components/RichText/Gadget/useGadgetSummaries.ts` (+ test) | The six summary hooks |
| `src/components/RichText/Gadget/GadgetChip/GadgetChip.tsx` (+ css, test) | Inline chip in three states |
| `src/components/RichText/Gadget/GadgetCard/GadgetCard.tsx` (+ css, test) | Framed card in three states |
| `src/components/RichText/Gadget/GadgetNodes/GadgetNodes.tsx` (+ test) | `gadgetLink` and `gadgetEmbed` TipTap nodes, node views, display switch |
| `src/components/RichText/Gadget/GadgetActionsMenu/GadgetActionsMenu.tsx` | Editor-only hover menu |
| `src/components/RichText/MentionMenu/` | Replaces `UserMention/UserMentionList.tsx` and `createUserMentionSuggestion.ts` with a people-plus-gadgets menu |
| `src/components/RichText/createRichTextExtensions.ts` | Modify: add the gadget nodes |
| `src/components/RichText/RichTextView/RichTextView.tsx` | Modify: map the gadget nodes |
| `src/components/RichText/RichTextComposer/RichTextComposer.tsx` | Modify: `workspaceId` prop feeds gadget search |
| `src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/...` | Modify: pass `workspaceId` to the composers |
| `src/routes/_auth/$workspaceSlug/dashboards/preview/$dashboardId.tsx` | Modify: `tile` search param |
| `src/views/DashboardApp/DashboardViewerView/...`, `.../DataVizPBlock/...` | Modify: `data-tile-id`, scroll and highlight |
| `apps/desktop/sync/syncable-tables.ts` | Modify: exclude `comment_gadget_refs` |
| `tests/e2e/case-gadgets.spec.ts`, `tests/e2e/helpers/seedDashboardWithTile.ts` | E2E |
| `docs/measles-demo/gadgets.md` | The registry document |

---

### Task 0: Preflight

**Files:** none

- [ ] **Step 1:** `git rev-parse --abbrev-ref HEAD`. Expected: `feat/comment-embeds`.
- [ ] **Step 2:** `ava supabase status`. If not green (switched project for this branch), run `ava supabase switch`, then status again. Do not run any database command until it is green. If `ava` is missing, `pnpm build:ava-cli`.
- [ ] **Step 3:** `pnpm vitest run src/components/RichText src/views/IndividualManagerApp`. Expected: PASS.

---

### Task 1: Refs table and trigger (red, then green with Task 3)

Load the `supabase-declarative-schema` and `supabase-postgres-best-practices` skills.

**Files:**
- Create: `supabase/tests/database/gadgets/comment_gadget_refs.test.sql`
- Create: `supabase/schemas/00.enum.gadget_type.sql`
- Create: `supabase/schemas/22.comment_gadget_refs.sql`
- Modify: `supabase/schemas/23.comments__audit_triggers.sql`
- Modify: `supabase/tests/database/permissions/exact_data_api_grants.test.sql`

- [ ] **Step 1: Write the failing test**

```sql
\set ON_ERROR_STOP on

/**
 * `comments__sync_gadget_refs` mirrors the gadgets a comment references into
 * `comment_gadget_refs`, and members can read but not write that table.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('e3000001-0000-4000-8000-000000000001'::uuid, 'gadget_refs_author@test.dev', 'authenticated', 'authenticated'),
  ('e3000002-0000-4000-8000-000000000002'::uuid, 'gadget_refs_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('e3100001-0000-4000-8000-000000000001'::uuid, 'e3000001-0000-4000-8000-000000000001'::uuid, 'gadget refs ws', 'gadget-refs-ws'),
  ('e3100002-0000-4000-8000-000000000002'::uuid, 'e3000002-0000-4000-8000-000000000002'::uuid, 'gadget refs other', 'gadget-refs-other')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('e3200001-0000-4000-8000-000000000001'::uuid, 'e3100001-0000-4000-8000-000000000001'::uuid, 'e3000001-0000-4000-8000-000000000001'::uuid),
  ('e3200002-0000-4000-8000-000000000002'::uuid, 'e3100002-0000-4000-8000-000000000002'::uuid, 'e3000002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values ('e3300001-0000-4000-8000-000000000001'::uuid, 'e3000001-0000-4000-8000-000000000001'::uuid, 'e3100001-0000-4000-8000-000000000001'::uuid, 'gadget concept', true)
on conflict (id) do nothing;

insert into public.individuals (id, workspace_id, name, concept_id, external_id)
values ('e3400001-0000-4000-8000-000000000001'::uuid, 'e3100001-0000-4000-8000-000000000001'::uuid, 'Case', 'e3300001-0000-4000-8000-000000000001'::uuid, 'ext-1')
on conflict (id) do nothing;

select set_config('request.jwt.claims', '{"sub":"e3000001-0000-4000-8000-000000000001","role":"authenticated"}', true);

insert into public.comments (id, workspace_id, individual_id, author_user_id, body, body_text)
values (
  'e3500001-0000-4000-8000-000000000001'::uuid,
  'e3100001-0000-4000-8000-000000000001'::uuid,
  'e3400001-0000-4000-8000-000000000001'::uuid,
  'e3000001-0000-4000-8000-000000000001'::uuid,
  '{"type":"doc","content":[
    {"type":"paragraph","content":[
      {"type":"text","text":"See "},
      {"type":"gadgetLink","attrs":{"gadgetType":"dashboard","gadgetId":"e3600001-0000-4000-8000-000000000001","subId":null}},
      {"type":"gadgetLink","attrs":{"gadgetType":"not_a_type","gadgetId":"e3600001-0000-4000-8000-000000000001","subId":null}},
      {"type":"gadgetLink","attrs":{"gadgetType":"map","gadgetId":"not-a-uuid","subId":null}}
    ]},
    {"type":"gadgetEmbed","attrs":{"gadgetType":"dashboard_tile","gadgetId":"e3600001-0000-4000-8000-000000000001","subId":"DataViz-abc"}}
  ]}'::jsonb,
  'See [dashboard]'
);

select plan (7);

-- 1. One row per valid gadget node, invalid ones skipped.
select is (
  (select count(*)::int from public.comment_gadget_refs where comment_id = 'e3500001-0000-4000-8000-000000000001'::uuid),
  2,
  'valid gadget nodes are mirrored and invalid ones skipped'
);

-- 2. The embed keeps its sub id and display.
select is (
  (
    select gadget_type::text || ':' || sub_id || ':' || display
    from public.comment_gadget_refs
    where comment_id = 'e3500001-0000-4000-8000-000000000001'::uuid and display = 'embed'
  ),
  'dashboard_tile:DataViz-abc:embed',
  'an embed records its type, tile id, and display'
);

-- 3. Editing replaces the rows.
update public.comments
set
  body = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"gadgetLink","attrs":{"gadgetType":"individual","gadgetId":"e3400001-0000-4000-8000-000000000001","subId":null}}]}]}'::jsonb,
  body_text = '[case]'
where id = 'e3500001-0000-4000-8000-000000000001'::uuid;

select is (
  (select string_agg(gadget_type::text, ',') from public.comment_gadget_refs where comment_id = 'e3500001-0000-4000-8000-000000000001'::uuid),
  'individual',
  'editing a comment replaces its gadget rows'
);

-- 4. Soft delete clears them.
update public.comments set deleted_at = now() where id = 'e3500001-0000-4000-8000-000000000001'::uuid;
select is (
  (select count(*)::int from public.comment_gadget_refs where comment_id = 'e3500001-0000-4000-8000-000000000001'::uuid),
  0,
  'a deleted comment references no gadgets'
);

-- 5. A member reads refs in their workspace (seed a fresh comment as the owner).
insert into public.comments (id, workspace_id, individual_id, author_user_id, body, body_text)
values (
  'e3500002-0000-4000-8000-000000000002'::uuid,
  'e3100001-0000-4000-8000-000000000001'::uuid,
  'e3400001-0000-4000-8000-000000000001'::uuid,
  'e3000001-0000-4000-8000-000000000001'::uuid,
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"gadgetLink","attrs":{"gadgetType":"concept","gadgetId":"e3300001-0000-4000-8000-000000000001","subId":null}}]}]}'::jsonb,
  '[case type]'
);

select lives_ok (
  $t$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e3000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.comment_gadget_refs where comment_id = 'e3500002-0000-4000-8000-000000000002'::uuid) <> 1 then
      raise exception 'a member cannot read gadget refs in their workspace';
    end if;
  end $chk$;
  $t$,
  'a member reads gadget refs in their workspace'
);

-- 6. An outsider reads none.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e3000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.comment_gadget_refs) <> 0 then
      raise exception 'an outsider can read another workspace''s gadget refs';
    end if;
  end $chk$;
  $t$,
  'an outsider reads no gadget refs'
);

-- 7. The client cannot write the table.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e3000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.comment_gadget_refs (comment_id, workspace_id, gadget_type, gadget_id, display)
  values ('e3500002-0000-4000-8000-000000000002'::uuid, 'e3100001-0000-4000-8000-000000000001'::uuid, 'map', 'e3600001-0000-4000-8000-000000000001'::uuid, 'link');
  $t$,
  '42501',
  null,
  'authenticated cannot insert gadget refs'
);

select * from finish ();

rollback;
```

- [ ] **Step 2: Run it and watch it fail**

Run: `supabase test db supabase/tests/database/gadgets/comment_gadget_refs.test.sql` (or `pnpm test:db` if the CLI rejects a path).
Expected: FAIL with `relation "public.comment_gadget_refs" does not exist`.

- [ ] **Step 3: The enum**

`supabase/schemas/00.enum.gadget_type.sql`:

```sql
/**
 * Kinds of gadget a comment can reference. A gadget is any platform object
 * a comment can link or embed. See docs/measles-demo/gadgets.md.
 *
 * Enum values:
 *
 * `dashboard` - A row in `dashboards`.
 * `dashboard_tile` - A DataViz block inside a dashboard's `config`. The
 *   reference's id is the dashboard's and its sub id is the block's.
 * `dataset` - A row in `datasets`.
 * `map` - A row in `maps`.
 * `concept` - A case type, a row in `concepts`.
 * `individual` - A case, a row in `individuals`.
 */
create type public.gadget_type as enum('dashboard', 'dashboard_tile', 'dataset', 'map', 'concept', 'individual');
```

- [ ] **Step 4: The table**

`supabase/schemas/22.comment_gadget_refs.sql`:

```sql
/**
 * Every gadget a comment references, mirrored from the comment's stored
 * document by `comments__sync_gadget_refs` so backlinks and notifications
 * can find references without scanning bodies. Owned by that trigger.
 * `gadget_id` has no foreign key because it points at one of several tables;
 * a reference to a deleted gadget stays until the comment is edited.
 */
create table public.comment_gadget_refs (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- The comment that references the gadget
  comment_id uuid not null references public.comments (id) on update cascade on delete cascade,
  -- Workspace of the comment
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Which kind of gadget
  gadget_type public.gadget_type not null,
  -- The gadget's id. For a dashboard tile, the dashboard's id.
  gadget_id uuid not null,
  -- The tile's block id for a dashboard tile, else null
  sub_id text,
  -- Whether the comment shows the gadget as an inline link or an embed card
  display text not null,
  -- When the reference was recorded
  created_at timestamptz not null default now(),
  constraint comment_gadget_refs__display_valid check (display in ('link', 'embed'))
);

create unique index idx_comment_gadget_refs__unique_ref on public.comment_gadget_refs (
  comment_id,
  gadget_type,
  gadget_id,
  coalesce(sub_id, ''),
  display
);

create index idx_comment_gadget_refs__gadget on public.comment_gadget_refs (gadget_type, gadget_id);

create index idx_comment_gadget_refs__workspace_id on public.comment_gadget_refs (workspace_id);

alter table public.comment_gadget_refs enable row level security;

-- Data API privileges. Members read; only the trigger writes.
grant
select
  on table public.comment_gadget_refs to authenticated;

grant
select
,
  insert,
update,
delete on table public.comment_gadget_refs to service_role;

create policy "User can SELECT comment_gadget_refs in their workspace" on public.comment_gadget_refs for
select
  to authenticated using (
    public.comment_gadget_refs.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );
```

- [ ] **Step 5: The trigger**

Append to `supabase/schemas/23.comments__audit_triggers.sql`:

```sql
/**
 * Rebuilds a comment's `comment_gadget_refs` from the `gadgetLink` and
 * `gadgetEmbed` nodes in its stored document, keeping only nodes with a
 * known gadget type and a valid uuid id. A deleted comment references
 * nothing. Fires on every update (no column list) for the same reason as
 * `comments__sync_mentions`. It does not check that the gadget exists or
 * that the author can see it: reading a reference goes through the reader's
 * own access.
 */
create or replace function public.comments__sync_gadget_refs () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.body is not distinct from old.body then
    return null;
  end if;

  delete from public.comment_gadget_refs r where r.comment_id = new.id;

  if new.body is null then
    return null;
  end if;

  insert into public.comment_gadget_refs (comment_id, workspace_id, gadget_type, gadget_id, sub_id, display)
  select distinct
    new.id,
    new.workspace_id,
    (node -> 'attrs' ->> 'gadgetType')::public.gadget_type,
    (node -> 'attrs' ->> 'gadgetId')::uuid,
    nullif(node -> 'attrs' ->> 'subId', ''),
    case when node ->> 'type' = 'gadgetEmbed' then 'embed' else 'link' end
  from jsonb_path_query(
    new.body,
    'lax $.** ? (@.type == "gadgetLink" || @.type == "gadgetEmbed")'
  ) as node
  where (node -> 'attrs' ->> 'gadgetType') = any (enum_range(null::public.gadget_type)::text[])
    and (node -> 'attrs' ->> 'gadgetId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  return null;
end;
$$;

revoke
execute on function public.comments__sync_gadget_refs ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__comments__sync_gadget_refs
after insert or
update on public.comments for each row
execute function public.comments__sync_gadget_refs ();
```

Note: `case` and `where` evaluation order is not guaranteed in SQL, so the casts in the select list run only on rows that pass the `where` because Postgres evaluates the projection after filtering for a plain `select ... from ... where`. If the planner ever pushes a cast earlier and a bad row throws, wrap the casts in `case when ... then ... end` as `comments__sync_mentions` does.

- [ ] **Step 6: Grants test**

In `supabase/tests/database/permissions/exact_data_api_grants.test.sql`, add `'comment_gadget_refs'` in alphabetical position to both the `standard_authenticated_tables` exclusion list and the SELECT-only `authenticated` list (the same two lists that hold `comment_mentions`).

No commit yet: Task 3 commits the schema with its migration.

---

### Task 2: Search RPC (red, then green with Task 3)

**Files:**
- Create: `supabase/tests/database/gadgets/gadgets_search.test.sql`
- Create: `supabase/schemas/50.rpc_gadgets__search.sql`

- [ ] **Step 1: Write the failing test**

Seed: workspace W1 with owner A and member B; workspace W2 with outsider O. In W1: dashboard `Measles by borough` (owned by A, `visibility` `workspace`, a `config` with a `Grid` holding a DataViz block `{ "type": "DataViz", "props": { "id": "DataViz-tile1", "nlQuery": { "prompt": "Cases per week by borough", "rawSql": "", "generations": [] }, "vizType": "bar" } }` inside its `r1c1` slot); a restricted dashboard `Board briefing` (owned by A, `is_restricted = true`, no shares); a dataset `Borough boundaries` with `is_restricted = true`; a map `Exposure sites`; concept `Measles case`; individual `Amara Okafor`. Insert the dashboards, datasets, and maps with the columns their schema files require (read `10.dashboards.sql`, `10.datasets.sql`, `10.maps.sql` and copy the required columns from an existing pgTAP file that seeds each, for example `supabase/tests/database/permissions/resource_rls_role_matrix.test.sql`).

Assertions (`plan (10)`), each run as `authenticated` with the right claims inside `lives_ok` blocks like Task 1:

1. As A, `rpc_gadgets__search(W1, 'measles', 20)` returns the dashboard and the concept.
2. As A, `rpc_gadgets__search(W1, 'cases per week', 20)` returns one `dashboard_tile` row with `gadget_id` = the dashboard id, `sub_id` = `DataViz-tile1`, `sub_label` = `Measles by borough`.
3. As A, `rpc_gadgets__search(W1, 'amara', 20)` returns the individual with `sub_label` = `Measles case`.
4. As B, `rpc_gadgets__search(W1, 'board', 20)` returns no `Board briefing` row (restricted, no share).
5. As A, `rpc_gadgets__search(W1, 'board', 20)` returns `Board briefing` with `has_limited_audience = true`.
6. As A, the `Borough boundaries` dataset row has `has_limited_audience = true`, and the tile row has `has_limited_audience = false` (its dashboard is not restricted).
7. As O, `rpc_gadgets__search(W1, '', 20)` returns zero rows.
8. As A, `rpc_gadgets__search(W1, '', 3)` returns exactly 3 rows ordered by `updated_at` desc.
9. `has_function_privilege('authenticated', 'public.rpc_gadgets__search(uuid, text, integer)', 'EXECUTE')` is true.
10. `has_function_privilege('anon', 'public.rpc_gadgets__search(uuid, text, integer)', 'EXECUTE')` is false.

Write each as a full SQL assertion (see `supabase/tests/database/case_activity/activity_page.test.sql` for the house style of calling an RPC inside a `lives_ok` block and checking rows with a `do $chk$` block).

- [ ] **Step 2: Run and watch it fail**

Run: `supabase test db supabase/tests/database/gadgets/gadgets_search.test.sql`. Expected: FAIL, function does not exist.

- [ ] **Step 3: Implement**

`supabase/schemas/50.rpc_gadgets__search.sql`:

```sql
/**
 * Searches every gadget type in a workspace for the `@` menu. Runs as the
 * caller, so RLS filters each branch and a restricted gadget the caller
 * cannot read never appears. Tiles are the DataViz blocks inside each
 * visible dashboard's config, labeled by their query prompt. With a blank
 * query, returns the most recently updated gadgets.
 *
 * `has_limited_audience` is true when not everyone in the workspace can open
 * the gadget (a restricted dashboard, dataset, or map, or a tile on a
 * restricted dashboard). The `@` menu warns the author about those.
 */
create or replace function public.rpc_gadgets__search (
  p_workspace_id uuid,
  p_query text,
  p_limit integer default 20
) returns table (
  gadget_type public.gadget_type,
  gadget_id uuid,
  sub_id text,
  label text,
  sub_label text,
  has_limited_audience boolean,
  updated_at timestamptz,
  rank real
) language sql stable security invoker
set
  search_path = ''
set
  pg_trgm.word_similarity_threshold = 0.3 as $$
  with
    params as (
      select
        nullif(btrim(p_query), '') as q,
        least(greatest(coalesce(p_limit, 20), 1), 100) as row_limit
    ),
    candidates as (
      select 'dashboard'::public.gadget_type as gadget_type, d.id as gadget_id, null::text as sub_id,
        d.name as label, null::text as sub_label, d.is_restricted as has_limited_audience, d.updated_at
      from public.dashboards d
      where d.workspace_id = p_workspace_id
      union all
      select 'dashboard_tile', d.id, tile ->> 'id', tile -> 'nlQuery' ->> 'prompt', d.name, d.is_restricted, d.updated_at
      from public.dashboards d
      cross join lateral (
        select node -> 'props' as tile
        from jsonb_path_query(d.config, 'lax $.** ? (@.type == "DataViz")') as node
      ) as tiles
      where d.workspace_id = p_workspace_id
        and coalesce(btrim(tile -> 'nlQuery' ->> 'prompt'), '') <> ''
        and tile ->> 'id' is not null
      union all
      select 'dataset', ds.id, null, ds.name, null, ds.is_restricted, ds.updated_at
      from public.datasets ds
      where ds.workspace_id = p_workspace_id
      union all
      select 'map', m.id, null, m.name, null, m.is_restricted, m.updated_at
      from public.maps m
      where m.workspace_id = p_workspace_id
      union all
      select 'concept', c.id, null, c.name, null, false, c.updated_at
      from public.concepts c
      where c.workspace_id = p_workspace_id
      union all
      select 'individual', i.id, null, i.name, c.name, false, i.updated_at
      from public.individuals i
      join public.concepts c on c.id = i.concept_id
      where i.workspace_id = p_workspace_id
    )
  select
    candidate.gadget_type,
    candidate.gadget_id,
    candidate.sub_id,
    candidate.label,
    candidate.sub_label,
    candidate.has_limited_audience,
    candidate.updated_at,
    case
      when params.q is null then 0::real
      else (
        case when candidate.label ilike params.q || '%' then 1 else 0 end
        + extensions.word_similarity(params.q, candidate.label)
      )::real
    end as rank
  from candidates as candidate
  cross join params
  where params.q is null
    or candidate.label ilike '%' || params.q || '%'
    or params.q operator(extensions.<%) candidate.label
  order by rank desc, candidate.updated_at desc, candidate.label, candidate.gadget_id
  limit (select row_limit from params);
$$;

revoke
execute on function public.rpc_gadgets__search (uuid, text, integer)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_gadgets__search (uuid, text, integer) to authenticated;
```

If any table's `updated_at` or `is_restricted` column name differs, check its schema file and adjust; the test is the judge.

No commit yet.

---

### Task 3: Migration, types, desktop, commit

**Files:** generated migration, `shared/types/database.types.ts`, `apps/desktop/migrations/*_gadget_references.gen.sql`, `apps/desktop/sync/syncable-tables.ts`

- [ ] **Step 1:** `ava supabase status` (green, switched). Then `pnpm db:reset && pnpm db:new-migration gadget_references`. Open the migration: it must create the enum, the table, its indexes and policy, the two functions, the trigger, and the grants, with no `drop` of unrelated objects.
- [ ] **Step 2:** `pnpm exec prettier --write` on the new and changed `.sql` files.
- [ ] **Step 3:** `pnpm test:db`. Expected: PASS, including both new files and the grants test.
- [ ] **Step 4:** `pnpm db:gen-types`.
- [ ] **Step 5:** Add `"comment_gadget_refs"` to `EXCLUDED_TABLES` in `apps/desktop/sync/syncable-tables.ts` next to the other comment tables (and to the header comment's EXCLUDED list), then `pnpm desktop:sqlite:gen-migrations` and `pnpm test:desktop`.
- [ ] **Step 6: Commit**

```bash
git add supabase/schemas/00.enum.gadget_type.sql supabase/schemas/22.comment_gadget_refs.sql \
  supabase/schemas/23.comments__audit_triggers.sql supabase/schemas/50.rpc_gadgets__search.sql \
  supabase/migrations/*_gadget_references.sql shared/types/database.types.ts \
  supabase/tests/database/gadgets supabase/tests/database/permissions/exact_data_api_grants.test.sql \
  apps/desktop/sync/syncable-tables.ts apps/desktop/migrations/*_gadget_references.gen.sql
git status --short supabase/config.toml   # modified but must not be staged
git commit -m "feat(comments): add gadget search and mirror comment gadget references"
```

---

### Task 4: `Gadget` shared model

**Files:**
- Create: `shared/models/gadgets/Gadget/Gadget.ts`
- Test: `shared/models/gadgets/Gadget/Gadget.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from "vitest";
import { GADGET_TYPES, isGadgetRef } from "$/models/gadgets/Gadget/Gadget.ts";

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111";

describe("Gadget", () => {
  it("lists the six gadget types", () => {
    expect(GADGET_TYPES).toEqual([
      "dashboard",
      "dashboard_tile",
      "dataset",
      "map",
      "concept",
      "individual",
    ]);
  });

  it("accepts a tile ref only with a sub id", () => {
    expect(isGadgetRef({ gadgetType: "dashboard_tile", gadgetId: DASHBOARD_ID, subId: "DataViz-1" })).toBe(true);
    expect(isGadgetRef({ gadgetType: "dashboard_tile", gadgetId: DASHBOARD_ID, subId: null })).toBe(false);
  });

  it("rejects a sub id on other types, unknown types, and non-uuid ids", () => {
    expect(isGadgetRef({ gadgetType: "dashboard", gadgetId: DASHBOARD_ID, subId: null })).toBe(true);
    expect(isGadgetRef({ gadgetType: "dashboard", gadgetId: DASHBOARD_ID, subId: "x" })).toBe(false);
    expect(isGadgetRef({ gadgetType: "query", gadgetId: DASHBOARD_ID, subId: null })).toBe(false);
    expect(isGadgetRef({ gadgetType: "map", gadgetId: "nope", subId: null })).toBe(false);
  });
});
```

- [ ] **Step 2:** `pnpm vitest run shared/models/gadgets`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
/* eslint-disable @typescript-eslint/no-namespace */
import { z } from "zod";
import type { Enums } from "$/types/database.types.ts";

/** Kinds of gadget, in the order the `@` menu groups them. */
export const GADGET_TYPES = [
  "dashboard",
  "dashboard_tile",
  "dataset",
  "map",
  "concept",
  "individual",
] as const satisfies ReadonlyArray<Enums<"gadget_type">>;

type GadgetType = (typeof GADGET_TYPES)[number];

/**
 * A pointer to one gadget. For a dashboard tile, `gadgetId` is the
 * dashboard's id and `subId` is the tile's block id; every other type has
 * no `subId`.
 */
type GadgetRef = {
  gadgetType: GadgetType;
  gadgetId: string;
  subId: string | null;
};

/** Validates a gadget ref, as stored in a gadget node's attributes. */
export const GadgetRefSchema: z.ZodType<GadgetRef> = z
  .object({
    gadgetType: z.enum(GADGET_TYPES),
    gadgetId: z.uuid(),
    subId: z.string().min(1).nullable(),
  })
  .refine(
    (ref) => {
      return (ref.gadgetType === "dashboard_tile") === (ref.subId !== null);
    },
    { message: "Only a dashboard tile ref has a sub id" },
  );

/** Whether a value is a valid gadget ref. */
export function isGadgetRef(value: unknown): value is GadgetRef {
  return GadgetRefSchema.safeParse(value).success;
}

/** Anything a comment can reference. See docs/measles-demo/gadgets.md. */
export namespace Gadget {
  export type Type = GadgetType;
  export type Ref = GadgetRef;
}
```

The `satisfies` line fails to compile if the tuple and the database enum drift apart. If `Enums` is not exported under that name, use `Database["public"]["Enums"]["gadget_type"]`.

- [ ] **Step 4:** Run the test and `pnpm type-check`. Expected: PASS.
- [ ] **Step 5:** Commit: `git add shared/models/gadgets && git commit -m "feat(comments): add the Gadget model"`.

---

### Task 5: Gadget nodes in the stored document

**Files:**
- Modify: `shared/models/RichTextDocument/RichTextDocument.ts`
- Test: `shared/models/RichTextDocument/RichTextDocument.test.ts`

- [ ] **Step 1: Failing tests** (append)

```ts
describe("gadget nodes", () => {
  const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111";

  it("accepts a gadget link and a gadget embed", () => {
    expect(
      isRichTextDocument({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "gadgetLink", attrs: { gadgetType: "dashboard", gadgetId: DASHBOARD_ID, subId: null } }] },
          { type: "gadgetEmbed", attrs: { gadgetType: "dashboard_tile", gadgetId: DASHBOARD_ID, subId: "DataViz-1" } },
        ],
      }),
    ).toBe(true);
  });

  it("rejects a gadget node with bad attributes", () => {
    expect(
      isRichTextDocument({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "gadgetLink", attrs: { gadgetType: "dashboard", gadgetId: "nope", subId: null } }] }],
      }),
    ).toBe(false);
  });

  it("writes a gadget as its type noun in plain text, never its name", () => {
    expect(
      richTextToPlainText({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "See " }, { type: "gadgetLink", attrs: { gadgetType: "concept", gadgetId: DASHBOARD_ID, subId: null } }] },
          { type: "gadgetEmbed", attrs: { gadgetType: "dashboard_tile", gadgetId: DASHBOARD_ID, subId: "DataViz-1" } },
        ],
      }),
    ).toBe("See [case type]\n[tile]");
  });
});
```

- [ ] **Step 2:** Run. Expected: FAIL.

- [ ] **Step 3: Implement**

1. Import `GadgetRefSchema` and `Gadget` from `$/models/gadgets/Gadget/Gadget.ts`.
2. Add `"gadgetEmbed"` and `"gadgetLink"` to `RICH_TEXT_NODE_TYPES` (alphabetical).
3. Add two members to the node schema union, before the catch-all member, and add both names to that member's `.exclude([...])`:

```ts
z.object({ type: z.literal("gadgetLink"), attrs: GadgetRefSchema }),
z.object({ type: z.literal("gadgetEmbed"), attrs: GadgetRefSchema }),
```

4. Add the plain-text noun map (stored text, never displayed, so English like the existing `"member"` fallback):

```ts
/** How plain text names each gadget type. Stored in `body_text`, never displayed. */
const GADGET_PLAIN_TEXT_NOUNS: Readonly<Record<Gadget.Type, string>> = {
  dashboard: "dashboard",
  dashboard_tile: "tile",
  dataset: "dataset",
  map: "map",
  concept: "case type",
  individual: "case",
};
```

5. In `_nodeToPlainText`, before the container fallback: when the type is `gadgetLink` or `gadgetEmbed`, read `attrs.gadgetType` defensively (with the existing `_isObject` helpers) and return `` `[${GADGET_PLAIN_TEXT_NOUNS[type] ?? "gadget"}]` ``. Add `gadgetEmbed` handling so that, as a block at the document level, it is separated by `"\n"` like other blocks (it already is, because `doc` is a block container).
6. Update the `richTextToPlainText` docstring: gadgets are written as `[noun]`, never by name, because `body_text` is readable by every member.

- [ ] **Step 4:** Run `pnpm vitest run shared/models/RichTextDocument` and `pnpm type-check`. Expected: PASS.
- [ ] **Step 5:** Commit `shared/models/RichTextDocument`: `feat(comments): store gadget links and embeds in rich text documents`.

---

### Task 6: `searchGadgets` client

**Files:**
- Create: `src/clients/gadgets/searchGadgets/searchGadgets.ts`
- Test: `src/clients/gadgets/searchGadgets/searchGadgets.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchGadgets } from "@/clients/gadgets/searchGadgets/searchGadgets";

const { rpcMock } = vi.hoisted(() => {
  return { rpcMock: vi.fn() };
});

vi.mock("$/db/supabase/AvaSupabase.ts", () => {
  return { AvaSupabase: { db: () => { return { rpc: rpcMock }; } } };
});

const ROW = {
  gadget_type: "dashboard_tile",
  gadget_id: "11111111-1111-4111-8111-111111111111",
  sub_id: "DataViz-1",
  label: "Cases per week",
  sub_label: "Measles by borough",
  has_limited_audience: false,
  updated_at: "2026-11-06T10:00:00+00:00",
  rank: 1.2,
};

beforeEach(() => {
  rpcMock.mockReset();
});

describe("searchGadgets", () => {
  it("calls the RPC and maps rows to results", async () => {
    rpcMock.mockResolvedValue({ data: [ROW], error: null });
    const results = await searchGadgets({ workspaceId: "w1", query: "cases", limit: 20 });
    expect(rpcMock).toHaveBeenCalledWith("rpc_gadgets__search", { p_workspace_id: "w1", p_query: "cases", p_limit: 20 });
    expect(results).toEqual([
      {
        ref: { gadgetType: "dashboard_tile", gadgetId: ROW.gadget_id, subId: "DataViz-1" },
        label: "Cases per week",
        subLabel: "Measles by borough",
        hasLimitedAudience: false,
      },
    ]);
  });

  it("drops rows that are not valid refs", async () => {
    rpcMock.mockResolvedValue({ data: [{ ...ROW, sub_id: null }], error: null });
    expect(await searchGadgets({ workspaceId: "w1", query: "", limit: 20 })).toEqual([]);
  });

  it("throws when the RPC fails", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(searchGadgets({ workspaceId: "w1", query: "x", limit: 20 })).rejects.toThrow();
  });
});
```

- [ ] **Step 2:** Run. Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import { isGadgetRef } from "$/models/gadgets/Gadget/Gadget";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";

/** One `@` menu result for a gadget. */
export type GadgetSearchResult = {
  ref: Gadget.Ref;
  label: string;
  subLabel: string | undefined;
  hasLimitedAudience: boolean;
};

/**
 * Searches the workspace's gadgets the current user can read, most relevant
 * first. Rows that do not form a valid ref are dropped rather than shown.
 */
export async function searchGadgets(params: {
  workspaceId: string;
  query: string;
  limit: number;
}): Promise<GadgetSearchResult[]> {
  const { data, error } = await AvaSupabase.db().rpc("rpc_gadgets__search", {
    p_workspace_id: params.workspaceId,
    p_query: params.query,
    p_limit: params.limit,
  });
  if (error) {
    throw new Error(`Gadget search failed: ${error.message}`);
  }
  return (data ?? []).flatMap((row) => {
    const ref = { gadgetType: row.gadget_type, gadgetId: row.gadget_id, subId: row.sub_id };
    if (!isGadgetRef(ref)) {
      return [];
    }
    return [
      {
        ref,
        label: row.label,
        subLabel: row.sub_label ?? undefined,
        hasLimitedAudience: row.has_limited_audience,
      },
    ];
  });
}
```

Match the real `AvaSupabase` import path used by `src/hooks/permissions/useResourceRole/useResourceRole.ts` (the test mocks `$/db/supabase/AvaSupabase.ts`; import the same module so the mock applies).

- [ ] **Step 4:** Run the test and `pnpm type-check`. Expected: PASS.
- [ ] **Step 5:** Commit `src/clients/gadgets`: `feat(comments): add the gadget search client`.

---

### Task 7: Dashboard tile lookup and dataset source labels

**Files:**
- Create: `src/clients/dashboards/findDashboardTile/findDashboardTile.ts` (+ test)
- Create: `src/hooks/datasets/useDatasetSourceLabels.ts`
- Modify: `src/views/DataManagerApp/DatasetMetaView/DatasetMetaView.tsx` (use the hook instead of its inline map)

- [ ] **Step 1: Failing test** `findDashboardTile.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { countDashboardTiles, findDashboardTile } from "@/clients/dashboards/findDashboardTile/findDashboardTile";

const CONFIG = {
  root: { props: { title: "Measles" } },
  content: [
    { type: "DataViz", props: { id: "DataViz-top", nlQuery: { prompt: "Weekly cases" }, vizType: "line" } },
    {
      type: "Grid",
      props: {
        id: "Grid-1",
        r1c1: [{ type: "DataViz", props: { id: "DataViz-nested", nlQuery: { prompt: "By borough" }, vizType: "bar" } }],
      },
    },
    { type: "Text", props: { id: "Text-1" } },
  ],
};

describe("findDashboardTile", () => {
  it("finds a top-level and a nested tile", () => {
    expect(findDashboardTile(CONFIG, "DataViz-top")).toEqual({ id: "DataViz-top", prompt: "Weekly cases", vizType: "line" });
    expect(findDashboardTile(CONFIG, "DataViz-nested")).toEqual({ id: "DataViz-nested", prompt: "By borough", vizType: "bar" });
  });

  it("returns undefined for a missing block or a non-tile block", () => {
    expect(findDashboardTile(CONFIG, "DataViz-gone")).toBeUndefined();
    expect(findDashboardTile(CONFIG, "Text-1")).toBeUndefined();
  });

  it("counts every tile at any depth", () => {
    expect(countDashboardTiles(CONFIG)).toBe(2);
  });
});
```

- [ ] **Step 2:** Run. Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import { isPlainObject, traverse } from "@avandar/utils";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";

/** The parts of a dashboard tile a gadget card shows. */
export type DashboardTileSummary = {
  id: string;
  prompt: string | undefined;
  vizType: AvaVizConfig.Type | undefined;
};

function _collectTiles(dashboardConfig: unknown): DashboardTileSummary[] {
  const tiles: DashboardTileSummary[] = [];
  traverse(dashboardConfig, (node) => {
    if (!isPlainObject(node) || node["type"] !== "DataViz") {
      return;
    }
    const props: unknown = node["props"];
    if (!isPlainObject(props) || typeof props["id"] !== "string") {
      return;
    }
    const nlQuery: unknown = props["nlQuery"];
    const prompt = isPlainObject(nlQuery) && typeof nlQuery["prompt"] === "string" && nlQuery["prompt"].trim() !== ""
      ? nlQuery["prompt"]
      : undefined;
    tiles.push({
      id: props["id"],
      prompt,
      vizType: typeof props["vizType"] === "string" ? (props["vizType"] as AvaVizConfig.Type) : undefined,
    });
  });
  return tiles;
}

/**
 * Finds a DataViz block by its Puck id anywhere in a dashboard config,
 * including inside layout slots. Walks the tree the same way
 * `getDatasetIdsFromDashboardConfig` does.
 */
export function findDashboardTile(dashboardConfig: unknown, tileId: string): DashboardTileSummary | undefined {
  return _collectTiles(dashboardConfig).find((tile) => {
    return tile.id === tileId;
  });
}

/** How many DataViz blocks a dashboard config holds, at any depth. */
export function countDashboardTiles(dashboardConfig: unknown): number {
  return _collectTiles(dashboardConfig).length;
}
```

Use the real import path of the viz type (`DataVizPBlock` props type `vizType` as `AvaVizConfig.Type`; find its model file with `grep -rn "namespace AvaVizConfig" shared src`). If `traverse` visits a node more than once, de-duplicate by id in `_collectTiles`.

- [ ] **Step 4: Extract `useDatasetSourceLabels`**

Move the `sourceLabels` `useMemo` from `DatasetMetaView.tsx` (lines around 58-68) into `src/hooks/datasets/useDatasetSourceLabels.ts`:

```ts
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";

/** The translated name of each dataset source type, as users see it. */
export function useDatasetSourceLabels(): Readonly<Record<DatasetSource.SourceType, string>> {
  const { t } = useLingui();
  return useMemo(() => {
    return {
      csv_file: t`CSV file`,
      google_sheets: t`Google Sheets`,
      open_data: t`Open data`,
      pdf_file: t`PDF file`,
      postgres_table: t`Database`,
      virtual: t`Derived dataset`,
      xlsx_file: t`Excel file`,
    };
  }, [t]);
}
```

Copy the exact keys and strings from `DatasetMetaView.tsx`, then replace the inline map there with `const sourceLabels = useDatasetSourceLabels();`. Run `pnpm vitest run src/views/DataManagerApp/DatasetMetaView`.

- [ ] **Step 5:** Run the tests and `pnpm type-check`. Commit both paths: `refactor(datasets): share dataset source labels` and `feat(comments): find dashboard tiles in a dashboard config` (two commits).

---

### Task 8: Gadget registry and summaries

**Files:**
- Create: `src/components/RichText/Gadget/gadgetRegistry.ts` (+ test)
- Create: `src/components/RichText/Gadget/useGadgetSummaries.ts` (+ test)

- [ ] **Step 1: Types and registry**

`gadgetRegistry.ts`:

```ts
import { msg } from "@lingui/core/macro";
import {
  IconChartBar,
  IconDatabase,
  IconFileText,
  IconFolders,
  IconLayoutDashboard,
  IconMap2,
} from "@tabler/icons-react";
import {
  useConceptSummary,
  useDashboardSummary,
  useDashboardTileSummary,
  useDatasetSummary,
  useIndividualSummary,
  useMapSummary,
} from "@/components/RichText/Gadget/useGadgetSummaries";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { MessageDescriptor } from "@lingui/core";
import type { Icon } from "@tabler/icons-react";
import type { LinkProps } from "@tanstack/react-router";

/** Where opening a gadget goes, as a TanStack Router link target. */
export type GadgetLinkTarget = {
  to: NonNullable<LinkProps["to"]>;
  params: Record<string, string>;
  search?: Record<string, string>;
};

/** One fact on a gadget card. */
export type GadgetFact = { label: MessageDescriptor; value: string };

/** What a reader sees for one gadget ref. */
export type GadgetSummary =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "available"; name: string; facts: readonly GadgetFact[]; link: GadgetLinkTarget };

/** How one gadget type looks and resolves. */
export type GadgetDefinition = {
  Icon: Icon;
  noun: MessageDescriptor;
  useGadgetSummary: (ref: Gadget.Ref) => GadgetSummary;
};

/** Every gadget type. Adding a type to `GADGET_TYPES` fails to compile until it has an entry here. */
export const GADGET_REGISTRY: Readonly<Record<Gadget.Type, GadgetDefinition>> = {
  dashboard: { Icon: IconLayoutDashboard, noun: msg`dashboard`, useGadgetSummary: useDashboardSummary },
  dashboard_tile: { Icon: IconChartBar, noun: msg`tile`, useGadgetSummary: useDashboardTileSummary },
  dataset: { Icon: IconDatabase, noun: msg`dataset`, useGadgetSummary: useDatasetSummary },
  map: { Icon: IconMap2, noun: msg`map`, useGadgetSummary: useMapSummary },
  concept: { Icon: IconFolders, noun: msg`case type`, useGadgetSummary: useConceptSummary },
  individual: { Icon: IconFileText, noun: msg`case`, useGadgetSummary: useIndividualSummary },
};
```

A card calls `GADGET_REGISTRY[ref.gadgetType].useGadgetSummary(ref)` unconditionally at the top of its render (one hook per component instance, type fixed per node, so the hook order is stable).

- [ ] **Step 2: Failing tests** `useGadgetSummaries.test.tsx`

Use `renderHook` from `@/test-utils` with a `QueryClientProvider` wrapper, `vi.mock` the client modules (`@/clients/dashboards/DashboardClient/DashboardClient`, `@/clients/datasets/DatasetClient/DatasetClient`, `@/clients/datasets/DatasetColumnClient`, `@/clients/maps/AvaMapClient/AvaMapClient`, `@/clients/ontology/ConceptClient`, `@/clients/ontology/IndividualClient`, `@/clients/ontology/ConceptAttributeClient`) so each `useGetById` returns `[data, isLoading]` and each `useGetCount` returns `[count, isLoading]`, and mock `@/hooks/workspaces/useCurrentWorkspace` to `{ slug: "nyc-doh" }`. Cases:

- Dashboard found: `status: "available"`, name, facts Tiles `2` (config from Task 7's fixture), Audience (translated visibility), Updated (`formatDate(updatedAt, { format: "MMM D" })`), link `to: "/$workspaceSlug/dashboards/preview/$dashboardId"`.
- Dashboard loading: `status: "loading"`. Dashboard `undefined` after load: `status: "unavailable"`.
- Tile found: name is the prompt, facts Dashboard, Chart (`vizTypeLabel`), Updated; link has `search: { tile: "DataViz-nested" }`.
- Tile prompt missing: name is the translated "Untitled chart". Tile missing from its dashboard: `unavailable`.
- Dataset: facts Source (from `useDatasetSourceLabels`), Columns (count), Updated; link `AppLinks.dataManagerDatasetView`.
- Map: facts Layers (`config.layers.length`), Updated; link `AppLinks.mapEditor`.
- Concept: facts Records (individual count), Fields (attribute count); link `AppLinks.individualManagerHome`.
- Individual: facts Status, Case type (concept name), Updated; link `AppLinks.individualManagerIndividualView`.

- [ ] **Step 3: Implement `useGadgetSummaries.ts`**

One exported hook per type, each under 45 lines, each:

1. Calling its client's `useGetById({ id: ref.gadgetId })` (and the extra lookups listed above, each `useGetCount({ where: { <fk_column>: { eq: id } } })` or `useGetById`).
2. Returning `{ status: "loading" }` while any lookup is loading, `{ status: "unavailable" }` when the main row is `undefined` (or, for a tile, when `findDashboardTile` returns `undefined`), else `available`.
3. Building `link` from `AppLinks` for datasets, maps, case types, and cases (`{ to, params }` from the AppLink object), and for dashboards and tiles from the literal preview route:

```ts
const link: GadgetLinkTarget = {
  to: "/$workspaceSlug/dashboards/preview/$dashboardId",
  params: { workspaceSlug: workspace.slug, dashboardId: dashboard.id },
  ...(tileId ? { search: { tile: tileId } } : {}),
};
```

4. Formatting dates with `formatDate(value, { format: "MMM D" })` from `@avandar/utils`, counts with `String(count)`, the audience with a `msg` map `{ draft: msg\`Draft\`, workspace: msg\`Workspace\`, public: msg\`Public\` }`, and the viz type with `vizTypeLabel` from `shared/copy/vizTypeLabel.ts`. Translate `MessageDescriptor`s at the component (facts carry descriptors for labels; values are plain strings, so translate any value that is a message with `i18n._` inside the hook via `useLingui().i18n`).

Use `useCurrentWorkspace()` (from `@/hooks/workspaces/useCurrentWorkspace`) for `workspace.slug`. Gadgets render only inside workspace routes, so it is always available.

- [ ] **Step 4:** Registry test `gadgetRegistry.test.ts`: every value of `GADGET_TYPES` has an entry with an `Icon`, a `noun`, and a `useGadgetSummary` function.
- [ ] **Step 5:** Run both tests and `pnpm type-check`. Commit `src/components/RichText/Gadget/gadgetRegistry*` and `useGadgetSummaries*`: `feat(comments): resolve gadget references into summaries`.

---

### Task 9: `GadgetChip` and `GadgetCard`

**Files:**
- Create: `src/components/RichText/Gadget/GadgetChip/GadgetChip.tsx`, `.module.css`, `.test.tsx`
- Create: `src/components/RichText/Gadget/GadgetCard/GadgetCard.tsx`, `.module.css`, `.test.tsx`

Visual reference: the approved framed card and chip in `.superpowers/brainstorm/*/content/gadget-cards.html` (this worktree). Tokens: `--ava-surface-body` for the card header band and the chip fill (use `neutral.1` for the small chip per DESIGN.md "Area decides which step a fill takes"), `--ava-surface-raised` for the card body, `--ava-border-default` edges, radius `sm`, no shadow on the card (it sits inside a comment, which is already on the raised surface; a border alone marks it, per "The Real-Step Rule").

- [ ] **Step 1: Failing tests**

`GadgetChip.test.tsx`: mock `GADGET_REGISTRY` entries' `useGadgetSummary` via `vi.mock("@/components/RichText/Gadget/useGadgetSummaries", ...)` and render inside a router-aware wrapper. If TanStack `Link` needs a router in tests, find how existing component tests render `Link` (search `createMemoryHistory` or `RouterProvider` in `src/**/*.test.tsx`) and follow it; otherwise render `GadgetChip` with a `renderLink` prop override. Cases:

- Loading: a skeleton with an accessible label "Loading dashboard".
- Available: a link named "Measles by borough" with the dashboard icon.
- Unavailable: text "Unavailable dashboard", no link, a lock icon.

`GadgetCard.test.tsx`: the same three states; available shows the header (icon, name, noun "Dashboard", an "Open" link) and each fact label and value; unavailable shows "Unavailable dataset" and "It may have been deleted, or you don't have access. Ask the comment's author to share it." with no link; loading shows header and fact skeletons.

- [ ] **Step 2:** Run. Expected: FAIL.

- [ ] **Step 3: Implement**

`GadgetChip.tsx` props `{ gadgetRef: Gadget.Ref }`. It calls `GADGET_REGISTRY[gadgetRef.gadgetType].useGadgetSummary(gadgetRef)` and renders:

- loading: `<span className={classes.chip}><Icon size={13}/><Skeleton component="span" display="inline-block" width={80} height={12} /></span>` with `aria-busy` and a visually hidden "Loading {noun}".
- available: `<Link to params search className={classes.chip}><Icon size={13} aria-hidden />{name}</Link>`.
- unavailable: `<span className={clsx(classes.chip, classes.unavailable)}><IconLock size={13} aria-hidden />{t\`Unavailable ${noun}\`}</span>`.

`data-type="gadgetLink"` and the three attrs as `data-*` on the root, for e2e and for TipTap's `parseHTML`.

`GadgetCard.tsx` props `{ gadgetRef: Gadget.Ref; menu?: ReactNode }` (the editor passes its hover menu; the feed passes nothing). Renders a `<section aria-labelledby>` with:

- header band: icon tile, name (or skeleton, or "Unavailable {noun}" with a lock), the noun in dimmed text, and on the trailing edge `menu` then an "Open" `Link` (available only).
- body: a three-column `<dl>` of facts (available), three fact skeletons (loading), or the unavailable sentence.

Keep each component under 45 lines; split `GadgetCardHeader` and `GadgetCardBody` into the same folder if needed. CSS uses logical properties only.

- [ ] **Step 4:** Run the tests. Run `.claude/skills/impeccable/scripts/impeccable detect --json src/components/RichText/Gadget` and fix findings.
- [ ] **Step 5:** Commit `src/components/RichText/Gadget/GadgetChip` and `GadgetCard`: `feat(comments): render gadget chips and cards`.

---

### Task 10: Gadget TipTap nodes, view mapping, and the display switch

**Files:**
- Create: `src/components/RichText/Gadget/GadgetNodes/GadgetNodes.tsx` (+ test)
- Create: `src/components/RichText/Gadget/GadgetActionsMenu/GadgetActionsMenu.tsx`
- Modify: `src/components/RichText/createRichTextExtensions.ts`, `src/components/RichText/RichTextView/RichTextView.tsx`

- [ ] **Step 1: Failing tests** `GadgetNodes.test.ts` (headless `new Editor({ extensions: createRichTextExtensions(), content })`, destroyed in `afterEach`):

- `editor.commands.insertGadgetLink(ref)` inserts a `gadgetLink` node with exactly `{ gadgetType, gadgetId, subId }` attrs.
- `editor.commands.insertGadgetEmbed(ref)` inserts a top-level `gadgetEmbed` after the current paragraph.
- `editor.commands.showGadgetAsEmbed(pos)` on a link replaces it with an embed after its paragraph, removing the link; `showGadgetAsLink(pos)` on an embed replaces it with a paragraph holding a link.
- `editor.getJSON()` round-trips through `isRichTextDocument` as `true`.
- Rendering the same document with `RichTextView` (Task 9 mocks) shows a chip and a card.

- [ ] **Step 2:** Run. Expected: FAIL.

- [ ] **Step 3: Implement**

`GadgetNodes.tsx`:

```tsx
import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { GadgetActionsMenu } from "@/components/RichText/Gadget/GadgetActionsMenu/GadgetActionsMenu";
import { GadgetCard } from "@/components/RichText/Gadget/GadgetCard/GadgetCard";
import { GadgetChip } from "@/components/RichText/Gadget/GadgetChip/GadgetChip";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { NodeViewProps } from "@tiptap/react";
import type { ReactNode } from "react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    gadgetNodes: {
      insertGadgetLink: (ref: Gadget.Ref) => ReturnType;
      insertGadgetEmbed: (ref: Gadget.Ref) => ReturnType;
      showGadgetAsEmbed: (position: number) => ReturnType;
      showGadgetAsLink: (position: number) => ReturnType;
    };
  }
}

/** The attributes both gadget nodes store: a ref, never a name. */
const GADGET_ATTRIBUTES = {
  gadgetType: { default: null },
  gadgetId: { default: null },
  subId: { default: null },
};

function _refFromAttrs(attrs: Record<string, unknown>): Gadget.Ref {
  return {
    gadgetType: attrs.gadgetType as Gadget.Type,
    gadgetId: String(attrs.gadgetId ?? ""),
    subId: (attrs.subId as string | null) ?? null,
  };
}

function GadgetLinkView({ node, getPos, editor }: NodeViewProps): ReactNode {
  const ref = _refFromAttrs(node.attrs);
  return (
    <NodeViewWrapper as="span">
      <GadgetActionsMenu gadgetRef={ref} display="link" editor={editor} getPos={getPos}>
        <GadgetChip gadgetRef={ref} />
      </GadgetActionsMenu>
    </NodeViewWrapper>
  );
}

function GadgetEmbedView({ node, getPos, editor }: NodeViewProps): ReactNode {
  const ref = _refFromAttrs(node.attrs);
  return (
    <NodeViewWrapper>
      <GadgetCard
        gadgetRef={ref}
        menu={<GadgetActionsMenu gadgetRef={ref} display="embed" editor={editor} getPos={getPos} />}
      />
    </NodeViewWrapper>
  );
}

/** An inline link to a gadget, drawn as a chip. */
export const GadgetLink = Node.create({
  name: "gadgetLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes: () => {
    return GADGET_ATTRIBUTES;
  },
  parseHTML: () => {
    return [{ tag: 'span[data-type="gadgetLink"]' }];
  },
  renderHTML: ({ HTMLAttributes }) => {
    return ["span", mergeAttributes({ "data-type": "gadgetLink" }, HTMLAttributes)];
  },
  renderText: () => {
    return "[gadget]";
  },
  addNodeView: () => {
    return ReactNodeViewRenderer(GadgetLinkView);
  },
  addCommands: () => {
    return {
      insertGadgetLink:
        (ref) =>
        ({ commands }) => {
          return commands.insertContent([{ type: "gadgetLink", attrs: ref }, { type: "text", text: " " }]);
        },
      showGadgetAsEmbed:
        (position) =>
        ({ state, tr, dispatch }) => {
          const node = state.doc.nodeAt(position);
          if (node?.type.name !== "gadgetLink") {
            return false;
          }
          const embed = state.schema.nodes["gadgetEmbed"]?.create(node.attrs);
          if (!embed) {
            return false;
          }
          const $pos = state.doc.resolve(position);
          const afterBlock = $pos.after(1);
          if (dispatch) {
            tr.insert(afterBlock, embed).delete(position, position + node.nodeSize);
          }
          return true;
        },
    };
  },
});

/** A gadget embedded on its own line, drawn as a framed card. */
export const GadgetEmbed = Node.create({
  name: "gadgetEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes: () => {
    return GADGET_ATTRIBUTES;
  },
  parseHTML: () => {
    return [{ tag: 'div[data-type="gadgetEmbed"]' }];
  },
  renderHTML: ({ HTMLAttributes }) => {
    return ["div", mergeAttributes({ "data-type": "gadgetEmbed" }, HTMLAttributes)];
  },
  addNodeView: () => {
    return ReactNodeViewRenderer(GadgetEmbedView);
  },
  addCommands: () => {
    return {
      insertGadgetEmbed:
        (ref) =>
        ({ state, tr, dispatch }) => {
          const embed = state.schema.nodes["gadgetEmbed"]?.create(ref);
          if (!embed) {
            return false;
          }
          const afterBlock = state.selection.$from.after(1);
          if (dispatch) {
            tr.insert(afterBlock, embed);
          }
          return true;
        },
      showGadgetAsLink:
        (position) =>
        ({ state, tr, dispatch }) => {
          const node = state.doc.nodeAt(position);
          const link = state.schema.nodes["gadgetLink"];
          const paragraph = state.schema.nodes["paragraph"];
          if (node?.type.name !== "gadgetEmbed" || !link || !paragraph) {
            return false;
          }
          if (dispatch) {
            tr.replaceWith(position, position + node.nodeSize, paragraph.create(null, link.create(node.attrs)));
          }
          return true;
        },
    };
  },
});
```

If `$from.after(1)` throws at the document's top level (selection directly in `doc`), fall back to `state.doc.content.size`. The command tests cover both positions.

`GadgetActionsMenu.tsx` props `{ gadgetRef, display: "link" | "embed", editor, getPos, children? }`. With `children`, it wraps them in a Mantine `HoverCard` (open on hover and focus within, `openDelay` 300) whose dropdown holds the menu; without, it renders an `ActionIcon` with a `Menu`. Menu items (Lingui): "Open {noun}" (navigates through `useNavigate` to the summary's link; only when available), "Show as embed" / "Show as link" (calls `editor.commands.showGadgetAsEmbed(getPos())` / `showGadgetAsLink(getPos())`), "Copy link" (copies `window.location.origin + router.buildLocation(link).href`; only when available). When `editor.isEditable` is false, render only `children` (no menu).

`createRichTextExtensions.ts`: add `GadgetLink` and `GadgetEmbed` after `UserMention`.

`RichTextView.tsx` `nodeMapping`: add

```tsx
gadgetLink: ({ node }) => {
  return <GadgetChip gadgetRef={_refFromNode(node.attrs)} />;
},
gadgetEmbed: ({ node }) => {
  return <GadgetCard gadgetRef={_refFromNode(node.attrs)} />;
},
```

(export `_refFromAttrs` from `GadgetNodes.tsx` as `gadgetRefFromAttrs` and use it here.)

- [ ] **Step 4:** Run `pnpm vitest run src/components/RichText` and `pnpm type-check`. Expected: PASS.
- [ ] **Step 5:** Commit `src/components/RichText`: `feat(comments): add gadget link and embed nodes`.

---

### Task 11: One `@` menu for people and gadgets

**Files:**
- Create: `src/components/RichText/MentionMenu/MentionMenuList.tsx` (+ css, test) replacing `UserMention/UserMentionList.tsx` (+ its css and test)
- Create: `src/components/RichText/MentionMenu/createMentionMenuSuggestion.ts` replacing `UserMention/createUserMentionSuggestion.ts`
- Create: `src/components/RichText/MentionMenu/buildMentionMenuGroups.ts` (+ test)
- Modify: `src/components/RichText/RichTextComposer/RichTextComposer.tsx` (+ test), `src/components/RichText/createRichTextExtensions.ts`
- Modify: `.../CaseActivityFeed/CaseActivityComposer/CaseActivityComposer.tsx`, `.../CommentCard/CommentCardBody.tsx` (pass `workspaceId`)

- [ ] **Step 1: Pure grouping logic, failing test** `buildMentionMenuGroups.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { buildMentionMenuGroups } from "@/components/RichText/MentionMenu/buildMentionMenuGroups";

function _gadget(gadgetType: string, label: string) {
  return {
    ref: { gadgetType, gadgetId: "11111111-1111-4111-8111-111111111111", subId: gadgetType === "dashboard_tile" ? "DataViz-1" : null },
    label,
    subLabel: undefined,
    hasLimitedAudience: false,
  } as never;
}

describe("buildMentionMenuGroups", () => {
  it("groups gadgets by type in menu order, people last, at most 5 each, hiding empty groups", () => {
    const groups = buildMentionMenuGroups({
      gadgets: [
        _gadget("individual", "Amara"),
        _gadget("dashboard_tile", "Cases per week"),
        _gadget("dashboard", "Measles"),
        ...Array.from({ length: 7 }, (_, index) => _gadget("dataset", `Dataset ${index}`)),
      ],
      people: [{ userId: "u1", displayName: "Bella", email: "b@example.org" }],
    });
    expect(groups.map((group) => group.key)).toEqual(["dashboards", "datasets", "cases", "people"]);
    expect(groups[0]?.items.map((item) => item.label)).toEqual(["Measles", "Cases per week"]);
    expect(groups[1]?.items).toHaveLength(5);
  });
});
```

Implement `buildMentionMenuGroups.ts`: a `MentionMenuItem` union `{ kind: "person"; id: string; label: string; detail: string; candidate: MentionCandidate } | { kind: "gadget"; id: string; label: string; detail: string | undefined; result: GadgetSearchResult }` (`id` is a stable option id: user id, or `${gadgetType}:${gadgetId}:${subId ?? ""}`), and groups in this order with these keys: `dashboards` (`dashboard`, `dashboard_tile`, dashboards first), `datasets`, `maps`, `caseTypes` (`concept`), `cases` (`individual`), `people`. Cap each group at 5. Drop empty groups. Return `{ key, items }[]`; the list component supplies translated group titles.

- [ ] **Step 2: Menu list, failing tests** `MentionMenuList.test.tsx` (port `UserMentionList.test.tsx` and extend):

- Renders group titles "Dashboards", "Datasets", "People" and items with detail lines.
- ArrowDown moves across groups (flat index over all items).
- Enter on a gadget calls `command({ kind: "gadget", display: "link", result })`; Shift+Enter calls it with `display: "embed"`; Shift+Enter on a person does nothing and returns `false`; Ctrl/Meta+Enter returns `false` (submit wins).
- A highlighted gadget with `hasLimitedAudience` shows "Only some people can open this dashboard. Teammates on this case without access will see Unavailable."
- `isSearching` shows a single "Searching..." row in place of gadget groups; `searchFailed` shows "Couldn't search. Keep typing to retry." and people still render.
- Footer shows "Enter link" and "Shift Enter embed" hints when a gadget is highlighted.
- The ARIA behavior from `UserMentionList` (combobox role swap on the editing area, `aria-activedescendant`, cleanup on unmount) is preserved.

Implement `MentionMenuList.tsx` by moving `UserMentionList.tsx` and generalizing: props `{ groups, isSearching, searchFailed, clientRect, command, editingArea }`, `command(selection: { kind: "person"; candidate } | { kind: "gadget"; display: "link" | "embed"; result })`. Keep the highlight-in-React-state approach, the anchor positioning, and `hideDetached={false}`. Render each group with a `Combobox.Group label={title}`. Gadget rows show the registry icon, label, and detail (`subLabel` or the translated noun). Delete `UserMentionList.*` and update imports.

- [ ] **Step 3: Suggestion with async gadgets**

`createMentionMenuSuggestion.ts` replaces `createUserMentionSuggestion.ts`:

```ts
export function createMentionMenuSuggestion(options: {
  getCandidates: () => readonly MentionCandidate[];
  getWorkspaceId: () => string | undefined;
}): MentionOptions["suggestion"]
```

- `items: async ({ query, signal })`: people via `filterMentionCandidates`. If `getWorkspaceId()` is set, wait 150 ms (`await new Promise((resolve) => setTimeout(resolve, 150))`), return early if `signal?.aborted`, then `searchGadgets({ workspaceId, query, limit: 20 })`. On error, return the people with a `searchFailed` marker. The suggestion plugin passes `items` to `render` as `props.items`, so return a single object array element or encode the state as `MentionMenuState = { people, gadgets, searchFailed }` wrapped in an array of one (TipTap requires an array); `onUpdate` reads `props.items[0]`.
- To show "Searching..." while the request is in flight, `onStart`/`onUpdate` render immediately with the people and `isSearching: true` before the async result arrives. If TipTap's async `items` only calls `onUpdate` after resolution, keep a module-level `latestQuery` and render the searching state from `onBeforeUpdate`. Verify with the composer test.
- `command: ({ editor, range, props })` overrides Mention's default: for a person, `editor.chain().focus().insertContentAt(range, [{ type: "userMention", attrs: { id } }, { type: "text", text: " " }]).run()`; for a gadget link, `deleteRange(range).insertGadgetLink(ref)`; for a gadget embed, `deleteRange(range).insertGadgetEmbed(ref)`.
- Lifecycle (`ReactRenderer`, `editingArea`, `onExit` cleanup) is unchanged from `createUserMentionSuggestion.ts`.

`createRichTextExtensions` options: `mentionSuggestion` stays the parameter name; the composer now passes `createMentionMenuSuggestion(...)`.

- [ ] **Step 4: Composer**

`RichTextComposer` props gain `workspaceId?: string`. A `workspaceIdRef` mirrors it (like `candidatesRef`) and feeds `getWorkspaceId`. Update the toolbar `@` control label to "Mention a teammate or link a gadget" (keep the accessible name stable in tests by updating them). `CaseActivityComposer` and `CommentCardBody` pass their `workspaceId` (the comment's `workspaceId` for edits). Update the placeholder in `CaseActivityComposer` to "Write an update. Type @ to mention a teammate or link a dashboard, dataset, or case."

Composer tests (extend `RichTextComposer.test.tsx`, mocking `@/clients/gadgets/searchGadgets/searchGadgets`):

- With a `workspaceId`, typing `@meas` then waiting shows the gadget result; Enter inserts a `gadgetLink` and posting sends a document containing `{"type":"gadgetLink","attrs":{...}}`; `plainText` contains `[dashboard]` and not the label.
- Shift+Enter inserts a `gadgetEmbed`.
- Without a `workspaceId`, `searchGadgets` is never called.

- [ ] **Step 5:** Run `pnpm vitest run src/components/RichText src/views/IndividualManagerApp` and `pnpm type-check`. Expected: PASS.
- [ ] **Step 6:** Commit by path: `feat(comments): search gadgets from the @ menu`.

---

### Task 12: Open a tile on its dashboard

**Files:**
- Modify: `src/routes/_auth/$workspaceSlug/dashboards/preview/$dashboardId.tsx`
- Modify: `src/views/DashboardApp/DashboardViewerView/DashboardViewerView.tsx`, `DashboardViewerContent.tsx`
- Modify: `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock.tsx`, `DataVizContent.tsx`
- Create: `src/views/DashboardApp/DashboardViewerView/useHighlightTile.ts` (+ test)

- [ ] **Step 1: Failing test** `useHighlightTile.test.tsx`: render a container with `<div data-tile-id="DataViz-1">`, call `useHighlightTile("DataViz-1")`, assert `scrollIntoView` was called on it and it carries the highlight class; with an unknown id nothing throws; with `undefined` nothing happens.
- [ ] **Step 2: Implement**

- Route: `validateSearch: z.object({ tile: z.string().min(1).optional().catch(undefined) })`, read `Route.useSearch()` and pass `highlightedTileId` to `DashboardViewerView`, which passes it to `DashboardViewerContent`.
- `useHighlightTile(tileId)`: after mount, poll with `requestAnimationFrame` up to 2 seconds for `document.querySelector(\`[data-tile-id="${CSS.escape(tileId)}"]\`)` (tiles render after their queries start), then `scrollIntoView({ block: "center", behavior: "smooth" })` and add a CSS module class that fades a `--mantine-color-primary-0` outline over 2.4 s (no animation under `prefers-reduced-motion`; remove the class after the timer, like the linked-comment highlight in `CommentCard`).
- `DataVizPBlock` passes `props.id` to `DataVizContent`; both `Paper` roots in `DataVizContent` get `data-tile-id={tileId}`.

- [ ] **Step 3:** Run `pnpm vitest run src/views/DashboardApp/DashboardViewerView src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock` and `pnpm type-check`.
- [ ] **Step 4:** Commit by path: `feat(dashboards): scroll to and highlight a linked tile in the dashboard preview`.

---

### Task 13: Translations and docs

**Files:**
- Modify: `src/i18n/locales/*/messages.po|ts` (generated)
- Create: `docs/measles-demo/gadgets.md`
- Modify: `docs/measles-demo/case-activity-architecture.md`, `docs/production-plan-world-humanitarian-day.md`, `docs/measles-demo/pr-feature-log.md`

- [ ] **Step 1:** `pnpm i18n:extract && pnpm i18n:compile`; commit `src/i18n/locales` as `chore(comments): extract gadget messages`.
- [ ] **Step 2:** Write `docs/measles-demo/gadgets.md` with the content of spec section 9 (gadget table with table, id, open route, facts; never-gadgets with reasons; not-yet-gadgets; how to add a type), plus a short "How it works" paragraph naming `rpc_gadgets__search`, `GADGET_REGISTRY`, the two nodes, and `comment_gadget_refs`.
- [ ] **Step 3:** In `case-activity-architecture.md`, replace the "Extension points for object references and embeds" section with "Gadget references" (two short paragraphs and a link to `gadgets.md`). In the roadmap, add a P5c bullet for gadget references and list the spec's follow-ups. In `pr-feature-log.md`, add this feature (next free F number) with its commits, files, schema, and verification, following the existing entries.
- [ ] **Step 4:** Commit the docs: `docs(measles-demo): document gadgets and log gadget references`.

---

### Task 14: End-to-end spec

Load the `playwright-best-practices` skill.

**Files:**
- Create: `tests/e2e/helpers/seedDashboardWithTile.ts`
- Create: `tests/e2e/case-gadgets.spec.ts`

- [ ] **Step 1: Seed helper (setup only).** Insert, with the admin client, a dashboard in the e2e workspace (owner = primary user, `visibility` `workspace`, every required column per `10.dashboards.sql`) whose `config` is `{ "root": { "props": { "title": "E2E measles" } }, "content": [{ "type": "DataViz", "props": { "id": "DataViz-e2e", "nlQuery": { "prompt": "E2E cases per week", "rawSql": "", "generations": [] }, "vizType": "bar" } }] }`. Reuse `seedCaseRecord` from `tests/e2e/helpers/seedCaseRecord.ts` for the case. Return ids; provide `deleteSeededDashboard`.
- [ ] **Step 2: Spec** (UI only after seeding): sign in, open the seeded case, type `@E2E meas` and press Enter (chip "E2E measles" appears), hover the chip and choose "Show as embed" (a card titled "E2E measles" with a "Tiles 1" fact appears), type `@E2E cases` and press Shift+Enter (a tile card titled "E2E cases per week" appears), post, check both cards in the feed, click the tile card's "Open" and assert the URL contains `/dashboards/preview/` and `tile=DataViz-e2e` and an element `[data-tile-id="DataViz-e2e"]` is visible. Clean up in `finally`.
- [ ] **Step 3:** `pnpm test:e2e case-gadgets.spec.ts`. Expected: PASS within 45 s. Fix the UI, not the timeout.
- [ ] **Step 4:** Commit both files: `test(comments): cover linking and embedding gadgets in a case comment`.

---

### Task 15: Final verification

- [ ] `pnpm lint && pnpm type-check && pnpm test:frontend`
- [ ] `ava supabase status && pnpm test:db`
- [ ] `pnpm test:desktop`
- [ ] `pnpm i18n:check`
- [ ] `.claude/skills/impeccable/scripts/impeccable detect --json src/components/RichText src/views/DashboardApp/DashboardViewerView`
- [ ] `pnpm test:e2e case-gadgets.spec.ts` and `pnpm test:e2e case-activity.spec.ts`
- [ ] Manual check in the dev server with the seeded credentials: a link chip, an embed card, a tile card opening its dashboard with the tile highlighted, and the unavailable state (link a restricted dashboard as its owner, then view the case as another member). Screenshots to `.temp/feat-comment-embeds/`.
- [ ] Remind the user to run `ava supabase restore` when they finish validating.

---

## Refinements made while planning

- **Dashboard and tile "Open" go to the preview route** (`/$ws/dashboards/preview/<id>`), not `/$ws/d/<id>`: `DashboardRouteResolver` denies draft dashboards to everyone, while preview renders for editors at any visibility and for viewers on published dashboards (viewers of a draft are correctly denied). `?tile=` is therefore handled by the preview route and the dashboard viewer.
- **Search ranking follows the catalog search RPC:** pg_trgm `word_similarity` and the `<%` operator plus `ilike` and a prefix boost, instead of plain `similarity`.
- **`useDatasetSourceLabels` is extracted** from `DatasetMetaView` so the dataset card and the dataset page share one translated label set.
- **Puck renders blocks without DOM ids,** so `DataVizContent` gets `data-tile-id` for scrolling and for e2e.
- **The mention list and suggestion are replaced, not extended:** `UserMention/UserMentionList.tsx` and `createUserMentionSuggestion.ts` become `MentionMenu/MentionMenuList.tsx` and `createMentionMenuSuggestion.ts`, keeping their ARIA and highlight behavior.
- **`Gadget.Ref.subId` is `string | null`,** not `string | undefined`: it is stored in JSON node attributes and in a nullable column, where `null` round-trips and `undefined` does not.
- **Summaries carry a router `link` target** (`{ to, params, search? }`) instead of an `href` string, so chips and cards use TanStack `Link` and "Copy link" builds the absolute URL from the router.
- **Some test steps list exact cases instead of full code** (Tasks 2, 8, 9, 11, 12): their seeds and mocks depend on required columns and client hook shapes that the implementer must read from the files named in each step. Each listed case is a required assertion.
