# Analytics Event Foundation Implementation Plan

> **Status:** Complete as of 2026-08-14. The implementation landed with the
> analytics foundation changes; the deferred client-event enrichment was
> completed in the companion payload-enrichment plan.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `usage_analytics_events` a trustworthy funnel-stage column, an
emitting-runtime column, a build-version column, and the two helpers plus the
shared typed event registry that every later phase depends on.

**Architecture:** A single Postgres function maps event name to funnel stage,
and a `before insert` trigger applies it so the column can never disagree with
the event name. A `security definer` SQL helper is the only way triggers record
events, and it swallows every error so analytics can never roll back a user
action. The canonical event registry moves to `shared/` so the browser and Deno
edge functions type-check against one list, split by which runtime is allowed to
emit each event.

**Tech Stack:** Postgres 15 with declarative schemas under `supabase/schemas/`,
pgTAP for database tests, TypeScript with Vitest, Vite, Supabase Edge Functions
on Deno.

---

## Scope

This is Phase 1A of the four-phase plan in
`docs/superpowers/specs/2026-08-13-usage-analytics-events-design.md`. It covers
everything in the spec's Phase 1 that is fully specified today.

**Deliberately deferred to Phase 1B** (each needs per-call-site investigation
that this plan does not have answers for):

- Enriching the payloads of the seven events that already fire.
- Fixing `dashboard.filter_changed` to carry `workspaceId` and to log the
  `contains` branch. The ids come from `useAvaPageMetadata(puck)`, which
  requires converting `FilterPBlock` to `WithPuckProps<Props>`.
- Anything touching `ExportPdfButton.tsx`. `HIDE_EXPORT_AS_PDF = true` on line
  13 makes the component return `null` on line 34, so
  `dashboard.pdf_export_opened` is unreachable and `dashboard.pdf_exported`
  would be instrumentation for a hidden feature. Both names are still
  registered and categorised here so the mapping is complete when the feature
  ships.

After this plan, every existing call site still compiles and behaves
identically, but every row carries a category, an emitting client, and a build
version.

## File Structure

**Created:**

| Path | Responsibility |
| --- | --- |
| `supabase/schemas/00.enum.usage_analytics_events__category.sql` | The funnel-stage enum type, alone in its file per the declarative-schema skill |
| `supabase/schemas/00.enum.usage_analytics_events__client.sql` | The emitting-runtime enum type |
| `supabase/tests/database/analytics/usage_analytics_events_columns.test.sql` | pgTAP: the three columns and the index exist with the right nullability |
| `supabase/tests/database/analytics/analytics_event_category.test.sql` | pgTAP: the mapping function and the category trigger, including the override |
| `supabase/tests/database/analytics/log_analytics_event.test.sql` | pgTAP: the helper inserts, swallows errors, and is not executable by `authenticated` |
| `shared/analytics/analyticsEvents.ts` | The canonical event registry: names split by emitting runtime, the payload type map, and the derived union types |
| `shared/analytics/analyticsEvents.test.ts` | Vitest: drift guard proving every registered name is categorised in SQL |
| `supabase/functions/_shared/analytics/logAnalyticsEvent.ts` | Edge-function emitter, sets `client = 'server'` and swallows failures |
| `supabase/functions/_shared/analytics/logAnalyticsEvent.test.ts` | Vitest: row shape and error swallowing |
| `src/lib/analytics/AnalyticsClient.test.ts` | Vitest: row shape, `web` vs `desktop`, error swallowing |

**Modified:**

| Path | Change |
| --- | --- |
| `supabase/schemas/30.usage_analytics_events.sql` | Three columns, one index, the mapping function, the category trigger, the log helper, the corrected table comment |
| `src/lib/analytics/AnalyticsClient.ts` | Typed discriminated-union `logEvent`, sends `client` and `app_version`, dev-only warn |
| `vite.config.ts` | `define` exposing `import.meta.env.VITE_APP_VERSION` from `package.json` |

**Deleted:**

| Path | Reason |
| --- | --- |
| `src/lib/analytics/analyticsEventTypes.ts` | Superseded by `shared/analytics/analyticsEvents.ts`, which the edge runtime can also import |

## Background The Engineer Needs

**Declarative schema workflow.** Never hand-write a migration for a schema
change. Edit the desired final state in `supabase/schemas/*.sql`, then run
`pnpm db:new-migration <name>`, which stops Supabase and runs
`supabase db diff -f <name>`. Files are applied in lexicographic order, which is
why enums use a `00.` prefix and tables use higher numbers.

**The one exception.** `supabase db diff` does not reliably capture DML
(`INSERT`/`UPDATE`/`DELETE`), comments, views, or grants. The backfill in Task 3
is therefore a hand-written migration, and Task 4 verifies that the `revoke`
landed rather than assuming it.

**`pnpm db:reset`** starts Supabase, applies all migrations, regenerates
`shared/types/database.types.ts`, and seeds. Run it after generating a migration
so the local database and the generated types match.

**Import aliases.** `$` is `/shared`, `@` is `/src`, `@sbfn` is
`/supabase/functions`. Files under `shared/` are imported by both Vite and Deno,
so **imports inside `shared/` must carry a `.ts` extension** (Deno requires it,
Vite tolerates it). Every edge function's `deno.json` already maps `$/` to
`shared/`, so no import map needs editing.

---

## Task 1: Add the enum types and the three columns

**Files:**
- Create: `supabase/schemas/00.enum.usage_analytics_events__category.sql`
- Create: `supabase/schemas/00.enum.usage_analytics_events__client.sql`
- Create: `supabase/tests/database/analytics/usage_analytics_events_columns.test.sql`
- Modify: `supabase/schemas/30.usage_analytics_events.sql`

- [ ] **Step 1: Write the failing pgTAP test**

Create `supabase/tests/database/analytics/usage_analytics_events_columns.test.sql`:

```sql
begin;

select plan(7);

select has_column(
  'public', 'usage_analytics_events', 'event_category',
  'usage_analytics_events has an event_category column'
);
select has_column(
  'public', 'usage_analytics_events', 'client',
  'usage_analytics_events has a client column'
);
select has_column(
  'public', 'usage_analytics_events', 'app_version',
  'usage_analytics_events has an app_version column'
);

select col_not_null(
  'public', 'usage_analytics_events', 'event_category',
  'event_category is NOT NULL'
);
select col_not_null(
  'public', 'usage_analytics_events', 'client',
  'client is NOT NULL'
);
select col_is_null(
  'public', 'usage_analytics_events', 'app_version',
  'app_version is nullable because db and server rows have no build version'
);

select has_index(
  'public',
  'usage_analytics_events',
  'usage_analytics_events__event_category__created_at_idx',
  'the category reporting index exists'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm db:reset && pnpm test:db
```

Expected: FAIL. The `usage_analytics_events_columns` assertions report
`Column public.usage_analytics_events.event_category should exist` as not ok,
because none of the three columns exist yet.

- [ ] **Step 3: Create the category enum file**

Create `supabase/schemas/00.enum.usage_analytics_events__category.sql`:

```sql
-- Funnel stage a usage analytics event belongs to. Stored on every
-- `usage_analytics_events` row so reporting can group by lifecycle stage
-- instead of hard-coding lists of event names.
--
-- `expansion` covers the account growing or shrinking through people and
-- reach: invites, invite acceptances, seat removals, and public dashboard
-- views.
--
-- `other` is the fallback for an event name that has not been categorised in
-- `public.util__analytics_event_category`. It exists so a typo'd or
-- newly-added event name can never reject an insert. Find them with
-- `where event_category = 'other'`.
create type public.usage_analytics_events__category as enum(
  'acquisition',
  'activation',
  'engagement',
  'expansion',
  'revenue',
  'other'
);
```

- [ ] **Step 4: Create the client enum file**

Create `supabase/schemas/00.enum.usage_analytics_events__client.sql`:

```sql
-- Which runtime emitted a usage analytics event.
--
-- `web` and `desktop` are set by `AnalyticsClient` in the browser and in the
-- Electrobun desktop shell. `server` is set by the edge-function analytics
-- helper. `db` is set by `public.util__log_analytics_event`, which only
-- Postgres triggers call.
create type public.usage_analytics_events__client as enum(
  'web',
  'desktop',
  'server',
  'db'
);
```

- [ ] **Step 5: Append the three columns to the table definition**

In `supabase/schemas/30.usage_analytics_events.sql`, the column list currently
ends with:

```sql
  payload jsonb,
  created_at timestamptz not null default now()
);
```

Replace that with (new columns appended last, per the declarative-schema
skill's rule about reducing diff noise):

```sql
  payload jsonb,
  created_at timestamptz not null default now(),
  -- Funnel stage this event belongs to. Never set by callers: the
  -- `tr__usage_analytics_events__set_category` trigger overwrites whatever was
  -- passed with `util__analytics_event_category(event_name)`, so reporting can
  -- trust that this column always agrees with `event_name`. The default exists
  -- for two reasons: adding a NOT NULL column to a table with existing rows
  -- needs one, and an insert still succeeds if the trigger is ever dropped.
  event_category public.usage_analytics_events__category not null default 'other',
  -- Which runtime emitted the row. Every writer sets this explicitly:
  -- `AnalyticsClient` sends `web` or `desktop`, the edge helper sends
  -- `server`, and `util__log_analytics_event` sends `db`. The `web` default
  -- correctly backfills every row written before this column existed, all of
  -- which came from the browser client (the only writer at the time).
  client public.usage_analytics_events__client not null default 'web',
  -- Build version of the emitting app, for correlating a regression with a
  -- release. Null for `db` and `server` rows, which have no build version.
  app_version text
);
```

- [ ] **Step 6: Add the reporting index**

In the same file, immediately after the existing
`usage_analytics_events__event_name__created_at_idx` index, add:

```sql
create index usage_analytics_events__event_category__created_at_idx on public.usage_analytics_events (
  event_category,
  created_at desc
);
```

- [ ] **Step 7: Correct the table comment**

The header comment currently claims reads are restricted to "workspace owners +
global admins". No platform-admin concept exists anywhere in this schema. Find
this line in the header block:

```sql
-- an external analytics vendor.
-- Rows are intentionally not editable. The only valid operation is INSERT
-- by an authenticated workspace member, scoped to a workspace they belong
-- to. Reads are restricted to workspace owners + global admins via RLS so
-- we can build admin dashboards on top of this table later without
-- exposing one user's session to another.
```

Replace the last three lines of it so the block reads:

```sql
-- an external analytics vendor.
-- Rows are intentionally not editable. The only valid operation is INSERT
-- by an authenticated workspace member, scoped to a workspace they belong
-- to. Reads are restricted to workspace owners via RLS. There is no
-- platform-admin concept: account-level rows (where `workspace_id` is null)
-- are readable only with the service role, which is how the reporting views
-- in the `analytics` schema are queried.
```

- [ ] **Step 8: Generate the migration**

```bash
pnpm db:new-migration add_usage_analytics_event_category_and_client
```

Expected: prints that Supabase stopped, then writes a new file under
`supabase/migrations/`. Open it and confirm it contains two `create type`
statements, three `alter table ... add column` statements, and one
`create index`. It must **not** contain any `drop` statement. If it does, stop
and re-check the declarative edits.

- [ ] **Step 9: Apply the migration and regenerate types**

```bash
pnpm db:reset
```

Expected: migrations apply cleanly and `shared/types/database.types.ts` is
rewritten. Confirm the new enums landed in the generated types:

```bash
grep -n "usage_analytics_events__category" shared/types/database.types.ts
```

Expected: at least one match inside the `Enums` block.

- [ ] **Step 10: Run the test to verify it passes**

```bash
pnpm test:db
```

Expected: PASS. All 7 assertions in `usage_analytics_events_columns` report ok.

- [ ] **Step 11: Commit**

```bash
git add supabase/schemas/00.enum.usage_analytics_events__category.sql \
        supabase/schemas/00.enum.usage_analytics_events__client.sql \
        supabase/schemas/30.usage_analytics_events.sql \
        supabase/migrations/ \
        supabase/tests/database/analytics/usage_analytics_events_columns.test.sql \
        shared/types/database.types.ts
git commit -m "feat(analytics): add event_category, client, and app_version columns"
```

---

## Task 2: Category mapping function and enforcing trigger

**Files:**
- Create: `supabase/tests/database/analytics/analytics_event_category.test.sql`
- Modify: `supabase/schemas/30.usage_analytics_events.sql`

- [ ] **Step 1: Write the failing pgTAP test**

Create `supabase/tests/database/analytics/analytics_event_category.test.sql`:

```sql
begin;

select plan(8);

-- One representative event per category, so a mis-typed enum label in the
-- mapping function fails here rather than silently landing in `other`.
select is(
  public.util__analytics_event_category('user.registered')::text,
  'acquisition',
  'user.registered is acquisition'
);
select is(
  public.util__analytics_event_category('query.ran')::text,
  'activation',
  'query.ran is activation'
);
select is(
  public.util__analytics_event_category('chat.message_sent')::text,
  'engagement',
  'chat.message_sent is engagement'
);
select is(
  public.util__analytics_event_category('workspace.invite_sent')::text,
  'expansion',
  'workspace.invite_sent is expansion'
);
select is(
  public.util__analytics_event_category('subscription.plan_changed')::text,
  'revenue',
  'subscription.plan_changed is revenue'
);
select is(
  public.util__analytics_event_category('not.a.real.event')::text,
  'other',
  'an unmapped name falls back to other instead of raising'
);

-- The trigger fills the column when the caller omits it.
insert into public.usage_analytics_events (event_name)
values ('query.ran');

select is(
  (
    select event_category::text
    from public.usage_analytics_events
    where event_name = 'query.ran'
    order by created_at desc
    limit 1
  ),
  'activation',
  'the trigger sets event_category when the caller omits it'
);

-- The trigger overrides a caller-supplied value. This is the guarantee the
-- whole column rests on, so it is asserted directly.
insert into public.usage_analytics_events (event_name, event_category)
values ('subscription.plan_changed', 'engagement');

select is(
  (
    select event_category::text
    from public.usage_analytics_events
    where event_name = 'subscription.plan_changed'
    order by created_at desc
    limit 1
  ),
  'revenue',
  'the trigger overrides a category supplied by the caller'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test:db
```

Expected: FAIL with `function public.util__analytics_event_category(unknown)
does not exist`.

- [ ] **Step 3: Add the mapping function**

Append to `supabase/schemas/30.usage_analytics_events.sql`, after the RLS
policies:

```sql
-- Maps a stable event name to its funnel stage. This is the single source of
-- truth for `usage_analytics_events.event_category`, and
-- `tr__usage_analytics_events__set_category` is its only caller.
--
-- The mapping lives in SQL rather than in the TypeScript event registry
-- because Postgres triggers emit many of these events and cannot read
-- TypeScript. `shared/analytics/analyticsEvents.ts` mirrors it for developer
-- reference, and a Vitest drift guard fails if the two disagree.
--
-- An unknown name returns `other` rather than raising: recording analytics
-- must never reject a user action.
--
-- @param p_event_name: the event's stable name
-- @returns: the event's funnel stage
create or replace function public.util__analytics_event_category (
  p_event_name text
) returns public.usage_analytics_events__category as $$
  select (
    case p_event_name
      -- acquisition
      when 'waitlist.code_verified' then 'acquisition'
      when 'waitlist.code_claimed' then 'acquisition'
      when 'user.registered' then 'acquisition'
      when 'user.email_confirmed' then 'acquisition'
      -- activation
      when 'workspace.created' then 'activation'
      when 'dataset.imported' then 'activation'
      when 'query.ran' then 'activation'
      when 'dashboard.published' then 'activation'
      -- engagement
      when 'user.signed_in' then 'engagement'
      when 'chat.message_sent' then 'engagement'
      when 'chat.sql_generated' then 'engagement'
      when 'chat.turn_completed' then 'engagement'
      when 'chat.turn_failed' then 'engagement'
      when 'dashboard.block_added_via_chat' then 'engagement'
      when 'dashboard.filter_changed' then 'engagement'
      when 'dashboard.share_settings_updated' then 'engagement'
      when 'dashboard.pdf_export_opened' then 'engagement'
      when 'dashboard.pdf_exported' then 'engagement'
      when 'query.failed' then 'engagement'
      -- expansion
      when 'workspace.invite_sent' then 'expansion'
      when 'workspace.invite_accepted' then 'expansion'
      when 'member.removed' then 'expansion'
      when 'dashboard.public_viewed' then 'expansion'
      -- revenue
      when 'subscription.created' then 'revenue'
      when 'subscription.plan_changed' then 'revenue'
      when 'subscription.status_changed' then 'revenue'
      else 'other'
    end
  )::public.usage_analytics_events__category;
$$ language sql immutable;
```

- [ ] **Step 4: Add the trigger function and the trigger**

Append to the same file, directly below the mapping function:

```sql
-- Forces `event_category` to agree with `event_name`.
--
-- Runs BEFORE INSERT for two reasons: it satisfies the column's NOT NULL
-- constraint when a caller omits the value, and it deliberately overwrites a
-- caller-supplied value. Reporting groups by this column, so it must never
-- disagree with the event name, and no client is trusted to get it right.
--
-- @returns: trigger
create or replace function public.usage_analytics_events__set_category () returns trigger as $$
begin
  new.event_category := public.util__analytics_event_category(new.event_name);
  return new;
end;
$$ language plpgsql;

create trigger tr__usage_analytics_events__set_category before insert on public.usage_analytics_events for each row
execute function public.usage_analytics_events__set_category ();
```

- [ ] **Step 5: Generate the migration and apply it**

```bash
pnpm db:new-migration add_analytics_event_category_mapping
pnpm db:reset
```

Expected: the generated migration contains two `create ... function`
statements and one `create trigger`. Review it before applying.

- [ ] **Step 6: Run the test to verify it passes**

```bash
pnpm test:db
```

Expected: PASS. All 8 assertions in `analytics_event_category` report ok.

- [ ] **Step 7: Commit**

```bash
git add supabase/schemas/30.usage_analytics_events.sql \
        supabase/migrations/ \
        supabase/tests/database/analytics/analytics_event_category.test.sql
git commit -m "feat(analytics): map event names to funnel stages via a trigger"
```

---

## Task 3: Backfill existing rows

Existing rows all received `event_category = 'other'` from the column default in
Task 1. This corrects them. `client` needs no backfill: its `web` default is
already accurate for every pre-existing row.

This is DML, which `supabase db diff` does not capture, so it is a hand-written
migration. That is the documented exception in the declarative-schema skill, not
a violation of it.

**Files:**
- Create: `supabase/migrations/<timestamp>_backfill_usage_analytics_event_category.sql`

Every command in this task targets the local database only. `pnpm db:sql-cmd`
resolves to `psql -h 127.0.0.1 -p 54322` and `pnpm db:reset` runs
`supabase db reset --yes --local`. Do not reach for `pnpm db:apply-migrations`
here: this plan has not verified whether that script can target a remote
project, and writing to production is prohibited.

- [ ] **Step 1: Create the backfill migration**

Generate a timestamp that sorts after every existing migration:

```bash
date -u +%Y%m%d%H%M%S
```

Create `supabase/migrations/<that timestamp>_backfill_usage_analytics_event_category.sql`:

```sql
-- Backfill `event_category` for rows written before the column existed.
--
-- Task 1 added the column with a `default 'other'`, which is what every
-- pre-existing row received. This recomputes them from the event name.
--
-- Scoped to `event_category = 'other'` so the statement is idempotent and so
-- re-running it can never overwrite a correctly categorised row. A row whose
-- name genuinely maps to `other` is simply rewritten to `other`.
--
-- `client` is deliberately not backfilled: its `web` default is already
-- correct for every pre-existing row, because the browser client was the only
-- writer before this change.
update public.usage_analytics_events
set
  event_category = public.util__analytics_event_category(event_name)
where
  event_category = 'other';
```

- [ ] **Step 2: Verify the migration applies cleanly**

```bash
pnpm db:reset && pnpm test:db
```

Expected: every migration applies and every pgTAP test still passes. The
backfill is a no-op against the freshly reset table, which is correct: this step
only proves it does not error.

- [ ] **Step 3: Seed a mis-categorised row so the statement can be verified on data**

The reset table is empty, so create a row that looks like a pre-existing one.
Insert it, then force the category back to `other`, which is what the Task 1
column default gave every historical row (the trigger sets it correctly on
insert, so it has to be forced back):

```bash
pnpm db:sql-cmd "insert into public.usage_analytics_events (event_name) values ('dataset.imported'); update public.usage_analytics_events set event_category = 'other' where event_name = 'dataset.imported'; select event_name, event_category from public.usage_analytics_events where event_name = 'dataset.imported';"
```

Expected: the final `select` prints one row, `dataset.imported | other`.

- [ ] **Step 4: Run the backfill statement and verify it corrects the row**

Run the same statement the migration contains:

```bash
pnpm db:sql-cmd "update public.usage_analytics_events set event_category = public.util__analytics_event_category(event_name) where event_category = 'other'; select event_name, event_category from public.usage_analytics_events where event_name = 'dataset.imported';"
```

Expected: `UPDATE 1`, then one row showing `dataset.imported | activation`.

- [ ] **Step 5: Confirm the statement is idempotent**

```bash
pnpm db:sql-cmd "update public.usage_analytics_events set event_category = public.util__analytics_event_category(event_name) where event_category = 'other'; select event_name, event_category from public.usage_analytics_events where event_name = 'dataset.imported';"
```

Expected: `UPDATE 0` (the row no longer matches the `where`), and the row still
reads `activation`. Re-running the migration can never corrupt correct rows.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(analytics): backfill event_category on existing rows"
```

---

## Task 4: The `util__log_analytics_event` helper

Postgres triggers in Phase 2 will call only this function. It is
`security definer` so it can insert past RLS, which makes the `revoke`
mandatory: without it, any authenticated user could call it through PostgREST
and forge events attributed to other users and workspaces.

**Files:**
- Create: `supabase/tests/database/analytics/log_analytics_event.test.sql`
- Modify: `supabase/schemas/30.usage_analytics_events.sql`

- [ ] **Step 1: Write the failing pgTAP test**

Create `supabase/tests/database/analytics/log_analytics_event.test.sql`:

```sql
begin;

select plan(7);

select has_function(
  'public',
  'util__log_analytics_event',
  array['text', 'uuid', 'uuid', 'app_type', 'jsonb'],
  'util__log_analytics_event exists with the expected signature'
);

select is_definer(
  'public',
  'util__log_analytics_event',
  array['text', 'uuid', 'uuid', 'app_type', 'jsonb'],
  'util__log_analytics_event is SECURITY DEFINER so triggers can insert past RLS'
);

-- A successful call records the row and stamps it as database-emitted.
select public.util__log_analytics_event(
  'workspace.created',
  null,
  null,
  null,
  '{"isFirstWorkspaceForUser": true}'::jsonb
);

select is(
  (
    select client::text
    from public.usage_analytics_events
    where event_name = 'workspace.created'
    limit 1
  ),
  'db',
  'the helper stamps client as db so callers cannot get it wrong'
);

select is(
  (
    select app_version
    from public.usage_analytics_events
    where event_name = 'workspace.created'
    limit 1
  ),
  null,
  'the helper leaves app_version null because the database has no build version'
);

select is(
  (
    select event_category::text
    from public.usage_analytics_events
    where event_name = 'workspace.created'
    limit 1
  ),
  'activation',
  'the category trigger still applies to helper-inserted rows'
);

-- A failing insert must not raise. A workspace_id that violates the foreign
-- key is the cheapest way to force one.
select lives_ok(
  $$ select public.util__log_analytics_event(
       'workspace.created',
       '00000000-0000-0000-0000-000000000000'::uuid
     ) $$,
  'a failed insert is swallowed rather than raised, so it cannot roll back the caller'
);

select is(
  (
    select count(*)
    from public.usage_analytics_events
    where workspace_id = '00000000-0000-0000-0000-000000000000'::uuid
  ),
  0::bigint,
  'the failed insert recorded nothing'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Write the failing privilege test**

Create a second file,
`supabase/tests/database/analytics/log_analytics_event_privileges.test.sql`.
It is separate because it switches roles, and mixing that with the assertions
above would leak role state between them:

```sql
begin;

select plan(1);

set local role authenticated;

select throws_ok(
  $$ select public.util__log_analytics_event('user.registered') $$,
  '42501',
  null,
  'authenticated cannot execute the SECURITY DEFINER helper, so events cannot be forged through PostgREST'
);

reset role;

select * from finish();

rollback;
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
pnpm test:db
```

Expected: FAIL. `log_analytics_event` fails at `has_function`, and
`log_analytics_event_privileges` fails because the function does not exist yet
(the raised error code is `42883`, not the expected `42501`).

- [ ] **Step 4: Add the helper**

Append to `supabase/schemas/30.usage_analytics_events.sql`, after the trigger
from Task 2:

```sql
-- Records an analytics event from a Postgres trigger. Triggers must call this
-- rather than inserting directly.
--
-- `client` is always `db` and `app_version` is always null, set here rather
-- than accepted as parameters so no caller can get them wrong. The
-- `event_category` is set by `tr__usage_analytics_events__set_category`.
--
-- The body swallows every error. Recording analytics must never roll back the
-- write that triggered it (a signup, an invite, a subscription change), so this
-- returns cleanly even when the insert fails. The `exception` block runs in a
-- subtransaction, so a failure here rolls back only the failed insert.
--
-- SECURITY DEFINER is required to insert past RLS from a trigger, so EXECUTE is
-- revoked from every client-reachable role. Without that revoke, any
-- authenticated user could forge events for another user or workspace through
-- PostgREST. `search_path` is pinned empty, so every reference is fully
-- qualified.
--
-- @param p_event_name: stable event name; see util__analytics_event_category
-- @param p_workspace_id: workspace the event belongs to, or null
-- @param p_user_id: user who triggered the event, or null
-- @param p_app: app surface, or null when the event is not bound to one
-- @param p_payload: small, PII-free JSON payload, or null
-- @returns: void
create or replace function public.util__log_analytics_event (
  p_event_name text,
  p_workspace_id uuid default null,
  p_user_id uuid default null,
  p_app public.app_type default null,
  p_payload jsonb default null
) returns void as $$
begin
  insert into public.usage_analytics_events (
    event_name,
    workspace_id,
    user_id,
    app,
    payload,
    client
  ) values (
    p_event_name,
    p_workspace_id,
    p_user_id,
    p_app,
    p_payload,
    'db'
  );
exception
  when others then
    null;
end;
$$ language plpgsql security definer set search_path = '';

revoke execute on function public.util__log_analytics_event (
  text,
  uuid,
  uuid,
  public.app_type,
  jsonb
) from public, anon, authenticated;
```

- [ ] **Step 5: Generate the migration and confirm the revoke survived the diff**

```bash
pnpm db:new-migration add_log_analytics_event_helper
grep -n "revoke" supabase/migrations/*add_log_analytics_event_helper.sql
```

Expected: at least one `revoke` line. Grants are on the declarative-schema
skill's list of things `db diff` handles unreliably, so if the grep finds
nothing, append the `revoke` statement from Step 4 to the generated migration
by hand and note in the commit message that the diff dropped it.

- [ ] **Step 6: Apply and run the tests**

```bash
pnpm db:reset && pnpm test:db
```

Expected: PASS. 7 assertions in `log_analytics_event` and 1 in
`log_analytics_event_privileges`, all ok.

- [ ] **Step 7: Commit**

```bash
git add supabase/schemas/30.usage_analytics_events.sql \
        supabase/migrations/ \
        supabase/tests/database/analytics/log_analytics_event.test.sql \
        supabase/tests/database/analytics/log_analytics_event_privileges.test.sql
git commit -m "feat(analytics): add util__log_analytics_event for trigger emitters"
```

---

## Task 5: Expose the build version to the client

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/analytics/appVersion.test.ts`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("VITE_APP_VERSION", () => {
  it("matches the version in package.json", () => {
    const pkg = JSON.parse(
      readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"),
    ) as { version: string };

    expect(import.meta.env.VITE_APP_VERSION).toBe(pkg.version);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run src/lib/analytics/appVersion.test.ts
```

Expected: FAIL with `expected undefined to be '0.10.3-dev'`, because the
`define` does not exist yet.

- [ ] **Step 3: Read the version in `vite.config.ts`**

The file's imports currently end with:

```ts
import { defaultExclude, defineConfig } from "vitest/config";
```

Add a `node:fs` import above the others and read the version below the import
block. Reading the file avoids needing `resolveJsonModule` in the Node
tsconfig:

```ts
import { readFileSync } from "node:fs";
```

Then, directly above the `reactWithLinguiMacro` definition, add:

```ts
// Read rather than import package.json so this does not depend on
// `resolveJsonModule` being enabled in the Node-side tsconfig. Exposed to the
// app as `import.meta.env.VITE_APP_VERSION` and recorded on every analytics
// event, so a regression can be correlated with the release that shipped it.
const { version: appVersion } = JSON.parse(
  readFileSync("./package.json", "utf-8"),
) as { version: string };
```

- [ ] **Step 4: Add the define**

In the returned config object, add a `define` key directly above `worker`:

```ts
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
    },
    worker: {
      format: "es",
    },
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm vitest run src/lib/analytics/appVersion.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts src/lib/analytics/appVersion.test.ts
git commit -m "feat(analytics): expose the build version as VITE_APP_VERSION"
```

---

## Task 6: The shared event registry

The registry moves to `shared/` so the browser and the Deno edge runtime
type-check against one list. Names are split by emitting runtime so
`AnalyticsClient` cannot emit a trigger-owned event and vice versa.

Payload types here match **what the existing call sites pass today**, not the
final shapes in the spec. Phase 1B tightens each one as it enriches its call
site, so the tree stays green at every commit.

**Files:**
- Create: `shared/analytics/analyticsEvents.ts`
- Create: `shared/analytics/analyticsEvents.test.ts`
- Delete: `src/lib/analytics/analyticsEventTypes.ts`

- [ ] **Step 1: Write the failing drift-guard test**

Create `shared/analytics/analyticsEvents.test.ts`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENT_NAMES } from "$/analytics/analyticsEvents";

/**
 * The database owns the name-to-category mapping because Postgres triggers
 * emit many of these events and cannot read this registry. That split means
 * the two can drift, so this reads the schema file as text and proves every
 * registered name is mapped. A text check keeps the test in the normal
 * frontend suite instead of requiring a running database.
 */
describe("analytics event categories", () => {
  const schemaSql = readFileSync(
    path.resolve(
      process.cwd(),
      "supabase/schemas/30.usage_analytics_events.sql",
    ),
    "utf-8",
  );

  it.each(ANALYTICS_EVENT_NAMES)(
    "%s is categorised in util__analytics_event_category",
    (eventName) => {
      expect(schemaSql).toContain(`when '${eventName}' then`);
    },
  );

  it("maps no registered name to the other fallback", () => {
    const mappedToOther = ANALYTICS_EVENT_NAMES.filter((eventName) => {
      return schemaSql.includes(`when '${eventName}' then 'other'`);
    });

    expect(mappedToOther).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run shared/analytics/analyticsEvents.test.ts
```

Expected: FAIL with a module resolution error for
`$/analytics/analyticsEvents`, because the registry does not exist yet.

- [ ] **Step 3: Create the registry**

Create `shared/analytics/analyticsEvents.ts`:

```ts
import type { Database } from "$/types/database.types.ts";

/** App surface an event originated from, or null when not bound to one. */
export type AnalyticsApp = Database["public"]["Enums"]["app_type"];

// Types for the `usage_analytics_events__category` and
// `usage_analytics_events__client` enums are deliberately not re-exported here.
// Nothing in this phase consumes them: the category is never sent by a client,
// and each emitter writes its own `client` literal. Phase 2 adds them when the
// reporting helpers need them.

/**
 * Events emitted from the browser or the desktop shell. These describe UI
 * intent, which has no database row to hang a trigger on.
 */
export const CLIENT_ANALYTICS_EVENT_NAMES = [
  "dataset.imported",
  "query.ran",
  "query.failed",
  "dashboard.published",
  "dashboard.share_settings_updated",
  "dashboard.block_added_via_chat",
  "dashboard.filter_changed",
  "dashboard.pdf_export_opened",
  "dashboard.pdf_exported",
  "chat.message_sent",
  "chat.sql_generated",
] as const;

/**
 * Events emitted from edge functions. These describe facts only the server
 * knows, such as the model used or how many attempts a chat turn took.
 */
export const SERVER_ANALYTICS_EVENT_NAMES = [
  "waitlist.code_verified",
  "waitlist.code_claimed",
  "chat.turn_completed",
  "chat.turn_failed",
  "dashboard.public_viewed",
] as const;

/**
 * Events emitted by Postgres triggers via `util__log_analytics_event`. These
 * are row facts, so a trigger records them for every code path, including
 * seed scripts and backfills.
 */
export const DB_ANALYTICS_EVENT_NAMES = [
  "user.registered",
  "user.email_confirmed",
  "user.signed_in",
  "workspace.created",
  "workspace.invite_sent",
  "workspace.invite_accepted",
  "member.removed",
  "subscription.created",
  "subscription.plan_changed",
  "subscription.status_changed",
] as const;

/** Every event name the platform records, across all three runtimes. */
export const ANALYTICS_EVENT_NAMES = [
  ...CLIENT_ANALYTICS_EVENT_NAMES,
  ...SERVER_ANALYTICS_EVENT_NAMES,
  ...DB_ANALYTICS_EVENT_NAMES,
] as const;

// `dashboard.unpublished` is deliberately absent from every list above. It was
// declared in the old `analyticsEventTypes.ts` but never emitted, and no
// unpublish flow exists: `DashboardClient.usePublishDashboard` only ever writes
// `isPublic: true`, and the publish modal offers only Cancel and Publish. Add it
// back only alongside a real unpublish flow.

export type ClientAnalyticsEventName =
  (typeof CLIENT_ANALYTICS_EVENT_NAMES)[number];
export type ServerAnalyticsEventName =
  (typeof SERVER_ANALYTICS_EVENT_NAMES)[number];
export type DbAnalyticsEventName = (typeof DB_ANALYTICS_EVENT_NAMES)[number];
export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

/**
 * Payload shape per event. Written as a mapped type over
 * `AnalyticsEventName`, so adding a name to a list above without giving it a
 * payload is a compile error.
 *
 * `undefined` means the event carries no payload yet. Phase 1B replaces those
 * as it enriches each call site, and Phases 2 and 3 fill in the server and
 * database events.
 *
 * Payloads must never contain raw PII: no email addresses, no SQL text, no
 * chat content.
 */
export type AnalyticsEventPayloads = {
  [K in AnalyticsEventName]: K extends "dataset.imported" ?
    { datasetId: string; sourceType: string }
  : K extends "dashboard.published" ?
    { dashboardId: string; wasPreviouslyPublic: boolean }
  : K extends "dashboard.block_added_via_chat" ?
    { blockKind: string; vizType?: string; dashboardId?: string }
  : K extends "dashboard.filter_changed" ? { filterId: string; mode: string }
  : K extends "dashboard.pdf_export_opened" ? { dashboardId: string }
  : undefined;
};

/**
 * Discriminated union pairing each client-emitted event with its own payload,
 * so `logEvent` narrows `payload` by `event`. A union rather than a generic
 * function, because `withQueryHooks` wraps the client's mutations and infers
 * their signatures.
 */
export type ClientAnalyticsEvent = {
  [K in ClientAnalyticsEventName]: {
    event: K;
    payload?: AnalyticsEventPayloads[K];
  };
}[ClientAnalyticsEventName];

/** The same pairing for edge-function emitted events. */
export type ServerAnalyticsEvent = {
  [K in ServerAnalyticsEventName]: {
    event: K;
    payload?: AnalyticsEventPayloads[K];
  };
}[ServerAnalyticsEventName];
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm vitest run shared/analytics/analyticsEvents.test.ts
```

Expected: PASS, 27 assertions (26 per-name checks plus the fallback check).

- [ ] **Step 5: Delete the superseded file**

```bash
git rm src/lib/analytics/analyticsEventTypes.ts
```

- [ ] **Step 6: Verify nothing else imported it**

```bash
grep -rn "analyticsEventTypes" src shared supabase packages
```

Expected: exactly one match, the import in `src/lib/analytics/AnalyticsClient.ts`,
which Task 7 replaces. If there are others, update them to import from
`$/analytics/analyticsEvents` in Task 7 as well.

- [ ] **Step 7: Commit**

```bash
git add shared/analytics/analyticsEvents.ts shared/analytics/analyticsEvents.test.ts
git commit -m "feat(analytics): move the event registry to shared with typed payloads"
```

---

## Task 7: Type `AnalyticsClient` and send the new columns

**Files:**
- Create: `src/lib/analytics/AnalyticsClient.test.ts`
- Modify: `src/lib/analytics/AnalyticsClient.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/analytics/AnalyticsClient.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";

const insertMock = vi.fn(async () => {
  return { error: null };
});
const getSessionMock = vi.fn(async () => {
  return { data: { session: { user: { id: "user-1" } } }, error: null };
});
const isDesktopMock = vi.fn(() => {
  return false;
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: vi.fn(() => {
        return {
          auth: { getSession: getSessionMock },
          from: vi.fn(() => {
            return { insert: insertMock };
          }),
        };
      }),
    },
  };
});

vi.mock("$/platform/isDesktop", () => {
  return {
    isDesktop: () => {
      return isDesktopMock();
    },
  };
});

describe("AnalyticsClient.logEvent", () => {
  beforeEach(() => {
    insertMock.mockClear();
    isDesktopMock.mockReturnValue(false);
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
  });

  it("stamps the row with the web client and the build version", async () => {
    await AnalyticsClient.logEvent({
      event: "dashboard.filter_changed",
      payload: { filterId: "f1", mode: "select_multi" },
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: "dashboard.filter_changed",
        client: "web",
        app_version: import.meta.env.VITE_APP_VERSION,
        user_id: "user-1",
      }),
    );
  });

  it("stamps the row as desktop when running in the desktop shell", async () => {
    isDesktopMock.mockReturnValue(true);

    await AnalyticsClient.logEvent({
      event: "chat.message_sent",
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ client: "desktop" }),
    );
  });

  it("does not send an event_category, because the database owns it", async () => {
    await AnalyticsClient.logEvent({
      event: "chat.sql_generated",
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ event_category: expect.anything() }),
    );
  });

  it("records nothing when there is no session", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await AnalyticsClient.logEvent({ event: "chat.message_sent" });

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("never throws when the insert fails", async () => {
    insertMock.mockRejectedValueOnce(new Error("insert exploded"));

    await expect(
      AnalyticsClient.logEvent({ event: "chat.message_sent" }),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run src/lib/analytics/AnalyticsClient.test.ts
```

Expected: FAIL. The first assertion fails because the inserted row has no
`client` or `app_version` key.

- [ ] **Step 3: Replace the imports and types in `AnalyticsClient.ts`**

Replace the import block and the `LogEventOptions` type. The file currently
starts with imports ending in:

```ts
import type { Workspace } from "$/models/Workspace/Workspace";

type LogEventOptions = {
  event: AnalyticsEventName;
  workspaceId?: Workspace.Id;
  app?: AnalyticsApp;
  payload?: AnalyticsEventPayload;
};
```

Change the two analytics imports and the type so the file reads:

```ts
import { createServiceClient } from "@avandar/clients";
import { withLogger } from "@avandar/logger";
import { withQueryHooks } from "@avandar/query-hooks";
import { objectKeys } from "@avandar/utils";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import { isDesktop } from "$/platform/isDesktop";
import type {
  AnalyticsApp,
  ClientAnalyticsEvent,
} from "$/analytics/analyticsEvents";
import type { ServiceClient } from "@avandar/clients";
import type { WithLogger } from "@avandar/logger";
import type { WithQueryHooks } from "@avandar/query-hooks";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * A client-emitted event plus its optional scoping. `ClientAnalyticsEvent` is
 * a discriminated union over event name, so passing one event's payload shape
 * under a different event name is a compile error. Server-owned and
 * trigger-owned events are deliberately not assignable here.
 */
type LogEventOptions = ClientAnalyticsEvent & {
  workspaceId?: Workspace.Id;
  app?: AnalyticsApp;
};
```

- [ ] **Step 4: Send the new columns and warn in development**

Replace the body of `logEvent` (the whole `logEvent: async (...) => {...}`
property) with:

```ts
      /**
       * Fire-and-forget analytics event logger. Inserts a row into
       * `usage_analytics_events`. Failures are intentionally swallowed:
       * analytics must never break a user action. Workspace + user are
       * resolved from the Supabase session so callers don't have to thread
       * `userId` through every call site. RLS on the table enforces that the
       * inserted `user_id` matches `auth.uid()`.
       *
       * `event_category` is deliberately not sent. A `before insert` trigger
       * derives it from `event_name`, and would overwrite anything sent here.
       */
      logEvent: async (options: LogEventOptions): Promise<void> => {
        const logger = clientLogger.appendName("logEvent");
        logger.log("Logging analytics event", options);
        try {
          const db = AvaSupabase.db();
          const sessionResult = await db.auth.getSession();
          const userId = sessionResult.data.session?.user.id ?? null;

          if (!userId) {
            return;
          }

          await db.from("usage_analytics_events").insert({
            event_name: options.event,
            workspace_id: options.workspaceId ?? null,
            app: options.app ?? null,
            payload: (options.payload as never) ?? null,
            user_id: userId,
            client: isDesktop() ? "desktop" : "web",
            app_version: import.meta.env.VITE_APP_VERSION ?? null,
          });
        } catch (error) {
          // Analytics must never block a user action, so this is swallowed.
          // A bare `catch {}` also hid real defects (a payload violating a
          // constraint looked identical to success), so development gets a
          // warning while production stays silent.
          if (import.meta.env.DEV) {
            console.warn("[analytics] failed to log event", options, error);
          }
        }
      },
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm vitest run src/lib/analytics/AnalyticsClient.test.ts
```

Expected: PASS, 5 assertions.

- [ ] **Step 6: Verify every existing call site still type-checks**

```bash
pnpm type-check
```

Expected: no errors. The seven existing call sites pass payloads that match the
shapes declared in Task 6, so none of them need editing. If one fails, the
payload type in `AnalyticsEventPayloads` is wrong; correct the type rather than
the call site, since Phase 1B owns call-site changes.

- [ ] **Step 7: Commit**

```bash
git add src/lib/analytics/AnalyticsClient.ts src/lib/analytics/AnalyticsClient.test.ts
git commit -m "feat(analytics): type logEvent and record client and app version"
```

---

## Task 8: The edge-function emitter

Phase 2 and Phase 3 call this from the `waitlist` and `chat` functions. It takes
the client explicitly rather than importing `SupabaseAdmin`, so it is testable
without a Deno runtime or environment variables.

**Files:**
- Create: `supabase/functions/_shared/analytics/logAnalyticsEvent.ts`
- Create: `supabase/functions/_shared/analytics/logAnalyticsEvent.test.ts`

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/_shared/analytics/logAnalyticsEvent.test.ts`:

```ts
import { logAnalyticsEvent } from "@sbfn/_shared/analytics/logAnalyticsEvent.ts";
import { describe, expect, it, vi } from "vitest";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

function createFakeClient(options?: { failInsert?: boolean }) {
  const insert = vi.fn(async () => {
    if (options?.failInsert) {
      throw new Error("insert exploded");
    }
    return { error: null };
  });
  const from = vi.fn(() => {
    return { insert };
  });
  return {
    client: { from } as unknown as AvaSupabaseClient,
    from,
    insert,
  };
}

describe("logAnalyticsEvent", () => {
  it("stamps the row as server-emitted with no app version", async () => {
    const fake = createFakeClient();

    await logAnalyticsEvent({
      supabaseAdminClient: fake.client,
      event: "chat.turn_completed",
      workspaceId: "ws-1",
      userId: "user-1",
      app: "data_explorer",
      payload: { modelId: "openai/gpt-4o-mini" },
    });

    expect(fake.from).toHaveBeenCalledWith("usage_analytics_events");
    expect(fake.insert).toHaveBeenCalledWith({
      event_name: "chat.turn_completed",
      workspace_id: "ws-1",
      user_id: "user-1",
      app: "data_explorer",
      payload: { modelId: "openai/gpt-4o-mini" },
      client: "server",
      app_version: null,
    });
  });

  it("defaults every optional field to null", async () => {
    const fake = createFakeClient();

    await logAnalyticsEvent({
      supabaseAdminClient: fake.client,
      event: "waitlist.code_verified",
    });

    expect(fake.insert).toHaveBeenCalledWith({
      event_name: "waitlist.code_verified",
      workspace_id: null,
      user_id: null,
      app: null,
      payload: null,
      client: "server",
      app_version: null,
    });
  });

  it("never throws when the insert fails", async () => {
    const fake = createFakeClient({ failInsert: true });

    await expect(
      logAnalyticsEvent({
        supabaseAdminClient: fake.client,
        event: "chat.turn_failed",
      }),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run supabase/functions/_shared/analytics/logAnalyticsEvent.test.ts
```

Expected: FAIL with a module resolution error for
`@sbfn/_shared/analytics/logAnalyticsEvent.ts`.

- [ ] **Step 3: Write the implementation**

Create `supabase/functions/_shared/analytics/logAnalyticsEvent.ts`:

```ts
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";
import type {
  AnalyticsApp,
  ServerAnalyticsEvent,
} from "$/analytics/analyticsEvents.ts";

type LogAnalyticsEventOptions = ServerAnalyticsEvent & {
  /**
   * Service-role client. Passed in rather than imported so this module has no
   * environment dependency and stays testable outside Deno.
   */
  supabaseAdminClient: AvaSupabaseClient;
  workspaceId?: string;
  userId?: string;
  app?: AnalyticsApp;
};

/**
 * Records an analytics event from an edge function.
 *
 * Stamps `client` as `server` and leaves `app_version` null, because the edge
 * runtime has no app build version. `event_category` is deliberately not sent:
 * a `before insert` trigger derives it from `event_name` and would overwrite
 * anything passed here.
 *
 * Never throws. Recording analytics must not fail the request that triggered
 * it, so every error is swallowed after being logged.
 *
 * @param options - the event, its scoping, and the service-role client
 */
export async function logAnalyticsEvent(
  options: LogAnalyticsEventOptions,
): Promise<void> {
  const { supabaseAdminClient, event, payload, workspaceId, userId, app } =
    options;

  try {
    await supabaseAdminClient.from("usage_analytics_events").insert({
      event_name: event,
      workspace_id: workspaceId ?? null,
      user_id: userId ?? null,
      app: app ?? null,
      payload: (payload as never) ?? null,
      client: "server",
      app_version: null,
    });
  } catch (error) {
    console.error("[analytics] failed to log event", event, error);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm vitest run supabase/functions/_shared/analytics/logAnalyticsEvent.test.ts
```

Expected: PASS, 3 assertions.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/analytics/
git commit -m "feat(analytics): add the edge-function analytics emitter"
```

---

## Task 9: Full verification

- [ ] **Step 1: Reset the database and run every database test**

```bash
pnpm db:reset && pnpm test:db
```

Expected: every pgTAP file passes, including the pre-existing permission tests.

- [ ] **Step 2: Run the frontend suite**

```bash
pnpm test:frontend
```

Expected: PASS, with no regressions in the existing suites.

- [ ] **Step 3: Type-check the whole workspace**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 4: Lint**

```bash
pnpm lint
```

Expected: no errors. If `eslint` objects to the `console.warn` added in Task 7,
confirm the rule's configuration allows warnings guarded by
`import.meta.env.DEV`; if not, add a scoped
`// eslint-disable-next-line no-console` with a comment explaining that this is
the development-only analytics diagnostic.

- [ ] **Step 5: Confirm nothing references the deleted module**

```bash
grep -rn "analyticsEventTypes" src shared supabase packages
```

Expected: no matches.

- [ ] **Step 6: Commit any lint fixes**

```bash
git add -A
git commit -m "chore(analytics): satisfy lint after the analytics foundation"
```

---

## What Phase 1B Needs To Answer

Recorded here so the next plan does not have to rediscover it.

1. **`dashboard.filter_changed`.** `FilterPBlock` is rendered by Puck via
   `render: FilterPBlock` in `useFilterPBlockConfig.tsx:70`, so ids cannot come
   from props (they would be persisted into saved Puck data). The pattern to
   copy is `DataVizPBlock`, which takes `WithPuckProps<Props>` and calls
   `useAvaPageMetadata(puck)` to get
   `{ auth: "workspace", workspaceId, dashboardId }` or
   `{ auth: "public", dashboardId }`. Log only on the `workspace` branch: in
   public mode there is no session, so `logEvent` returns early anyway. The
   `contains` branch at `FilterPBlock.tsx:143` needs a debounce so typing does
   not emit per keystroke.
2. **`dataset.imported`.** `columnCount` exists only inside the per-source-type
   branches of the mutation body in `useSaveDataset.ts` (as `importedColumns`),
   not in `onSuccess`, where the event fires. `rowCount` is not available at
   all. `isFirstInWorkspace` needs a count query. Decide whether to thread the
   counts out of the mutation body or to drop those fields.
3. **`chat.message_sent`.** `runtimeMode` comes from `resolveChatRuntimeMode`,
   whose result is computed at `useAvandarChatRuntime.ts:465` as `mode`, after
   the event currently fires at line 295. The emission point has to move or the
   mode has to be resolved earlier.
4. **The PDF events stay untouched** until `HIDE_EXPORT_AS_PDF` is flipped to
   `false`.
