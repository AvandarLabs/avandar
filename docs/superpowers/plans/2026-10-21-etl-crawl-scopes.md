# EtlEngine Crawl Scopes and Per-Scope Checkpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the unit an incremental run crawls and resumes a scope (a named slice of one drive) with its own stored checkpoint, record on each listing which scopes produce it, and give the `ava` CLI the commands to run, reset, and prune scopes safely.

**Architecture:** A new `pipeline_scope_checkpoints` table replaces the high-water mark derived from `data_catalog_listings`. `@avandar/etl` lists each drive's scopes, crawls every `(drive, scope)` oldest-first, advances that scope's checkpoint after each loaded page, and writes `pipeline_scope_keys` on every row. HDX declares `format:csv` and `format:parquet` and pushes the format filter to CKAN. Socrata keeps one `all` scope per drive and gains category and tag scopes. Two service-role RPCs list a pipeline's stored scopes and prune one scope.

**Tech Stack:** TypeScript, Node 22, Vitest, `@supabase/supabase-js`, Fastify, Acclimate (`ava` CLI), Postgres + pgTAP, CKAN `package_search`, Socrata Discovery API, Bun (desktop SQLite migration generator).

**Spec:** [`docs/superpowers/specs/2026-10-21-etl-crawl-scopes-design.md`](../specs/2026-10-21-etl-crawl-scopes-design.md).
Test ids (S1 to S16, M1 to M5) refer to the spec's section 8.

---

## Ground rules for every task

Read these once. Every task assumes them.

1. **Worktree and database.** Work in `/Users/pablo/src/worktrees/avandar/feat/demo/measles`.
   Before any `pnpm db:*`, `pnpm test:db`, `supabase *`, or the `test:supabase`
   suite, run `ava supabase status` and confirm the first line reads
   `SWITCHED` (green). If it does not, stop and report BLOCKED. Never run
   those commands against the shared `avandar` stack.
2. **Never stage `supabase/config.toml`**, `.env.development`, or
   `.env.development.edge`. Commit by path, never with `git add -A` or
   `git add .`.
3. **Red/green.** Every behavior step writes the failing test first, runs it to
   see the failure, then writes the code. Do not skip the red run.
4. **Code style** (from `CLAUDE.md` and `docs/rules/typescript.md`):
   - No em dashes anywhere, including comments. Use periods, colons, or ` - `.
   - Arrow functions use a block body with `return`, matching the codebase.
   - Always use braces on `if`. Use template literals for new strings.
   - JSDoc on every exported member. Comments describe the code as it is today.
   - Functions stay at or under 45 lines. Avoid `for`/`while`, except a
     `for await` over an async iterable, each with a
     `// Sequential on purpose: ...` comment saying why.
   - Code under `shared/` is also type-checked by Deno: import local files with
     their `.ts` extension, exactly like the files around it.
5. **Never write to a production or staging database.** Only the switched local
   stack (`127.0.0.1:55341` API, `127.0.0.1:55342` Postgres) is allowed.
6. **Commit messages** follow Conventional Commits and end with:

   ```text
   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   ```

### Commands

| What | Command (from the repo root) |
| --- | --- |
| `@avandar/etl` unit tests | `pnpm --filter @avandar/etl exec vitest run <path relative to packages/node/etl>` |
| `@avandar/etl` Supabase suite | `pnpm --filter @avandar/etl test:supabase` |
| `@avandar/etl` types | `pnpm --filter @avandar/etl type-check` |
| `@avandar/etl` build | `pnpm --filter @avandar/etl build` |
| pipeline-server tests | `pnpm --filter @avandar/pipeline-server exec vitest run -c vitest.config.ts <path relative to apps/pipeline-server>` |
| `shared/` tests | `pnpm exec vitest run <path under shared/>` |
| ava-cli tests | `pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts <path relative to apps/ava-cli>` |
| Node-side types | `pnpm exec tsc --noEmit -p tsconfig.node.json` |
| App and `shared/` types (+ Deno) | `pnpm type-check` |
| pgTAP and migration replays | `pnpm test:db` |
| Migration replays only | `./scripts/test-dashboard-publishing-migrations.sh` |
| Lint one path | `pnpm exec eslint <path>` |

---

## Refinements to the spec

The plan makes these choices where the spec left room or where reading the
code changed the picture. Task 20 writes them back into the spec.

1. **The prune RPC's drive is optional.** `p_drive_key` may be `null`, meaning
   every drive, so `ava pipeline reset --scope` is one call. Its parameter
   order is `(p_pipeline_name, p_scope_key, p_drive_key, p_is_dry_run)`, and
   it returns `checkpoints_deleted integer` (a count, since a null drive can
   delete several).
2. **A second RPC lists stored scopes.** `rpc_data_catalog_listings__list_pipeline_scopes(p_pipeline_name)`
   returns every distinct `(drive_key, scope_key)` from listings and
   checkpoints. Prune needs this, and reading 36,000 listings into the CLI is
   not an option.
3. **The index stays.** `data_catalog_listings__pipeline_drive_last_update`
   is kept with a new comment: the prune and list RPCs and the checkpoint seed
   all filter on `pipeline_name` and `api_base_url`.
4. **Local live scopes come from a new script,** `scripts/listPipelineScopes.ts`,
   not a `--list-scopes` mode of `runPipelineOnce.ts`, whose strict argv
   parsing is for run options only.
5. **A drive that fails before its scopes are known** (its `getDriveKey` or
   `listScopes` throws, or its keys are invalid, or it declares none) gets one
   report entry with scope key `listScopes`.
6. **The desktop SQLite mirror.** `pipeline_scope_checkpoints` goes into
   `EXCLUDED_TABLES`, and the generator writes `.gen.sql` files for this
   branch's migrations, including the two earlier ones that never got them.
7. **The app model** gains `pipelineScopeKeys`, because regenerating
   `database.types.ts` adds the column and the parser's type test requires it.
8. **Reset clears checkpoints even when a pipeline has no listings,** since a
   crawl that wrote nothing can still have advanced a checkpoint.

---

## File map

### Database

| File | Change |
| --- | --- |
| `supabase/schemas/10.pipeline_scope_checkpoints.sql` | New table |
| `supabase/schemas/10.data_catalog_listings.sql` | Add `pipeline_scope_keys`, re-comment the drive index |
| `supabase/schemas/50.rpc_data_catalog_listings__prune_pipeline_scope.sql` | New RPC |
| `supabase/schemas/50.rpc_data_catalog_listings__list_pipeline_scopes.sql` | New RPC |
| `supabase/migrations/<ts>_add_pipeline_scope_checkpoints.sql` | Generated |
| `supabase/migrations/<ts>_add_pipeline_scope_rpcs.sql` | Generated |
| `supabase/migrations/<ts>_seed_pipeline_scope_keys_and_checkpoints.sql` | Hand-written data migration |
| `supabase/tests/database/pipeline_scope_checkpoints.test.sql` | Table, column, privileges |
| `supabase/tests/database/rpc_data_catalog_listings__pipeline_scopes.test.sql` | Both RPCs |
| `supabase/migration-upgrade-tests/pipeline_scope_seed.{prelude,assertions}.sql` | Replay of the data migration |
| `scripts/test-dashboard-publishing-migrations.sh` | Run the new replay |
| `shared/types/database.types.ts` | Regenerated |
| `shared/models/data-catalog-listings/DataCatalogListing/*` | `pipelineScopeKeys` |
| `apps/desktop/sync/syncable-tables.ts`, `apps/desktop/migrations/*.gen.sql` | Exclude the table, generate |

### `@avandar/etl` (`packages/node/etl/src`)

| File | Responsibility |
| --- | --- |
| `stores/EtlStores.types.ts` | `CheckpointKey`, `StoredCheckpoint`, `CheckpointStore`; `pipeline_scope_keys` on rows; `readHighWaterMark` removed |
| `stores/InMemoryCheckpointStore/createInMemoryCheckpointStore.ts` | Exported fake |
| `stores/SupabaseCheckpointStore/createSupabaseCheckpointStore.ts` | Real checkpoint store |
| `stores/throwOnSupabaseError/throwOnSupabaseError.ts` | Shared Supabase error formatting (moved out of the listings store) |
| `stores/listingContractColumns.ts` | Adds `pipeline_scope_keys` |
| `EtlEngine/etlScopes.ts` | `ETL_DEFAULT_SCOPE`, `ETL_SCOPE_KEY_PATTERN` |
| `EtlEngine/assertValidScopeKeys/assertValidScopeKeys.ts` | One drive's keys |
| `EtlEngine/checkpointRules/checkpointRules.ts` | When a checkpoint may move, and to what |
| `EtlEngine/crawlCheckpoint/crawlCheckpoint.ts` | Read a crawl's start, advance its checkpoint |
| `EtlEngine/resolveDriveScopes/resolveDriveScopes.ts` | Drive keys and scopes, validated |
| `EtlEngine/selectRequestedScopes/selectRequestedScopes.ts` | `options.scopes` |
| `EtlEngine/crawlScope/crawlScope.ts` | One `(drive, scope)` crawl (replaces `crawlDrive/`) |
| `EtlEngine/createEtlEngine/createEtlEngine.ts` | Orchestration, `listScopes()` |
| `EtlEngine/buildListingRowFromRelation/*`, `EtlEngine/loadRelationsPage/*` | Scope keys on rows |
| `EtlEngine/EtlEngine.types.ts`, `EtlEngine/EtlRunFailedError.ts`, `index.ts`, `../README.md` | Types, errors, exports, docs |

### `shared/`

| File | Change |
| --- | --- |
| `connectors/open-data/CkanDiscoveryClient/*` | `resourceFormats` filter |
| `connectors/open-data/SocrataDiscoveryClient/*` | `searchContext`, `categories`, `tags` |

### `apps/pipeline-server`

| File | Change |
| --- | --- |
| `pipelines/hdx/hdxScopes.ts` | `HdxScope`, `HDX_SCOPES` |
| `pipelines/hdx/{extractHdxDatasets,makeApiResourceRelationsFromCkanPackage,createHdxEtlEngine}/*` | Scopes |
| `pipelines/socrata/configuredDrives/configuredDrives.ts` | `SocrataScope`, `ConfiguredDrive.scopes` |
| `pipelines/socrata/{extractSocrataDrive,createSocrataEtlEngine}/*` | Scopes |
| `pipelines/*/run.ts` | Export `listScopes()` |
| `pipelines/shared/{parsePipelineRunOptions,readRawPipelineRunOptionsFromArgv,getPipelineEtlDestination}/*` | `scopes`, `checkpointsTable` |
| `src/routes/pipeline-name/{registerPipelineRoutes.ts,run/run.ts,listScopes/listScopes.ts}` | `scopes` body key, `GET /:pipelineName/scopes` |
| `../../scripts/runPipelineOnce.ts`, `../../scripts/listPipelineScopes.ts` | `--scope`, the new script |

### `apps/ava-cli/src/PipelineCli`

| File | Change |
| --- | --- |
| `RunPipelineCli/RunPipelineCli.ts`, `PipelineRunRequestOptions.types.ts`, `sendRunPipelineRequest.ts`, `runPipelineLocal.ts` | `--scope` |
| `PipelineRunReport/*` | `crawls` with `scopeKey` |
| `ResetPipelineCli/*` | Checkpoints first, `--scope` |
| `PruneRetiredScopesCli/*` | New command |
| `fetchLivePipelineScopes/fetchLivePipelineScopes.ts` | Live scopes from the server or the local script |
| `PipelineCli.ts` | Register the command |

---

## Phase A: Database

### Task 1: The checkpoints table and scope keys on listings

**Files:**
- Create: `supabase/schemas/10.pipeline_scope_checkpoints.sql`
- Modify: `supabase/schemas/10.data_catalog_listings.sql`
- Create: `supabase/tests/database/pipeline_scope_checkpoints.test.sql`
- Create (generated): `supabase/migrations/<timestamp>_add_pipeline_scope_checkpoints.sql`

- [ ] **Step 1: Load the schema skill and check the switch**

Invoke the `supabase-declarative-schema` skill and follow it for the rest of
this task. Then:

```bash
ava supabase status
```

Expected: first line starts with `SWITCHED`.

- [ ] **Step 2: Save the local listings for the upgrade check**

`pnpm db:reset` below empties the local database. Task 21 replays the seed
migration against real listings, so save them first (local stack only):

```bash
mkdir -p .temp/feat-demo-measles
psql "postgresql://postgres:postgres@127.0.0.1:55342/postgres" -c \
  "\copy public.data_catalog_listings to '.temp/feat-demo-measles/listings-before-scopes.csv' with (format csv, header true)"
wc -l .temp/feat-demo-measles/listings-before-scopes.csv
```

Expected: a CSV with a header line and one line per listing (about 36,700 on
this worktree's stack). `.temp/` is gitignored. If the table is empty, note
it in your report; Task 21 then crawls fresh data instead.

- [ ] **Step 3: Write the failing pgTAP file**

Create `supabase/tests/database/pipeline_scope_checkpoints.test.sql`:

```sql
\set ON_ERROR_STOP on

-- Identifiers are `pgtap-fixture`-prefixed and hosts are `.invalid`, so no
-- fixture can collide with a row a real pipeline wrote to this database.

begin;

select plan(9);

-- ---------------------------------------------------------------------------
-- The checkpoints table: one row per pipeline, drive, and scope, reachable by
-- the service role only.
-- ---------------------------------------------------------------------------

select has_table(
  'public',
  'pipeline_scope_checkpoints',
  'the checkpoints table exists'
);

select col_is_pk(
  'public',
  'pipeline_scope_checkpoints',
  array['pipeline_name', 'drive_key', 'scope_key'],
  'a checkpoint is keyed by pipeline, drive, and scope'
);

select table_privs_are(
  'public',
  'pipeline_scope_checkpoints',
  'service_role',
  array['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'the service role reads and writes checkpoints, and nothing more'
);

select table_privs_are(
  'public',
  'pipeline_scope_checkpoints',
  'authenticated',
  array[]::text[],
  'a signed-in user has no access to checkpoints'
);

select table_privs_are(
  'public',
  'pipeline_scope_checkpoints',
  'anon',
  array[]::text[],
  'an anonymous visitor has no access to checkpoints'
);

select has_trigger(
  'public',
  'pipeline_scope_checkpoints',
  'tr_pipeline_scope_checkpoints__set_updated_at',
  'updated_at is maintained on every update'
);

-- ---------------------------------------------------------------------------
-- Listings record the scopes that produce them. A row written without any
-- has none, and the column never holds null.
-- ---------------------------------------------------------------------------

insert into public.data_catalog_listings
  (display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format)
values
  ('pgtap-fixture scope keys', 'Fixture Org', 'api_resource', 'ckan',
   'https://pgtap-fixture.invalid', 'pgtap-fixture-scope-keys',
   'pgtap-fixture-scope-keys-resource', 'CSV');

select is(
  (
    select pipeline_scope_keys
    from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-scope-keys'
  ),
  '{}'::text[],
  'a listing written without scope keys has none'
);

select throws_ok(
  $$update public.data_catalog_listings
    set pipeline_scope_keys = null
    where external_dataset_id = 'pgtap-fixture-scope-keys'$$,
  '23502',
  null,
  'pipeline_scope_keys cannot be null'
);

select has_index(
  'public',
  'data_catalog_listings',
  'data_catalog_listings__pipeline_drive_last_update',
  'listings keep their pipeline and drive index'
);

select * from finish();

rollback;
```

- [ ] **Step 4: Watch it fail**

```bash
pnpm test:db
```

Expected: `pipeline_scope_checkpoints.test.sql` fails (`has_table` reports
the table missing, and the insert fails on the unknown column).

- [ ] **Step 5: Declare the table**

Create `supabase/schemas/10.pipeline_scope_checkpoints.sql`:

```sql
/**
 * How far each incremental pipeline crawl has loaded: one row per pipeline,
 * drive, and scope. Every connection in that scope with a source timestamp
 * before `high_water_mark` has been loaded, so the next incremental crawl of
 * the scope starts there. Written by `@avandar/etl` and cleared by the `ava`
 * CLI, both with the service role. Nothing in the app reads it.
 */
create table public.pipeline_scope_checkpoints (
  -- The pipeline, as `data_catalog_listings.pipeline_name` names it.
  pipeline_name text not null,
  -- The drive, as the pipeline keys it. For an API drive this is the same
  -- value as `data_catalog_listings.api_base_url`.
  drive_key text not null,
  -- The scope's key, unique within one drive.
  scope_key text not null,
  -- The newest source timestamp this scope's crawls have loaded up to.
  high_water_mark timestamptz not null,
  -- The run that last advanced this checkpoint.
  pipeline_run_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (pipeline_name, drive_key, scope_key)
);

-- RLS on with no policies: only the service role, which bypasses RLS, ever
-- reaches this table.
alter table public.pipeline_scope_checkpoints enable row level security;

-- Data API privileges. Service role only.
grant
select
,
  insert,
update,
delete on table public.pipeline_scope_checkpoints to service_role;

create trigger tr_pipeline_scope_checkpoints__set_updated_at before
update on public.pipeline_scope_checkpoints for each row
execute function public.util__set_updated_at ();
```

- [ ] **Step 6: Add the column and re-comment the index**

In `supabase/schemas/10.data_catalog_listings.sql`, replace:

```sql
  -- When the cache was last written. Informational only:
  -- cached_source_version is what correctness depends on.
  cached_at timestamptz,
```

with:

```sql
  -- When the cache was last written. Informational only:
  -- cached_source_version is what correctness depends on.
  cached_at timestamptz,
  -- The scopes of `pipeline_name` that produce this listing, in the order
  -- they first wrote it. `@avandar/etl` adds a crawl's scope key when it
  -- writes the row, and pruning a retired scope removes it. Empty on a
  -- listing no scoped pipeline wrote.
  pipeline_scope_keys text[] not null default '{}',
```

Then replace:

```sql
-- Serves the incremental-run high-water mark: the newest
-- `date_of_last_update` for one pipeline's one drive (`api_base_url`).
create index data_catalog_listings__pipeline_drive_last_update on public.data_catalog_listings (
```

with:

```sql
-- Serves lookups of one pipeline's listings on one drive (`api_base_url`):
-- listing and pruning a pipeline's scopes, and seeding checkpoints from the
-- newest `date_of_last_update`.
create index data_catalog_listings__pipeline_drive_last_update on public.data_catalog_listings (
```

- [ ] **Step 7: Generate the migration**

```bash
pnpm db:reset
pnpm db:new-migration add_pipeline_scope_checkpoints
```

Open the new `supabase/migrations/*_add_pipeline_scope_checkpoints.sql`.
Expected contents: `alter table "public"."data_catalog_listings" add column
"pipeline_scope_keys" text[] not null default '{}'::text[]`, `create table
"public"."pipeline_scope_checkpoints"`, its primary key, `enable row level
security`, the `service_role` grants (the reconcile step may append them), and
the trigger. If it drops or alters anything else, stop: that is the
shared-stack diff bug in `CLAUDE.md`. Run `ava supabase status`,
`pnpm db:reset`, and regenerate.

- [ ] **Step 8: Apply it and watch the suite pass**

```bash
pnpm db:reset
pnpm test:db
```

Expected: every pgTAP file passes, including the 9 new assertions.

- [ ] **Step 9: Commit**

```bash
git add supabase/schemas/10.pipeline_scope_checkpoints.sql \
  supabase/schemas/10.data_catalog_listings.sql \
  supabase/tests/database/pipeline_scope_checkpoints.test.sql \
  supabase/migrations/*_add_pipeline_scope_checkpoints.sql
git commit -m "feat(db): add per-scope pipeline checkpoints and listing scope keys

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: RPCs to list a pipeline's stored scopes and prune one

**Files:**
- Create: `supabase/schemas/50.rpc_data_catalog_listings__prune_pipeline_scope.sql`
- Create: `supabase/schemas/50.rpc_data_catalog_listings__list_pipeline_scopes.sql`
- Create: `supabase/tests/database/rpc_data_catalog_listings__pipeline_scopes.test.sql`
- Create (generated): `supabase/migrations/<timestamp>_add_pipeline_scope_rpcs.sql`

- [ ] **Step 1: Check the switch**

```bash
ava supabase status
```

Expected: `SWITCHED`. Keep following the `supabase-declarative-schema` skill.

- [ ] **Step 2: Write the failing pgTAP file**

Create `supabase/tests/database/rpc_data_catalog_listings__pipeline_scopes.test.sql`:

```sql
\set ON_ERROR_STOP on

-- Fixtures: one pipeline with listings on two drives, A and B, across two
-- scopes, `old` and `new`, plus a workspace dataset added from one of them.
-- Identifiers are `pgtap-fixture`-prefixed and hosts are `.invalid`.

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values (
  'e7000001-0000-4000-8000-000000000001'::uuid,
  'e7_owner@test.dev',
  'authenticated',
  'authenticated'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'e7001001-0000-4000-8000-000000000001'::uuid,
  'e7000001-0000-4000-8000-000000000001'::uuid,
  'e7 workspace',
  'e7-prune-scope-ws'
);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values (
  'e7002001-0000-4000-8000-000000000001'::uuid,
  'e7001001-0000-4000-8000-000000000001'::uuid,
  'e7000001-0000-4000-8000-000000000001'::uuid,
  null
);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values (
  'e7003001-0000-4000-8000-000000000001'::uuid,
  'e7000001-0000-4000-8000-000000000001'::uuid,
  'e7001001-0000-4000-8000-000000000001'::uuid,
  'e7002001-0000-4000-8000-000000000001'::uuid,
  'E7 Owner',
  'E7 Owner'
);

insert into public.data_catalog_listings
  (id, display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format,
   pipeline_name, pipeline_run_id, pipeline_scope_keys)
values
  ('e7004001-0000-4000-8000-000000000001'::uuid, 'only old', 'Fixture Org',
   'api_resource', 'ckan', 'https://pgtap-fixture-a.invalid',
   'pgtap-fixture-only-old', 'r1', 'CSV', 'pgtap-fixture-pipeline', 'run-1',
   array['old']),
  ('e7004002-0000-4000-8000-000000000002'::uuid, 'shared', 'Fixture Org',
   'api_resource', 'ckan', 'https://pgtap-fixture-a.invalid',
   'pgtap-fixture-shared', 'r2', 'CSV', 'pgtap-fixture-pipeline', 'run-1',
   array['old', 'new']),
  ('e7004003-0000-4000-8000-000000000003'::uuid, 'in use', 'Fixture Org',
   'api_resource', 'ckan', 'https://pgtap-fixture-a.invalid',
   'pgtap-fixture-in-use', 'r3', 'CSV', 'pgtap-fixture-pipeline', 'run-1',
   array['old']),
  ('e7004004-0000-4000-8000-000000000004'::uuid, 'other drive', 'Fixture Org',
   'api_resource', 'ckan', 'https://pgtap-fixture-b.invalid',
   'pgtap-fixture-other-drive', 'r4', 'CSV', 'pgtap-fixture-pipeline', 'run-1',
   array['old']),
  ('e7004005-0000-4000-8000-000000000005'::uuid, 'other scope', 'Fixture Org',
   'api_resource', 'ckan', 'https://pgtap-fixture-a.invalid',
   'pgtap-fixture-other-scope', 'r5', 'CSV', 'pgtap-fixture-pipeline', 'run-1',
   array['new']);

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values (
  'e7005001-0000-4000-8000-000000000001'::uuid,
  'e7001001-0000-4000-8000-000000000001'::uuid,
  'e7000001-0000-4000-8000-000000000001'::uuid,
  'e7003001-0000-4000-8000-000000000001'::uuid,
  'added from in use',
  'open_data'::public.datasets__source_type
);

insert into public.datasets__open_data (dataset_id, workspace_id, catalog_listing_id)
values (
  'e7005001-0000-4000-8000-000000000001'::uuid,
  'e7001001-0000-4000-8000-000000000001'::uuid,
  'e7004003-0000-4000-8000-000000000003'::uuid
);

insert into public.pipeline_scope_checkpoints
  (pipeline_name, drive_key, scope_key, high_water_mark, pipeline_run_id)
values
  ('pgtap-fixture-pipeline', 'https://pgtap-fixture-a.invalid', 'old',
   '2026-10-01T00:00:00Z', 'run-1'),
  ('pgtap-fixture-pipeline', 'https://pgtap-fixture-b.invalid', 'old',
   '2026-10-01T00:00:00Z', 'run-1'),
  ('pgtap-fixture-pipeline', 'https://pgtap-fixture-a.invalid', 'new',
   '2026-10-01T00:00:00Z', 'run-1');

select plan(14);

-- ---------------------------------------------------------------------------
-- Listing stored scopes
-- ---------------------------------------------------------------------------

select results_eq(
  $$select drive_key, scope_key
    from public.rpc_data_catalog_listings__list_pipeline_scopes('pgtap-fixture-pipeline')$$,
  $$values
    ('https://pgtap-fixture-a.invalid', 'new'),
    ('https://pgtap-fixture-a.invalid', 'old'),
    ('https://pgtap-fixture-b.invalid', 'old')$$,
  'lists every stored drive and scope pair once, ordered'
);

-- ---------------------------------------------------------------------------
-- A dry run counts and changes nothing
-- ---------------------------------------------------------------------------

select results_eq(
  $$select * from public.rpc_data_catalog_listings__prune_pipeline_scope(
      'pgtap-fixture-pipeline', 'old', 'https://pgtap-fixture-a.invalid', true)$$,
  $$values (1, 1, 1, 1)$$,
  'a dry run counts one deleted, one kept in use, one detached, one checkpoint'
);

select is(
  (
    select count(*)::integer
    from public.data_catalog_listings
    where pipeline_name = 'pgtap-fixture-pipeline'
  ),
  5,
  'a dry run deletes no listing'
);

-- ---------------------------------------------------------------------------
-- Pruning one drive
-- ---------------------------------------------------------------------------

select results_eq(
  $$select * from public.rpc_data_catalog_listings__prune_pipeline_scope(
      'pgtap-fixture-pipeline', 'old', 'https://pgtap-fixture-a.invalid', false)$$,
  $$values (1, 1, 1, 1)$$,
  'a real run reports what it did with the same counts'
);

select is(
  (
    select count(*)::integer
    from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-only-old'
  ),
  0,
  'a listing only the pruned scope produced is deleted'
);

select is(
  (
    select pipeline_scope_keys
    from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-shared'
  ),
  array['new'],
  'a listing another scope also produces only loses the pruned key'
);

select is(
  (
    select pipeline_scope_keys
    from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-in-use'
  ),
  array['old'],
  'a listing a workspace uses is kept with its key'
);

select is(
  (
    select pipeline_scope_keys
    from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-other-drive'
  ),
  array['old'],
  'a listing on another drive is untouched'
);

select is(
  (
    select count(*)::integer
    from public.pipeline_scope_checkpoints
    where pipeline_name = 'pgtap-fixture-pipeline'
  ),
  2,
  'only the pruned drive and scope lose their checkpoint'
);

-- ---------------------------------------------------------------------------
-- Pruning every drive at once
-- ---------------------------------------------------------------------------

select results_eq(
  $$select * from public.rpc_data_catalog_listings__prune_pipeline_scope(
      'pgtap-fixture-pipeline', 'old', null, false)$$,
  $$values (1, 1, 0, 1)$$,
  'a null drive prunes the scope on every drive'
);

-- ---------------------------------------------------------------------------
-- Only the service role may call either function
-- ---------------------------------------------------------------------------

select ok(
  has_function_privilege(
    'service_role',
    'public.rpc_data_catalog_listings__prune_pipeline_scope(text, text, text, boolean)',
    'execute'
  ),
  'the service role may prune a scope'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.rpc_data_catalog_listings__prune_pipeline_scope(text, text, text, boolean)',
    'execute'
  ),
  'a signed-in user may not prune a scope'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_data_catalog_listings__prune_pipeline_scope(text, text, text, boolean)',
    'execute'
  ),
  'an anonymous visitor may not prune a scope'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.rpc_data_catalog_listings__list_pipeline_scopes(text)',
    'execute'
  ),
  'a signed-in user may not list a pipeline''s scopes'
);

select * from finish();

rollback;
```

- [ ] **Step 3: Watch it fail**

```bash
pnpm test:db
```

Expected: the new file fails, because neither function exists. If an insert
fails first (for example a required column on `workspaces` or `datasets`),
fix the fixture by copying the column list from
`supabase/tests/database/permissions/rpc_workspaces__private_resource_counts.test.sql`,
which inserts the same rows.

- [ ] **Step 4: Declare the prune RPC**

Create `supabase/schemas/50.rpc_data_catalog_listings__prune_pipeline_scope.sql`:

```sql
/**
 * Removes one scope from a pipeline's listings and deletes its checkpoints,
 * once the pipeline no longer produces that scope. Among the pipeline's
 * listings on the drive (every drive when `p_drive_key` is null) whose
 * `pipeline_scope_keys` contain the scope:
 *
 * - a listing another scope also produces loses only this key (detached);
 * - a listing only this scope produces, that a workspace dataset was added
 *   from, is left as it is, key included (kept in use);
 * - every other listing is deleted.
 *
 * Listings a workspace uses are kept because deleting one would cascade
 * away the workspace dataset's link to its source
 * (`datasets__open_data.catalog_listing_id` is `on delete cascade`).
 *
 * @param p_pipeline_name The pipeline, as `pipeline_name` names it.
 * @param p_scope_key The scope to remove.
 * @param p_drive_key The drive (`api_base_url`), or null for every drive.
 * @param p_is_dry_run When true, counts what would happen and changes
 *   nothing.
 *
 * @returns One row: listings deleted, listings kept because a workspace uses
 *   them, listings detached, and checkpoints deleted. A dry run returns what
 *   a real run would.
 */
create or replace function public.rpc_data_catalog_listings__prune_pipeline_scope (
  p_pipeline_name text,
  p_scope_key text,
  p_drive_key text,
  p_is_dry_run boolean
) returns table (
  listings_deleted integer,
  listings_kept_in_use integer,
  listings_detached integer,
  checkpoints_deleted integer
) as $$
declare
  v_deleted integer;
  v_kept_in_use integer;
  v_detached integer;
  v_checkpoints integer;
begin
  select
    count(*) filter (where counted.is_shared),
    count(*) filter (where not counted.is_shared and counted.is_in_use),
    count(*) filter (where not counted.is_shared and not counted.is_in_use)
  into v_detached, v_kept_in_use, v_deleted
  from (
    select
      cardinality(array_remove(listing.pipeline_scope_keys, p_scope_key)) > 0
        as is_shared,
      exists (
        select 1
        from public.datasets__open_data open_data
        where open_data.catalog_listing_id = listing.id
      ) as is_in_use
    from public.data_catalog_listings listing
    where
      listing.pipeline_name = p_pipeline_name and
      (p_drive_key is null or listing.api_base_url = p_drive_key) and
      p_scope_key = any (listing.pipeline_scope_keys)
  ) counted;

  select count(*)
  into v_checkpoints
  from public.pipeline_scope_checkpoints scope_checkpoint
  where
    scope_checkpoint.pipeline_name = p_pipeline_name and
    scope_checkpoint.scope_key = p_scope_key and
    (p_drive_key is null or scope_checkpoint.drive_key = p_drive_key);

  if not p_is_dry_run then
    update public.data_catalog_listings listing
    set
      pipeline_scope_keys = array_remove(listing.pipeline_scope_keys, p_scope_key)
    where
      listing.pipeline_name = p_pipeline_name and
      (p_drive_key is null or listing.api_base_url = p_drive_key) and
      p_scope_key = any (listing.pipeline_scope_keys) and
      cardinality(array_remove(listing.pipeline_scope_keys, p_scope_key)) > 0;

    delete from public.data_catalog_listings listing
    where
      listing.pipeline_name = p_pipeline_name and
      (p_drive_key is null or listing.api_base_url = p_drive_key) and
      p_scope_key = any (listing.pipeline_scope_keys) and
      cardinality(array_remove(listing.pipeline_scope_keys, p_scope_key)) = 0 and
      not exists (
        select 1
        from public.datasets__open_data open_data
        where open_data.catalog_listing_id = listing.id
      );

    delete from public.pipeline_scope_checkpoints scope_checkpoint
    where
      scope_checkpoint.pipeline_name = p_pipeline_name and
      scope_checkpoint.scope_key = p_scope_key and
      (p_drive_key is null or scope_checkpoint.drive_key = p_drive_key);
  end if;

  return query select v_deleted, v_kept_in_use, v_detached, v_checkpoints;
end;
$$ language plpgsql security invoker
set
  search_path = '';

-- `service_role` only: the `ava` CLI calls this with the service role key.
revoke
execute on function public.rpc_data_catalog_listings__prune_pipeline_scope (text, text, text, boolean)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_data_catalog_listings__prune_pipeline_scope (text, text, text, boolean) to service_role;
```

- [ ] **Step 5: Declare the list RPC**

Create `supabase/schemas/50.rpc_data_catalog_listings__list_pipeline_scopes.sql`:

```sql
/**
 * Every drive and scope pair a pipeline has stored: the scopes in its
 * listings' `pipeline_scope_keys`, by `api_base_url`, and the scopes it has a
 * checkpoint for. `ava pipeline prune-retired-scopes` compares these with the
 * scopes the pipeline declares today to find the retired ones.
 *
 * @param p_pipeline_name The pipeline, as `pipeline_name` names it.
 *
 * @returns One row per distinct pair, ordered by drive, then scope.
 */
create or replace function public.rpc_data_catalog_listings__list_pipeline_scopes (p_pipeline_name text) returns table (drive_key text, scope_key text) as $$
  select distinct stored.drive_key, stored.scope_key
  from (
    select
      listing.api_base_url as drive_key,
      unnest(listing.pipeline_scope_keys) as scope_key
    from public.data_catalog_listings listing
    where
      listing.pipeline_name = p_pipeline_name and
      listing.api_base_url is not null
    union
    select scope_checkpoint.drive_key, scope_checkpoint.scope_key
    from public.pipeline_scope_checkpoints scope_checkpoint
    where scope_checkpoint.pipeline_name = p_pipeline_name
  ) stored
  order by stored.drive_key, stored.scope_key;
$$ language sql stable security invoker
set
  search_path = '';

-- `service_role` only: the `ava` CLI calls this with the service role key.
revoke
execute on function public.rpc_data_catalog_listings__list_pipeline_scopes (text)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_data_catalog_listings__list_pipeline_scopes (text) to service_role;
```

- [ ] **Step 6: Generate the migration**

```bash
pnpm db:reset
pnpm db:new-migration add_pipeline_scope_rpcs
```

Expected contents of `supabase/migrations/*_add_pipeline_scope_rpcs.sql`: the
two `create or replace function` statements with their `revoke` and `grant`.
Nothing is dropped. If anything else appears, stop, run `pnpm db:reset`, and
regenerate.

- [ ] **Step 7: Apply it and watch the suite pass**

```bash
pnpm db:reset
pnpm test:db
```

Expected: every pgTAP file passes, including the 14 new assertions.

- [ ] **Step 8: Commit**

```bash
git add supabase/schemas/50.rpc_data_catalog_listings__prune_pipeline_scope.sql \
  supabase/schemas/50.rpc_data_catalog_listings__list_pipeline_scopes.sql \
  supabase/tests/database/rpc_data_catalog_listings__pipeline_scopes.test.sql \
  supabase/migrations/*_add_pipeline_scope_rpcs.sql
git commit -m "feat(db): add RPCs that list and prune a pipeline's scopes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Seed scope keys and checkpoints from existing listings

**Files:**
- Create: `supabase/migrations/<timestamp>_seed_pipeline_scope_keys_and_checkpoints.sql`
- Create: `supabase/migration-upgrade-tests/pipeline_scope_seed.prelude.sql`
- Create: `supabase/migration-upgrade-tests/pipeline_scope_seed.assertions.sql`
- Modify: `scripts/test-dashboard-publishing-migrations.sh`

This migration is data only, which `supabase db diff` cannot generate, so it
is hand-written like `20261020174732_backfill_api_listing_pipeline_name.sql`.

- [ ] **Step 1: Create the empty migration**

```bash
ava supabase status
supabase migration new seed_pipeline_scope_keys_and_checkpoints
```

Expected: a new empty file whose timestamp sorts after Task 2's migration.

- [ ] **Step 2: Write the replay fixtures**

`supabase/migration-upgrade-tests/pipeline_scope_seed.prelude.sql`:

```sql
-- Listings the way the `socrata`, `hdx`, and `world-bank__wdi` pipelines
-- wrote them before listings carried scope keys: every one has `{}`. Drives
-- are `.invalid` hosts and other identifiers are `pgtap-fixture`-prefixed,
-- so the seeded checkpoints the assertions read belong to these fixtures
-- only, whatever real rows this database holds.
begin;

insert into public.data_catalog_listings
  (display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format,
   pipeline_name, pipeline_run_id, date_of_last_update)
values
  ('pgtap-fixture hdx csv', 'HDX', 'api_resource', 'ckan',
   'https://pgtap-fixture-hdx.invalid', 'pgtap-fixture-hdx-csv',
   'pgtap-fixture-hdx-csv-r', 'CSV', 'hdx', 'run-1', '2026-10-01T00:00:00Z'),
  ('pgtap-fixture hdx parquet', 'HDX', 'api_resource', 'ckan',
   'https://pgtap-fixture-hdx.invalid', 'pgtap-fixture-hdx-parquet',
   'pgtap-fixture-hdx-parquet-r', 'PARQUET', 'hdx', 'run-1',
   '2026-10-05T00:00:00Z'),
  -- A date later than now is a bad source timestamp, which the seed skips.
  ('pgtap-fixture hdx future', 'HDX', 'api_resource', 'ckan',
   'https://pgtap-fixture-hdx.invalid', 'pgtap-fixture-hdx-future',
   'pgtap-fixture-hdx-future-r', 'CSV', 'hdx', 'run-1',
   '2099-01-01T00:00:00Z'),
  ('pgtap-fixture socrata', 'City of New York', 'api_resource', 'socrata',
   'https://pgtap-fixture-socrata.invalid', 'pgtap-fixture-socrata',
   'pgtap-fixture-socrata-r', 'CSV', 'socrata', 'run-1',
   '2026-09-01T00:00:00Z'),
  -- A drive that already has a checkpoint keeps it.
  ('pgtap-fixture socrata seeded', 'City of New York', 'api_resource',
   'socrata', 'https://pgtap-fixture-socrata-seeded.invalid',
   'pgtap-fixture-socrata-seeded', 'pgtap-fixture-socrata-seeded-r', 'CSV',
   'socrata', 'run-1', '2026-09-09T00:00:00Z'),
  -- A hand-curated listing names no pipeline and gets no scope key.
  ('pgtap-fixture curated', 'Elsewhere', 'api_resource', 'ckan',
   'https://pgtap-fixture-curated.invalid', 'pgtap-fixture-curated',
   'pgtap-fixture-curated-r', 'CSV', null, null, '2026-09-01T00:00:00Z');

-- A listing a scoped pipeline already wrote keeps its keys.
insert into public.data_catalog_listings
  (display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format,
   pipeline_name, pipeline_run_id, pipeline_scope_keys)
values
  ('pgtap-fixture hdx keyed', 'HDX', 'api_resource', 'ckan',
   'https://pgtap-fixture-hdx.invalid', 'pgtap-fixture-hdx-keyed',
   'pgtap-fixture-hdx-keyed-r', 'CSV', 'hdx', 'run-2',
   array['format:csv@2']);

insert into public.data_catalog_listings
  (display_name, external_organization_name, parquet_file_name,
   pipeline_name, pipeline_run_id)
values
  ('pgtap-fixture wdi', 'World Bank', 'pgtap-fixture-scope-seed.parquet',
   'pgtap-fixture-wdi', 'run-1');

insert into public.pipeline_scope_checkpoints
  (pipeline_name, drive_key, scope_key, high_water_mark, pipeline_run_id)
values
  ('socrata', 'https://pgtap-fixture-socrata-seeded.invalid', 'all',
   '2026-01-01T00:00:00Z', 'run-0');
```

`supabase/migration-upgrade-tests/pipeline_scope_seed.assertions.sql`:

```sql
-- Verify the seed gives each pipeline listing the scope that produced it,
-- leaves keyed and hand-curated listings alone, and seeds one checkpoint per
-- incremental drive and scope from the newest non-future update.
do $$
begin
  if (
    select pipeline_scope_keys from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-hdx-csv'
  ) is distinct from array['format:csv'] then
    raise exception 'an HDX CSV listing was not keyed format:csv';
  end if;

  if (
    select pipeline_scope_keys from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-hdx-parquet'
  ) is distinct from array['format:parquet'] then
    raise exception 'an HDX Parquet listing was not keyed format:parquet';
  end if;

  if (
    select pipeline_scope_keys from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-socrata'
  ) is distinct from array['all'] then
    raise exception 'a Socrata listing was not keyed all';
  end if;

  if (
    select pipeline_scope_keys from public.data_catalog_listings
    where parquet_file_name = 'pgtap-fixture-scope-seed.parquet'
  ) is distinct from array['all'] then
    raise exception 'a pipeline_parquet listing was not keyed all';
  end if;

  if (
    select pipeline_scope_keys from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-hdx-keyed'
  ) is distinct from array['format:csv@2'] then
    raise exception 'a listing that already had scope keys was changed';
  end if;

  if (
    select pipeline_scope_keys from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-curated'
  ) is distinct from '{}'::text[] then
    raise exception 'a listing with no pipeline was given a scope key';
  end if;

  if (
    select array_agg(scope_key || '=' || high_water_mark::text order by scope_key)
    from public.pipeline_scope_checkpoints
    where pipeline_name = 'hdx' and drive_key = 'https://pgtap-fixture-hdx.invalid'
  ) is distinct from array[
    'format:csv=2026-10-05 00:00:00+00',
    'format:parquet=2026-10-05 00:00:00+00'
  ] then
    raise exception 'the HDX drive did not get both scope checkpoints at its newest non-future update';
  end if;

  if (
    select high_water_mark from public.pipeline_scope_checkpoints
    where pipeline_name = 'socrata'
      and drive_key = 'https://pgtap-fixture-socrata.invalid'
      and scope_key = 'all'
  ) is distinct from '2026-09-01T00:00:00Z'::timestamptz then
    raise exception 'the Socrata drive did not get an all checkpoint';
  end if;

  if (
    select high_water_mark from public.pipeline_scope_checkpoints
    where pipeline_name = 'socrata'
      and drive_key = 'https://pgtap-fixture-socrata-seeded.invalid'
  ) is distinct from '2026-01-01T00:00:00Z'::timestamptz then
    raise exception 'an existing checkpoint was overwritten';
  end if;

  if exists (
    select 1 from public.pipeline_scope_checkpoints
    where drive_key = 'https://pgtap-fixture-curated.invalid'
  ) then
    raise exception 'a drive with no pipeline got a checkpoint';
  end if;
end;
$$;

rollback;
```

The HDX checkpoint comparison renders `timestamptz` as text, which depends on
the session time zone. The runner's `psql` session uses UTC; if the
assertion fails only on the `+00` suffix, compare with
`at time zone 'UTC'` instead of changing the expected values.

- [ ] **Step 3: Wire the replay into the runner**

In `scripts/test-dashboard-publishing-migrations.sh`, after the
`data_catalog_listings_pipeline_name` replay block, add:

```bash

# Scope seed: key existing pipeline listings by the scope that produced them,
# and seed per-scope checkpoints from each drive's newest update.
run_migration_replay \
  "$repo_root/supabase/migration-upgrade-tests/pipeline_scope_seed.prelude.sql" \
  "$repo_root/supabase/migrations/<timestamp>_seed_pipeline_scope_keys_and_checkpoints.sql" \
  "$repo_root/supabase/migration-upgrade-tests/pipeline_scope_seed.assertions.sql"
```

Replace `<timestamp>` with the real file name from Step 1.

- [ ] **Step 4: Watch the replay fail**

```bash
./scripts/test-dashboard-publishing-migrations.sh
```

Expected: the new replay raises `an HDX CSV listing was not keyed format:csv`,
because the migration is still empty.

- [ ] **Step 5: Write the migration**

Fill `supabase/migrations/<timestamp>_seed_pipeline_scope_keys_and_checkpoints.sql`:

```sql
-- Records which scope produced each listing a pipeline wrote before listings
-- carried scope keys, and seeds each incremental drive's checkpoints from the
-- newest update its listings hold, so the first scoped run resumes instead of
-- crawling from the start. The keys must match the pipelines' code: `all` is
-- the engine's default scope, and the `hdx` pipeline's scopes are
-- `format:csv` and `format:parquet` (pinned by `hdxScopes.test.ts`). Only
-- listings with no scope key yet, and drives and scopes with no checkpoint
-- yet, are touched, so this is safe to replay.
update public.data_catalog_listings
set
  pipeline_scope_keys = array['format:csv']
where
  pipeline_name = 'hdx' and
  api_resource_format = 'CSV' and
  pipeline_scope_keys = '{}';

update public.data_catalog_listings
set
  pipeline_scope_keys = array['format:parquet']
where
  pipeline_name = 'hdx' and
  api_resource_format = 'PARQUET' and
  pipeline_scope_keys = '{}';

update public.data_catalog_listings
set
  pipeline_scope_keys = array['all']
where
  pipeline_name is not null and
  pipeline_name <> 'hdx' and
  pipeline_scope_keys = '{}';

-- The unscoped HDX crawl covered both formats up to the drive's newest
-- update, so both scopes start there. A date later than now is a bad source
-- timestamp, skipped as the engine skips it.
insert into public.pipeline_scope_checkpoints
  (pipeline_name, drive_key, scope_key, high_water_mark, pipeline_run_id)
select
  drive.pipeline_name,
  drive.drive_key,
  scope.scope_key,
  drive.high_water_mark,
  'migration:seed-scope-checkpoints'
from (
  select
    listing.pipeline_name,
    listing.api_base_url as drive_key,
    max(listing.date_of_last_update) as high_water_mark
  from public.data_catalog_listings listing
  where
    listing.pipeline_name in ('socrata', 'hdx') and
    listing.api_base_url is not null and
    listing.date_of_last_update <= now()
  group by listing.pipeline_name, listing.api_base_url
) drive
join (
  values
    ('socrata', 'all'),
    ('hdx', 'format:csv'),
    ('hdx', 'format:parquet')
) as scope (pipeline_name, scope_key) on scope.pipeline_name = drive.pipeline_name
on conflict (pipeline_name, drive_key, scope_key) do nothing;
```

- [ ] **Step 6: Run everything and watch it pass**

```bash
./scripts/test-dashboard-publishing-migrations.sh
pnpm db:reset
pnpm test:db
```

Expected: the replay exits 0 and `pnpm test:db` passes.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/*_seed_pipeline_scope_keys_and_checkpoints.sql \
  supabase/migration-upgrade-tests/pipeline_scope_seed.prelude.sql \
  supabase/migration-upgrade-tests/pipeline_scope_seed.assertions.sql \
  scripts/test-dashboard-publishing-migrations.sh
git commit -m "feat(db): seed scope keys and checkpoints from existing listings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Generated types, the listing model, and the desktop mirror

**Files:**
- Modify (generated): `shared/types/database.types.ts`
- Modify: `shared/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types.ts`
- Modify: `shared/models/data-catalog-listings/DataCatalogListing/DataCatalogListingParsers.ts`
- Modify: test fixtures that build a full listing (the type-check lists them)
- Modify: `apps/desktop/sync/syncable-tables.ts`
- Create (generated): `apps/desktop/migrations/*.gen.sql` for each migration without one

- [ ] **Step 1: Regenerate the database types**

```bash
ava supabase status
pnpm db:gen-types
git diff --stat shared/types/database.types.ts
```

Expected: the diff adds `pipeline_scope_keys` to `data_catalog_listings`
(`Row`, `Insert`, `Update`), the `pipeline_scope_checkpoints` table, and the
two `rpc_data_catalog_listings__*` functions. Nothing else changes. If other
tables change, the local database is not this branch's: stop and report.

- [ ] **Step 2: Watch the model's type test fail**

```bash
pnpm type-check
```

Expected: `DataCatalogListingParsers.ts` fails its `ZodConsistencyTests`,
because `DBReadSchema` lacks `pipeline_scope_keys`.

- [ ] **Step 3: Add the column to the parser and the model**

In `DataCatalogListingParsers.ts`, in `DBReadSchema`, after
`cached_at: z.iso.datetime({ offset: true }).nullable(),` add:

```ts
  pipeline_scope_keys: z.array(z.string()),
```

In `DataCatalogListing.types.ts`, in `DataCatalogListingRead`, after the
`cachedAt` member add:

```ts

  /**
   * The scopes of `pipelineName` that produce this listing. Empty on a
   * listing no scoped pipeline wrote.
   */
  pipelineScopeKeys: string[];
```

- [ ] **Step 4: Update the fixtures the type-check names**

```bash
pnpm type-check
```

For every error saying `pipeline_scope_keys` or `pipelineScopeKeys` is
missing in a test fixture, add `pipeline_scope_keys: [],` (a database row,
next to its `cached_at`) or `pipelineScopeKeys: [],` (a model object, next
to its `cachedAt`). Expect `DataCatalogListingParsers.test.ts` (its
`SHARED_DB_COLUMNS`) and `DataCatalogListingModule.test.ts`, and possibly
tests under `shared/connectors/open-data/`. Change no production code beyond
Step 3. If a non-test file fails, stop and report it.

- [ ] **Step 5: Run the model tests and the type-check**

```bash
pnpm exec vitest run shared/models/data-catalog-listings
pnpm type-check
```

Expected: both pass.

- [ ] **Step 6: Exclude the table from the desktop mirror**

In `apps/desktop/sync/syncable-tables.ts`, at the end of `EXCLUDED_TABLES`
(after `"db_connections__postgres",`), add:

```ts
  // Pipeline crawl state, written by the pipeline server with the service
  // role. Nothing the desktop renders.
  "pipeline_scope_checkpoints",
```

- [ ] **Step 7: Generate the desktop migrations**

```bash
pnpm desktop:sqlite:gen-migrations
git status --short apps/desktop/migrations
```

Expected: new `.gen.sql` files for `20261020174133_relax_api_listing_pipeline_columns`,
`20261020174732_backfill_api_listing_pipeline_name`, and the three migrations
from Tasks 1 to 3. The `add_pipeline_scope_checkpoints` one adds
`"pipeline_scope_keys" TEXT ...` to `data_catalog_listings` and no
`pipeline_scope_checkpoints` table. The rest report no schema-shape change,
except the index the relax migration created. If the generator prints a
`needs hand-edit` warning, follow `apps/desktop/migrations/README.md` for it
and report what you did. The two `20261020*` files are outside this task's
own migrations; list them as out-of-scope files in your report ("generated
because the earlier tasks on this branch skipped the generator").

- [ ] **Step 8: Run the desktop sync tests**

```bash
pnpm exec vitest run apps/desktop/sync apps/desktop/scripts/gen-sqlite-migrations
```

Expected: pass.

- [ ] **Step 9: Commit**

```bash
git add shared/types/database.types.ts \
  shared/models/data-catalog-listings/DataCatalogListing \
  apps/desktop/sync/syncable-tables.ts \
  apps/desktop/migrations/*.gen.sql
git add <each fixture file Step 4 changed>
git commit -m "feat(db): regenerate types and mirror scope keys to the desktop

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
## Phase B: `@avandar/etl` building blocks

All paths in this phase are under `packages/node/etl/src` unless they start
with `packages/` or `apps/`.

### Task 5: The checkpoint store contract and its in-memory store

**Files:**
- Modify: `stores/EtlStores.types.ts`
- Create: `stores/InMemoryCheckpointStore/createInMemoryCheckpointStore.ts`
- Create: `stores/InMemoryCheckpointStore/createInMemoryCheckpointStore.test.ts`
- Modify: `index.ts`

- [ ] **Step 1: Add the contract types**

In `stores/EtlStores.types.ts`, append:

```ts
/** Identifies one checkpoint: one scope of one drive of one pipeline. */
export type CheckpointKey = Readonly<{
  pipelineName: string;
  driveKey: string;
  scopeKey: string;
}>;

/** A checkpoint's value and the run that wrote it. */
export type StoredCheckpoint = CheckpointKey &
  Readonly<{
    /** The newest source timestamp the scope's crawls have loaded up to. */
    highWaterMark: Date;
    pipelineRunId: string;
  }>;

/**
 * Where incremental crawls keep their checkpoints. Every connection in a
 * scope with a source timestamp before its checkpoint has been loaded.
 */
export type CheckpointStore = Readonly<{
  /** Resolves to the checkpoint, or `undefined` when the scope has none. */
  read: (key: CheckpointKey) => Promise<Date | undefined>;
  /** Creates the checkpoint, or replaces its value and run id. */
  write: (checkpoint: StoredCheckpoint) => Promise<void>;
}>;
```

- [ ] **Step 2: Write the failing tests**

Create `stores/InMemoryCheckpointStore/createInMemoryCheckpointStore.test.ts`:

```ts
import { createInMemoryCheckpointStore } from "@etl/stores/InMemoryCheckpointStore/createInMemoryCheckpointStore";
import { describe, expect, it } from "vitest";
import type {
  CheckpointKey,
  StoredCheckpoint,
} from "@etl/stores/EtlStores.types";

const KEY: CheckpointKey = {
  pipelineName: "hdx",
  driveKey: "https://data.humdata.org",
  scopeKey: "format:csv",
};

function _checkpoint(iso: string, pipelineRunId = "run-1"): StoredCheckpoint {
  return { ...KEY, highWaterMark: new Date(iso), pipelineRunId };
}

describe("createInMemoryCheckpointStore", () => {
  it("has no checkpoint for a scope never written", async () => {
    await expect(
      createInMemoryCheckpointStore().read(KEY),
    ).resolves.toBeUndefined();
  });

  it("reads back the last value written for a key", async () => {
    const store = createInMemoryCheckpointStore();
    await store.write(_checkpoint("2026-10-01T00:00:00.000Z"));
    await store.write(_checkpoint("2026-10-02T00:00:00.000Z", "run-2"));

    await expect(store.read(KEY)).resolves.toEqual(
      new Date("2026-10-02T00:00:00.000Z"),
    );
  });

  it("keeps each pipeline, drive, and scope apart", async () => {
    const store = createInMemoryCheckpointStore({
      checkpoints: [_checkpoint("2026-10-01T00:00:00.000Z")],
    });

    const reads = await Promise.all([
      store.read({ ...KEY, pipelineName: "socrata" }),
      store.read({ ...KEY, driveKey: "https://other.invalid" }),
      store.read({ ...KEY, scopeKey: "format:parquet" }),
    ]);

    expect(reads).toEqual([undefined, undefined, undefined]);
  });

  it("lists every checkpoint with the run that last wrote it", async () => {
    const store = createInMemoryCheckpointStore({
      checkpoints: [_checkpoint("2026-10-01T00:00:00.000Z")],
    });
    await store.write(_checkpoint("2026-10-03T00:00:00.000Z", "run-3"));

    expect([store.getCheckpoints(), store.getWriteCount()]).toEqual([
      [_checkpoint("2026-10-03T00:00:00.000Z", "run-3")],
      1,
    ]);
  });

  it("is not changed by editing a date it returned", async () => {
    const store = createInMemoryCheckpointStore({
      checkpoints: [_checkpoint("2026-10-01T00:00:00.000Z")],
    });

    (await store.read(KEY))?.setTime(0);
    store.getCheckpoints()[0]?.highWaterMark.setTime(0);

    await expect(store.read(KEY)).resolves.toEqual(
      new Date("2026-10-01T00:00:00.000Z"),
    );
  });

  it("rejects an invalid date, as Postgres would", async () => {
    await expect(
      createInMemoryCheckpointStore().write({
        ...KEY,
        highWaterMark: new Date(Number.NaN),
        pipelineRunId: "run-1",
      }),
    ).rejects.toThrow("invalid high-water mark");
  });
});
```

- [ ] **Step 3: Watch them fail**

```bash
pnpm --filter @avandar/etl exec vitest run src/stores/InMemoryCheckpointStore
```

Expected: FAIL, the module does not exist.

- [ ] **Step 4: Write the store**

Create `stores/InMemoryCheckpointStore/createInMemoryCheckpointStore.ts`:

```ts
import type {
  CheckpointKey,
  CheckpointStore,
  StoredCheckpoint,
} from "@etl/stores/EtlStores.types";

/** A checkpoint store held in memory, plus accessors for asserting on it. */
export type InMemoryCheckpointStore = CheckpointStore &
  Readonly<{
    /** A copy of every checkpoint, in the order its key was first written. */
    getCheckpoints: () => readonly StoredCheckpoint[];
    /** How many times `write` was called. */
    getWriteCount: () => number;
  }>;

function _buildMapKey(key: CheckpointKey): string {
  return JSON.stringify([key.pipelineName, key.driveKey, key.scopeKey]);
}

function _copyCheckpoint(checkpoint: StoredCheckpoint): StoredCheckpoint {
  return {
    pipelineName: checkpoint.pipelineName,
    driveKey: checkpoint.driveKey,
    scopeKey: checkpoint.scopeKey,
    highWaterMark: new Date(checkpoint.highWaterMark.getTime()),
    pipelineRunId: checkpoint.pipelineRunId,
  };
}

/**
 * Creates a checkpoint store that keeps checkpoints in memory, for testing a
 * pipeline or the engine without Supabase. Values cross the store boundary
 * as copies, and an invalid date is rejected the way Postgres rejects it.
 *
 * @param options.checkpoints - Checkpoints to start with.
 * @returns The store.
 */
export function createInMemoryCheckpointStore(
  options: Readonly<{ checkpoints?: readonly StoredCheckpoint[] }> = {},
): InMemoryCheckpointStore {
  const checkpointsByKey = new Map<string, StoredCheckpoint>(
    (options.checkpoints ?? []).map((checkpoint) => {
      return [_buildMapKey(checkpoint), _copyCheckpoint(checkpoint)];
    }),
  );
  let writeCount = 0;
  return {
    read: async (key) => {
      const stored = checkpointsByKey.get(_buildMapKey(key));
      return stored === undefined
        ? undefined
        : new Date(stored.highWaterMark.getTime());
    },
    write: async (checkpoint) => {
      if (Number.isNaN(checkpoint.highWaterMark.getTime())) {
        throw new Error(
          `Checkpoint ${_buildMapKey(checkpoint)} has an invalid high-water mark.`,
        );
      }
      writeCount += 1;
      checkpointsByKey.set(
        _buildMapKey(checkpoint),
        _copyCheckpoint(checkpoint),
      );
    },
    getCheckpoints: () => {
      return [...checkpointsByKey.values()].map(_copyCheckpoint);
    },
    getWriteCount: () => {
      return writeCount;
    },
  };
}
```

- [ ] **Step 5: Export it**

In `index.ts`, add to the `export type { ... } from "@etl/stores/EtlStores.types";`
list: `CheckpointKey`, `CheckpointStore`, `StoredCheckpoint` (keep the list
sorted). After the `createInMemoryListingsStore` export block, add:

```ts
export {
  createInMemoryCheckpointStore,
  type InMemoryCheckpointStore,
} from "@etl/stores/InMemoryCheckpointStore/createInMemoryCheckpointStore";
```

- [ ] **Step 6: Run the tests, type-check, and lint**

```bash
pnpm --filter @avandar/etl exec vitest run src/stores/InMemoryCheckpointStore
pnpm --filter @avandar/etl type-check
pnpm exec eslint packages/node/etl/src/stores packages/node/etl/src/index.ts
```

Expected: 6 tests pass, no type or lint errors.

- [ ] **Step 7: Commit**

```bash
git add packages/node/etl/src/stores/EtlStores.types.ts \
  packages/node/etl/src/stores/InMemoryCheckpointStore \
  packages/node/etl/src/index.ts
git commit -m "feat(etl): add the checkpoint store contract and an in-memory store

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The Supabase checkpoint store

**Files:**
- Create: `stores/throwOnSupabaseError/throwOnSupabaseError.ts`
- Modify: `stores/SupabaseListingsStore/createSupabaseListingsStore.ts`
- Create: `stores/SupabaseCheckpointStore/createSupabaseCheckpointStore.ts`
- Create: `stores/SupabaseCheckpointStore/createSupabaseCheckpointStore.supabase.test.ts`
- Modify: `index.ts`

- [ ] **Step 1: Move the error helper out of the listings store**

Create `stores/throwOnSupabaseError/throwOnSupabaseError.ts` holding the
listings store's `_SupabaseError` type and `_throwOnError` function, renamed
and exported:

```ts
/** The fields of a Supabase error the message is built from. */
export type SupabaseErrorLike = Readonly<{
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}>;

/**
 * Throws when a Supabase request failed, naming what was being done and
 * Supabase's message, code, details, and hint. The original error is kept as
 * the cause.
 *
 * @param args.error - The `error` a Supabase request resolved with.
 * @param args.action - What was being done, such as `reading rows from x`.
 * @throws When `error` is not null.
 */
export function throwOnSupabaseError(args: {
  error: SupabaseErrorLike | null;
  action: string;
}): void {
  const { error } = args;
  if (!error) {
    return;
  }
  const extras = [
    error.code ? `code ${error.code}` : "",
    error.details ? `details: ${error.details}` : "",
    error.hint ? `hint: ${error.hint}` : "",
  ].filter((extra) => {
    return extra !== "";
  });
  const suffix = extras.length === 0 ? "" : ` (${extras.join("; ")})`;
  throw new Error(`Supabase failed ${args.action}: ${error.message}${suffix}`, {
    cause: error,
  });
}
```

In `stores/SupabaseListingsStore/createSupabaseListingsStore.ts`, delete the
`_SupabaseError` type and the `_throwOnError` function, import
`throwOnSupabaseError` from `@etl/stores/throwOnSupabaseError/throwOnSupabaseError`,
and replace every `_throwOnError(` call with `throwOnSupabaseError(`.

- [ ] **Step 2: Confirm the move changed nothing**

```bash
pnpm --filter @avandar/etl exec vitest run src/stores/SupabaseListingsStore
pnpm --filter @avandar/etl type-check
```

Expected: the existing unit tests pass.

- [ ] **Step 3: Write the failing integration tests**

```bash
ava supabase status
```

Expected: `SWITCHED`. Then create
`stores/SupabaseCheckpointStore/createSupabaseCheckpointStore.supabase.test.ts`:

```ts
import { randomUUID } from "node:crypto";
import { createSupabaseCheckpointStore } from "@etl/stores/SupabaseCheckpointStore/createSupabaseCheckpointStore";
import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { CheckpointKey } from "@etl/stores/EtlStores.types";

const CHECKPOINTS_TABLE = "pipeline_scope_checkpoints";
const PIPELINE_NAME = `etl-fixture-${randomUUID()}`;
const KEY: CheckpointKey = {
  pipelineName: PIPELINE_NAME,
  driveKey: "https://etl-fixture.invalid",
  scopeKey: "format:csv",
};

const client = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } },
);
const store = createSupabaseCheckpointStore({
  client,
  checkpointsTable: CHECKPOINTS_TABLE,
});

async function _readRunIds(): Promise<string[]> {
  const { data, error } = await client
    .from(CHECKPOINTS_TABLE)
    .select("pipeline_run_id")
    .eq("pipeline_name", PIPELINE_NAME);
  expect(error).toBeNull();
  return (data ?? []).map((row) => {
    return String(row.pipeline_run_id);
  });
}

beforeAll(async () => {
  // Removes what a crashed earlier run left behind.
  const { error } = await client
    .from(CHECKPOINTS_TABLE)
    .delete()
    .like("pipeline_name", "etl-fixture-%");
  expect(error).toBeNull();
});

afterEach(async () => {
  const { error } = await client
    .from(CHECKPOINTS_TABLE)
    .delete()
    .eq("pipeline_name", PIPELINE_NAME);
  expect(error).toBeNull();
});

describe("createSupabaseCheckpointStore", () => {
  it("has no checkpoint for a scope never written", async () => {
    await expect(store.read(KEY)).resolves.toBeUndefined();
  });

  it("writes a checkpoint and reads it back as the same instant", async () => {
    await store.write({
      ...KEY,
      highWaterMark: new Date("2026-10-01T12:34:56.789Z"),
      pipelineRunId: "run-1",
    });

    await expect(store.read(KEY)).resolves.toEqual(
      new Date("2026-10-01T12:34:56.789Z"),
    );
  });

  it("replaces a checkpoint's value and run id on one row", async () => {
    await store.write({
      ...KEY,
      highWaterMark: new Date("2026-10-01T00:00:00.000Z"),
      pipelineRunId: "run-1",
    });
    await store.write({
      ...KEY,
      highWaterMark: new Date("2026-10-02T00:00:00.000Z"),
      pipelineRunId: "run-2",
    });

    expect([await store.read(KEY), await _readRunIds()]).toEqual([
      new Date("2026-10-02T00:00:00.000Z"),
      ["run-2"],
    ]);
  });

  it("keeps two scopes of one drive apart", async () => {
    await store.write({
      ...KEY,
      highWaterMark: new Date("2026-10-01T00:00:00.000Z"),
      pipelineRunId: "run-1",
    });

    await expect(
      store.read({ ...KEY, scopeKey: "format:parquet" }),
    ).resolves.toBeUndefined();
  });

  it("names the table when a request fails", async () => {
    const brokenStore = createSupabaseCheckpointStore({
      client,
      checkpointsTable: "no_such_table",
    });

    await expect(brokenStore.read(KEY)).rejects.toThrow(
      "Supabase failed reading a checkpoint from no_such_table",
    );
  });
});
```

- [ ] **Step 4: Watch them fail**

```bash
pnpm --filter @avandar/etl test:supabase
```

Expected: the new file fails, the module does not exist. The other Supabase
files still pass.

- [ ] **Step 5: Write the store**

Create `stores/SupabaseCheckpointStore/createSupabaseCheckpointStore.ts`:

```ts
import { throwOnSupabaseError } from "@etl/stores/throwOnSupabaseError/throwOnSupabaseError";
import type { CheckpointStore } from "@etl/stores/EtlStores.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** The conflict key: one checkpoint per pipeline, drive, and scope. */
const CHECKPOINT_CONFLICT = "pipeline_name,drive_key,scope_key";

/** The Supabase client and table a checkpoint store reads and writes. */
export type SupabaseCheckpointStoreOptions = Readonly<{
  /** A service-role client: only the service role reaches the table. */
  client: SupabaseClient;
  /** The checkpoints table. */
  checkpointsTable: string;
}>;

/**
 * Creates a checkpoint store over a Supabase table with the columns
 * `pipeline_name`, `drive_key`, `scope_key`, `high_water_mark`, and
 * `pipeline_run_id`, unique on the first three (see the README). Every
 * method throws with the table name and Supabase's message when a request
 * fails.
 *
 * @param options - The client and the table.
 * @returns The store.
 */
export function createSupabaseCheckpointStore(
  options: SupabaseCheckpointStoreOptions,
): CheckpointStore {
  const { client, checkpointsTable } = options;
  return {
    read: async (key) => {
      const { data, error } = await client
        .from(checkpointsTable)
        .select("high_water_mark")
        .eq("pipeline_name", key.pipelineName)
        .eq("drive_key", key.driveKey)
        .eq("scope_key", key.scopeKey)
        .maybeSingle();
      throwOnSupabaseError({
        error,
        action: `reading a checkpoint from ${checkpointsTable}`,
      });
      const row = data as Readonly<{ high_water_mark: string }> | null;
      return row === null ? undefined : new Date(row.high_water_mark);
    },
    write: async (checkpoint) => {
      const { error } = await client.from(checkpointsTable).upsert(
        {
          pipeline_name: checkpoint.pipelineName,
          drive_key: checkpoint.driveKey,
          scope_key: checkpoint.scopeKey,
          high_water_mark: checkpoint.highWaterMark.toISOString(),
          pipeline_run_id: checkpoint.pipelineRunId,
        },
        { onConflict: CHECKPOINT_CONFLICT },
      );
      throwOnSupabaseError({
        error,
        action: `writing a checkpoint to ${checkpointsTable}`,
      });
    },
  };
}
```

- [ ] **Step 6: Export it**

In `index.ts`, after the `createSupabaseListingsStore` export block, add:

```ts
export {
  createSupabaseCheckpointStore,
  type SupabaseCheckpointStoreOptions,
} from "@etl/stores/SupabaseCheckpointStore/createSupabaseCheckpointStore";
```

- [ ] **Step 7: Run the suites, type-check, and lint**

```bash
pnpm --filter @avandar/etl test:supabase
pnpm --filter @avandar/etl exec vitest run src/stores
pnpm --filter @avandar/etl type-check
pnpm exec eslint packages/node/etl/src/stores packages/node/etl/src/index.ts
```

Expected: every Supabase test passes, including the 5 new ones.

- [ ] **Step 8: Commit**

```bash
git add packages/node/etl/src/stores/throwOnSupabaseError \
  packages/node/etl/src/stores/SupabaseListingsStore/createSupabaseListingsStore.ts \
  packages/node/etl/src/stores/SupabaseCheckpointStore \
  packages/node/etl/src/index.ts
git commit -m "feat(etl): add a Supabase checkpoint store

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Record the producing scope on every listing row

Covers S9 and S10 at the page level.

**Files:**
- Create: `EtlEngine/etlScopes.ts`
- Modify: `EtlEngine/EtlEngine.types.ts`
- Modify: `stores/EtlStores.types.ts`, `stores/listingContractColumns.ts`
- Modify: `EtlEngine/buildListingRowFromRelation/buildListingRowFromRelation.ts` and its test
- Modify: `EtlEngine/isListingRowUnchanged/isListingRowUnchanged.test.ts`
- Modify: `EtlEngine/loadRelationsPage/loadRelationsPage.ts` and its test
- Modify: `EtlEngine/crawlDrive/crawlDrive.ts`
- Modify: `EtlEngine/prepareParquetRelation/prepareParquetRelation.test.ts`
- Modify: fixtures in `stores/InMemoryListingsStore/createInMemoryListingsStore.test.ts`,
  `stores/SupabaseListingsStore/__tests__/createSupabaseListingsStore.test.ts`,
  `stores/SupabaseListingsStore/__tests__/createSupabaseListingsStore.supabase.test.ts`,
  `stores/buildListingKeyFromRow/buildListingKeyFromRow.test.ts`,
  `EtlEngine/createEtlEngine/createEtlEngine.test.ts`
- Modify: `index.ts`

- [ ] **Step 1: Add the scope type and constants**

In `EtlEngine/EtlEngine.types.ts`, after the `EtlRunWindow` type, add:

```ts
/**
 * One slice of a drive that is crawled and resumed on its own, such as one
 * file format or one category. A pipeline adds whatever fields its `extract`
 * and `transform` need to filter by it.
 */
export type EtlScope = Readonly<{
  /** Unique within one drive. Matches `ETL_SCOPE_KEY_PATTERN`. */
  key: string;
}>;
```

Create `EtlEngine/etlScopes.ts`:

```ts
import type { EtlScope } from "@etl/EtlEngine/EtlEngine.types";

/** The one scope a drive has when its pipeline declares none. */
export const ETL_DEFAULT_SCOPE: EtlScope = { key: "all" };

/**
 * What a scope key may be: 1 to 64 lowercase letters, digits, and `.`, `_`,
 * `:`, `@`, `-`, starting with a letter or digit. Keys are stored in a
 * `text[]` and sent in PostgREST array filters, where commas, braces, and
 * quotes would need escaping.
 */
export const ETL_SCOPE_KEY_PATTERN = /^[a-z0-9][a-z0-9._:@-]{0,63}$/;
```

In `index.ts`, add `EtlScope` to the `EtlEngine.types` type export list, and
add:

```ts
export {
  ETL_DEFAULT_SCOPE,
  ETL_SCOPE_KEY_PATTERN,
} from "@etl/EtlEngine/etlScopes";
```

- [ ] **Step 2: Add the column to the row contract**

In `stores/EtlStores.types.ts`, in `ListingRowValues`, after
`parquet_file_name: string | null;` add:

```ts
  /** The scopes that produce this row, in the order they first wrote it. */
  pipeline_scope_keys: readonly string[];
```

In `stores/listingContractColumns.ts`, after `"parquet_file_name",` add
`"pipeline_scope_keys",`.

- [ ] **Step 3: Write the failing row-builder test**

In `EtlEngine/buildListingRowFromRelation/buildListingRowFromRelation.test.ts`,
add `scopeKey: "format:csv",` to the object `_build` passes to
`buildListingRowFromRelation` (after `syncedAt: SYNCED_AT,`), then add this
test after `"writes the relation's source time to date_of_last_update"`:

```ts
  it("records the scope that produced the row", () => {
    expect(_build(API_RELATION).pipeline_scope_keys).toEqual(["format:csv"]);
  });
```

- [ ] **Step 4: Write the failing change-check test**

In `EtlEngine/isListingRowUnchanged/isListingRowUnchanged.test.ts`, add
`pipeline_scope_keys: ["all"],` to `_row` after `parquet_file_name: null,`,
then add:

```ts
  it("treats a scope key added to the row as a change", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored(),
        next: _row({ pipeline_scope_keys: ["all", "category:health"] }),
      }),
    ).toBe(false);
  });
```

- [ ] **Step 5: Write the failing page-load tests**

In `EtlEngine/loadRelationsPage/loadRelationsPage.test.ts`, add
`scopeKey: "all",` to `_context`'s returned object (after `bucket: undefined,`).
Then add inside `describe("loadRelationsPage", ...)`, after
`"counts a row as unchanged when only the run and sync time differ"`:

```ts
  it("records the page's scope on a new row", async () => {
    const listings = createInMemoryListingsStore();

    await loadRelationsPage({
      relations: _apiRelations(1),
      context: _context({ listings, objects: undefined }, { scopeKey: "x" }),
    });

    expect(
      listings.getRows().map((row) => {
        return row.pipeline_scope_keys;
      }),
    ).toEqual([["x"]]);
  });

  it("adds a second scope's key to a row another scope wrote, once", async () => {
    const listings = createInMemoryListingsStore();
    const stores = { listings, objects: undefined };
    await loadRelationsPage({
      relations: _apiRelations(1),
      context: _context(stores, { scopeKey: "x" }),
    });

    const second = await loadRelationsPage({
      relations: _apiRelations(1),
      context: _context(stores, { scopeKey: "y" }),
    });
    const third = await loadRelationsPage({
      relations: _apiRelations(1),
      context: _context(stores, { scopeKey: "y" }),
    });

    expect([second, third, listings.getRows()[0]?.pipeline_scope_keys]).toEqual(
      [{ written: 1, unchanged: 0 }, { written: 0, unchanged: 1 }, ["x", "y"]],
    );
  });

  it("keeps the stored order of a row's scope keys", async () => {
    const listings = createInMemoryListingsStore();
    const stores = { listings, objects: undefined };
    await loadRelationsPage({
      relations: _apiRelations(1),
      context: _context(stores, { scopeKey: "y" }),
    });
    await loadRelationsPage({
      relations: _apiRelations(1),
      context: _context(stores, { scopeKey: "x" }),
    });

    const result = await loadRelationsPage({
      relations: _apiRelations(1),
      context: _context(stores, { scopeKey: "y" }),
    });

    expect([result, listings.getRows()[0]?.pipeline_scope_keys]).toEqual([
      { written: 0, unchanged: 1 },
      ["y", "x"],
    ]);
  });
```

- [ ] **Step 6: Watch them fail**

```bash
pnpm --filter @avandar/etl exec vitest run src/EtlEngine/buildListingRowFromRelation src/EtlEngine/isListingRowUnchanged src/EtlEngine/loadRelationsPage
```

Expected: the four new tests fail (no `pipeline_scope_keys` on built rows).
The type-check fails on the missing `scopeKey` until Step 8.

- [ ] **Step 7: Write the scope key into built rows**

In `EtlEngine/buildListingRowFromRelation/buildListingRowFromRelation.ts`:

- Add `scopeKey: string;` to `_BuildArgs` after `syncedAt: Date;`.
- In `_buildSharedColumns`'s returned object, after
  `coverage_end_date: _readIsoOrNull(relation, "coverageEndDate"),` add
  `pipeline_scope_keys: [args.scopeKey],`.
- In the JSDoc of `buildListingRowFromRelation`, after the `args.syncedAt`
  line, add:
  ` * @param args.scopeKey - The scope that produced the row, written to`
  ` *   `pipeline_scope_keys`.`

- [ ] **Step 8: Merge stored scope keys in the page load**

In `EtlEngine/loadRelationsPage/loadRelationsPage.ts`:

Add `scopeKey: string;` to `LoadRelationsPageContext` after `driveKey: string;`,
with the doc line `/** The scope the page was crawled for. */` above it.

In `_buildRelationsWithRows`, pass `scopeKey: context.scopeKey,` to
`buildListingRowFromRelation`.

Add this function above `_prepareRelation`:

```ts
/**
 * The row's scope keys once this page's scope is recorded: the stored row's
 * keys in their stored order, plus this scope's key when it is missing.
 * Keeping the stored order is what lets a row this scope already produced
 * compare unchanged.
 */
function _mergeStoredScopeKeys(args: {
  row: ListingRowValues;
  stored: StoredListingRow | undefined;
  scopeKey: string;
}): ListingRowValues {
  const storedKeys = args.stored?.pipeline_scope_keys ?? [];
  const mergedKeys = storedKeys.includes(args.scopeKey)
    ? storedKeys
    : [...storedKeys, args.scopeKey];
  return { ...args.row, pipeline_scope_keys: [...mergedKeys] };
}
```

In `_prepareRelation`, replace:

```ts
  const prepared = await _buildRowAndColumns({
    relation,
    row,
    stored,
    context: args.context,
  });
```

with:

```ts
  const prepared = await _buildRowAndColumns({
    relation,
    row: _mergeStoredScopeKeys({
      row,
      stored,
      scopeKey: args.context.scopeKey,
    }),
    stored,
    context: args.context,
  });
```

- [ ] **Step 9: Give the crawl its scope**

In `EtlEngine/crawlDrive/crawlDrive.ts`, import
`ETL_DEFAULT_SCOPE` from `@etl/EtlEngine/etlScopes`, and in `_processPage`'s
`context` object add `scopeKey: ETL_DEFAULT_SCOPE.key,` after
`driveKey: args.driveKey,`. Task 10 replaces this with the crawl's own scope.

- [ ] **Step 10: Update the remaining fixtures**

Add `pipeline_scope_keys: ["all"],` after `parquet_file_name: ...,` in each
full-row fixture:

- `stores/InMemoryListingsStore/createInMemoryListingsStore.test.ts` (the row helper near line 35)
- `stores/SupabaseListingsStore/__tests__/createSupabaseListingsStore.test.ts` (near line 41)
- `stores/SupabaseListingsStore/__tests__/createSupabaseListingsStore.supabase.test.ts` (`_apiRow` near line 50 and `_parquetRow` near line 64)
- `stores/buildListingKeyFromRow/buildListingKeyFromRow.test.ts` (near line 29)
- `EtlEngine/createEtlEngine/createEtlEngine.test.ts` (`_storedRow`, near line 191)

In `EtlEngine/prepareParquetRelation/prepareParquetRelation.test.ts`, add
`scopeKey: "all",` to each `buildListingRowFromRelation({ ... })` call.

Then add this test to `createSupabaseListingsStore.supabase.test.ts`, after
`"reads back a written row that the change check sees as unchanged"`:

```ts
  it("round-trips a row's scope keys in order", async () => {
    await store.upsertRows([
      _apiRow({ pipeline_scope_keys: ["format:csv", "category:health"] }),
    ]);

    const [stored] = await store.readRowsMatching([_apiRow()]);

    expect(stored?.pipeline_scope_keys).toEqual([
      "format:csv",
      "category:health",
    ]);
  });
```

- [ ] **Step 11: Run everything in the package**

```bash
pnpm --filter @avandar/etl exec vitest run
ava supabase status
pnpm --filter @avandar/etl test:supabase
pnpm --filter @avandar/etl type-check
pnpm exec eslint packages/node/etl/src
```

Expected: every unit and Supabase test passes. If a test elsewhere in the
package builds a full `ListingRowValues` and fails the type-check, add
`pipeline_scope_keys: ["all"],` to it the same way and list it in your report.

- [ ] **Step 12: Check the pipelines still compile**

```bash
pnpm exec tsc --noEmit -p tsconfig.node.json
pnpm --filter @avandar/pipeline-server exec vitest run -c vitest.config.ts
```

Expected: both pass. The pipelines build rows only through the engine.

- [ ] **Step 13: Commit**

```bash
git add packages/node/etl/src
git commit -m "feat(etl): record the producing scope on every listing row

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Scope-key validation and checkpoint rules

Pure functions that Tasks 9 and 10 call. Covers the rules behind S5 to S7 and
S11.

**Files:**
- Create: `EtlEngine/assertValidScopeKeys/assertValidScopeKeys.ts` and `.test.ts`
- Create: `EtlEngine/checkpointRules/checkpointRules.ts` and `.test.ts`

- [ ] **Step 1: Write the failing validation tests**

Create `EtlEngine/assertValidScopeKeys/assertValidScopeKeys.test.ts`:

```ts
import { assertValidScopeKeys } from "@etl/EtlEngine/assertValidScopeKeys/assertValidScopeKeys";
import { describe, expect, it } from "vitest";

const DRIVE_KEY = "https://data.humdata.org";

describe("assertValidScopeKeys", () => {
  it.each([["all"], ["format:csv"], ["format:csv@2"], ["category.health-v_1"]])(
    "accepts %s",
    (scopeKey) => {
      expect(() => {
        assertValidScopeKeys({ driveKey: DRIVE_KEY, scopeKeys: [scopeKey] });
      }).not.toThrow();
    },
  );

  it.each([
    [""],
    ["Format:CSV"],
    ["format,csv"],
    ["{all}"],
    ['"all"'],
    ["-all"],
    ["a".repeat(65)],
  ])("rejects %j, naming the drive", (scopeKey) => {
    expect(() => {
      assertValidScopeKeys({ driveKey: DRIVE_KEY, scopeKeys: [scopeKey] });
    }).toThrow(`Drive ${DRIVE_KEY} declares the scope key`);
  });

  it("rejects a key declared twice", () => {
    expect(() => {
      assertValidScopeKeys({
        driveKey: DRIVE_KEY,
        scopeKeys: ["format:csv", "format:csv"],
      });
    }).toThrow("declares the scope key format:csv more than once");
  });

  it("rejects a drive that declares no scopes", () => {
    expect(() => {
      assertValidScopeKeys({ driveKey: DRIVE_KEY, scopeKeys: [] });
    }).toThrow(`Drive ${DRIVE_KEY} declares no scopes`);
  });
});
```

- [ ] **Step 2: Write the failing checkpoint-rule tests**

Create `EtlEngine/checkpointRules/checkpointRules.test.ts`:

```ts
import {
  getAdvancedCheckpoint,
  isCrawlContiguousWithCheckpoint,
} from "@etl/EtlEngine/checkpointRules/checkpointRules";
import { describe, expect, it } from "vitest";

function _at(minute: number): Date {
  return new Date(Date.UTC(2026, 9, 1, 0, minute));
}

describe("isCrawlContiguousWithCheckpoint", () => {
  it("lets a crawl from the start advance, with or without a checkpoint", () => {
    expect([
      isCrawlContiguousWithCheckpoint({
        windowSince: undefined,
        storedCheckpoint: undefined,
      }),
      isCrawlContiguousWithCheckpoint({
        windowSince: undefined,
        storedCheckpoint: _at(5),
      }),
    ]).toEqual([true, true]);
  });

  it("lets a crawl starting at or before the checkpoint advance", () => {
    expect([
      isCrawlContiguousWithCheckpoint({
        windowSince: _at(5),
        storedCheckpoint: _at(5),
      }),
      isCrawlContiguousWithCheckpoint({
        windowSince: _at(1),
        storedCheckpoint: _at(5),
      }),
    ]).toEqual([true, true]);
  });

  it("stops a crawl starting after the checkpoint from advancing", () => {
    expect(
      isCrawlContiguousWithCheckpoint({
        windowSince: _at(9),
        storedCheckpoint: _at(5),
      }),
    ).toBe(false);
  });

  it("stops a crawl from an explicit since from creating a checkpoint", () => {
    expect(
      isCrawlContiguousWithCheckpoint({
        windowSince: _at(9),
        storedCheckpoint: undefined,
      }),
    ).toBe(false);
  });
});

describe("getAdvancedCheckpoint", () => {
  const SYNCED_AT = _at(30);

  it("moves to the page's newest timestamp", () => {
    expect(
      getAdvancedCheckpoint({
        current: _at(1),
        pageTimestamps: [_at(2), _at(4), _at(3)],
        syncedAt: SYNCED_AT,
      }),
    ).toEqual(_at(4));
  });

  it("creates a checkpoint where there was none", () => {
    expect(
      getAdvancedCheckpoint({
        current: undefined,
        pageTimestamps: [_at(2)],
        syncedAt: SYNCED_AT,
      }),
    ).toEqual(_at(2));
  });

  it("ignores a timestamp later than the sync time", () => {
    expect(
      getAdvancedCheckpoint({
        current: undefined,
        pageTimestamps: [_at(2), _at(90)],
        syncedAt: SYNCED_AT,
      }),
    ).toEqual(_at(2));
  });

  it("does not move for a page no later than the checkpoint", () => {
    expect([
      getAdvancedCheckpoint({
        current: _at(5),
        pageTimestamps: [_at(5)],
        syncedAt: SYNCED_AT,
      }),
      getAdvancedCheckpoint({
        current: _at(5),
        pageTimestamps: [_at(2)],
        syncedAt: SYNCED_AT,
      }),
    ]).toEqual([undefined, undefined]);
  });

  it("does not move for an empty page or one of only future timestamps", () => {
    expect([
      getAdvancedCheckpoint({
        current: undefined,
        pageTimestamps: [],
        syncedAt: SYNCED_AT,
      }),
      getAdvancedCheckpoint({
        current: undefined,
        pageTimestamps: [_at(90)],
        syncedAt: SYNCED_AT,
      }),
    ]).toEqual([undefined, undefined]);
  });
});
```

- [ ] **Step 3: Watch them fail**

```bash
pnpm --filter @avandar/etl exec vitest run src/EtlEngine/assertValidScopeKeys src/EtlEngine/checkpointRules
```

Expected: FAIL, the modules do not exist.

- [ ] **Step 4: Write the validation**

Create `EtlEngine/assertValidScopeKeys/assertValidScopeKeys.ts`:

```ts
import { ETL_SCOPE_KEY_PATTERN } from "@etl/EtlEngine/etlScopes";

/**
 * Checks one drive's scope keys: there is at least one, each matches
 * `ETL_SCOPE_KEY_PATTERN`, and none repeats.
 *
 * @param args.driveKey - Named in the error.
 * @param args.scopeKeys - The keys the drive's `listScopes` returned.
 * @throws Naming the drive and the first invalid or repeated key.
 */
export function assertValidScopeKeys(args: {
  driveKey: string;
  scopeKeys: readonly string[];
}): void {
  const { driveKey } = args;
  if (args.scopeKeys.length === 0) {
    throw new Error(
      `Drive ${driveKey} declares no scopes, so there is nothing to crawl.`,
    );
  }
  const seenKeys = new Set<string>();
  args.scopeKeys.forEach((scopeKey) => {
    if (!ETL_SCOPE_KEY_PATTERN.test(scopeKey)) {
      throw new Error(
        `Drive ${driveKey} declares the scope key ${JSON.stringify(scopeKey)}, which is not valid: use 1 to 64 lowercase letters, digits, and . _ : @ -, starting with a letter or digit.`,
      );
    }
    if (seenKeys.has(scopeKey)) {
      throw new Error(
        `Drive ${driveKey} declares the scope key ${scopeKey} more than once.`,
      );
    }
    seenKeys.add(scopeKey);
  });
}
```

- [ ] **Step 5: Write the checkpoint rules**

Create `EtlEngine/checkpointRules/checkpointRules.ts`:

```ts
/**
 * Whether a crawl may advance its checkpoint: only when it covers everything
 * since the stored checkpoint. A crawl from the start does. A crawl from an
 * explicit `since` does when it starts at or before the stored checkpoint.
 * One that starts later would skip what lies between, and with no stored
 * checkpoint it would claim everything before its `since`.
 *
 * @param args.windowSince - The crawl's lower bound.
 * @param args.storedCheckpoint - The checkpoint when the crawl started.
 * @returns `true` when the crawl's pages may move the checkpoint.
 */
export function isCrawlContiguousWithCheckpoint(args: {
  windowSince: Date | undefined;
  storedCheckpoint: Date | undefined;
}): boolean {
  const { windowSince, storedCheckpoint } = args;
  if (windowSince === undefined) {
    return true;
  }
  return (
    storedCheckpoint !== undefined &&
    windowSince.getTime() <= storedCheckpoint.getTime()
  );
}

/**
 * Where a checkpoint moves after a page has loaded: to the page's newest
 * connection timestamp that is no later than `syncedAt`, when that is later
 * than the current checkpoint. A timestamp later than the sync time is a bad
 * source timestamp, and following it would skip real changes until the
 * clock caught up.
 *
 * @param args.current - The checkpoint before the page.
 * @param args.pageTimestamps - The timestamps of the page's connections.
 * @param args.syncedAt - When the run started.
 * @returns The new checkpoint, or `undefined` when it does not move.
 */
export function getAdvancedCheckpoint(args: {
  current: Date | undefined;
  pageTimestamps: readonly Date[];
  syncedAt: Date;
}): Date | undefined {
  const syncedTime = args.syncedAt.getTime();
  const newest = args.pageTimestamps.reduce<Date | undefined>(
    (latest, timestamp) => {
      const time = timestamp.getTime();
      if (time > syncedTime) {
        return latest;
      }
      return latest === undefined || time > latest.getTime()
        ? timestamp
        : latest;
    },
    undefined,
  );
  if (newest === undefined) {
    return undefined;
  }
  if (
    args.current !== undefined &&
    newest.getTime() <= args.current.getTime()
  ) {
    return undefined;
  }
  return newest;
}
```

- [ ] **Step 6: Run the tests, type-check, and lint**

```bash
pnpm --filter @avandar/etl exec vitest run src/EtlEngine/assertValidScopeKeys src/EtlEngine/checkpointRules
pnpm --filter @avandar/etl type-check
pnpm exec eslint packages/node/etl/src/EtlEngine/assertValidScopeKeys packages/node/etl/src/EtlEngine/checkpointRules
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add packages/node/etl/src/EtlEngine/assertValidScopeKeys \
  packages/node/etl/src/EtlEngine/checkpointRules
git commit -m "feat(etl): add scope-key validation and checkpoint rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
## Phase C: The engine

### Task 9: Stored checkpoints replace the derived high-water mark

Covers S4 to S8 and S16, with one scope per drive (`all`). Task 10 adds more
scopes.

**Files:**
- Create: `EtlEngine/crawlCheckpoint/crawlCheckpoint.ts`
- Replace: `EtlEngine/crawlDrive/crawlDrive.ts`
- Modify: `EtlEngine/createEtlEngine/createEtlEngine.ts`
- Modify: `EtlEngine/EtlEngine.types.ts`
- Modify: `stores/EtlStores.types.ts`, `stores/InMemoryListingsStore/createInMemoryListingsStore.ts`,
  `stores/SupabaseListingsStore/createSupabaseListingsStore.ts`, and their tests
- Modify: `EtlEngine/createEtlEngine/createEtlEngine.test.ts`
- Modify: `apps/pipeline-server/pipelines/shared/getPipelineEtlDestination/getPipelineEtlDestination.ts` and its test
- Modify: `apps/pipeline-server/pipelines/hdx/createHdxEtlEngine/createHdxEtlEngine.test.ts`
- Modify: `apps/pipeline-server/pipelines/socrata/createSocrataEtlEngine/createSocrataEtlEngine.test.ts`

- [ ] **Step 1: Point the engine test helpers at checkpoints**

In `EtlEngine/createEtlEngine/createEtlEngine.test.ts`:

1. Add the imports:

   ```ts
   import { createInMemoryCheckpointStore } from "@etl/stores/InMemoryCheckpointStore/createInMemoryCheckpointStore";
   import type { InMemoryCheckpointStore } from "@etl/stores/InMemoryCheckpointStore/createInMemoryCheckpointStore";
   ```

   and add `CheckpointStore` and `StoredCheckpoint` to the
   `@etl/stores/EtlStores.types` type import.
2. In `_config`, delete the `readHighWaterMark` argument and the
   `readHighWaterMark: args.readHighWaterMark,` line, and add
   `checkpointsTable: "pipeline_scope_checkpoints",` to `output`.
3. Replace `_stores` with:

   ```ts
   /**
    * One checkpoint store per listings store, so two runs over the same
    * listings, as a resume is, also share their checkpoints.
    */
   const CHECKPOINTS_BY_LISTINGS = new WeakMap<
     ListingsStore,
     InMemoryCheckpointStore
   >();

   function _checkpointsFor(listings: ListingsStore): InMemoryCheckpointStore {
     const existing = CHECKPOINTS_BY_LISTINGS.get(listings);
     if (existing !== undefined) {
       return existing;
     }
     const created = createInMemoryCheckpointStore();
     CHECKPOINTS_BY_LISTINGS.set(listings, created);
     return created;
   }

   function _stores(
     listings: ListingsStore = createInMemoryListingsStore(),
     checkpoints: CheckpointStore = _checkpointsFor(listings),
   ): EtlStores {
     return { listings, objects: undefined, checkpoints };
   }

   function _checkpoint(driveKey: string, minute: number): StoredCheckpoint {
     return {
       pipelineName: PIPELINE_NAME,
       driveKey,
       scopeKey: "all",
       highWaterMark: _at(minute),
       pipelineRunId: "earlier-run",
     };
   }

   function _checkpointValues(
     checkpoints: InMemoryCheckpointStore,
   ): Array<[string, Date]> {
     return checkpoints.getCheckpoints().map((checkpoint) => {
       return [checkpoint.driveKey, checkpoint.highWaterMark];
     });
   }
   ```

- [ ] **Step 2: Rewrite the tests that read the derived mark**

In the same file:

1. Replace `"starts each drive of an incremental run at its own high-water mark"` with:

   ```ts
   it("starts each drive of an incremental run at its own checkpoint", async () => {
     const recorder = _recorder();
     const checkpoints = createInMemoryCheckpointStore({
       checkpoints: [_checkpoint("a", 10), _checkpoint("b", 20)],
     });

     await _run(
       _config({
         drives: [_drive("a", [[]]), _drive("b", [[]])],
         recorder,
         stores: _stores(createInMemoryListingsStore(), checkpoints),
       }),
       { mode: "incremental" },
     );

     expect([
       recorder.windows.get("a")?.since,
       recorder.windows.get("b")?.since,
     ]).toEqual([_at(10), _at(20)]);
   });
   ```

2. Rename `"starts an incremental drive with no rows at no lower bound"` to
   `"starts an incremental drive with no checkpoint at no lower bound"`.
3. Replace `"ignores the high-water mark in a full run"` with:

   ```ts
   it("ignores the checkpoint in a full run", async () => {
     const recorder = _recorder();
     const checkpoints = createInMemoryCheckpointStore({
       checkpoints: [_checkpoint("a", 10)],
     });

     await _run(
       _config({
         drives: [_drive("a", [[]])],
         recorder,
         stores: _stores(createInMemoryListingsStore(), checkpoints),
       }),
     );

     expect(recorder.windows.get("a")?.since).toBeUndefined();
   });
   ```

4. Replace `"lets an explicit since win without reading the high-water mark"` with:

   ```ts
   it("lets an explicit since win over the checkpoint", async () => {
     const recorder = _recorder();
     const checkpoints = createInMemoryCheckpointStore({
       checkpoints: [_checkpoint("a", 30)],
     });

     await _run(
       _config({
         drives: [_drive("a", [[]])],
         recorder,
         stores: _stores(createInMemoryListingsStore(), checkpoints),
       }),
       { mode: "incremental", since: _at(5) },
     );

     expect(recorder.windows.get("a")?.since).toEqual(_at(5));
   });
   ```

5. Rename `"fetches the connection at the high-water mark again without rewriting it"`
   to `"fetches the connection at the checkpoint again without rewriting it"`.
6. Delete `"passes the drive to a custom readHighWaterMark and uses its value"`.
7. Replace `"does not move the high-water mark for a connection with no relations"` with:

   ```ts
   it("advances the checkpoint past a connection with no relations", async () => {
     const listings = createInMemoryListingsStore();

     await _run(
       _config({
         drives: [
           _drive("a", [[_connection("c1", 1), _connection("c2", 2, 0)]]),
         ],
         recorder: _recorder(),
         stores: _stores(listings),
       }),
     );

     expect([
       _datasetIds(listings),
       _checkpointValues(_checkpointsFor(listings)),
     ]).toEqual([["c1"], [["a", _at(2)]]]);
   });
   ```

8. Rename `"writes a connection that shares the high-water mark's timestamp on resume"`
   to `"writes a connection that shares the checkpoint's timestamp on resume"`.
9. Replace `"reports a drive whose high-water mark cannot be read as failed and still crawls the next one"` with:

   ```ts
   it("reports a drive whose checkpoint cannot be read as failed and still crawls the next one", async () => {
     const checkpoints: CheckpointStore = {
       read: async ({ driveKey }) => {
         if (driveKey === "a") {
           throw new Error("checkpoint unavailable");
         }
         return undefined;
       },
       write: async () => {
         return undefined;
       },
     };

     const report = await _run(
       _config({
         drives: [
           _drive("a", [[_connection("a1", 1)]]),
           _drive("b", [[_connection("b1", 1)]]),
         ],
         recorder: _recorder(),
         stores: _stores(createInMemoryListingsStore(), checkpoints),
       }),
       { mode: "incremental" },
     );

     expect(_statusesOf(report)).toEqual([
       ["a", "failed", "checkpoint unavailable"],
       ["b", "ok", undefined],
     ]);
   });
   ```

10. Remove `vi` and `EtlIncrementalConfig` from the imports if nothing else
    uses them.

- [ ] **Step 3: Write the failing checkpoint tests**

Add a new `describe` inside `describe("createEtlEngine", ...)`, after
`describe("resuming", ...)`:

```ts
  describe("checkpoints", () => {
    it("advances the checkpoint after each loaded page", async () => {
      const listings = createInMemoryListingsStore();
      const checkpoints = _checkpointsFor(listings);

      await _run(
        _config({
          drives: [
            _drive("a", [
              [_connection("c1", 1), _connection("c2", 2)],
              [_connection("c3", 3)],
            ]),
          ],
          recorder: _recorder(),
          stores: _stores(listings),
        }),
      );

      expect([_checkpointValues(checkpoints), checkpoints.getWriteCount()]).toEqual(
        [[["a", _at(3)]], 2],
      );
    });

    it("resumes a failed crawl from its last loaded page", async () => {
      const listings = createInMemoryListingsStore();
      const pages: FakePage[] = [
        [_connection("c1", 1), _connection("c2", 2)],
        [_connection("c3", 3)],
      ];
      await _run(
        _config({
          drives: [_drive("a", pages, 1)],
          recorder: _recorder(),
          stores: _stores(listings),
        }),
      ).catch(() => {
        return undefined;
      });
      const recorder = _recorder();

      await _run(
        _config({
          drives: [_drive("a", pages)],
          recorder,
          stores: _stores(listings),
        }),
        { mode: "incremental" },
      );

      expect(recorder.windows.get("a")?.since).toEqual(_at(2));
    });

    it("keeps a future-dated connection from moving the checkpoint", async () => {
      const listings = createInMemoryListingsStore();
      const futureConnection: FakeConnection = {
        id: "future",
        modifiedAt: new Date("2099-01-01T00:00:00.000Z"),
        relationCount: 1,
      };

      await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 1), futureConnection]])],
          recorder: _recorder(),
          stores: _stores(listings),
        }),
      );

      expect(_checkpointValues(_checkpointsFor(listings))).toEqual([
        ["a", _at(1)],
      ]);
    });

    it("does not advance the checkpoint from a since later than it", async () => {
      const checkpoints = createInMemoryCheckpointStore({
        checkpoints: [_checkpoint("a", 5)],
      });

      await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 11)]])],
          recorder: _recorder(),
          stores: _stores(createInMemoryListingsStore(), checkpoints),
        }),
        { mode: "full", since: _at(10) },
      );

      expect(_checkpointValues(checkpoints)).toEqual([["a", _at(5)]]);
    });

    it("does not create a checkpoint from an explicit since", async () => {
      const checkpoints = createInMemoryCheckpointStore();

      await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 11)]])],
          recorder: _recorder(),
          stores: _stores(createInMemoryListingsStore(), checkpoints),
        }),
        { mode: "full", since: _at(10) },
      );

      expect(checkpoints.getCheckpoints()).toEqual([]);
    });

    it("advances the checkpoint from a since at or before it", async () => {
      const checkpoints = createInMemoryCheckpointStore({
        checkpoints: [_checkpoint("a", 5)],
      });

      await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 6)]])],
          recorder: _recorder(),
          stores: _stores(createInMemoryListingsStore(), checkpoints),
        }),
        { mode: "full", since: _at(5) },
      );

      expect(_checkpointValues(checkpoints)).toEqual([["a", _at(6)]]);
    });

    it("never moves the checkpoint backward", async () => {
      const checkpoints = createInMemoryCheckpointStore({
        checkpoints: [_checkpoint("a", 10)],
      });

      await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 2), _connection("c2", 3)]])],
          recorder: _recorder(),
          stores: _stores(createInMemoryListingsStore(), checkpoints),
        }),
        { mode: "full", since: _at(1) },
      );

      expect([_checkpointValues(checkpoints), checkpoints.getWriteCount()]).toEqual(
        [[["a", _at(10)]], 0],
      );
    });

    it("advances the checkpoint in a full run from the start", async () => {
      const checkpoints = createInMemoryCheckpointStore();

      await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 1)]])],
          recorder: _recorder(),
          stores: _stores(createInMemoryListingsStore(), checkpoints),
        }),
      );

      expect(_checkpointValues(checkpoints)).toEqual([["a", _at(1)]]);
    });

    it("writes no checkpoint for a pipeline without incremental config", async () => {
      const checkpoints = createInMemoryCheckpointStore();

      await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 1)]])],
          recorder: _recorder(),
          stores: _stores(createInMemoryListingsStore(), checkpoints),
          isIncremental: false,
        }),
      );

      expect(checkpoints.getWriteCount()).toBe(0);
    });

    it("fails a drive whose checkpoint cannot be written and keeps its rows", async () => {
      const listings = createInMemoryListingsStore();
      const failingCheckpoints: CheckpointStore = {
        read: async () => {
          return undefined;
        },
        write: async () => {
          throw new Error("checkpoint write failed");
        },
      };

      const error = await _runFailure(
        _config({
          drives: [_drive("a", [[_connection("c1", 1)]])],
          recorder: _recorder(),
          stores: _stores(listings, failingCheckpoints),
        }),
      );

      expect([error.report.drives[0]?.error, _datasetIds(listings)]).toEqual([
        "checkpoint write failed",
        ["c1"],
      ]);
    });
  });
```

And in `describe("configuration", ...)`, add:

```ts
    it("rejects an incremental pipeline with no checkpoint store before listing drives", async () => {
      const recorder = _recorder();

      const run = _run(
        _config({
          drives: [_drive("a", [[]])],
          recorder,
          stores: { listings: createInMemoryListingsStore(), objects: undefined },
        }),
      );

      await expect(run).rejects.toThrow("needs somewhere to keep its checkpoints");
      expect(recorder.events).toEqual([]);
    });
```

- [ ] **Step 4: Watch them fail**

```bash
pnpm --filter @avandar/etl exec vitest run src/EtlEngine/createEtlEngine
```

Expected: the checkpoint tests and the rewritten window tests fail (the
engine still reads the derived mark and writes no checkpoint).

- [ ] **Step 5: Update the types**

In `EtlEngine/EtlEngine.types.ts`:

1. Import `CheckpointStore` alongside `ListingsStore` and `ObjectStore`.
2. In `RelationDescription`, replace the `sourceUpdatedAt` doc comment with:

   ```ts
   /** The connection's source modification time, written to `date_of_last_update`. */
   ```

3. In `EtlOutput`, after `relationColumnsTable: string;` add:

   ```ts
   /**
    * The checkpoints table. Required when the config has `incremental`,
    * because incremental crawls resume from it.
    */
   checkpointsTable?: string;
   ```

4. In `EtlStores`, after `objects`, add:

   ```ts
   /** Required when the config has `incremental`. */
   checkpoints?: CheckpointStore;
   ```

5. In `EtlIncrementalConfig`, delete `readHighWaterMark` and its doc comment.
6. In `EtlEngineInstance.run`'s JSDoc, add after the credentials line:

   ```ts
   * @throws Before listing drives, when the config has `incremental` and
   * there is no checkpoint store.
   ```

- [ ] **Step 6: Remove the derived mark from the stores**

1. In `stores/EtlStores.types.ts`, delete `readHighWaterMark` from
   `ListingsStore`.
2. In `stores/InMemoryListingsStore/createInMemoryListingsStore.ts`, delete
   `_readHighWaterMark` and the `readHighWaterMark` method.
3. In `stores/SupabaseListingsStore/createSupabaseListingsStore.ts`, delete
   `_readHighWaterMark` and the `readHighWaterMark` method.
4. In `createInMemoryListingsStore.test.ts`, delete the tests
   `"reads the newest date_of_last_update for one pipeline and drive"`,
   `"ignores a date_of_last_update later than now"`,
   `"has no high-water mark for a drive with no dated rows"`,
   `"ignores a stored row whose date does not parse"`, and
   `"has no high-water mark when no stored date parses"`.
5. In `createSupabaseListingsStore.supabase.test.ts`, delete
   `"reads the newest date_of_last_update for one pipeline and drive only"` and
   `"ignores a date_of_last_update later than now"`.

- [ ] **Step 7: Write the crawl's checkpoint helpers**

Create `EtlEngine/crawlCheckpoint/crawlCheckpoint.ts`:

```ts
import {
  getAdvancedCheckpoint,
  isCrawlContiguousWithCheckpoint,
} from "@etl/EtlEngine/checkpointRules/checkpointRules";
import { resolveRunWindow } from "@etl/EtlEngine/resolveRunWindow/resolveRunWindow";
import type {
  EtlPipelineRunId,
  EtlRunOptions,
  EtlRunWindow,
} from "@etl/EtlEngine/EtlEngine.types";
import type {
  CheckpointKey,
  CheckpointStore,
} from "@etl/stores/EtlStores.types";

/**
 * One crawl's checkpoint: where it is stored, its value now, and whether
 * this crawl's pages may move it.
 */
export type CrawlCheckpoint = Readonly<{
  store: CheckpointStore;
  key: CheckpointKey;
  current: Date | undefined;
  canAdvance: boolean;
}>;

/** Where a crawl starts, and the checkpoint it advances. */
export type CrawlStart = Readonly<{
  window: EtlRunWindow;
  /** Undefined when there is no checkpoint store to read. */
  checkpoint: CrawlCheckpoint | undefined;
}>;

/**
 * Reads a crawl's checkpoint and resolves its window from it. With no
 * checkpoint store, as for a pipeline without incremental config, the
 * window is the run's own bounds.
 *
 * @param args.store - Where the checkpoint is kept, if anywhere.
 * @param args.key - The crawl's pipeline, drive, and scope.
 * @param args.options - The run's options.
 * @returns The window and the checkpoint.
 * @throws Whatever reading the checkpoint throws.
 */
export async function readCrawlStart(args: {
  store: CheckpointStore | undefined;
  key: CheckpointKey;
  options: EtlRunOptions;
}): Promise<CrawlStart> {
  const { store, options } = args;
  if (store === undefined) {
    return {
      window: resolveRunWindow({ options, highWaterMark: undefined }),
      checkpoint: undefined,
    };
  }
  const stored = await store.read(args.key);
  const window = resolveRunWindow({ options, highWaterMark: stored });
  return {
    window,
    checkpoint: {
      store,
      key: args.key,
      current: stored,
      canAdvance: isCrawlContiguousWithCheckpoint({
        windowSince: window.since,
        storedCheckpoint: stored,
      }),
    },
  };
}

/**
 * Moves a crawl's checkpoint past a page that finished loading, and writes
 * it, when the page's timestamps carry it forward (see
 * `getAdvancedCheckpoint`).
 *
 * @param args.checkpoint - The crawl's checkpoint before the page.
 * @param args.pageTimestamps - The timestamps of the page's connections.
 * @param args.syncedAt - When the run started.
 * @param args.pipelineRunId - Written with the checkpoint.
 * @returns The checkpoint as it now stands.
 * @throws Whatever writing the checkpoint throws.
 */
export async function advanceCrawlCheckpoint(args: {
  checkpoint: CrawlCheckpoint | undefined;
  pageTimestamps: readonly Date[];
  syncedAt: Date;
  pipelineRunId: EtlPipelineRunId;
}): Promise<CrawlCheckpoint | undefined> {
  const { checkpoint } = args;
  if (checkpoint === undefined || !checkpoint.canAdvance) {
    return checkpoint;
  }
  const nextCheckpoint = getAdvancedCheckpoint({
    current: checkpoint.current,
    pageTimestamps: args.pageTimestamps,
    syncedAt: args.syncedAt,
  });
  if (nextCheckpoint === undefined) {
    return checkpoint;
  }
  await checkpoint.store.write({
    ...checkpoint.key,
    highWaterMark: nextCheckpoint,
    pipelineRunId: args.pipelineRunId,
  });
  return { ...checkpoint, current: nextCheckpoint };
}
```

- [ ] **Step 8: Crawl from the checkpoint**

Replace the whole of `EtlEngine/crawlDrive/crawlDrive.ts` with:

```ts
import { promiseMapSequential } from "@avandar/utils";
import {
  advanceCrawlCheckpoint,
  readCrawlStart,
} from "@etl/EtlEngine/crawlCheckpoint/crawlCheckpoint";
import { ETL_DEFAULT_SCOPE } from "@etl/EtlEngine/etlScopes";
import { loadRelationsPage } from "@etl/EtlEngine/loadRelationsPage/loadRelationsPage";
import { resolveRunWindow } from "@etl/EtlEngine/resolveRunWindow/resolveRunWindow";
import { selectPageConnections } from "@etl/EtlEngine/selectPageConnections/selectPageConnections";
import type {
  CrawlCheckpoint,
  CrawlStart,
} from "@etl/EtlEngine/crawlCheckpoint/crawlCheckpoint";
import type {
  EtlDriveReport,
  EtlEngineConfig,
  EtlPipelineRunId,
  EtlRunOptions,
  EtlRunWindow,
  EtlStores,
  Relation,
} from "@etl/EtlEngine/EtlEngine.types";
import type { LoadRelationsPageContext } from "@etl/EtlEngine/loadRelationsPage/loadRelationsPage";
import type { ConnectionSelectionState } from "@etl/EtlEngine/selectPageConnections/selectPageConnections";

/** What one drive's crawl needs. */
export type CrawlDriveArgs<TDrive, TConnection> = Readonly<{
  config: EtlEngineConfig<TDrive, TConnection>;
  drive: TDrive;
  /** The drive's position in `listDrives` order. */
  driveIndex: number;
  options: EtlRunOptions;
  pipelineRunId: EtlPipelineRunId;
  stores: EtlStores;
  /**
   * How many more connections the run's limit allows. At 0 or below the
   * drive is skipped.
   */
  remaining: number;
  syncedAt: Date;
}>;

/** One drive's report, plus what the drive threw when it failed. */
export type CrawlDriveResult = Readonly<{
  report: EtlDriveReport;
  /**
   * What the drive threw, kept whole so its class and stack survive. Only
   * meaningful when `report.status` is `failed`.
   */
  error?: unknown;
}>;

type _DriveArgs<TDrive, TConnection> = CrawlDriveArgs<TDrive, TConnection> &
  Readonly<{ driveKey: string }>;

type _PagesArgs<TDrive, TConnection> = _DriveArgs<TDrive, TConnection> &
  CrawlStart;

type _DriveCounts = Readonly<{
  connectionsFetched: number;
  relationsWritten: number;
  relationsUnchanged: number;
  newestTimestamp: Date | undefined;
}>;

type _DriveProgress = _DriveCounts &
  Readonly<{
    selection: ConnectionSelectionState;
    checkpoint: CrawlCheckpoint | undefined;
  }>;

/**
 * How a drive's crawl ended. A failure is its own variant, so a drive that
 * throws `undefined` is still failed.
 */
type _DriveOutcome =
  | Readonly<{ status: "ok" | "skipped" }>
  | Readonly<{ status: "failed"; error: unknown }>;

type _DriveResultArgs = Readonly<{
  driveKey: string;
  window: EtlRunWindow;
  counts: _DriveCounts;
  outcome: _DriveOutcome;
}>;

const NO_DRIVE_COUNTS: _DriveCounts = {
  connectionsFetched: 0,
  relationsWritten: 0,
  relationsUnchanged: 0,
  newestTimestamp: undefined,
};

function _createProgress(args: {
  remaining: number;
  checkpoint: CrawlCheckpoint | undefined;
}): _DriveProgress {
  return {
    ...NO_DRIVE_COUNTS,
    selection: {
      seenIds: new Set(),
      lastTimestamp: undefined,
      remaining: args.remaining,
    },
    checkpoint: args.checkpoint,
  };
}

function _buildDriveResult(args: _DriveResultArgs): CrawlDriveResult {
  const { counts, outcome } = args;
  const base = {
    driveKey: args.driveKey,
    window: args.window,
    connectionsFetched: counts.connectionsFetched,
    relationsWritten: counts.relationsWritten,
    relationsUnchanged: counts.relationsUnchanged,
    newestTimestamp: counts.newestTimestamp,
  };
  if (outcome.status !== "failed") {
    return { report: { ...base, status: outcome.status } };
  }
  const { error } = outcome;
  return {
    report: {
      ...base,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    },
    error,
  };
}

/** The result for a drive that never got as far as fetching a page. */
function _buildUncrawledDriveResult(args: {
  driveKey: string;
  options: EtlRunOptions;
  outcome: _DriveOutcome;
}): CrawlDriveResult {
  return _buildDriveResult({
    driveKey: args.driveKey,
    // With no checkpoint read, the window is the run's own bounds.
    window: resolveRunWindow({
      options: args.options,
      highWaterMark: undefined,
    }),
    counts: NO_DRIVE_COUNTS,
    outcome: args.outcome,
  });
}

/**
 * Reads the drive's checkpoint, and its window from it. Only a pipeline with
 * incremental config keeps checkpoints.
 */
function _readDriveStart<TDrive, TConnection>(
  args: _DriveArgs<TDrive, TConnection>,
): Promise<CrawlStart> {
  const { config } = args;
  return readCrawlStart({
    store:
      config.incremental === undefined ? undefined : args.stores.checkpoints,
    key: {
      pipelineName: config.name,
      driveKey: args.driveKey,
      scopeKey: ETL_DEFAULT_SCOPE.key,
    },
    options: args.options,
  });
}

/**
 * Throws when a relation's `sourceUpdatedAt` is later than its connection's
 * timestamp. The two should come from one source date, and a later relation
 * date would write a `date_of_last_update` beyond what the crawl's checkpoint
 * has reached.
 */
function _assertRelationsNotNewer<TDrive, TConnection>(args: {
  pagesArgs: _PagesArgs<TDrive, TConnection>;
  connection: TConnection;
  relations: readonly Relation[];
}): void {
  const { config, driveKey } = args.pagesArgs;
  const getConnectionTimestamp = config.incremental?.getConnectionTimestamp;
  if (getConnectionTimestamp === undefined) {
    return;
  }
  const connectionTime = getConnectionTimestamp(args.connection);
  const newerUpdate = args.relations
    .map((relation) => {
      return relation.sourceUpdatedAt;
    })
    .find((updatedAt) => {
      return (
        updatedAt !== undefined &&
        updatedAt.getTime() > connectionTime.getTime()
      );
    });
  if (newerUpdate !== undefined) {
    throw new Error(
      `Drive ${driveKey} returned ${config.getConnectionId(args.connection)} with a relation updated at ${newerUpdate.toISOString()}, later than the connection's timestamp ${connectionTime.toISOString()}. A relation's sourceUpdatedAt must not be later than its connection's timestamp.`,
    );
  }
}

async function _transformConnections<TDrive, TConnection>(
  args: _PagesArgs<TDrive, TConnection> &
    Readonly<{ connections: readonly TConnection[] }>,
): Promise<Relation[]> {
  const { config } = args;
  const relationsByConnection = await promiseMapSequential(
    args.connections,
    async (connection) => {
      const relations = await config.transform({
        drive: args.drive,
        connection,
        pipelineRunId: args.pipelineRunId,
      });
      _assertRelationsNotNewer({ pagesArgs: args, connection, relations });
      return relations;
    },
  );
  return relationsByConnection.flat();
}

function _buildLoadContext<TDrive, TConnection>(
  args: _PagesArgs<TDrive, TConnection>,
): LoadRelationsPageContext {
  return {
    pipelineName: args.config.name,
    pipelineRunId: args.pipelineRunId,
    service: args.config.service,
    driveKey: args.driveKey,
    scopeKey: ETL_DEFAULT_SCOPE.key,
    syncedAt: args.syncedAt,
    stores: args.stores,
    bucket: args.config.output.bucket,
  };
}

async function _processPage<TDrive, TConnection>(
  args: _PagesArgs<TDrive, TConnection> &
    Readonly<{ page: readonly TConnection[]; progress: _DriveProgress }>,
): Promise<_DriveProgress> {
  const { config, progress } = args;
  const getConnectionTimestamp = config.incremental?.getConnectionTimestamp;
  const { connections, state } = selectPageConnections({
    page: args.page,
    driveKey: args.driveKey,
    window: args.window,
    state: progress.selection,
    getConnectionId: config.getConnectionId,
    getConnectionTimestamp,
  });
  const loaded = await loadRelationsPage({
    relations: await _transformConnections({ ...args, connections }),
    context: _buildLoadContext(args),
  });
  const pageTimestamps =
    getConnectionTimestamp === undefined
      ? []
      : connections.map(getConnectionTimestamp);
  return {
    connectionsFetched: progress.connectionsFetched + connections.length,
    relationsWritten: progress.relationsWritten + loaded.written,
    relationsUnchanged: progress.relationsUnchanged + loaded.unchanged,
    newestTimestamp: pageTimestamps.at(-1) ?? progress.newestTimestamp,
    selection: state,
    // The page is loaded, so the checkpoint may move past it.
    checkpoint: await advanceCrawlCheckpoint({
      checkpoint: progress.checkpoint,
      pageTimestamps,
      syncedAt: args.syncedAt,
      pipelineRunId: args.pipelineRunId,
    }),
  };
}

async function _crawlPages<TDrive, TConnection>(
  args: _PagesArgs<TDrive, TConnection>,
): Promise<Readonly<{ progress: _DriveProgress; outcome: _DriveOutcome }>> {
  let progress = _createProgress({
    remaining: args.remaining,
    checkpoint: args.checkpoint,
  });
  try {
    const pages = args.config.extract({
      drive: args.drive,
      window: args.window,
      pipelineRunId: args.pipelineRunId,
    });
    // Sequential on purpose: each page is written, and the checkpoint moved
    // past it, before the next is fetched, so the listings table always
    // holds an oldest-first prefix of the drive up to the checkpoint. That
    // is what makes the checkpoint safe to resume from.
    for await (const page of pages) {
      progress = await _processPage({ ...args, page, progress });
      if (progress.selection.remaining <= 0) {
        break;
      }
    }
    return { progress, outcome: { status: "ok" } };
  } catch (error: unknown) {
    return { progress, outcome: { status: "failed", error } };
  }
}

function _readDriveKey<TDrive, TConnection>(
  args: CrawlDriveArgs<TDrive, TConnection>,
): Readonly<{ driveKey: string }> | Readonly<{ error: unknown }> {
  try {
    return { driveKey: args.config.getDriveKey(args.drive) };
  } catch (error: unknown) {
    return { error };
  }
}

async function _crawlKeyedDrive<TDrive, TConnection>(
  args: _DriveArgs<TDrive, TConnection>,
): Promise<CrawlDriveResult> {
  const { driveKey, options } = args;
  if (args.remaining <= 0) {
    return _buildUncrawledDriveResult({
      driveKey,
      options,
      outcome: { status: "skipped" },
    });
  }
  try {
    const start = await _readDriveStart(args);
    const { progress, outcome } = await _crawlPages({ ...args, ...start });
    return _buildDriveResult({
      driveKey,
      window: start.window,
      counts: progress,
      outcome,
    });
  } catch (error: unknown) {
    // _crawlPages reports its own failures, so only reading the checkpoint
    // lands here.
    return _buildUncrawledDriveResult({
      driveKey,
      options,
      outcome: { status: "failed", error },
    });
  }
}

/**
 * Crawls one drive: reads its key, checkpoint, and window, then fetches,
 * transforms, and loads one page at a time until the source runs out or
 * the run's limit is reached, moving the checkpoint past each loaded page.
 * A drive with no limit left is skipped without a request. A failure never
 * escapes: the drive is reported `failed` with the counts of what it wrote
 * before the failure, and the result keeps what it threw. A drive whose key
 * cannot be read is reported as `listDrives[<index>]`.
 *
 * @returns The drive's report and, when it failed, its error.
 */
export async function crawlDrive<TDrive, TConnection>(
  args: CrawlDriveArgs<TDrive, TConnection>,
): Promise<CrawlDriveResult> {
  const keyRead = _readDriveKey(args);
  if (!("driveKey" in keyRead)) {
    return _buildUncrawledDriveResult({
      driveKey: `listDrives[${args.driveIndex}]`,
      options: args.options,
      outcome: { status: "failed", error: keyRead.error },
    });
  }
  return _crawlKeyedDrive({ ...args, driveKey: keyRead.driveKey });
}
```

- [ ] **Step 9: Require a checkpoint store and create the Supabase one**

In `EtlEngine/createEtlEngine/createEtlEngine.ts`:

1. Import `createSupabaseCheckpointStore` from
   `@etl/stores/SupabaseCheckpointStore/createSupabaseCheckpointStore`.
2. In `_createSupabaseStores`'s returned object, after `objects`, add:

   ```ts
   checkpoints:
     output.checkpointsTable === undefined
       ? undefined
       : createSupabaseCheckpointStore({
           client,
           checkpointsTable: output.checkpointsTable,
         }),
   ```

3. Add above `createEtlEngine`:

   ```ts
   /**
    * The stores a run writes through: the config's own, or Supabase-backed
    * ones.
    *
    * @throws When the config has `incremental` and there is no checkpoint
    * store to resume from.
    */
   function _resolveStores<TDrive, TConnection>(
     config: EtlEngineConfig<TDrive, TConnection>,
   ): EtlStores {
     const stores = config.stores ?? _createSupabaseStores(config);
     if (config.incremental !== undefined && stores.checkpoints === undefined) {
       throw new Error(
         `The ${config.name} pipeline supports incremental runs, so EtlEngine needs somewhere to keep its checkpoints: set output.checkpointsTable, or stores.checkpoints in tests.`,
       );
     }
     return stores;
   }
   ```

4. In `run`, replace
   `const stores = config.stores ?? _createSupabaseStores(config);` with
   `const stores = _resolveStores(config);`.

- [ ] **Step 10: Run the package tests**

```bash
pnpm --filter @avandar/etl exec vitest run
pnpm --filter @avandar/etl type-check
```

Expected: every test passes, including the 10 new checkpoint tests.

- [ ] **Step 11: Give the pipelines a checkpoints table and store**

In `apps/pipeline-server/pipelines/shared/getPipelineEtlDestination/getPipelineEtlDestination.ts`,
add `checkpointsTable: "pipeline_scope_checkpoints",` after
`relationColumnsTable: ...,`, and change "the Open Data Catalog's two tables"
in the JSDoc to "the Open Data Catalog's two tables, the pipeline checkpoints
table". In its test, add:

```ts
  it("keeps checkpoints in pipeline_scope_checkpoints", () => {
    expect(getPipelineEtlDestination().output.checkpointsTable).toBe(
      "pipeline_scope_checkpoints",
    );
  });
```

In `apps/pipeline-server/pipelines/hdx/createHdxEtlEngine/createHdxEtlEngine.test.ts`,
import `createInMemoryCheckpointStore` from `@avandar/etl`, and in each of
the three tests change `stores: { listings, objects: undefined }` (or the
`stores:` object in the last test) to include
`checkpoints: createInMemoryCheckpointStore()`. In the incremental test the
`engineArgs` object is shared by both runs, so they share the checkpoint
store. Rename that test to
`"asks an incremental run for datasets modified since its checkpoint"`.

In `apps/pipeline-server/pipelines/socrata/createSocrataEtlEngine/createSocrataEtlEngine.test.ts`,
import `createInMemoryCheckpointStore` and the `EtlStores` type from
`@avandar/etl`, change `_engine` to take `stores: EtlStores` instead of
`listings`, passing `stores` through, and in each test build:

```ts
    const listings = createInMemoryListingsStore();
    const stores = {
      listings,
      objects: undefined,
      checkpoints: createInMemoryCheckpointStore(),
    };
```

then call `_engine(stores, ...)`. Remove the now-unused
`InMemoryListingsStore` type import. Rename
`"continues an incremental run from the newest stored dataset"` to
`"continues an incremental run from its checkpoint"`.

- [ ] **Step 12: Run everything that depends on the engine**

```bash
pnpm --filter @avandar/etl build
pnpm --filter @avandar/pipeline-server exec vitest run -c vitest.config.ts
pnpm exec tsc --noEmit -p tsconfig.node.json
ava supabase status
pnpm --filter @avandar/etl test:supabase
pnpm exec eslint packages/node/etl/src apps/pipeline-server/pipelines
```

Expected: all pass.

- [ ] **Step 13: Commit**

```bash
git add packages/node/etl/src \
  apps/pipeline-server/pipelines/shared/getPipelineEtlDestination \
  apps/pipeline-server/pipelines/hdx/createHdxEtlEngine/createHdxEtlEngine.test.ts \
  apps/pipeline-server/pipelines/socrata/createSocrataEtlEngine/createSocrataEtlEngine.test.ts
git commit -m "feat(etl): resume incremental crawls from stored checkpoints

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Crawl each scope of each drive

Covers S1 to S3, S9, and S11 to S15.

**Files:**
- Modify: `EtlEngine/EtlEngine.types.ts`, `EtlEngine/etlScopes.ts`
- Create: `EtlEngine/resolveDriveScopes/resolveDriveScopes.ts`
- Create: `EtlEngine/selectRequestedScopes/selectRequestedScopes.ts`
- Create: `EtlEngine/crawlScope/crawlScope.ts` (replacing `EtlEngine/crawlDrive/`)
- Replace: `EtlEngine/createEtlEngine/createEtlEngine.ts`
- Modify: `EtlEngine/EtlRunFailedError.ts`, `index.ts`
- Modify: `EtlEngine/createEtlEngine/createEtlEngine.test.ts`
- Modify: pipeline-server tests and comments that name `drives` in a report

- [ ] **Step 1: Make the test fakes scope-aware**

In `EtlEngine/createEtlEngine/createEtlEngine.test.ts`:

1. Import `EtlScope` with the other `EtlEngine.types` types, and
   `EtlRunOptionsError` is already imported.
2. Change the fake types to:

   ```ts
   type FakeDrive = Readonly<{
     key: string;
     pages: readonly FakePage[];
     failAtPage?: number;
     /** Pages for one scope, in place of `pages`. */
     pagesByScope?: Readonly<Record<string, readonly FakePage[]>>;
   }>;
   type Recorder = {
     events: string[];
     windows: Map<string, EtlRunWindow>;
     /** Each crawl's window, keyed `<drive>/<scope>`. */
     scopeWindows: Map<string, EtlRunWindow>;
     /** The id of each connection passed to `transform`, in call order. */
     transforms: string[];
     /** `<scope>:<connection id>` for each `transform` call, in order. */
     scopedTransforms: string[];
   };
   type FakeConfig = EtlEngineConfig<FakeDrive, FakeConnection, EtlScope>;
   ```

3. Change `_recorder` to return all five fields
   (`scopeWindows: new Map()`, `scopedTransforms: []`).
4. Replace `_yieldPages` with:

   ```ts
   /** A crawl's name in events: the drive key, plus `/<scope>` unless `all`. */
   function _crawlLabel(drive: FakeDrive, scope: EtlScope): string {
     return scope.key === "all" ? drive.key : `${drive.key}/${scope.key}`;
   }

   async function* _yieldPages(args: {
     label: string;
     pages: readonly FakePage[];
     failAtPage: number | undefined;
     recorder: Recorder;
   }): AsyncGenerator<FakePage> {
     try {
       // Sequential on purpose: the fake pages like a real source, one at a
       // time.
       for (const [index, page] of args.pages.entries()) {
         if (args.failAtPage === index) {
           throw new Error(`${args.label} failed`);
         }
         args.recorder.events.push(`${args.label}:page${index}`);
         yield page;
       }
     } finally {
       args.recorder.events.push(`${args.label}:closed`);
     }
   }
   ```

5. In `_config`, add an optional `listScopes?: FakeConfig["listScopes"];`
   argument, spread `...(args.listScopes === undefined ? {} : { listScopes: args.listScopes }),`
   into the returned config, and replace `extract` and `transform` with:

   ```ts
       extract: ({ drive, scope, window }) => {
         const label = _crawlLabel(drive, scope);
         args.recorder.windows.set(drive.key, window);
         args.recorder.scopeWindows.set(`${drive.key}/${scope.key}`, window);
         return _yieldPages({
           label,
           pages: drive.pagesByScope?.[scope.key] ?? drive.pages,
           failAtPage: drive.failAtPage,
           recorder: args.recorder,
         });
       },
       getConnectionId: (connection) => {
         return connection.id;
       },
       transform: (transformArgs) => {
         const { connection, scope } = transformArgs;
         args.recorder.transforms.push(connection.id);
         args.recorder.scopedTransforms.push(`${scope.key}:${connection.id}`);
         return args.transform === undefined
           ? _relationsFor(connection)
           : args.transform(transformArgs);
       },
   ```

6. Replace `_statusesOf` with these two helpers:

   ```ts
   function _statusesOf(
     report: EtlRunReport,
   ): Array<[string, string, string | undefined]> {
     return report.crawls.map((crawl) => {
       return [crawl.driveKey, crawl.status, crawl.error];
     });
   }

   function _crawlsOf(report: EtlRunReport): Array<[string, string, string]> {
     return report.crawls.map((crawl) => {
       return [crawl.driveKey, crawl.scopeKey, crawl.status];
     });
   }
   ```

7. Everywhere else in the file, rename the report's `drives` to `crawls`:
   `report.drives` becomes `report.crawls`, `.report.drives` becomes
   `.report.crawls`, and in the two `report.drives.map((drive) => ...)`
   callbacks rename `drive` to `crawl`.
8. In `"reports each drive's window, counts, and newest timestamp"`, change
   the expected `drives: [{ driveKey: "a", ...` to
   `crawls: [{ driveKey: "a", scopeKey: "all", ...`.
9. In `"rejects naming every drive's error when every drive fails"`, change
   the expected message to `"a [all]: a failed; b [all]: b failed"`.

- [ ] **Step 2: Write the failing scope tests**

Add, inside `describe("createEtlEngine", ...)`, after `describe("checkpoints", ...)`:

```ts
  describe("scopes", () => {
    const INVALID_SCOPE_LISTS: ReadonlyArray<
      [string, () => readonly EtlScope[], string]
    > = [
      [
        "an invalid key",
        () => {
          return [{ key: "Not Valid" }];
        },
        "is not valid",
      ],
      [
        "a repeated key",
        () => {
          return [{ key: "x" }, { key: "x" }];
        },
        "more than once",
      ],
      [
        "no scopes",
        () => {
          return [];
        },
        "declares no scopes",
      ],
      [
        "a throwing listScopes",
        () => {
          throw new Error("no scopes for a");
        },
        "no scopes for a",
      ],
    ];

    function _twoScopes(): readonly EtlScope[] {
      return [{ key: "x" }, { key: "y" }];
    }

    it("crawls a drive with no listScopes once, as scope all, and keys its rows all", async () => {
      const listings = createInMemoryListingsStore();

      const report = await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 1)]])],
          recorder: _recorder(),
          stores: _stores(listings),
        }),
      );

      expect([
        _crawlsOf(report),
        listings.getRows().map((row) => {
          return row.pipeline_scope_keys;
        }),
      ]).toEqual([[["a", "all", "ok"]], [["all"]]]);
    });

    it("crawls each scope of a drive in order, passing the scope to extract and transform", async () => {
      const recorder = _recorder();

      const report = await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 1)]])],
          recorder,
          stores: _stores(),
          listScopes: _twoScopes,
        }),
      );

      expect([recorder.events, recorder.scopedTransforms, _crawlsOf(report)]).toEqual(
        [
          ["listDrives", "a/x:page0", "a/x:closed", "a/y:page0", "a/y:closed"],
          ["x:c1", "y:c1"],
          [
            ["a", "x", "ok"],
            ["a", "y", "ok"],
          ],
        ],
      );
    });

    it("starts each scope of an incremental run at its own checkpoint", async () => {
      const recorder = _recorder();
      const checkpoints = createInMemoryCheckpointStore({
        checkpoints: [{ ..._checkpoint("a", 10), scopeKey: "x" }],
      });

      await _run(
        _config({
          drives: [_drive("a", [[]])],
          recorder,
          stores: _stores(createInMemoryListingsStore(), checkpoints),
          listScopes: _twoScopes,
        }),
        { mode: "incremental" },
      );

      expect([
        recorder.scopeWindows.get("a/x")?.since,
        recorder.scopeWindows.get("a/y")?.since,
      ]).toEqual([_at(10), undefined]);
    });

    it("keeps one checkpoint per scope", async () => {
      const checkpoints = createInMemoryCheckpointStore();

      await _run(
        _config({
          drives: [
            {
              key: "a",
              pages: [],
              pagesByScope: {
                x: [[_connection("c1", 1)]],
                y: [[_connection("c1", 1), _connection("c2", 2)]],
              },
            },
          ],
          recorder: _recorder(),
          stores: _stores(createInMemoryListingsStore(), checkpoints),
          listScopes: _twoScopes,
        }),
      );

      expect(
        checkpoints.getCheckpoints().map((checkpoint) => {
          return [checkpoint.scopeKey, checkpoint.highWaterMark];
        }),
      ).toEqual([
        ["x", _at(1)],
        ["y", _at(2)],
      ]);
    });

    it("records both scopes on a relation two scopes produce, and leaves it unchanged on a rerun", async () => {
      const listings = createInMemoryListingsStore();
      const config = _config({
        drives: [_drive("a", [[_connection("c1", 1)]])],
        recorder: _recorder(),
        stores: _stores(listings),
        listScopes: _twoScopes,
      });

      const first = await _run(config);
      const second = await _run(config);

      const written = (report: EtlRunReport) => {
        return report.crawls.map((crawl) => {
          return crawl.relationsWritten;
        });
      };
      expect([
        written(first),
        written(second),
        listings.getRows().map((row) => {
          return row.pipeline_scope_keys;
        }),
      ]).toEqual([[1, 1], [0, 0], [["x", "y"]]]);
    });

    it.each(INVALID_SCOPE_LISTS)(
      "fails a drive with %s under scope listScopes and still crawls the next",
      async (_name, scopesForA, message) => {
        const report = await _run(
          _config({
            drives: [
              _drive("a", [[_connection("a1", 1)]]),
              _drive("b", [[_connection("b1", 1)]]),
            ],
            recorder: _recorder(),
            stores: _stores(),
            listScopes: (drive) => {
              return drive.key === "a" ? scopesForA() : [{ key: "all" }];
            },
          }),
        );

        expect([_crawlsOf(report), report.crawls[0]?.error]).toEqual([
          [
            ["a", "listScopes", "failed"],
            ["b", "all", "ok"],
          ],
          expect.stringContaining(message),
        ]);
      },
    );

    it("reports a drive whose key cannot be read under scope listScopes", async () => {
      const report = await _run(
        _config({
          drives: [_drive("a", [[]]), _drive("b", [[]])],
          recorder: _recorder(),
          stores: _stores(),
          getDriveKey: (drive) => {
            if (drive.key === "a") {
              throw new Error("no key for a");
            }
            return drive.key;
          },
        }),
      );

      expect(_crawlsOf(report)[0]).toEqual([
        "listDrives[0]",
        "listScopes",
        "failed",
      ]);
    });

    it("crawls only the scopes a run names", async () => {
      const report = await _run(
        _config({
          drives: [_drive("a", [[]]), _drive("b", [[]])],
          recorder: _recorder(),
          stores: _stores(),
          listScopes: (drive) => {
            return drive.key === "a" ? _twoScopes() : [{ key: "z" }];
          },
        }),
        { mode: "full", scopes: ["y"] },
      );

      expect(_crawlsOf(report)).toEqual([["a", "y", "ok"]]);
    });

    it("rejects a scope no drive declares before any extract", async () => {
      const recorder = _recorder();

      const run = _run(
        _config({
          drives: [_drive("a", [[]])],
          recorder,
          stores: _stores(),
          listScopes: _twoScopes,
        }),
        { mode: "full", scopes: ["nope"] },
      );

      await expect(run).rejects.toThrow(EtlRunOptionsError);
      await expect(run).rejects.toThrow("has no scope nope");
      expect(recorder.events).toEqual(["listDrives"]);
    });

    it.each([[[] as string[]], [["Not Valid"]]])(
      "rejects the scopes %j before listing drives",
      async (scopes) => {
        const recorder = _recorder();

        const run = _run(
          _config({ drives: [_drive("a", [[]])], recorder, stores: _stores() }),
          { mode: "full", scopes },
        );

        await expect(run).rejects.toThrow(EtlRunOptionsError);
        expect(recorder.events).toEqual([]);
      },
    );

    it("counts the limit across scopes", async () => {
      const report = await _run(
        _config({
          drives: [
            _drive("a", [
              [
                _connection("c1", 1),
                _connection("c2", 2),
                _connection("c3", 3),
              ],
            ]),
          ],
          recorder: _recorder(),
          stores: _stores(),
          listScopes: _twoScopes,
        }),
        { mode: "full", limit: 4 },
      );

      expect(
        report.crawls.map((crawl) => {
          return crawl.connectionsFetched;
        }),
      ).toEqual([3, 1]);
    });

    it("lists each drive's live scopes without crawling", async () => {
      const recorder = _recorder();

      const scopes = await createEtlEngine(
        _config({
          drives: [_drive("a", [[]]), _drive("b", [[]])],
          recorder,
          stores: _stores(),
          listScopes: (drive) => {
            return drive.key === "a" ? _twoScopes() : [{ key: "all" }];
          },
        }),
      ).listScopes();

      expect([scopes, recorder.events]).toEqual([
        [
          { driveKey: "a", scopeKeys: ["x", "y"] },
          { driveKey: "b", scopeKeys: ["all"] },
        ],
        ["listDrives"],
      ]);
    });

    it("refuses to list scopes when a drive's scopes are invalid", async () => {
      await expect(
        createEtlEngine(
          _config({
            drives: [_drive("a", [[]])],
            recorder: _recorder(),
            stores: _stores(),
            listScopes: () => {
              return [];
            },
          }),
        ).listScopes(),
      ).rejects.toThrow("could not list the scopes of drive a");
    });

    it("lists the default scope without Supabase credentials", async () => {
      const scopes = await createEtlEngine(
        _config({
          drives: [_drive("a", [[]])],
          recorder: _recorder(),
          supabase: { url: undefined, serviceRoleKey: undefined },
        }),
      ).listScopes();

      expect(scopes).toEqual([{ driveKey: "a", scopeKeys: ["all"] }]);
    });

    it("rejects with every crawl's report when every crawl fails", async () => {
      const error = await _runFailure(
        _config({
          drives: [_drive("a", [[]], 0)],
          recorder: _recorder(),
          stores: _stores(),
          listScopes: _twoScopes,
        }),
      );

      expect([_crawlsOf(error.report), error.message]).toEqual([
        [
          ["a", "x", "failed"],
          ["a", "y", "failed"],
        ],
        "Every crawl failed. a [x]: a/x failed; a [y]: a/y failed",
      ]);
    });
  });
```

- [ ] **Step 3: Watch them fail**

```bash
pnpm --filter @avandar/etl exec vitest run src/EtlEngine/createEtlEngine
```

Expected: FAIL on types and on every scope test (no `listScopes`, no
`crawls`).

- [ ] **Step 4: Update the public types**

In `EtlEngine/EtlEngine.types.ts`:

1. In `EtlRunOptions`, after `limit`, add:

   ```ts
   /** Crawl only these scope keys. Omit to crawl every scope. */
   scopes?: readonly string[];
   ```

2. Replace `EtlEngineConfig` with:

   ```ts
   /** Everything one pipeline gives the engine. */
   export type EtlEngineConfig<
     TDrive,
     TConnection,
     TScope extends EtlScope = EtlScope,
   > = EtlDestination &
     Readonly<{
       /** Written to `pipeline_name`. */
       name: string;
       /** Written to `api_service`. Required for `api_resource` relations. */
       service?: string;
       /** Replaces the Supabase-backed stores, for tests. */
       stores?: EtlStores;
       listDrives: () => PromisedOrValue<readonly TDrive[]>;
       /** Written to `api_base_url` on `api_resource` rows. */
       getDriveKey: (drive: TDrive) => string;
       /**
        * The drive's scopes, crawled in this order. Omit for one scope,
        * `all`, which leaves `TScope` at its default, `EtlScope`.
        */
       listScopes?: (drive: TDrive) => PromisedOrValue<readonly TScope[]>;
       /**
        * Pages of one scope's connections, oldest first when `incremental`
        * is set. Narrow to the scope at the source where it can.
        */
       extract: (args: {
         drive: TDrive;
         scope: TScope;
         window: EtlRunWindow;
         pipelineRunId: EtlPipelineRunId;
       }) => AsyncIterable<readonly TConnection[]>;
       /** Identifies a connection, so a repeat within one crawl is dropped. */
       getConnectionId: (connection: TConnection) => string;
       /** Returns only the scope's relations of one connection. */
       transform: (args: {
         drive: TDrive;
         scope: TScope;
         connection: TConnection;
         pipelineRunId: EtlPipelineRunId;
       }) => PromisedOrValue<readonly Relation[]>;
       /** Omit for a pipeline that only supports full runs. */
       incremental?: EtlIncrementalConfig<TDrive, TConnection>;
     }>;
   ```

3. Replace `EtlDriveStatus`, `EtlDriveReport`, and `EtlRunReport` with:

   ```ts
   /** How one crawl ended. `skipped` means the limit was reached first. */
   export type EtlCrawlStatus = "ok" | "failed" | "skipped";

   /**
    * What happened to one scope of one drive during a run. The counts and
    * `newestTimestamp` cover only pages that finished loading: when a crawl
    * fails partway through a page, rows that page already wrote are not
    * counted in `relationsWritten`. A drive that failed before its scopes
    * were known has one entry, with `scopeKey` `listScopes`.
    */
   export type EtlCrawlReport = Readonly<{
     driveKey: string;
     scopeKey: string;
     window: EtlRunWindow;
     connectionsFetched: number;
     relationsWritten: number;
     relationsUnchanged: number;
     newestTimestamp: Date | undefined;
     status: EtlCrawlStatus;
     error?: string;
   }>;

   /** What happened during a run, one entry per crawl in crawl order. */
   export type EtlRunReport = Readonly<{
     pipelineRunId: EtlPipelineRunId;
     mode: EtlRunMode;
     crawls: readonly EtlCrawlReport[];
   }>;

   /** One drive's live scope keys. */
   export type EtlDriveScopes = Readonly<{
     driveKey: string;
     scopeKeys: readonly string[];
   }>;
   ```

4. In `EtlEngineInstance`, change `run`'s doc to say "when at least one crawl
   did not fail", add `@throws EtlRunOptionsError when `scopes` is empty,
   holds an invalid key, or names a scope no drive declares.`, change the last
   line to `@throws EtlRunFailedError when every crawl failed.`, and add after
   `run`:

   ```ts
   /**
    * Lists each drive's live scope keys without crawling or touching any
    * store, so it needs no Supabase credentials.
    *
    * @throws Whatever `listDrives` throws, and when any drive's key or
    * scopes cannot be read or are invalid: a partial list would make live
    * scopes look retired.
    */
   listScopes: () => Promise<readonly EtlDriveScopes[]>;
   ```

In `EtlEngine/etlScopes.ts`, append:

```ts
/**
 * The scope key a run report gives a drive that failed before its scopes
 * were known. `ETL_SCOPE_KEY_PATTERN` allows no uppercase, so no real scope
 * can share it.
 */
export const ETL_UNLISTED_SCOPE_KEY = "listScopes";
```

- [ ] **Step 5: Resolve drives and their scopes**

Create `EtlEngine/resolveDriveScopes/resolveDriveScopes.ts`:

```ts
import { promiseMapSequential } from "@avandar/utils";
import { assertValidScopeKeys } from "@etl/EtlEngine/assertValidScopeKeys/assertValidScopeKeys";
import { ETL_DEFAULT_SCOPE } from "@etl/EtlEngine/etlScopes";
import type {
  EtlEngineConfig,
  EtlScope,
} from "@etl/EtlEngine/EtlEngine.types";

/**
 * One drive with its key and validated scopes, or a drive that could not get
 * that far, with what it threw. `driveKey` is `listDrives[<index>]` when the
 * key itself could not be read.
 */
export type ResolvedDrive<TDrive, TScope extends EtlScope> =
  | Readonly<{
      isResolved: true;
      drive: TDrive;
      driveKey: string;
      scopes: readonly TScope[];
    }>
  | Readonly<{ isResolved: false; driveKey: string; error: unknown }>;

type _ResolveArgs<TDrive, TConnection, TScope extends EtlScope> = Readonly<{
  config: EtlEngineConfig<TDrive, TConnection, TScope>;
  drive: TDrive;
  driveIndex: number;
}>;

function _readDriveKey<TDrive, TConnection, TScope extends EtlScope>(
  args: _ResolveArgs<TDrive, TConnection, TScope>,
): Readonly<{ driveKey: string }> | Readonly<{ error: unknown }> {
  try {
    return { driveKey: args.config.getDriveKey(args.drive) };
  } catch (error: unknown) {
    return { error };
  }
}

async function _listValidScopes<TDrive, TConnection, TScope extends EtlScope>(
  args: _ResolveArgs<TDrive, TConnection, TScope> &
    Readonly<{ driveKey: string }>,
): Promise<readonly TScope[]> {
  const { listScopes } = args.config;
  // A config without listScopes keeps TScope at its default, EtlScope, so
  // the default scope is a TScope.
  const scopes =
    listScopes === undefined
      ? [ETL_DEFAULT_SCOPE as TScope]
      : await listScopes(args.drive);
  assertValidScopeKeys({
    driveKey: args.driveKey,
    scopeKeys: scopes.map((scope) => {
      return scope.key;
    }),
  });
  return scopes;
}

async function _resolveDrive<TDrive, TConnection, TScope extends EtlScope>(
  args: _ResolveArgs<TDrive, TConnection, TScope>,
): Promise<ResolvedDrive<TDrive, TScope>> {
  const keyRead = _readDriveKey(args);
  if (!("driveKey" in keyRead)) {
    return {
      isResolved: false,
      driveKey: `listDrives[${args.driveIndex}]`,
      error: keyRead.error,
    };
  }
  const { driveKey } = keyRead;
  try {
    const scopes = await _listValidScopes({ ...args, driveKey });
    return { isResolved: true, drive: args.drive, driveKey, scopes };
  } catch (error: unknown) {
    return { isResolved: false, driveKey, error };
  }
}

/**
 * Reads every drive's key and scopes, in `listDrives` order. A drive whose
 * key or scopes cannot be read, or whose scope keys are invalid, comes back
 * unresolved with what it threw, so a run can report it and go on.
 *
 * @param args.config - The pipeline.
 * @param args.drives - What `listDrives` returned.
 * @returns One entry per drive, in order.
 */
export async function resolveDriveScopes<
  TDrive,
  TConnection,
  TScope extends EtlScope,
>(args: {
  config: EtlEngineConfig<TDrive, TConnection, TScope>;
  drives: readonly TDrive[];
}): Promise<ReadonlyArray<ResolvedDrive<TDrive, TScope>>> {
  const indexedDrives = args.drives.map((drive, driveIndex) => {
    return { drive, driveIndex };
  });
  return promiseMapSequential(indexedDrives, ({ drive, driveIndex }) => {
    return _resolveDrive({ config: args.config, drive, driveIndex });
  });
}
```

- [ ] **Step 6: Select the scopes a run names**

Create `EtlEngine/selectRequestedScopes/selectRequestedScopes.ts`:

```ts
import { EtlRunOptionsError } from "@etl/EtlEngine/EtlRunOptionsError";
import type { EtlScope } from "@etl/EtlEngine/EtlEngine.types";
import type { ResolvedDrive } from "@etl/EtlEngine/resolveDriveScopes/resolveDriveScopes";

function _listDeclaredKeys<TDrive, TScope extends EtlScope>(
  resolvedDrives: ReadonlyArray<ResolvedDrive<TDrive, TScope>>,
): ReadonlySet<string> {
  return new Set(
    resolvedDrives.flatMap((resolved) => {
      return resolved.isResolved
        ? resolved.scopes.map((scope) => {
            return scope.key;
          })
        : [];
    }),
  );
}

/**
 * Keeps only the scopes a run names, when it names any. A drive that
 * declares none of them is left out. A drive that failed before its scopes
 * were known stays, so the run still reports it.
 *
 * @param args.pipelineName - Named in the error.
 * @param args.resolvedDrives - Every drive, resolved.
 * @param args.requestedScopeKeys - `options.scopes`.
 * @returns The drives to crawl, each with only the named scopes.
 * @throws EtlRunOptionsError when a named scope is declared by no drive whose
 * scopes could be listed.
 */
export function selectRequestedScopes<TDrive, TScope extends EtlScope>(args: {
  pipelineName: string;
  resolvedDrives: ReadonlyArray<ResolvedDrive<TDrive, TScope>>;
  requestedScopeKeys: readonly string[] | undefined;
}): ReadonlyArray<ResolvedDrive<TDrive, TScope>> {
  const { requestedScopeKeys } = args;
  if (requestedScopeKeys === undefined) {
    return args.resolvedDrives;
  }
  const declaredKeys = _listDeclaredKeys(args.resolvedDrives);
  const unknownKeys = requestedScopeKeys.filter((scopeKey) => {
    return !declaredKeys.has(scopeKey);
  });
  if (unknownKeys.length > 0) {
    throw new EtlRunOptionsError(
      `The ${args.pipelineName} pipeline has no scope ${unknownKeys.join(", ")}. Its scopes are ${[...declaredKeys].join(", ") || "none"}.`,
    );
  }
  const requestedKeys = new Set(requestedScopeKeys);
  return args.resolvedDrives.flatMap((resolved) => {
    if (!resolved.isResolved) {
      return [resolved];
    }
    const scopes = resolved.scopes.filter((scope) => {
      return requestedKeys.has(scope.key);
    });
    return scopes.length === 0 ? [] : [{ ...resolved, scopes }];
  });
}
```

- [ ] **Step 7: Turn the drive crawl into a scope crawl**

```bash
git mv packages/node/etl/src/EtlEngine/crawlDrive/crawlDrive.ts \
  packages/node/etl/src/EtlEngine/crawlScope/crawlScope.ts
```

Then replace the whole of `EtlEngine/crawlScope/crawlScope.ts` with:

```ts
import { promiseMapSequential } from "@avandar/utils";
import {
  advanceCrawlCheckpoint,
  readCrawlStart,
} from "@etl/EtlEngine/crawlCheckpoint/crawlCheckpoint";
import { loadRelationsPage } from "@etl/EtlEngine/loadRelationsPage/loadRelationsPage";
import { resolveRunWindow } from "@etl/EtlEngine/resolveRunWindow/resolveRunWindow";
import { selectPageConnections } from "@etl/EtlEngine/selectPageConnections/selectPageConnections";
import type {
  CrawlCheckpoint,
  CrawlStart,
} from "@etl/EtlEngine/crawlCheckpoint/crawlCheckpoint";
import type {
  EtlCrawlReport,
  EtlEngineConfig,
  EtlPipelineRunId,
  EtlRunOptions,
  EtlRunWindow,
  EtlScope,
  EtlStores,
  Relation,
} from "@etl/EtlEngine/EtlEngine.types";
import type { LoadRelationsPageContext } from "@etl/EtlEngine/loadRelationsPage/loadRelationsPage";
import type { ConnectionSelectionState } from "@etl/EtlEngine/selectPageConnections/selectPageConnections";

/** What one scope's crawl needs. */
export type CrawlScopeArgs<TDrive, TConnection, TScope extends EtlScope> =
  Readonly<{
    config: EtlEngineConfig<TDrive, TConnection, TScope>;
    drive: TDrive;
    driveKey: string;
    scope: TScope;
    options: EtlRunOptions;
    pipelineRunId: EtlPipelineRunId;
    stores: EtlStores;
    /**
     * How many more connections the run's limit allows. At 0 or below the
     * crawl is skipped.
     */
    remaining: number;
    syncedAt: Date;
  }>;

/** One crawl's report, plus what the crawl threw when it failed. */
export type CrawlScopeResult = Readonly<{
  report: EtlCrawlReport;
  /**
   * What the crawl threw, kept whole so its class and stack survive. Only
   * meaningful when `report.status` is `failed`.
   */
  error?: unknown;
}>;

/**
 * How a crawl ended. A failure is its own variant, so a crawl that throws
 * `undefined` is still failed.
 */
export type CrawlOutcome =
  | Readonly<{ status: "ok" | "skipped" }>
  | Readonly<{ status: "failed"; error: unknown }>;

type _PagesArgs<TDrive, TConnection, TScope extends EtlScope> = CrawlScopeArgs<
  TDrive,
  TConnection,
  TScope
> &
  CrawlStart;

type _CrawlCounts = Readonly<{
  connectionsFetched: number;
  relationsWritten: number;
  relationsUnchanged: number;
  newestTimestamp: Date | undefined;
}>;

type _CrawlProgress = _CrawlCounts &
  Readonly<{
    selection: ConnectionSelectionState;
    checkpoint: CrawlCheckpoint | undefined;
  }>;

type _CrawlResultArgs = Readonly<{
  driveKey: string;
  scopeKey: string;
  window: EtlRunWindow;
  counts: _CrawlCounts;
  outcome: CrawlOutcome;
}>;

const NO_CRAWL_COUNTS: _CrawlCounts = {
  connectionsFetched: 0,
  relationsWritten: 0,
  relationsUnchanged: 0,
  newestTimestamp: undefined,
};

function _createProgress(args: {
  remaining: number;
  checkpoint: CrawlCheckpoint | undefined;
}): _CrawlProgress {
  return {
    ...NO_CRAWL_COUNTS,
    selection: {
      seenIds: new Set(),
      lastTimestamp: undefined,
      remaining: args.remaining,
    },
    checkpoint: args.checkpoint,
  };
}

function _buildCrawlResult(args: _CrawlResultArgs): CrawlScopeResult {
  const { counts, outcome } = args;
  const base = {
    driveKey: args.driveKey,
    scopeKey: args.scopeKey,
    window: args.window,
    connectionsFetched: counts.connectionsFetched,
    relationsWritten: counts.relationsWritten,
    relationsUnchanged: counts.relationsUnchanged,
    newestTimestamp: counts.newestTimestamp,
  };
  if (outcome.status !== "failed") {
    return { report: { ...base, status: outcome.status } };
  }
  const { error } = outcome;
  return {
    report: {
      ...base,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    },
    error,
  };
}

/**
 * The result for a crawl that never got as far as fetching a page: one
 * skipped for the limit, one whose checkpoint could not be read, or a drive
 * that failed before its scopes were known.
 *
 * @param args.driveKey - The drive, or `listDrives[<index>]`.
 * @param args.scopeKey - The scope, or `ETL_UNLISTED_SCOPE_KEY`.
 * @param args.options - The run's options, for the reported window.
 * @param args.outcome - Skipped, or failed with what was thrown.
 * @returns The result, with zero counts.
 */
export function buildUncrawledCrawlResult(args: {
  driveKey: string;
  scopeKey: string;
  options: EtlRunOptions;
  outcome: CrawlOutcome;
}): CrawlScopeResult {
  return _buildCrawlResult({
    driveKey: args.driveKey,
    scopeKey: args.scopeKey,
    // With no checkpoint read, the window is the run's own bounds.
    window: resolveRunWindow({
      options: args.options,
      highWaterMark: undefined,
    }),
    counts: NO_CRAWL_COUNTS,
    outcome: args.outcome,
  });
}

/**
 * Reads the scope's checkpoint, and its window from it. Only a pipeline with
 * incremental config keeps checkpoints.
 */
function _readScopeStart<TDrive, TConnection, TScope extends EtlScope>(
  args: CrawlScopeArgs<TDrive, TConnection, TScope>,
): Promise<CrawlStart> {
  const { config } = args;
  return readCrawlStart({
    store:
      config.incremental === undefined ? undefined : args.stores.checkpoints,
    key: {
      pipelineName: config.name,
      driveKey: args.driveKey,
      scopeKey: args.scope.key,
    },
    options: args.options,
  });
}

/**
 * Throws when a relation's `sourceUpdatedAt` is later than its connection's
 * timestamp. The two should come from one source date, and a later relation
 * date would write a `date_of_last_update` beyond what the scope's
 * checkpoint has reached.
 */
function _assertRelationsNotNewer<TDrive, TConnection, TScope extends EtlScope>(args: {
  pagesArgs: _PagesArgs<TDrive, TConnection, TScope>;
  connection: TConnection;
  relations: readonly Relation[];
}): void {
  const { config, driveKey } = args.pagesArgs;
  const getConnectionTimestamp = config.incremental?.getConnectionTimestamp;
  if (getConnectionTimestamp === undefined) {
    return;
  }
  const connectionTime = getConnectionTimestamp(args.connection);
  const newerUpdate = args.relations
    .map((relation) => {
      return relation.sourceUpdatedAt;
    })
    .find((updatedAt) => {
      return (
        updatedAt !== undefined &&
        updatedAt.getTime() > connectionTime.getTime()
      );
    });
  if (newerUpdate !== undefined) {
    throw new Error(
      `Drive ${driveKey} returned ${config.getConnectionId(args.connection)} with a relation updated at ${newerUpdate.toISOString()}, later than the connection's timestamp ${connectionTime.toISOString()}. A relation's sourceUpdatedAt must not be later than its connection's timestamp.`,
    );
  }
}

async function _transformConnections<
  TDrive,
  TConnection,
  TScope extends EtlScope,
>(
  args: _PagesArgs<TDrive, TConnection, TScope> &
    Readonly<{ connections: readonly TConnection[] }>,
): Promise<Relation[]> {
  const { config } = args;
  const relationsByConnection = await promiseMapSequential(
    args.connections,
    async (connection) => {
      const relations = await config.transform({
        drive: args.drive,
        scope: args.scope,
        connection,
        pipelineRunId: args.pipelineRunId,
      });
      _assertRelationsNotNewer({ pagesArgs: args, connection, relations });
      return relations;
    },
  );
  return relationsByConnection.flat();
}

function _buildLoadContext<TDrive, TConnection, TScope extends EtlScope>(
  args: _PagesArgs<TDrive, TConnection, TScope>,
): LoadRelationsPageContext {
  return {
    pipelineName: args.config.name,
    pipelineRunId: args.pipelineRunId,
    service: args.config.service,
    driveKey: args.driveKey,
    scopeKey: args.scope.key,
    syncedAt: args.syncedAt,
    stores: args.stores,
    bucket: args.config.output.bucket,
  };
}

async function _processPage<TDrive, TConnection, TScope extends EtlScope>(
  args: _PagesArgs<TDrive, TConnection, TScope> &
    Readonly<{ page: readonly TConnection[]; progress: _CrawlProgress }>,
): Promise<_CrawlProgress> {
  const { config, progress } = args;
  const getConnectionTimestamp = config.incremental?.getConnectionTimestamp;
  const { connections, state } = selectPageConnections({
    page: args.page,
    driveKey: args.driveKey,
    window: args.window,
    state: progress.selection,
    getConnectionId: config.getConnectionId,
    getConnectionTimestamp,
  });
  const loaded = await loadRelationsPage({
    relations: await _transformConnections({ ...args, connections }),
    context: _buildLoadContext(args),
  });
  const pageTimestamps =
    getConnectionTimestamp === undefined
      ? []
      : connections.map(getConnectionTimestamp);
  return {
    connectionsFetched: progress.connectionsFetched + connections.length,
    relationsWritten: progress.relationsWritten + loaded.written,
    relationsUnchanged: progress.relationsUnchanged + loaded.unchanged,
    newestTimestamp: pageTimestamps.at(-1) ?? progress.newestTimestamp,
    selection: state,
    // The page is loaded, so the checkpoint may move past it.
    checkpoint: await advanceCrawlCheckpoint({
      checkpoint: progress.checkpoint,
      pageTimestamps,
      syncedAt: args.syncedAt,
      pipelineRunId: args.pipelineRunId,
    }),
  };
}

async function _crawlPages<TDrive, TConnection, TScope extends EtlScope>(
  args: _PagesArgs<TDrive, TConnection, TScope>,
): Promise<Readonly<{ progress: _CrawlProgress; outcome: CrawlOutcome }>> {
  let progress = _createProgress({
    remaining: args.remaining,
    checkpoint: args.checkpoint,
  });
  try {
    const pages = args.config.extract({
      drive: args.drive,
      scope: args.scope,
      window: args.window,
      pipelineRunId: args.pipelineRunId,
    });
    // Sequential on purpose: each page is written, and the checkpoint moved
    // past it, before the next is fetched, so the listings table always
    // holds an oldest-first prefix of the scope up to the checkpoint. That
    // is what makes the checkpoint safe to resume from.
    for await (const page of pages) {
      progress = await _processPage({ ...args, page, progress });
      if (progress.selection.remaining <= 0) {
        break;
      }
    }
    return { progress, outcome: { status: "ok" } };
  } catch (error: unknown) {
    return { progress, outcome: { status: "failed", error } };
  }
}

/**
 * Crawls one scope of one drive: reads the scope's checkpoint and window,
 * then fetches, transforms, and loads one page at a time until the source
 * runs out or the run's limit is reached, moving the checkpoint past each
 * loaded page. A crawl with no limit left is skipped without a request. A
 * failure never escapes: the crawl is reported `failed` with the counts of
 * what it wrote before the failure, and the result keeps what it threw.
 *
 * @returns The crawl's report and, when it failed, its error.
 */
export async function crawlScope<TDrive, TConnection, TScope extends EtlScope>(
  args: CrawlScopeArgs<TDrive, TConnection, TScope>,
): Promise<CrawlScopeResult> {
  const { driveKey, options } = args;
  const scopeKey = args.scope.key;
  if (args.remaining <= 0) {
    return buildUncrawledCrawlResult({
      driveKey,
      scopeKey,
      options,
      outcome: { status: "skipped" },
    });
  }
  try {
    const start = await _readScopeStart(args);
    const { progress, outcome } = await _crawlPages({ ...args, ...start });
    return _buildCrawlResult({
      driveKey,
      scopeKey,
      window: start.window,
      counts: progress,
      outcome,
    });
  } catch (error: unknown) {
    // _crawlPages reports its own failures, so only reading the checkpoint
    // lands here.
    return buildUncrawledCrawlResult({
      driveKey,
      scopeKey,
      options,
      outcome: { status: "failed", error },
    });
  }
}
```

- [ ] **Step 8: Orchestrate drives and scopes**

Replace the whole of `EtlEngine/createEtlEngine/createEtlEngine.ts` with:

```ts
import { randomUUID } from "node:crypto";
import { promiseReduce } from "@avandar/utils";
import {
  buildUncrawledCrawlResult,
  crawlScope,
} from "@etl/EtlEngine/crawlScope/crawlScope";
import {
  ETL_SCOPE_KEY_PATTERN,
  ETL_UNLISTED_SCOPE_KEY,
} from "@etl/EtlEngine/etlScopes";
import { EtlRunFailedError } from "@etl/EtlEngine/EtlRunFailedError";
import { EtlRunOptionsError } from "@etl/EtlEngine/EtlRunOptionsError";
import { resolveDriveScopes } from "@etl/EtlEngine/resolveDriveScopes/resolveDriveScopes";
import { selectRequestedScopes } from "@etl/EtlEngine/selectRequestedScopes/selectRequestedScopes";
import { createSupabaseCheckpointStore } from "@etl/stores/SupabaseCheckpointStore/createSupabaseCheckpointStore";
import { createSupabaseListingsStore } from "@etl/stores/SupabaseListingsStore/createSupabaseListingsStore";
import { createSupabaseObjectStore } from "@etl/stores/SupabaseObjectStore/createSupabaseObjectStore";
import { createClient } from "@supabase/supabase-js";
import type { CrawlScopeResult } from "@etl/EtlEngine/crawlScope/crawlScope";
import type {
  EtlDestination,
  EtlDriveScopes,
  EtlEngineConfig,
  EtlEngineInstance,
  EtlPipelineRunId,
  EtlRunMode,
  EtlRunOptions,
  EtlRunReport,
  EtlScope,
  EtlStores,
} from "@etl/EtlEngine/EtlEngine.types";
import type { ResolvedDrive } from "@etl/EtlEngine/resolveDriveScopes/resolveDriveScopes";

/** One crawl to run, or a drive that failed before its scopes were known. */
type _CrawlTask<TDrive, TScope extends EtlScope> =
  | Readonly<{ isListed: true; drive: TDrive; driveKey: string; scope: TScope }>
  | Readonly<{ isListed: false; driveKey: string; error: unknown }>;

type _CrawlTasksArgs<TDrive, TConnection, TScope extends EtlScope> = Readonly<{
  config: EtlEngineConfig<TDrive, TConnection, TScope>;
  tasks: ReadonlyArray<_CrawlTask<TDrive, TScope>>;
  options: EtlRunOptions;
  pipelineRunId: EtlPipelineRunId;
  stores: EtlStores;
  syncedAt: Date;
}>;

function _assertValidScopeOptions(args: {
  pipelineName: string;
  scopes: readonly string[] | undefined;
}): void {
  const { scopes } = args;
  if (scopes === undefined) {
    return;
  }
  const isValid =
    scopes.length > 0 &&
    scopes.every((scopeKey) => {
      return ETL_SCOPE_KEY_PATTERN.test(scopeKey);
    });
  if (!isValid) {
    throw new EtlRunOptionsError(
      `The ${args.pipelineName} pipeline got the scopes ${JSON.stringify(scopes)}, but scopes must be a non-empty list of scope keys such as format:csv.`,
    );
  }
}

function _assertCanRun<TDrive, TConnection, TScope extends EtlScope>(args: {
  config: EtlEngineConfig<TDrive, TConnection, TScope>;
  options: EtlRunOptions;
}): void {
  const { config, options } = args;
  if (options.mode === "incremental" && config.incremental === undefined) {
    throw new EtlRunOptionsError(
      `The ${config.name} pipeline does not support incremental runs.`,
    );
  }
  const hasWindow = options.since !== undefined || options.until !== undefined;
  if (hasWindow && config.incremental === undefined) {
    throw new EtlRunOptionsError(
      `The ${config.name} pipeline does not support --since or --until, because its sources carry no modification time.`,
    );
  }
  const { limit } = options;
  if (limit !== undefined && !(Number.isInteger(limit) && limit >= 0)) {
    throw new EtlRunOptionsError(
      `The ${config.name} pipeline got a limit of ${limit}, but a limit must be an integer of 0 or more.`,
    );
  }
  _assertValidScopeOptions({
    pipelineName: config.name,
    scopes: options.scopes,
  });
}

function _createSupabaseStores(destination: EtlDestination): EtlStores {
  const url = destination.supabase?.url;
  const serviceRoleKey = destination.supabase?.serviceRoleKey;
  if (!url) {
    throw new Error("EtlEngine needs supabase.url to load into Supabase.");
  }
  if (!serviceRoleKey) {
    throw new Error(
      "EtlEngine needs supabase.serviceRoleKey to load into Supabase.",
    );
  }
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { output } = destination;
  return {
    listings: createSupabaseListingsStore({
      client,
      listingsTable: output.listingsTable,
      relationColumnsTable: output.relationColumnsTable,
    }),
    objects:
      output.bucket === undefined
        ? undefined
        : createSupabaseObjectStore({ client, bucket: output.bucket }),
    checkpoints:
      output.checkpointsTable === undefined
        ? undefined
        : createSupabaseCheckpointStore({
            client,
            checkpointsTable: output.checkpointsTable,
          }),
  };
}

/**
 * The stores a run writes through: the config's own, or Supabase-backed
 * ones.
 *
 * @throws When the config has `incremental` and there is no checkpoint
 * store to resume from.
 */
function _resolveStores<TDrive, TConnection, TScope extends EtlScope>(
  config: EtlEngineConfig<TDrive, TConnection, TScope>,
): EtlStores {
  const stores = config.stores ?? _createSupabaseStores(config);
  if (config.incremental !== undefined && stores.checkpoints === undefined) {
    throw new Error(
      `The ${config.name} pipeline supports incremental runs, so EtlEngine needs somewhere to keep its checkpoints: set output.checkpointsTable, or stores.checkpoints in tests.`,
    );
  }
  return stores;
}

function _buildCrawlTasks<TDrive, TScope extends EtlScope>(
  resolvedDrives: ReadonlyArray<ResolvedDrive<TDrive, TScope>>,
): Array<_CrawlTask<TDrive, TScope>> {
  return resolvedDrives.flatMap((resolved): Array<_CrawlTask<TDrive, TScope>> => {
    if (!resolved.isResolved) {
      return [
        { isListed: false, driveKey: resolved.driveKey, error: resolved.error },
      ];
    }
    return resolved.scopes.map((scope) => {
      return {
        isListed: true,
        drive: resolved.drive,
        driveKey: resolved.driveKey,
        scope,
      };
    });
  });
}

async function _runCrawlTask<TDrive, TConnection, TScope extends EtlScope>(
  args: _CrawlTasksArgs<TDrive, TConnection, TScope> &
    Readonly<{ task: _CrawlTask<TDrive, TScope>; remaining: number }>,
): Promise<CrawlScopeResult> {
  const { task } = args;
  if (!task.isListed) {
    return buildUncrawledCrawlResult({
      driveKey: task.driveKey,
      scopeKey: ETL_UNLISTED_SCOPE_KEY,
      options: args.options,
      outcome: { status: "failed", error: task.error },
    });
  }
  return crawlScope({
    config: args.config,
    drive: task.drive,
    driveKey: task.driveKey,
    scope: task.scope,
    options: args.options,
    pipelineRunId: args.pipelineRunId,
    stores: args.stores,
    remaining: args.remaining,
    syncedAt: args.syncedAt,
  });
}

async function _crawlInOrder<TDrive, TConnection, TScope extends EtlScope>(
  args: _CrawlTasksArgs<TDrive, TConnection, TScope>,
): Promise<readonly CrawlScopeResult[]> {
  const limit = args.options.limit ?? Number.POSITIVE_INFINITY;
  // Sequential on purpose: crawls run one after another, drive by drive and
  // scope by scope, and each crawl's remaining limit depends on how many
  // connections the crawls before it fetched.
  return promiseReduce<_CrawlTask<TDrive, TScope>, readonly CrawlScopeResult[]>(
    args.tasks,
    async (results, task) => {
      const fetched = results.reduce((sum, { report }) => {
        return sum + report.connectionsFetched;
      }, 0);
      const result = await _runCrawlTask({
        ...args,
        task,
        remaining: limit - fetched,
      });
      return [...results, result];
    },
    [],
  );
}

/**
 * Builds the run's report.
 *
 * @throws EtlRunFailedError, carrying the report, when every crawl failed.
 */
function _finishRun(args: {
  pipelineRunId: EtlPipelineRunId;
  mode: EtlRunMode;
  results: readonly CrawlScopeResult[];
}): EtlRunReport {
  const { results } = args;
  const report: EtlRunReport = {
    pipelineRunId: args.pipelineRunId,
    mode: args.mode,
    crawls: results.map((result) => {
      return result.report;
    }),
  };
  const isEveryCrawlFailed =
    results.length > 0 &&
    results.every((result) => {
      return result.report.status === "failed";
    });
  if (isEveryCrawlFailed) {
    throw new EtlRunFailedError({
      report,
      errors: results.map((result) => {
        return result.error;
      }),
    });
  }
  return report;
}

async function _listLiveScopes<TDrive, TConnection, TScope extends EtlScope>(
  config: EtlEngineConfig<TDrive, TConnection, TScope>,
): Promise<readonly EtlDriveScopes[]> {
  const resolvedDrives = await resolveDriveScopes({
    config,
    drives: await config.listDrives(),
  });
  return resolvedDrives.map((resolved) => {
    if (!resolved.isResolved) {
      throw new Error(
        `The ${config.name} pipeline could not list the scopes of drive ${resolved.driveKey}.`,
        { cause: resolved.error },
      );
    }
    return {
      driveKey: resolved.driveKey,
      scopeKeys: resolved.scopes.map((scope) => {
        return scope.key;
      }),
    };
  });
}

/**
 * Creates one pipeline's engine. `run()` crawls every scope of every drive,
 * in `listDrives` and then `listScopes` order, one page at a time, and loads
 * each page into the configured listings table and bucket before fetching
 * the next. A failed crawl is reported and the next one still runs.
 * `EtlEngineInstance` lists when `run()` and `listScopes()` reject. See the
 * package README for the output contract and run modes.
 *
 * @param config - The pipeline's drives, scopes, extract, transform, and
 * output.
 * @returns The engine.
 */
export function createEtlEngine<
  TDrive,
  TConnection,
  TScope extends EtlScope = EtlScope,
>(config: EtlEngineConfig<TDrive, TConnection, TScope>): EtlEngineInstance {
  return {
    run: async (options) => {
      _assertCanRun({ config, options });
      const stores = _resolveStores(config);
      const pipelineRunId = randomUUID() as EtlPipelineRunId;
      const resolvedDrives = selectRequestedScopes({
        pipelineName: config.name,
        resolvedDrives: await resolveDriveScopes({
          config,
          drives: await config.listDrives(),
        }),
        requestedScopeKeys: options.scopes,
      });
      const results = await _crawlInOrder({
        config,
        tasks: _buildCrawlTasks(resolvedDrives),
        options,
        pipelineRunId,
        stores,
        syncedAt: new Date(),
      });
      return _finishRun({ pipelineRunId, mode: options.mode, results });
    },
    listScopes: () => {
      return _listLiveScopes(config);
    },
  };
}
```

- [ ] **Step 9: Name crawls in the failure message, and export the new types**

In `EtlEngine/EtlRunFailedError.ts`, replace the `failures` computation and
the `super(...)` call with:

```ts
    const failures = report.crawls
      .map((crawl) => {
        return `${crawl.driveKey} [${crawl.scopeKey}]: ${crawl.error ?? "unknown error"}`;
      })
      .join("; ");
    super(`Every crawl failed. ${failures}`, {
      cause: new AggregateError(errors, "What each failed crawl threw."),
    });
```

and change its class JSDoc to say "every crawl" where it says "every drive".

In `index.ts`, in the `EtlEngine.types` type exports, replace
`EtlDriveReport` and `EtlDriveStatus` with `EtlCrawlReport`,
`EtlCrawlStatus`, and `EtlDriveScopes`. Add `ETL_UNLISTED_SCOPE_KEY` to the
`etlScopes` export.

- [ ] **Step 10: Run the package tests**

```bash
pnpm --filter @avandar/etl exec vitest run
pnpm --filter @avandar/etl type-check
pnpm exec eslint packages/node/etl/src
```

Expected: all pass. `grep -rn "crawlDrive" packages/node/etl/src` prints
nothing.

- [ ] **Step 11: Update the pipeline server's reports and comments**

```bash
pnpm --filter @avandar/etl build
grep -rn "drives: \[\]\|report\.drives\|\.drives\[" apps/pipeline-server --include='*.ts'
```

In each match, rename the report's `drives` to `crawls` (for example
`drives: []` becomes `crawls: []` in `getEtlRunFailedReport.test.ts`,
`runPipelineAndPrintReport.test.ts`, and `registerPipelineRoutes.test.ts`, and
`report.drives` becomes `report.crawls` in the HDX and Socrata engine tests).
Leave `drives:` that is not a report alone (`createSocrataEtlEngine`'s
`drives` argument is a list of drives).

In `apps/pipeline-server/src/routes/pipeline-name/registerPipelineRoutes.ts`,
change the comments "When every drive failed, the report still says what each
drive did." to "When every crawl failed, the report still says what each
crawl did." and "A run where every drive failed" to "A run where every crawl
failed". In `apps/pipeline-server/pipelines/shared/runPipelineAndPrintReport/runPipelineAndPrintReport.ts`,
change "When every drive failed" to "When every crawl failed" in its JSDoc.

- [ ] **Step 12: Run everything that depends on the engine**

```bash
pnpm --filter @avandar/pipeline-server exec vitest run -c vitest.config.ts
pnpm exec tsc --noEmit -p tsconfig.node.json
ava supabase status
pnpm --filter @avandar/etl test:supabase
pnpm exec eslint apps/pipeline-server
```

Expected: all pass.

- [ ] **Step 13: Commit**

```bash
git add packages/node/etl/src apps/pipeline-server
git commit -m "feat(etl): crawl and resume each scope of each drive

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
## Phase D: Source clients (`shared/`)

### Task 11: CKAN search by resource format

**Files:**
- Modify: `shared/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.types.ts`
- Modify: `shared/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.ts`
- Modify: `shared/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.test.ts`

- [ ] **Step 1: Write the failing tests**

In `CkanDiscoveryClient.test.ts`, add after `"escapes a backslash and a double quote in the cursor name"`:

```ts
  it("narrows to datasets with a resource in one of the given formats", async () => {
    const http = _searchHttp();

    await createCkanDiscoveryClient(http).searchDatasets({
      baseUrl: BASE_URL,
      rows: 100,
      resourceFormats: ["CSV", "Parquet"],
    });

    expect(_sentQuery(http).get("fq")).toBe(
      '+metadata_modified:[* TO *] +res_format:("CSV" OR "Parquet")',
    );
  });

  it("keeps the format filter after a cursor", async () => {
    const http = _searchHttp();

    await createCkanDiscoveryClient(http).searchDatasets({
      baseUrl: BASE_URL,
      rows: 100,
      after: {
        modifiedAt: new Date("2026-10-01T00:00:00.000Z"),
        name: "a",
      },
      resourceFormats: ["CSV"],
    });

    expect(_sentQuery(http).get("fq")).toMatch(/\) \+res_format:\("CSV"\)$/);
  });

  it.each([['CSV" OR name:*'], ["CSV)"], ["C\\SV"], [""]])(
    "rejects the resource format %j before sending a request",
    async (format) => {
      const http = _searchHttp();

      await expect(
        createCkanDiscoveryClient(http).searchDatasets({
          baseUrl: BASE_URL,
          rows: 100,
          resourceFormats: [format],
        }),
      ).rejects.toThrow("may only hold letters, digits, spaces");
      expect(http.get).not.toHaveBeenCalled();
    },
  );

  it("rejects an empty format list, which would match nothing", async () => {
    await expect(
      createCkanDiscoveryClient(_searchHttp()).searchDatasets({
        baseUrl: BASE_URL,
        rows: 100,
        resourceFormats: [],
      }),
    ).rejects.toThrow("at least one resource format");
  });
```

- [ ] **Step 2: Watch them fail**

```bash
pnpm exec vitest run shared/connectors/open-data/CkanDiscoveryClient
```

Expected: FAIL. The type-check also fails on the unknown `resourceFormats`.

- [ ] **Step 3: Add the parameter**

In `CkanDiscoveryClient.types.ts`, in `searchDatasets`'s params, after
`rows: number;` add:

```ts
    /**
     * Only datasets with at least one resource in one of these formats,
     * spelled exactly as CKAN labels them: `res_format` is case-sensitive,
     * so on HDX `CSV` matches and `csv` does not.
     */
    resourceFormats?: readonly string[];
```

and add to its JSDoc:

```ts
   * @throws Before any request, when `resourceFormats` is empty or holds a
   * character other than letters, digits, spaces, and `.`, `_`, `-`.
```

- [ ] **Step 4: Build the filter**

In `CkanDiscoveryClient.ts`, add after `_buildModifiedFilter`:

```ts
/** A `res_format` value that is safe inside double quotes. */
const SAFE_RESOURCE_FORMAT = /^[A-Za-z0-9 ._-]+$/;

/**
 * Builds the `res_format` clause of `package_search`'s `fq`, or `undefined`
 * when no format is asked for. Like the time clause, it is marked required
 * with `+`, so it narrows the match on a deployment whose default operator
 * is OR.
 *
 * @throws When the list is empty, or a format holds a character that could
 * break out of its quotes.
 */
function _buildResourceFormatFilter(
  resourceFormats: readonly string[] | undefined,
): string | undefined {
  if (resourceFormats === undefined) {
    return undefined;
  }
  if (resourceFormats.length === 0) {
    throw new Error(
      "A CKAN search by format needs at least one resource format.",
    );
  }
  resourceFormats.forEach((format) => {
    if (!SAFE_RESOURCE_FORMAT.test(format)) {
      throw new Error(
        `CKAN resource format ${JSON.stringify(format)} may only hold letters, digits, spaces, and . _ -.`,
      );
    }
  });
  const quotedFormats = resourceFormats.map((format) => {
    return `"${format}"`;
  });
  return `+res_format:(${quotedFormats.join(" OR ")})`;
}
```

In `createCkanDiscoveryClient`, replace `fq: _buildModifiedFilter(params),`
with:

```ts
          fq: [
            _buildModifiedFilter(params),
            _buildResourceFormatFilter(params.resourceFormats),
          ]
            .filter((clause) => {
              return clause !== undefined;
            })
            .join(" "),
```

- [ ] **Step 5: Run the tests and the type-checks**

```bash
pnpm exec vitest run shared/connectors/open-data/CkanDiscoveryClient
pnpm type-check
pnpm exec eslint shared/connectors/open-data/CkanDiscoveryClient
```

Expected: all pass. The existing `fq` tests are unchanged.

- [ ] **Step 6: Commit**

```bash
git add shared/connectors/open-data/CkanDiscoveryClient
git commit -m "feat(open-data): search CKAN datasets by resource format

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Socrata search by category and tag

**Files:**
- Modify: `shared/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types.ts`
- Modify: `shared/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.ts`
- Modify: `shared/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.test.ts`

- [ ] **Step 1: Write the failing tests**

In `SocrataDiscoveryClient.test.ts`, add after `"sends an order when given"`:

```ts
  it("filters by categories and tags within the drive's own search context", async () => {
    const http = _http();

    await createSocrataDiscoveryClient(http).search({
      domains: ["data.cityofnewyork.us"],
      searchContext: "data.cityofnewyork.us",
      categories: ["Education", "Health"],
      tags: ["doe"],
    });

    const sentUrl = new URL(String(vi.mocked(http.get).mock.calls[0]?.[0]));
    expect([
      sentUrl.searchParams.get("search_context"),
      sentUrl.searchParams.getAll("categories"),
      sentUrl.searchParams.getAll("tags"),
    ]).toEqual(["data.cityofnewyork.us", ["Education", "Health"], ["doe"]]);
  });

  it("rejects categories or tags without a search context, which match nothing", async () => {
    const http = _http();

    await expect(
      createSocrataDiscoveryClient(http).search({
        domains: ["data.cityofnewyork.us"],
        categories: ["Education"],
      }),
    ).rejects.toThrow("needs a searchContext");
    expect(http.get).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Watch them fail**

```bash
pnpm exec vitest run shared/connectors/open-data/SocrataDiscoveryClient
```

Expected: FAIL.

- [ ] **Step 3: Name the params type and add the filters**

In `SocrataDiscoveryClient.types.ts`, replace the inline `search` params
type with a named, exported one:

```ts
/** What one Discovery API search asks for. */
export type SocrataDiscoverySearchParams = Readonly<{
  query?: string;
  domains?: readonly string[];
  /**
   * The domain whose own categories and tags `categories` and `tags` match.
   * Required with either: without it the Discovery API matches nothing.
   */
  searchContext?: string;
  /** Only datasets in one of these domain categories. */
  categories?: readonly string[];
  /** Only datasets with one of these domain tags. */
  tags?: readonly string[];
  limit?: number;
  offset?: number;
  order?: string;
}>;

export type SocrataDiscoveryClient = {
  search: (
    params: SocrataDiscoverySearchParams,
  ) => Promise<SocrataDiscoverySearchPage>;
};
```

Keep the existing doc comments on `SocrataDiscoveryClient` and `search`.

- [ ] **Step 4: Build the query in one place**

In `SocrataDiscoveryClient.ts`, import `SocrataDiscoverySearchParams`, add
above `createSocrataDiscoveryClient`:

```ts
/**
 * The Discovery API query for one search. A parameter given several values
 * is repeated, which the API reads as OR.
 *
 * @throws When `categories` or `tags` is given without `searchContext`.
 */
function _buildSearchParams(
  params: SocrataDiscoverySearchParams,
): URLSearchParams {
  const hasDomainFilter =
    (params.categories?.length ?? 0) > 0 || (params.tags?.length ?? 0) > 0;
  if (hasDomainFilter && params.searchContext === undefined) {
    throw new Error(
      "A Socrata search by categories or tags needs a searchContext, or the Discovery API matches nothing.",
    );
  }
  const searchParams = new URLSearchParams();
  if (params.query !== undefined) {
    searchParams.set("q", params.query);
  }
  if (params.domains && params.domains.length > 0) {
    searchParams.set("domains", params.domains.join(","));
  }
  if (params.searchContext !== undefined) {
    searchParams.set("search_context", params.searchContext);
  }
  params.categories?.forEach((category) => {
    searchParams.append("categories", category);
  });
  params.tags?.forEach((tag) => {
    searchParams.append("tags", tag);
  });
  if (params.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    searchParams.set("offset", String(params.offset));
  }
  if (params.order !== undefined) {
    searchParams.set("order", params.order);
  }
  return searchParams;
}
```

and replace `search`'s body up to the `http.get` call with:

```ts
    search: async (params): Promise<SocrataDiscoverySearchPage> => {
      const body = await http.get(
        `${DISCOVERY_BASE_URL}?${_buildSearchParams(params).toString()}`,
      );
```

keeping the parse and return that follow. The parameter order for a search
without the new fields is unchanged, so existing URL assertions still hold.

- [ ] **Step 5: Run the tests and the type-checks**

```bash
pnpm exec vitest run shared/connectors/open-data/SocrataDiscoveryClient
pnpm type-check
pnpm exec eslint shared/connectors/open-data/SocrataDiscoveryClient
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add shared/connectors/open-data/SocrataDiscoveryClient
git commit -m "feat(open-data): search Socrata datasets by category and tag

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Phase E: Pipelines

All paths in this phase are under `apps/pipeline-server` unless they start
with `scripts/`.

### Task 13: HDX crawls one scope per format

**Files:**
- Create: `pipelines/hdx/hdxScopes.ts`, `pipelines/hdx/hdxScopes.test.ts`
- Modify: `pipelines/hdx/extractHdxDatasets/extractHdxDatasets.ts` and its test
- Modify: `pipelines/hdx/makeApiResourceRelationsFromCkanPackage/makeApiResourceRelationsFromCkanPackage.ts` and its test
- Modify: `pipelines/hdx/createHdxEtlEngine/createHdxEtlEngine.ts` and its test

- [ ] **Step 1: Write the failing scope tests**

Create `pipelines/hdx/hdxScopes.test.ts`:

```ts
import { HDX_SCOPES } from "@pipelines/hdx/hdxScopes";
import { describe, expect, it } from "vitest";
import { READABLE_FORMATS } from "$/connectors/open-data/getCkanResourceFromPackage";

describe("HDX_SCOPES", () => {
  it("keeps the keys the scope seed migration names", () => {
    // The migration *_seed_pipeline_scope_keys_and_checkpoints.sql seeded
    // checkpoints and listing keys under exactly these keys. Renaming one
    // starts that format's crawl over from the beginning.
    expect(
      HDX_SCOPES.map((scope) => {
        return scope.key;
      }),
    ).toEqual(["format:csv", "format:parquet"]);
  });

  it("names only formats the open data reader can read", () => {
    expect(
      HDX_SCOPES.every((scope) => {
        return READABLE_FORMATS.includes(scope.resourceFormat.toLowerCase());
      }),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Write the failing extract test**

In `pipelines/hdx/extractHdxDatasets/extractHdxDatasets.test.ts`, add inside
`describe("extractHdxDatasets", ...)`:

```ts
  it("asks for the given resource formats on every request", async () => {
    const discovery = _keysetDiscovery(CATALOG);

    // Sequential on purpose: the generator pages one request at a time.
    for await (const _page of extractHdxDatasets({
      drive: DRIVE,
      window: OPEN_WINDOW,
      discovery,
      pageSize: 2,
      resourceFormats: ["CSV"],
    })) {
      // Draining the crawl is all this test needs.
    }

    expect(
      vi.mocked(discovery.searchDatasets).mock.calls.map(([params]) => {
        return params.resourceFormats;
      }),
    ).toEqual([["CSV"], ["CSV"], ["CSV"]]);
  });
```

- [ ] **Step 3: Write the failing relation tests**

In `makeApiResourceRelationsFromCkanPackage.test.ts`:

1. Rename the first test to
   `"builds one relation per readable resource of the scope's format, dated by metadata_modified"`,
   pass `resourceFormat: "CSV"` to `makeApiResourceRelationsFromCkanPackage`,
   and delete the `parquet-1` relation from its expected array.
2. Pass `resourceFormat: "CSV"` in `"returns no relations when the dataset has no readable resource"`.
3. Add:

   ```ts
   it("keeps only the scope's format, whatever the resource's case", () => {
     const ckanPackage: CkanPackage = {
       id: "c3429f0e",
       name: "movement-range-maps",
       metadata_modified: "2025-11-19T10:29:46.280529",
       resources: [
         {
           id: "csv-1",
           name: "data.csv",
           format: "CSV",
           url: "https://data.humdata.org/dataset/x/resource/csv-1/download/data.csv",
           url_type: "upload",
           size: 200,
           hash: "abc",
           last_modified: undefined,
           mimetype: undefined,
           datastore_active: false,
         },
         {
           id: "parquet-1",
           name: "data.parquet",
           format: "parquet",
           url: "https://data.humdata.org/dataset/x/resource/parquet-1/download/data.parquet",
           url_type: "upload",
           size: 150,
           hash: "def",
           last_modified: undefined,
           mimetype: undefined,
           datastore_active: false,
         },
       ],
     };

     const relations = makeApiResourceRelationsFromCkanPackage({
       drive: CKAN_DRIVE,
       ckanPackage,
       resourceFormat: "Parquet",
     });

     expect(
       relations.map((relation) => {
         return [relation.apiResourceId, relation.apiResourceFormat];
       }),
     ).toEqual([["parquet-1", "PARQUET"]]);
   });
   ```

- [ ] **Step 4: Write the failing engine tests**

In `pipelines/hdx/createHdxEtlEngine/createHdxEtlEngine.test.ts`:

1. Make `_discovery` apply `resourceFormats` the way CKAN does:

   ```ts
   function _discovery(catalog: readonly CkanPackage[]): CkanDiscoveryClient {
     return {
       searchDatasets: vi.fn(async ({ modifiedSince, resourceFormats }) => {
         const datasets = catalog.filter((dataset) => {
           const isInWindow =
             modifiedSince === undefined ||
             parseCkanTimestamp(dataset.metadata_modified ?? "").getTime() >=
               modifiedSince.getTime();
           const hasFormat =
             resourceFormats === undefined ||
             dataset.resources.some((resource) => {
               return resourceFormats.includes(resource.format);
             });
           return isInWindow && hasFormat;
         });
         const lastDataset = datasets.at(-1);
         return {
           datasets,
           skippedDatasets: [],
           nextCursor:
             lastDataset === undefined ? undefined : (
               {
                 modifiedAt: parseCkanTimestamp(
                   lastDataset.metadata_modified ?? "",
                 ),
                 name: lastDataset.name,
               }
             ),
           resultCount: datasets.length,
         };
       }),
     };
   }
   ```

2. Add a helper after `_package`:

   ```ts
   /** A dataset with one CSV and one Parquet resource. */
   function _packageWithParquet(name: string, day: number): CkanPackage {
     const ckanPackage = _package(name, day);
     const [csvResource] = ckanPackage.resources;
     return {
       ...ckanPackage,
       resources: [
         ...ckanPackage.resources,
         {
           ...csvResource!,
           id: `${name}-parquet`,
           name: `${name}.parquet`,
           format: "Parquet",
           url: `https://data.humdata.org/dataset/${name}/resource/${name}-parquet/download/${name}.parquet`,
         },
       ],
     };
   }
   ```

   If the non-null assertion fails lint, build the Parquet resource as a full
   literal copied from `_package`'s CSV resource instead.

3. Add the tests:

   ```ts
   it("crawls the CSV scope, then the Parquet scope, each writing only its format", async () => {
     const listings = createInMemoryListingsStore();
     const discovery = _discovery([_packageWithParquet("a", 1)]);

     await createHdxEtlEngine({
       output: OUTPUT,
       discovery,
       drive: DRIVE,
       stores: {
         listings,
         objects: undefined,
         checkpoints: createInMemoryCheckpointStore(),
       },
     }).run({ mode: "full" });

     expect([
       vi.mocked(discovery.searchDatasets).mock.calls.map(([params]) => {
         return params.resourceFormats;
       }),
       listings.getRows().map((row) => {
         return [row.api_resource_id, row.pipeline_scope_keys];
       }),
     ]).toEqual([
       [["CSV"], ["Parquet"]],
       [
         ["a-csv", ["format:csv"]],
         ["a-parquet", ["format:parquet"]],
       ],
     ]);
   });

   it("lists one scope per format for its drive", async () => {
     const scopes = await createHdxEtlEngine({
       output: OUTPUT,
       discovery: _discovery([]),
       drive: DRIVE,
     }).listScopes();

     expect(scopes).toEqual([
       { driveKey: DRIVE.baseUrl, scopeKeys: ["format:csv", "format:parquet"] },
     ]);
   });
   ```

- [ ] **Step 5: Watch them fail**

```bash
pnpm --filter @avandar/pipeline-server exec vitest run -c vitest.config.ts pipelines/hdx
```

Expected: FAIL (no `hdxScopes`, no `resourceFormats`, no `resourceFormat`).

- [ ] **Step 6: Declare the scopes**

Create `pipelines/hdx/hdxScopes.ts`:

```ts
import type { EtlScope } from "@avandar/etl";

/**
 * One HDX scope: the hosted resources of one format. `resourceFormat` is
 * HDX's own label for the format, spelled exactly, because
 * `package_search`'s `res_format` filter is case-sensitive.
 */
export type HdxScope = EtlScope & Readonly<{ resourceFormat: string }>;

/**
 * The formats the HDX pipeline indexes, one scope each, crawled in this
 * order. A format added here is backfilled in full by the next incremental
 * run. Keep the keys as they are: the migration
 * `*_seed_pipeline_scope_keys_and_checkpoints.sql` seeded them, and renaming
 * one restarts that format's crawl from the beginning.
 */
export const HDX_SCOPES: readonly HdxScope[] = [
  { key: "format:csv", resourceFormat: "CSV" },
  { key: "format:parquet", resourceFormat: "Parquet" },
];
```

- [ ] **Step 7: Narrow the extract to the scope's format**

In `pipelines/hdx/extractHdxDatasets/extractHdxDatasets.ts`:

- Add `resourceFormats: readonly string[] | undefined;` to `_ExtractArgs`.
- In `_fetchPageAfter`'s `searchDatasets` call, add
  `resourceFormats: args.resourceFormats,` after `rows: args.pageSize,`.
- Add `resourceFormats?: readonly string[];` to `extractHdxDatasets`'s args
  and pass `resourceFormats: args.resourceFormats,` into `_pages`.
- Add to its JSDoc:
  ` * @param args.resourceFormats - Only datasets with a resource in one of`
  ` *   these formats, as CKAN labels them.`

- [ ] **Step 8: Keep only the scope's resources**

In `makeApiResourceRelationsFromCkanPackage.ts`, add `resourceFormat: string;`
to the params, with the JSDoc line
` * @param params.resourceFormat - The scope's format. Only readable resources`
` *   in it, compared case-insensitively, become relations.`, and replace the
`readableResources` filter with:

```ts
  const wantedFormat = params.resourceFormat.toLowerCase();
  const readableResources = ckanPackage.resources.filter((resource) => {
    return (
      isReadableCkanResource(resource) &&
      resource.format.toLowerCase() === wantedFormat
    );
  });
```

- [ ] **Step 9: Crawl the scopes**

In `pipelines/hdx/createHdxEtlEngine/createHdxEtlEngine.ts`, import
`HDX_SCOPES` and the `HdxScope` type from `@pipelines/hdx/hdxScopes`, change
`EtlEngine.create<HdxDrive, CkanPackage>` to
`EtlEngine.create<HdxDrive, CkanPackage, HdxScope>`, and replace `extract`
and `transform` with:

```ts
    listScopes: () => {
      return HDX_SCOPES;
    },
    extract: ({ drive: current, scope, window }) => {
      return extractHdxDatasets({
        drive: current,
        window,
        discovery,
        resourceFormats: [scope.resourceFormat],
      });
    },
    getConnectionId: (ckanPackage) => {
      return ckanPackage.name;
    },
    transform: ({ drive: current, scope, connection }) => {
      return makeApiResourceRelationsFromCkanPackage({
        drive: current,
        ckanPackage: connection,
        resourceFormat: scope.resourceFormat,
      });
    },
```

Add to the function's JSDoc: "Each drive is crawled once per scope in
`HDX_SCOPES`, asking CKAN only for datasets with a resource in that format."

- [ ] **Step 10: Run the tests, type-check, and lint**

```bash
pnpm --filter @avandar/pipeline-server exec vitest run -c vitest.config.ts pipelines/hdx
pnpm exec tsc --noEmit -p tsconfig.node.json
pnpm exec eslint apps/pipeline-server/pipelines/hdx
```

Expected: all pass.

- [ ] **Step 11: Commit**

```bash
git add apps/pipeline-server/pipelines/hdx
git commit -m "feat(pipeline-server): crawl HDX one scope per resource format

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Socrata drives may declare category and tag scopes

**Files:**
- Modify: `pipelines/socrata/configuredDrives/configuredDrives.ts`
- Modify: `pipelines/socrata/extractSocrataDrive/extractSocrataDrive.ts` and its test
- Modify: `pipelines/socrata/createSocrataEtlEngine/createSocrataEtlEngine.ts` and its test

- [ ] **Step 1: Write the failing extract test**

In `extractSocrataDrive.test.ts`, change `_collect` to take a scope:

```ts
async function _collect(
  window: EtlRunWindow,
  discovery: SocrataDiscoveryClient,
  scope: SocrataScope = { key: "all" },
) {
  const pages: SocrataDiscoveryResult[][] = [];
  // Sequential on purpose: the generator pages one request at a time.
  for await (const page of extractSocrataDrive({
    drive: DRIVE,
    scope,
    window,
    discovery,
  })) {
    pages.push([...page]);
  }
  return pages;
}
```

importing the `SocrataScope` type from
`@pipelines/socrata/configuredDrives/configuredDrives`, and add:

```ts
  it("narrows a category scope at the source, in the drive's own search context", async () => {
    const discovery = _discoveryOver(_catalog(10));

    await _collect(OPEN_WINDOW, discovery, {
      key: "category:education",
      categories: ["Education"],
    });

    expect(vi.mocked(discovery.search)).toHaveBeenCalledWith({
      domains: ["data.cityofnewyork.us"],
      searchContext: "data.cityofnewyork.us",
      categories: ["Education"],
      order: "updatedAt ASC",
      limit: 1000,
      offset: 0,
    });
  });

  it("sends a tag scope's tags", async () => {
    const discovery = _discoveryOver(_catalog(10));

    await _collect(OPEN_WINDOW, discovery, { key: "tag:doe", tags: ["doe"] });

    expect(vi.mocked(discovery.search).mock.calls[0]?.[0].tags).toEqual([
      "doe",
    ]);
  });
```

- [ ] **Step 2: Write the failing engine tests**

In `createSocrataEtlEngine.test.ts`, add:

```ts
  it("crawls each of a drive's scopes and records them on its rows", async () => {
    const listings = createInMemoryListingsStore();
    const discovery = _discoveryOver(_catalog(1));

    await createSocrataEtlEngine({
      output: OUTPUT,
      discovery,
      drives: [
        {
          ...DRIVE,
          scopes: [
            { key: "category:education", categories: ["Education"] },
            { key: "tag:doe", tags: ["doe"] },
          ],
        },
      ],
      stores: {
        listings,
        objects: undefined,
        checkpoints: createInMemoryCheckpointStore(),
      },
    }).run({ mode: "full" });

    expect([
      vi.mocked(discovery.search).mock.calls.map(([params]) => {
        return [params.categories, params.tags];
      }),
      listings.getRows().map((row) => {
        return row.pipeline_scope_keys;
      }),
    ]).toEqual([
      [
        [["Education"], undefined],
        [undefined, ["doe"]],
      ],
      [["category:education", "tag:doe"]],
    ]);
  });

  it("lists all as the scope of a drive without scopes", async () => {
    const scopes = await createSocrataEtlEngine({
      output: OUTPUT,
      discovery: _discoveryOver([]),
      drives: [DRIVE],
    }).listScopes();

    expect(scopes).toEqual([{ driveKey: DRIVE.baseUrl, scopeKeys: ["all"] }]);
  });
```

- [ ] **Step 3: Watch them fail**

```bash
pnpm --filter @avandar/pipeline-server exec vitest run -c vitest.config.ts pipelines/socrata
```

Expected: FAIL (no `scope` argument, no `scopes` on a drive).

- [ ] **Step 4: Declare the scope type**

In `pipelines/socrata/configuredDrives/configuredDrives.ts`, add at the top:

```ts
import type { EtlScope } from "@avandar/etl";

/**
 * One Socrata scope: a drive's datasets in any of `categories` or with any
 * of `tags`, both spelled as the portal names them. A scope with neither is
 * the whole drive.
 */
export type SocrataScope = EtlScope &
  Readonly<{ categories?: readonly string[]; tags?: readonly string[] }>;
```

and add to `ConfiguredDrive`, after `organizationName`:

```ts
  /**
   * The drive's scopes, crawled in this order. Omit to index the whole
   * portal as one scope, `all`. Replacing `all` with category or tag scopes
   * retires `all`, and `ava pipeline prune-retired-scopes` then removes the
   * datasets outside them.
   */
  scopes?: readonly SocrataScope[];
```

- [ ] **Step 5: Send the scope's filters**

In `pipelines/socrata/extractSocrataDrive/extractSocrataDrive.ts`:

- Import the `SocrataScope` type and add `scope: Readonly<SocrataScope>;` to
  `ExtractSocrataDriveArgs` after `drive`.
- Add above `_fetchPage`:

  ```ts
  /**
   * The Discovery API filters for a scope, or none for a scope that is the
   * whole drive. Categories and tags are the drive's own, so the search runs
   * in the drive's search context.
   */
  function _buildScopeFilters(args: ExtractSocrataDriveArgs): Readonly<{
    searchContext?: string;
    categories?: readonly string[];
    tags?: readonly string[];
  }> {
    const { categories, tags } = args.scope;
    if (categories === undefined && tags === undefined) {
      return {};
    }
    return {
      searchContext: new URL(args.drive.baseUrl).host,
      ...(categories === undefined ? {} : { categories }),
      ...(tags === undefined ? {} : { tags }),
    };
  }
  ```

- In `_fetchPage`'s `search` call, add `..._buildScopeFilters(args),` after
  `domains: [new URL(drive.baseUrl).host],`.
- Add to `extractSocrataDrive`'s JSDoc: "A scope with categories or tags is
  narrowed at the source."

- [ ] **Step 6: Crawl the drive's scopes**

In `pipelines/socrata/createSocrataEtlEngine/createSocrataEtlEngine.ts`,
import `ETL_DEFAULT_SCOPE` from `@avandar/etl` and the `SocrataScope` type,
change `EtlEngine.create<ConfiguredDrive, SocrataDiscoveryResult>` to
`EtlEngine.create<ConfiguredDrive, SocrataDiscoveryResult, SocrataScope>`,
and replace `extract` with:

```ts
    listScopes: (drive) => {
      return drive.scopes ?? [ETL_DEFAULT_SCOPE];
    },
    extract: ({ drive, scope, window }) => {
      return extractSocrataDrive({ drive, scope, window, discovery });
    },
```

- [ ] **Step 7: Run the tests, type-check, and lint**

```bash
pnpm --filter @avandar/pipeline-server exec vitest run -c vitest.config.ts pipelines/socrata
pnpm exec tsc --noEmit -p tsconfig.node.json
pnpm exec eslint apps/pipeline-server/pipelines/socrata
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add apps/pipeline-server/pipelines/socrata
git commit -m "feat(pipeline-server): let Socrata drives declare category and tag scopes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: The `scopes` run option, from the server and the local runner

**Files:**
- Modify: `pipelines/shared/parsePipelineRunOptions/parsePipelineRunOptions.ts` and its test
- Modify: `pipelines/shared/readRawPipelineRunOptionsFromArgv/readRawPipelineRunOptionsFromArgv.ts` and its test
- Modify: `src/routes/pipeline-name/registerPipelineRoutes.ts` and its test
- Modify: `src/routes/pipeline-name/run/run.ts` and its test
- Modify: `scripts/runPipelineOnce.ts`

- [ ] **Step 1: Write the failing parser tests**

In `parsePipelineRunOptions.test.ts`, add:

```ts
  it("reads comma-separated scopes from argv", () => {
    expect(
      parsePipelineRunOptions({ scopes: "format:csv,format:parquet" }).scopes,
    ).toEqual(["format:csv", "format:parquet"]);
  });

  it("reads a list of scopes from a request body", () => {
    expect(parsePipelineRunOptions({ scopes: ["format:csv"] }).scopes).toEqual(
      ["format:csv"],
    );
  });

  it.each([
    [""],
    ["Format:CSV"],
    ["format:csv,,format:parquet"],
    [[]],
    [["format:csv", 1]],
    [42],
  ])("rejects the scopes %j", (scopes) => {
    expect(() => {
      return parsePipelineRunOptions({ scopes });
    }).toThrow("--scope must name one or more scope keys");
  });

  it("rejects a scope named twice", () => {
    expect(() => {
      return parsePipelineRunOptions({ scopes: "format:csv,format:csv" });
    }).toThrow("names a scope more than once");
  });
```

In `readRawPipelineRunOptionsFromArgv.test.ts`, add:

```ts
  it("reads --scope as one raw string", () => {
    expect(
      readRawPipelineRunOptionsFromArgv(["--scope", "format:csv,format:parquet"]),
    ).toEqual({ scopes: "format:csv,format:parquet" });
  });

  it("rejects --scope given twice", () => {
    expect(() => {
      return readRawPipelineRunOptionsFromArgv([
        "--scope",
        "format:csv",
        "--scope",
        "format:parquet",
      ]);
    }).toThrow("more than once");
  });
```

- [ ] **Step 2: Write the failing server tests**

In `registerPipelineRoutes.test.ts`:

1. In `"returns 400 and skips the run when the body has an unknown option"`,
   change the expected text to
   `"accepts only incremental, since, until, limit, and scopes"`.
2. Add:

   ```ts
   it("passes scopes from a JSON body to the run", async () => {
     server = await _createServer();

     await server.inject({
       method: "POST",
       url: "/example-pipeline/run",
       headers: { authorization: AUTH_HEADER },
       payload: { scopes: ["format:csv"] },
     });

     expect(vi.mocked(run)).toHaveBeenCalledWith({
       pipelineName: "example-pipeline",
       mode: "full",
       scopes: ["format:csv"],
     });
   });

   it("returns 400 and skips the run for an invalid scope", async () => {
     server = await _createServer();

     const res = await server.inject({
       method: "POST",
       url: "/example-pipeline/run",
       headers: { authorization: AUTH_HEADER },
       payload: { scopes: ["Not Valid"] },
     });

     expect([res.statusCode, vi.mocked(run).mock.calls.length]).toEqual([
       400, 0,
     ]);
   });
   ```

In `src/routes/pipeline-name/run/run.test.ts`, add a test in the file's own
style that `run({ pipelineName, mode: "full", scopes: ["format:csv"] })`
passes `scopes: ["format:csv"]` to the pipeline module's `run`. Read the
existing tests first and copy how they stub the pipeline module.

- [ ] **Step 3: Watch them fail**

```bash
pnpm --filter @avandar/pipeline-server exec vitest run -c vitest.config.ts pipelines/shared src/routes
```

Expected: the new tests fail.

- [ ] **Step 4: Parse scopes**

In `parsePipelineRunOptions.ts`:

1. Import `ETL_SCOPE_KEY_PATTERN` from `@avandar/etl`.
2. Add `scopes?: unknown;` to `RawPipelineRunOptions` after `limit`.
3. Add above `parsePipelineRunOptions`:

   ```ts
   function _isScopeKeyList(value: unknown): value is string[] {
     return (
       Array.isArray(value) &&
       value.length > 0 &&
       value.every((scopeKey) => {
         return (
           typeof scopeKey === "string" && ETL_SCOPE_KEY_PATTERN.test(scopeKey)
         );
       })
     );
   }

   /**
    * Reads the scopes to crawl: a comma-separated string, as argv carries
    * it, or a list of strings, as a request body carries it.
    */
   function _parseScopes(value: unknown): readonly string[] | undefined {
     if (value === undefined) {
       return undefined;
     }
     const scopeKeys = typeof value === "string" ? value.split(",") : value;
     if (!_isScopeKeyList(scopeKeys)) {
       throw new Error(
         `--scope must name one or more scope keys separated by commas, such as format:csv,format:parquet. Got ${JSON.stringify(value)}.`,
       );
     }
     if (new Set(scopeKeys).size < scopeKeys.length) {
       throw new Error(
         `--scope names a scope more than once: ${JSON.stringify(value)}.`,
       );
     }
     return scopeKeys;
   }
   ```

4. In `parsePipelineRunOptions`, after the `until` line add
   `const scopes = _parseScopes(raw.scopes);`, and add
   `...(scopes === undefined ? {} : { scopes }),` as the last entry of the
   returned object. Mention `scopes` in its JSDoc.

In `readRawPipelineRunOptionsFromArgv.ts`, add `scope: { type: "string" },`
to `RUN_OPTION_FLAGS`, add
`...(values.scope === undefined ? {} : { scopes: values.scope }),` to the
returned object, and add `--scope` to its JSDoc's flag list.

- [ ] **Step 5: Accept scopes on the server**

In `registerPipelineRoutes.ts`:

- Add `scopes?: unknown;` to `RunPipelineRequest`'s `Body`.
- Change `RUN_BODY_SCHEMA`'s enum to
  `["incremental", "since", "until", "limit", "scopes"]`.
- Change the validation message to
  `` `The run body accepts only incremental, since, until, limit, and scopes. ${request.validationError.message}` ``.

In `src/routes/pipeline-name/run/run.ts`, replace

```ts
  const { mode, since, until, limit } = options;
  return await (pipelineModule as PipelineRunModule).run({
    mode,
    since,
    until,
    limit,
  });
```

with:

```ts
  const { mode, since, until, limit, scopes } = options;
  return await (pipelineModule as PipelineRunModule).run({
    mode,
    since,
    until,
    limit,
    ...(scopes === undefined ? {} : { scopes }),
  });
```

In `scripts/runPipelineOnce.ts`, change `_USAGE` to:

```ts
const _USAGE =
  "Usage: runPipelineOnce <pipeline-name> [--incremental] [--since <ISO 8601>] [--until <ISO 8601>] [--limit <n>] [--scope <key>[,<key>...]]";
```

- [ ] **Step 6: Run the tests, type-check, and lint**

```bash
pnpm --filter @avandar/pipeline-server exec vitest run -c vitest.config.ts
pnpm exec tsc --noEmit -p tsconfig.node.json
pnpm exec eslint apps/pipeline-server scripts/runPipelineOnce.ts
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add apps/pipeline-server/pipelines/shared \
  apps/pipeline-server/src/routes \
  scripts/runPipelineOnce.ts
git commit -m "feat(pipeline-server): accept a scopes run option

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: List a pipeline's live scopes, on the server and locally

**Files:**
- Modify: `pipelines/hdx/run.ts`, `pipelines/socrata/run.ts`, `pipelines/world-bank__wdi/run.ts`
- Create: `src/routes/pipeline-name/buildPipelineModuleUrl/buildPipelineModuleUrl.ts`
- Create: `src/routes/pipeline-name/listScopes/listScopes.ts`
- Modify: `src/routes/pipeline-name/run/run.ts`
- Modify: `src/routes/pipeline-name/registerPipelineRoutes.ts` and its test
- Create: `scripts/listPipelineScopes.ts`

- [ ] **Step 1: Write the failing route tests**

In `registerPipelineRoutes.test.ts`, mock the new module next to the `run`
mock:

```ts
vi.mock("@pipeline-server/routes/pipeline-name/listScopes/listScopes", () => {
  return {
    listScopes: vi.fn(),
  };
});
```

import `listScopes` from it, and add:

```ts
  describe("GET /:pipelineName/scopes", () => {
    it("returns 401 when auth is missing", async () => {
      server = await _createServer();

      const res = await server.inject({ method: "GET", url: "/hdx/scopes" });

      expect([res.statusCode, vi.mocked(listScopes).mock.calls.length]).toEqual(
        [401, 0],
      );
    });

    it("answers with each drive's live scopes", async () => {
      vi.mocked(listScopes).mockResolvedValue([
        {
          driveKey: "https://data.humdata.org",
          scopeKeys: ["format:csv", "format:parquet"],
        },
      ]);
      server = await _createServer();

      const res = await server.inject({
        method: "GET",
        url: "/hdx/scopes",
        headers: { authorization: AUTH_HEADER },
      });

      expect([res.statusCode, res.json(), vi.mocked(listScopes).mock.calls]).toEqual([
        200,
        {
          drives: [
            {
              driveKey: "https://data.humdata.org",
              scopeKeys: ["format:csv", "format:parquet"],
            },
          ],
        },
        [["hdx"]],
      ]);
    });

    it("returns 500 with the message when the scopes cannot be listed", async () => {
      vi.mocked(listScopes).mockRejectedValue(
        new Error("could not list the scopes of drive a"),
      );
      server = await _createServer();

      const res = await server.inject({
        method: "GET",
        url: "/hdx/scopes",
        headers: { authorization: AUTH_HEADER },
      });

      expect([res.statusCode, res.json()]).toEqual([
        500,
        { ok: false, error: "could not list the scopes of drive a" },
      ]);
    });
  });
```

- [ ] **Step 2: Watch them fail**

```bash
pnpm --filter @avandar/pipeline-server exec vitest run -c vitest.config.ts src/routes
```

Expected: FAIL, the module and route do not exist.

- [ ] **Step 3: Share the module path**

Create `src/routes/pipeline-name/buildPipelineModuleUrl/buildPipelineModuleUrl.ts`:

```ts
/**
 * The URL of a pipeline's module, `apps/pipeline-server/pipelines/<name>/run.ts`.
 *
 * @param pipelineName - The pipeline's directory name.
 * @returns The module's file URL.
 */
export function buildPipelineModuleUrl(pipelineName: string): URL {
  return new URL(
    `../../../../pipelines/${pipelineName}/run.ts`,
    import.meta.url,
  );
}
```

In `src/routes/pipeline-name/run/run.ts`, delete `_getPipelineModuleURL` and
use `buildPipelineModuleUrl(options.pipelineName).href` instead. The
relative path is the same, because both files sit two directories under
`src/routes`.

- [ ] **Step 4: Load a pipeline's scopes**

Create `src/routes/pipeline-name/listScopes/listScopes.ts`:

```ts
import { buildPipelineModuleUrl } from "@pipeline-server/routes/pipeline-name/buildPipelineModuleUrl/buildPipelineModuleUrl";
import type { EtlDriveScopes } from "@avandar/etl";

type PipelineScopesModule = Readonly<{
  listScopes: () => Promise<readonly EtlDriveScopes[]>;
}>;

/**
 * Loads a pipeline's module and lists each drive's live scopes. Reads no
 * database.
 *
 * @param pipelineName - The pipeline's directory name.
 * @returns Each drive's scope keys.
 * @throws When the module exports no `listScopes` function, or whatever it
 * throws.
 */
export async function listScopes(
  pipelineName: string,
): Promise<readonly EtlDriveScopes[]> {
  const pipelineModule: unknown = await import(
    buildPipelineModuleUrl(pipelineName).href
  );
  if (
    typeof pipelineModule !== "object" ||
    pipelineModule === null ||
    !("listScopes" in pipelineModule) ||
    typeof pipelineModule.listScopes !== "function"
  ) {
    throw new Error(
      `Pipeline "${pipelineName}" does not export a listScopes() function.`,
    );
  }
  return await (pipelineModule as PipelineScopesModule).listScopes();
}
```

- [ ] **Step 5: Register the route**

In `registerPipelineRoutes.ts`, import `listScopes` and add:

```ts
type PipelineScopesRequest = FastifyRequest<{
  Params: {
    pipelineName: string;
  };
}>;

async function _listPipelineScopes(
  request: PipelineScopesRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  try {
    const drives = await listScopes(request.params.pipelineName);
    return await reply.send({ drives });
  } catch (error: unknown) {
    const message: string =
      error instanceof Error ? error.message : "Unknown error";
    return await reply.status(500).send({ ok: false, error: message });
  }
}
```

and inside `registerPipelineRoutes`, after the `server.post(...)` call:

```ts
  server.get(
    "/:pipelineName/scopes",
    {
      preValidation: async (request, reply) => {
        return await _requireRunAuth({ request, reply });
      },
    },
    _listPipelineScopes,
  );
```

Extend the plugin's JSDoc: "Also registers `GET /:pipelineName/scopes`,
which answers with `{ drives }`, each drive's live scope keys, behind the
same auth."

- [ ] **Step 6: Export `listScopes` from each pipeline**

In `pipelines/hdx/run.ts`, move the engine construction into a private
helper and export `listScopes`:

```ts
function _createEngine(): EtlEngineInstance {
  const discovery = createCkanDiscoveryClient(
    createHdxHttpClient({ baseUrl: HDX_BASE_URL }),
  );
  return createHdxEtlEngine({ ...getPipelineEtlDestination(), discovery });
}

export async function run(
  options: PipelineRunOptions = { mode: "full" },
): Promise<EtlRunReport> {
  return await _createEngine().run(options);
}

/**
 * Lists the HDX drive's live scopes, without crawling or needing Supabase
 * credentials.
 */
export async function listScopes(): Promise<readonly EtlDriveScopes[]> {
  return await _createEngine().listScopes();
}
```

Keep `run`'s existing JSDoc, and import the `EtlDriveScopes` and
`EtlEngineInstance` types from `@avandar/etl`. Do the same in
`pipelines/socrata/run.ts` (its `_createEngine` builds the Socrata discovery
client exactly as `run` does today) and in `pipelines/world-bank__wdi/run.ts`
(its `_createEngine` returns `createWdiEtlEngine(getPipelineEtlDestination())`).

- [ ] **Step 7: Add the local script**

Create `scripts/listPipelineScopes.ts`:

```ts
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const _USAGE = "Usage: listPipelineScopes <pipeline-name>";

/**
 * Loads `apps/pipeline-server/pipelines/<name>/run.ts` and prints its live
 * scopes as `{"drives":[...]}` on the last line of stdout, the same body
 * `GET /:pipelineName/scopes` answers with. It reads no database and needs
 * no credentials. `ava pipeline prune-retired-scopes --local` runs it.
 */
async function main(): Promise<void> {
  const [pipelineName, ...extraArgs] = process.argv.slice(2);
  if (!pipelineName || extraArgs.length > 0) {
    console.error(_USAGE);
    process.exit(1);
  }
  const rootDir = fileURLToPath(new URL("..", import.meta.url));
  const runPath = join(
    rootDir,
    "apps/pipeline-server/pipelines",
    pipelineName,
    "run.ts",
  );
  if (!existsSync(runPath)) {
    console.error(`No pipeline module at ${runPath}`);
    process.exit(1);
  }
  const pipelineModule = await import(pathToFileURL(runPath).href);
  if (typeof pipelineModule.listScopes !== "function") {
    console.error(`Pipeline "${pipelineName}" does not export listScopes().`);
    process.exit(1);
  }
  const drives: unknown = await pipelineModule.listScopes();
  console.log(JSON.stringify({ drives }));
}

void main();
```

- [ ] **Step 8: Run the tests and try the script**

```bash
pnpm --filter @avandar/pipeline-server exec vitest run -c vitest.config.ts
pnpm exec tsc --noEmit -p tsconfig.node.json
pnpm exec eslint apps/pipeline-server scripts/listPipelineScopes.ts
pnpm exec vite-node --config vite.script.config.ts scripts/listPipelineScopes.ts hdx
pnpm exec vite-node --config vite.script.config.ts scripts/listPipelineScopes.ts socrata
```

Expected: tests and checks pass. The script prints, as its last line,
`{"drives":[{"driveKey":"https://data.humdata.org","scopeKeys":["format:csv","format:parquet"]}]}`
for `hdx`, and `{"drives":[{"driveKey":"https://data.cityofnewyork.us","scopeKeys":["all"]}]}`
for `socrata`.

- [ ] **Step 9: Commit**

```bash
git add apps/pipeline-server/pipelines/hdx/run.ts \
  apps/pipeline-server/pipelines/socrata/run.ts \
  apps/pipeline-server/pipelines/world-bank__wdi/run.ts \
  apps/pipeline-server/src/routes \
  scripts/listPipelineScopes.ts
git commit -m "feat(pipeline-server): list a pipeline's live scopes on the server and locally

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
## Phase F: The `ava` CLI

All paths in this phase are under `apps/ava-cli/src/PipelineCli` unless they
start with `apps/` or `scripts/`.

### Task 17: `ava pipeline run --scope`, and the per-crawl report

**Files:**
- Modify: `PipelineRunRequestOptions.types.ts`
- Modify: `RunPipelineCli/RunPipelineCli.ts` and its test
- Modify: `sendRunPipelineRequest.ts` and its test
- Modify: `runPipelineLocal.ts` and its test
- Modify: `PipelineRunReport/PipelineRunReport.schemas.ts` and its test
- Modify: `PipelineRunReport/printPipelineRunReport.ts` and its test
- Modify: `PipelineRunReport/readPipelineRunReport.test.ts`

- [ ] **Step 1: Move the test fixtures to the crawl shape**

In every test file listed above, the report fixtures use `drives`. Rename
each report's `drives` to `crawls`, and add `scopeKey: "all",` after each
entry's `driveKey`. In `printPipelineRunReport.test.ts`, also rename the
`_report` helper's parameter type to `PipelineRunReport["crawls"]`, and in
`PipelineRunReport.schemas.test.ts` change `report.drives[0]` to
`report.crawls[0]`.

- [ ] **Step 2: Write the failing tests**

In `printPipelineRunReport.test.ts`, change the expected first line in
`"prints a drive's key, then its window and counts on indented lines"` from
`"ok      https://data.cityofnewyork.us\n"` to
`"ok      https://data.cityofnewyork.us [all]\n"`, and rename the test to
`"prints a crawl's drive and scope, then its window and counts on indented lines"`.

In `PipelineRunReport.schemas.test.ts`, add:

```ts
  it("rejects a crawl with no scope key", () => {
    const { scopeKey: _scopeKey, ...crawlWithoutScope } = REPORT.crawls[0]!;

    expect(
      PipelineRunReportSchema.safeParse({
        ...REPORT,
        crawls: [crawlWithoutScope],
      }).success,
    ).toBe(false);
  });
```

(use the file's existing report constant name in place of `REPORT` if it
differs).

In `RunPipelineCli/RunPipelineCli.test.ts`, add:

```ts
  it("sends scopes to the pipeline server as a list", async () => {
    const fetchMock = _mockFetch(async () => {
      return new Response(JSON.stringify(REPORT), { status: 200 });
    });

    const { runPipelineCommand } = await import("./RunPipelineCli");
    await runPipelineCommand({
      name: "hdx",
      local: false,
      scope: "format:csv,format:parquet",
    });

    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
      '{"scopes":["format:csv","format:parquet"]}',
    );
  });

  it("passes scopes to a local run", async () => {
    const { runPipelineCommand } = await import("./RunPipelineCli");
    await runPipelineCommand({ name: "hdx", local: true, scope: "format:csv" });

    expect(vi.mocked(runPipelineLocal)).toHaveBeenCalledWith({
      pipelineName: "hdx",
      repoRoot: "/repo",
      runOptions: { scopes: ["format:csv"] },
    });
  });
```

In `runPipelineLocal.test.ts`, add:

```ts
  it("passes scopes to the runner as one comma-separated flag", () => {
    runPipelineLocal({
      pipelineName: "hdx",
      repoRoot: "/repo",
      runOptions: { scopes: ["format:csv", "format:parquet"] },
    });

    expect(vi.mocked(spawnSync).mock.calls[0]?.[1]?.slice(-3)).toEqual([
      "hdx",
      "--scope",
      "format:csv,format:parquet",
    ]);
  });
```

- [ ] **Step 3: Watch them fail**

```bash
pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts src/PipelineCli
```

Expected: the new and changed tests fail.

- [ ] **Step 4: Read the crawl shape**

In `PipelineRunReport/PipelineRunReport.schemas.ts`, replace `drives:` with
`crawls:` and add `scopeKey: z.string(),` after `driveKey: z.string(),`.
Change "`@avandar/etl`'s `EtlRunReport`" in the JSDoc to say each entry is
one crawl: one scope of one drive.

In `PipelineRunReport/printPipelineRunReport.ts`:

- Rename `_DriveReport` to `_CrawlReport` (`PipelineRunReport["crawls"][number]`),
  `_formatDrive` to `_formatCrawl`, and `_printDrive` to `_printCrawl`, and
  their parameters from `drive` to `crawl`.
- In `_formatCrawl`, change the first line to:

  ```ts
      `${crawl.status.padEnd(_STATUS_WIDTH)} ${crawl.driveKey} [${crawl.scopeKey}]${limitNote}`,
  ```

- Replace `report.drives` with `report.crawls` throughout, and change the
  empty-report message to
  `"No drives or scopes are configured, so nothing was crawled."`
- Update the JSDoc: "each crawl (a drive and scope)" where it says "each
  drive", and "every crawl failed" where it says "every drive failed".

- [ ] **Step 5: Send scopes**

In `PipelineRunRequestOptions.types.ts`, add after `limit?: number;`:

```ts
  /** The scope keys to crawl. Omit to crawl every scope. */
  scopes?: readonly string[];
```

In `sendRunPipelineRequest.ts`, add to `_buildRunBody`'s object:

```ts
    ...(runOptions.scopes === undefined ? {} : { scopes: runOptions.scopes }),
```

In `runPipelineLocal.ts`, add to `_buildRunArgs`:

```ts
    ...(runOptions.scopes === undefined
      ? []
      : ["--scope", runOptions.scopes.join(",")]),
```

and change "only these four flags" in its JSDoc to "only these five flags".

In `RunPipelineCli/RunPipelineCli.ts`:

- Add `scope?: string;` to `runPipelineCommand`'s options and to the action's
  args type, with the JSDoc line
  ` * @param options.scope - Comma-separated scope keys to crawl.`
- Add to `runOptions`:

  ```ts
      scopes: options.scope?.split(","),
  ```

- Add the option after `--limit`:

  ```ts
    .addOption({
      name: "--scope",
      type: "string",
      required: false,
      description:
        "Crawl only these scopes, as comma-separated keys such as " +
        "format:csv,format:parquet. A scope never crawled before starts from " +
        "the beginning, even with --incremental.",
    })
  ```

- Change `--incremental`'s description to "Only process what was created or
  changed since each scope's checkpoint. Also continues a cancelled or
  limited run, and crawls a scope with no checkpoint from the beginning.",
  and in `--since`'s description delete the sentence starting "A --since
  later than a drive's last stored update".

- [ ] **Step 6: Run the tests, type-check, and lint**

```bash
pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts
pnpm exec tsc --noEmit -p tsconfig.node.json
pnpm exec eslint apps/ava-cli/src/PipelineCli
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add apps/ava-cli/src/PipelineCli
git commit -m "feat(ava-cli): run pipeline scopes and print one report line per crawl

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: `ava pipeline reset` clears checkpoints first, and can reset one scope

**Files:**
- Modify: `ResetPipelineCli/pipelineListingsRest.ts`
- Create: `scopePruneCounts/scopePruneCounts.ts` and `.test.ts`
- Create: `announcePostgrestTarget/announcePostgrestTarget.ts`
- Modify: `ResetPipelineCli/ResetPipelineCli.ts` and its test

- [ ] **Step 1: Teach the test PostgREST about checkpoints and RPCs**

In `ResetPipelineCli/ResetPipelineCli.test.ts`, replace `_mockPostgrest` with:

```ts
type PruneCounts = Readonly<{
  listings_deleted: number;
  listings_kept_in_use: number;
  listings_detached: number;
  checkpoints_deleted: number;
}>;

const NO_PRUNE: PruneCounts = {
  listings_deleted: 0,
  listings_kept_in_use: 0,
  listings_detached: 0,
  checkpoints_deleted: 0,
};

type RecordedRequest = Readonly<{
  method: string;
  table: string;
  params: URLSearchParams;
  body: unknown;
}>;

/**
 * Stubs `fetch` as a tiny PostgREST: a HEAD reports `listingCount` on
 * `data_catalog_listings` and `checkpointCount` on
 * `pipeline_scope_checkpoints`, a GET on `datasets__open_data` returns
 * `inUseRows`, a POST to the prune RPC returns `pruneCounts`, and every
 * DELETE succeeds. Returns the requests in the order they were made.
 */
function _mockPostgrest(options: {
  listingCount: number;
  checkpointCount?: number;
  inUseRows?: readonly InUseRow[];
  pruneCounts?: PruneCounts;
}): RecordedRequest[] {
  const requests: RecordedRequest[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: { method?: string; body?: string }) => {
      const url = new URL(input);
      const method = init?.method ?? "GET";
      const table = url.pathname.replace("/rest/v1/", "");
      const body: unknown =
        init?.body === undefined ? undefined : JSON.parse(init.body);
      requests.push({ method, table, params: url.searchParams, body });
      const count =
        table === "pipeline_scope_checkpoints"
          ? (options.checkpointCount ?? 0)
          : options.listingCount;
      if (method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: { "content-range": `*/${count}` },
        });
      }
      if (method === "POST") {
        return new Response(JSON.stringify([options.pruneCounts ?? NO_PRUNE]));
      }
      if (method === "GET") {
        return new Response(JSON.stringify(options.inUseRows ?? []));
      }
      return new Response(null, {
        status: 204,
        headers: { "content-range": `*/${count}` },
      });
    }),
  );
  return requests;
}
```

Then, in every existing test that asserts the list of DELETE requests, expect
`["pipeline_scope_checkpoints", "pipeline_name=eq.<name>"]` as the first
DELETE, before any `datasets` or `data_catalog_listings` delete. For example
`"deletes every socrata listing once the reset is confirmed"` now expects:

```ts
    ).toEqual([
      ["pipeline_scope_checkpoints", "pipeline_name=eq.socrata"],
      ["data_catalog_listings", "pipeline_name=eq.socrata"],
    ]);
```

If a test asserts the confirmation prompt's text, change it to the new text
in Step 5.

- [ ] **Step 2: Write the failing reset tests**

Add inside `describe("resetPipelineCommand", ...)`:

```ts
  it("deletes checkpoints even when the pipeline has no listings", async () => {
    const requests = _mockPostgrest({ listingCount: 0, checkpointCount: 2 });

    await resetPipelineCommand({ name: "socrata" });

    expect(
      _getDeletes(requests).map((request) => {
        return request.table;
      }),
    ).toEqual(["pipeline_scope_checkpoints", "data_catalog_listings"]);
  });

  it("deletes nothing else when deleting checkpoints fails", async () => {
    const recorded: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: { method?: string }) => {
        const table = new URL(input).pathname.replace("/rest/v1/", "");
        recorded.push(`${init?.method ?? "GET"} ${table}`);
        if (init?.method === "DELETE") {
          return new Response("boom", { status: 500 });
        }
        if (init?.method === "HEAD") {
          return new Response(null, {
            status: 200,
            headers: { "content-range": "*/3" },
          });
        }
        return new Response("[]");
      }),
    );

    await expect(resetPipelineCommand({ name: "socrata" })).rejects.toThrow(
      "500",
    );
    expect(
      recorded.filter((request) => {
        return request.startsWith("DELETE");
      }),
    ).toEqual(["DELETE pipeline_scope_checkpoints"]);
  });

  describe("with --scope", () => {
    it("prunes the scope on every drive once confirmed", async () => {
      const requests = _mockPostgrest({
        listingCount: 0,
        pruneCounts: { ...NO_PRUNE, listings_deleted: 3, checkpoints_deleted: 1 },
      });

      await resetPipelineCommand({ name: "hdx", scope: "format:parquet" });

      const calls = requests.filter((request) => {
        return request.method === "POST";
      });
      expect(
        calls.map((request) => {
          return [request.table, request.body];
        }),
      ).toEqual([
        [
          "rpc/rpc_data_catalog_listings__prune_pipeline_scope",
          {
            p_pipeline_name: "hdx",
            p_scope_key: "format:parquet",
            p_drive_key: null,
            p_is_dry_run: true,
          },
        ],
        [
          "rpc/rpc_data_catalog_listings__prune_pipeline_scope",
          {
            p_pipeline_name: "hdx",
            p_scope_key: "format:parquet",
            p_drive_key: null,
            p_is_dry_run: false,
          },
        ],
      ]);
    });

    it("changes nothing when the scope has nothing to prune", async () => {
      const requests = _mockPostgrest({ listingCount: 0 });

      await resetPipelineCommand({ name: "hdx", scope: "format:parquet" });

      expect([
        vi.mocked(promptToConfirmReset).mock.calls.length,
        requests.filter((request) => {
          return request.method === "POST";
        }).length,
      ]).toEqual([0, 1]);
    });

    it("deletes the workspace datasets of in-use listings first when asked to", async () => {
      vi.mocked(promptForInUseListingsChoice).mockResolvedValueOnce("delete");
      const requests = _mockPostgrest({
        listingCount: 0,
        inUseRows: [IN_USE_ROW],
        pruneCounts: { ...NO_PRUNE, listings_kept_in_use: 1 },
      });

      await resetPipelineCommand({ name: "hdx", scope: "format:parquet" });

      const inUseLookup = requests.find((request) => {
        return request.table === "datasets__open_data";
      });
      expect([
        inUseLookup?.params.get("data_catalog_listings.pipeline_scope_keys"),
        requests
          .filter((request) => {
            return request.method === "DELETE" || request.method === "POST";
          })
          .map((request) => {
            return `${request.method} ${request.table}`;
          }),
      ]).toEqual([
        "eq.{format:parquet}",
        [
          "POST rpc/rpc_data_catalog_listings__prune_pipeline_scope",
          "DELETE datasets",
          "POST rpc/rpc_data_catalog_listings__prune_pipeline_scope",
        ],
      ]);
    });
  });
```

- [ ] **Step 3: Write the failing count-formatting tests**

Create `scopePruneCounts/scopePruneCounts.test.ts`:

```ts
import {
  describeScopePruneCounts,
  isScopePruneEmpty,
} from "@ava-cli/PipelineCli/scopePruneCounts/scopePruneCounts";
import { describe, expect, it } from "vitest";

const COUNTS = {
  listings_deleted: 3,
  listings_kept_in_use: 1,
  listings_detached: 2,
  checkpoints_deleted: 1,
};

describe("describeScopePruneCounts", () => {
  it("says what pruning does to listings and checkpoints", () => {
    expect(describeScopePruneCounts(COUNTS)).toBe(
      "delete 3 listing(s), keep 1 a workspace uses, detach 2 another scope still produces, delete 1 checkpoint(s)",
    );
  });
});

describe("isScopePruneEmpty", () => {
  it("is true only when every count is zero", () => {
    expect([
      isScopePruneEmpty(COUNTS),
      isScopePruneEmpty({
        listings_deleted: 0,
        listings_kept_in_use: 0,
        listings_detached: 0,
        checkpoints_deleted: 0,
      }),
    ]).toEqual([false, true]);
  });
});
```

- [ ] **Step 4: Watch them fail**

```bash
pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts src/PipelineCli/ResetPipelineCli src/PipelineCli/scopePruneCounts
```

Expected: FAIL.

- [ ] **Step 5: Add the REST helpers**

In `ResetPipelineCli/pipelineListingsRest.ts`:

1. Widen `_sendPostgrestRequest` to take `method: "HEAD" | "GET" | "DELETE" | "POST"`
   and an optional `body?: unknown`. When `body` is given, send
   `JSON.stringify(body)` with a `"Content-Type": "application/json"` header.
2. Append:

   ```ts
   /** The checkpoints table, as PostgREST names it. */
   const CHECKPOINTS_TABLE = "pipeline_scope_checkpoints";

   /** The RPC that prunes one scope from a pipeline's listings. */
   const PRUNE_SCOPE_RPC = "rpc/rpc_data_catalog_listings__prune_pipeline_scope";

   /** The RPC that lists a pipeline's stored drive and scope pairs. */
   const LIST_SCOPES_RPC = "rpc/rpc_data_catalog_listings__list_pipeline_scopes";

   /** What pruning one scope did, or would do in a dry run. */
   export type ScopePruneCounts = Readonly<{
     listings_deleted: number;
     listings_kept_in_use: number;
     listings_detached: number;
     checkpoints_deleted: number;
   }>;

   /** A drive and scope a pipeline has listings or a checkpoint for. */
   export type StoredScope = Readonly<{ drive_key: string; scope_key: string }>;

   /** Counts one pipeline's checkpoints. */
   export async function countCheckpoints(options: {
     target: PostgrestTarget;
     pipelineName: string;
   }): Promise<number> {
     const response = await _sendPostgrestRequest({
       target: options.target,
       method: "HEAD",
       table: CHECKPOINTS_TABLE,
       params: { pipeline_name: `eq.${options.pipelineName}`, select: "scope_key" },
       prefer: "count=exact",
     });
     return _countFromContentRange(response);
   }

   /**
    * Deletes every checkpoint of one pipeline. Resolves to how many were
    * deleted.
    */
   export async function deleteCheckpoints(options: {
     target: PostgrestTarget;
     pipelineName: string;
   }): Promise<number> {
     const response = await _sendPostgrestRequest({
       target: options.target,
       method: "DELETE",
       table: CHECKPOINTS_TABLE,
       params: { pipeline_name: `eq.${options.pipelineName}` },
       prefer: "return=minimal,count=exact",
     });
     return _countFromContentRange(response);
   }

   /**
    * Prunes one scope from a pipeline's listings and checkpoints, on one
    * drive or, with no `driveKey`, on every drive. A dry run only counts.
    * Listings a workspace uses are never deleted.
    */
   export async function pruneScope(options: {
     target: PostgrestTarget;
     pipelineName: string;
     scopeKey: string;
     driveKey: string | undefined;
     isDryRun: boolean;
   }): Promise<ScopePruneCounts> {
     const response = await _sendPostgrestRequest({
       target: options.target,
       method: "POST",
       table: PRUNE_SCOPE_RPC,
       params: {},
       body: {
         p_pipeline_name: options.pipelineName,
         p_scope_key: options.scopeKey,
         p_drive_key: options.driveKey ?? null,
         p_is_dry_run: options.isDryRun,
       },
     });
     const [counts] = (await response.json()) as readonly ScopePruneCounts[];
     if (counts === undefined) {
       throw new Error(`Supabase returned no counts from ${PRUNE_SCOPE_RPC}.`);
     }
     return counts;
   }

   /** Lists every drive and scope pair one pipeline has stored. */
   export async function listStoredScopes(options: {
     target: PostgrestTarget;
     pipelineName: string;
   }): Promise<readonly StoredScope[]> {
     const response = await _sendPostgrestRequest({
       target: options.target,
       method: "POST",
       table: LIST_SCOPES_RPC,
       params: {},
       body: { p_pipeline_name: options.pipelineName },
     });
     return (await response.json()) as readonly StoredScope[];
   }
   ```

- [ ] **Step 6: Add the count formatting**

Create `scopePruneCounts/scopePruneCounts.ts`:

```ts
import type { ScopePruneCounts } from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";

/**
 * One line saying what pruning a scope does, such as
 * `delete 3 listing(s), keep 1 a workspace uses, ...`.
 */
export function describeScopePruneCounts(counts: ScopePruneCounts): string {
  return [
    `delete ${counts.listings_deleted} listing(s)`,
    `keep ${counts.listings_kept_in_use} a workspace uses`,
    `detach ${counts.listings_detached} another scope still produces`,
    `delete ${counts.checkpoints_deleted} checkpoint(s)`,
  ].join(", ");
}

/** Whether pruning a scope would change nothing at all. */
export function isScopePruneEmpty(counts: ScopePruneCounts): boolean {
  return (
    counts.listings_deleted === 0 &&
    counts.listings_kept_in_use === 0 &&
    counts.listings_detached === 0 &&
    counts.checkpoints_deleted === 0
  );
}
```

- [ ] **Step 7: Share the target announcement**

Create `announcePostgrestTarget/announcePostgrestTarget.ts` holding the body
of `ResetPipelineCli.ts`'s `_announceTarget`, exported, with its imports:

```ts
import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";
import { printInfo, printWarn } from "@ava-cli/utils/cliOutput/cliOutput";
import type { PostgrestTarget } from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";

/**
 * Prints which database a command is about to change, and a warning when it
 * is production.
 */
export function announcePostgrestTarget(target: PostgrestTarget): void {
  const envTarget = AvaEnv.getLoadedEnvTarget();
  printInfo(`Database: ${envTarget} (${target.apiUrl})`);
  if (envTarget === "production") {
    printWarn(
      "WARNING: this will delete rows from the PRODUCTION database. " +
        "Workspaces in production may be using these listings.",
    );
  }
}
```

Delete `_announceTarget` from `ResetPipelineCli.ts` and call
`announcePostgrestTarget` instead.

- [ ] **Step 8: Reset checkpoints first, and add `--scope`**

In `ResetPipelineCli/ResetPipelineCli.ts`:

1. Import `countCheckpoints`, `deleteCheckpoints`, `pruneScope`, and the
   prune-count helpers.
2. Replace `resetPipelineCommand` with:

   ```ts
   /**
    * Deletes a pipeline's listings and checkpoints, or with `scope`, removes
    * one scope from them on every drive. Asks before changing anything.
    *
    * @param options.name - The pipeline's directory name.
    * @param options.scope - Reset only this scope.
    */
   export async function resetPipelineCommand(options: {
     name: string;
     scope?: string;
   }): Promise<void> {
     const { name, scope } = options;
     try {
       const target = getPostgrestTarget();
       announcePostgrestTarget(target);
       if (scope === undefined) {
         await _resetWholePipeline({ name, target });
       } else {
         await _resetScope({ name, scope, target });
       }
     } catch (error: unknown) {
       printError(`Failed to reset pipeline: ${name}`);
       printError(error instanceof Error ? error.message : String(error));
       throw error;
     }
   }
   ```

3. Add `_resetWholePipeline`, moving the old body into it:

   ```ts
   async function _resetWholePipeline(options: {
     name: string;
     target: PostgrestTarget;
   }): Promise<void> {
     const { name, target } = options;
     const filter = buildListingFilterFromPipeline(name);
     const [listingCount, checkpointCount] = await Promise.all([
       countListings({ target, filter }),
       countCheckpoints({ target, pipelineName: name }),
     ]);
     if (listingCount === 0 && checkpointCount === 0) {
       printSuccess(`No ${name} listings or checkpoints to delete.`);
       return;
     }
     const isConfirmed = await promptToConfirmReset(
       `Delete all ${listingCount} ${name} listing(s) and ${checkpointCount} checkpoint(s)?`,
     );
     if (!isConfirmed) {
       printInfo("Reset cancelled. Nothing was deleted.");
       return;
     }
     const inUseListings = await findInUseListings({ target, filter });
     const { datasetIds, keepListingIds } =
       inUseListings.length === 0
         ? { datasetIds: [], keepListingIds: [] }
         : await _resolveInUseListings(inUseListings);
     // Checkpoints go first. If a later delete failed with the checkpoints
     // still there, the next incremental run would resume past listings that
     // are gone and never write them again. Without a checkpoint it only
     // crawls from the start.
     await deleteCheckpoints({ target, pipelineName: name });
     await _deleteChosenRows({
       name,
       target,
       filter,
       datasetIds,
       keepListingIds,
     });
   }
   ```

4. Add `_resetScope`:

   ```ts
   async function _resetScope(options: {
     name: string;
     scope: string;
     target: PostgrestTarget;
   }): Promise<void> {
     const { name, scope, target } = options;
     const pruneArgs = { target, pipelineName: name, scopeKey: scope, driveKey: undefined };
     const planned = await pruneScope({ ...pruneArgs, isDryRun: true });
     if (isScopePruneEmpty(planned)) {
       printSuccess(`No ${name} listings or checkpoints have the scope ${scope}.`);
       return;
     }
     printInfo(`Resetting ${scope} would ${describeScopePruneCounts(planned)}.`);
     const isConfirmed = await promptToConfirmReset(
       `Remove the scope ${scope} from ${name}?`,
     );
     if (!isConfirmed) {
       printInfo("Reset cancelled. Nothing was deleted.");
       return;
     }
     // Only listings this scope alone produces can be deleted, so only their
     // workspace datasets are asked about.
     const inUseListings =
       planned.listings_kept_in_use === 0
         ? []
         : await findInUseListings({
             target,
             filter: {
               ...buildListingFilterFromPipeline(name),
               pipeline_scope_keys: `eq.{${scope}}`,
             },
           });
     const { datasetIds } =
       inUseListings.length === 0
         ? { datasetIds: [] }
         : await _resolveInUseListings(inUseListings);
     if (datasetIds.length > 0) {
       await deleteDatasets({ target, datasetIds });
     }
     const pruned = await pruneScope({ ...pruneArgs, isDryRun: false });
     printSuccess(`Reset ${scope} of ${name}: ${describeScopePruneCounts(pruned)}.`);
   }
   ```

5. Add the option and pass it through:

   ```ts
     .addOption({
       name: "--scope",
       type: "string",
       required: false,
       description:
         "Reset only this scope on every drive: listings only it produces " +
         "are deleted, listings another scope also produces only lose it, " +
         "and its checkpoints are deleted, so the next run crawls it from " +
         "the beginning.",
     })
     .action(({ name, scope }: Readonly<{ name: string; scope?: string }>) => {
       return resetPipelineCommand({ name, scope });
     });
   ```

   and add "Also deletes the pipeline's checkpoints, before any listing." to
   the command's description.

- [ ] **Step 9: Run the tests, type-check, and lint**

```bash
pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts
pnpm exec tsc --noEmit -p tsconfig.node.json
pnpm exec eslint apps/ava-cli/src/PipelineCli
```

Expected: all pass. Run Prettier on the files if lint reports formatting.

- [ ] **Step 10: Commit**

```bash
git add apps/ava-cli/src/PipelineCli
git commit -m "feat(ava-cli): reset pipeline checkpoints first, and reset one scope

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: `ava pipeline prune-retired-scopes`

**Files:**
- Create: `fetchLivePipelineScopes/fetchLivePipelineScopes.ts` and `.test.ts`
- Create: `PruneRetiredScopesCli/findRetiredScopes.ts` and `.test.ts`
- Create: `PruneRetiredScopesCli/PruneRetiredScopesCli.ts` and `.test.ts`
- Modify: `PipelineCli.ts`

- [ ] **Step 1: Write the failing retired-scope tests**

Create `PruneRetiredScopesCli/findRetiredScopes.test.ts`:

```ts
import { findRetiredScopes } from "@ava-cli/PipelineCli/PruneRetiredScopesCli/findRetiredScopes";
import { describe, expect, it } from "vitest";

const HDX = "https://data.humdata.org";
const OLD_DRIVE = "https://retired.invalid";

describe("findRetiredScopes", () => {
  it("finds stored pairs the pipeline no longer declares, including a removed drive's", () => {
    expect(
      findRetiredScopes({
        stored: [
          { drive_key: HDX, scope_key: "format:csv" },
          { drive_key: HDX, scope_key: "format:parquet" },
          { drive_key: OLD_DRIVE, scope_key: "all" },
        ],
        live: [{ driveKey: HDX, scopeKeys: ["format:csv"] }],
        scopeKey: undefined,
      }),
    ).toEqual([
      { driveKey: HDX, scopeKey: "format:parquet" },
      { driveKey: OLD_DRIVE, scopeKey: "all" },
    ]);
  });

  it("keeps only the named scope when one is given", () => {
    expect(
      findRetiredScopes({
        stored: [
          { drive_key: HDX, scope_key: "format:parquet" },
          { drive_key: OLD_DRIVE, scope_key: "all" },
        ],
        live: [{ driveKey: HDX, scopeKeys: ["format:csv"] }],
        scopeKey: "all",
      }),
    ).toEqual([{ driveKey: OLD_DRIVE, scopeKey: "all" }]);
  });

  it("finds nothing when every stored pair is live", () => {
    expect(
      findRetiredScopes({
        stored: [{ drive_key: HDX, scope_key: "format:csv" }],
        live: [{ driveKey: HDX, scopeKeys: ["format:csv", "format:parquet"] }],
        scopeKey: undefined,
      }),
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Write the failing live-scope tests**

Create `fetchLivePipelineScopes/fetchLivePipelineScopes.test.ts`:

```ts
import { spawnSync } from "node:child_process";
import { fetchLivePipelineScopes } from "@ava-cli/PipelineCli/fetchLivePipelineScopes/fetchLivePipelineScopes";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => {
  return { spawnSync: vi.fn() };
});

vi.mock("@ava-cli/PipelineCli/runPipelineLocal", () => {
  return {
    findAvandarRepoRoot: vi.fn(() => {
      return "/repo";
    }),
  };
});

const BODY = {
  drives: [
    {
      driveKey: "https://data.humdata.org",
      scopeKeys: ["format:csv", "format:parquet"],
    },
  ],
};

describe("fetchLivePipelineScopes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    process.env.AVA_PIPELINE_SERVER_URL = "https://pipeline.example/";
    process.env.AVA_PIPELINE_SERVER_SECRET = "secret";
  });

  it("asks the pipeline server, with its secret", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify(BODY), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const scopes = await fetchLivePipelineScopes({
      pipelineName: "hdx",
      local: false,
    });

    expect([scopes, fetchMock.mock.calls[0]]).toEqual([
      BODY.drives,
      [
        "https://pipeline.example/hdx/scopes",
        { headers: { authorization: "Bearer secret" } },
      ],
    ]);
  });

  it("names the status when the server cannot list the scopes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response('{"ok":false,"error":"nope"}', { status: 500 });
      }),
    );

    await expect(
      fetchLivePipelineScopes({ pipelineName: "hdx", local: false }),
    ).rejects.toThrow("answered 500");
  });

  it("runs the local script and reads its last line", async () => {
    vi.mocked(spawnSync).mockReturnValue({
      pid: 1,
      output: [],
      signal: null,
      status: 0,
      stdout: `some log\n${JSON.stringify(BODY)}\n`,
      stderr: "",
    });

    const scopes = await fetchLivePipelineScopes({
      pipelineName: "hdx",
      local: true,
    });

    expect([scopes, vi.mocked(spawnSync).mock.calls[0]?.[1]]).toEqual([
      BODY.drives,
      [
        "exec",
        "vite-node",
        "--config",
        "vite.script.config.ts",
        "/repo/scripts/listPipelineScopes.ts",
        "hdx",
      ],
    ]);
  });
});
```

- [ ] **Step 3: Write the failing command tests**

Create `PruneRetiredScopesCli/PruneRetiredScopesCli.test.ts`:

```ts
import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";
import { fetchLivePipelineScopes } from "@ava-cli/PipelineCli/fetchLivePipelineScopes/fetchLivePipelineScopes";
import { pruneRetiredScopesCommand } from "@ava-cli/PipelineCli/PruneRetiredScopesCli/PruneRetiredScopesCli";
import { promptToConfirmReset } from "@ava-cli/PipelineCli/ResetPipelineCli/resetPipelinePrompts";
import { Acclimate } from "@avandar/acclimate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ava-cli/PipelineCli/ResetPipelineCli/resetPipelinePrompts", () => {
  return {
    promptToConfirmReset: vi.fn(async () => {
      return true;
    }),
    promptForInUseListingsChoice: vi.fn(),
  };
});

vi.mock(
  "@ava-cli/PipelineCli/fetchLivePipelineScopes/fetchLivePipelineScopes",
  () => {
    return {
      fetchLivePipelineScopes: vi.fn(async () => {
        return [
          { driveKey: "https://data.humdata.org", scopeKeys: ["format:csv"] },
        ];
      }),
    };
  },
);

const API_URL = "http://127.0.0.1:54321";
const PRUNE_RPC = "rpc/rpc_data_catalog_listings__prune_pipeline_scope";
const LIST_RPC = "rpc/rpc_data_catalog_listings__list_pipeline_scopes";

type RecordedPost = Readonly<{ table: string; body: unknown }>;

/**
 * Stubs `fetch` as PostgREST's two scope RPCs: the list RPC returns
 * `storedScopes`, the prune RPC returns fixed counts.
 */
function _mockScopeRpcs(
  storedScopes: ReadonlyArray<Readonly<{ drive_key: string; scope_key: string }>>,
): RecordedPost[] {
  const posts: RecordedPost[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: { body?: string }) => {
      const table = new URL(input).pathname.replace("/rest/v1/", "");
      posts.push({ table, body: JSON.parse(init?.body ?? "null") });
      if (table === LIST_RPC) {
        return new Response(JSON.stringify(storedScopes));
      }
      return new Response(
        JSON.stringify([
          {
            listings_deleted: 2,
            listings_kept_in_use: 0,
            listings_detached: 1,
            checkpoints_deleted: 1,
          },
        ]),
      );
    }),
  );
  return posts;
}

function _pruneCalls(posts: readonly RecordedPost[]): unknown[] {
  return posts
    .filter((post) => {
      return post.table === PRUNE_RPC;
    })
    .map((post) => {
      return post.body;
    });
}

function _getCombinedLogs(): string {
  const logCalls = (Acclimate.log as unknown as { mock: { calls: unknown[] } })
    .mock.calls;
  return logCalls.flat().join("\n");
}

const RETIRED = {
  drive_key: "https://data.humdata.org",
  scope_key: "format:parquet",
};
const LIVE = { drive_key: "https://data.humdata.org", scope_key: "format:csv" };

describe("pruneRetiredScopesCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_SUPABASE_API_URL = API_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_test";
    vi.spyOn(Acclimate, "log").mockImplementation(() => {});
    vi.spyOn(AvaEnv, "getLoadedEnvTarget").mockReturnValue("local");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dry-runs each retired scope, prints it, and changes nothing with --dry-run", async () => {
    const posts = _mockScopeRpcs([LIVE, RETIRED]);

    await pruneRetiredScopesCommand({ name: "hdx", isDryRun: true, local: false });

    expect([
      _pruneCalls(posts),
      vi.mocked(promptToConfirmReset).mock.calls.length,
      _getCombinedLogs(),
    ]).toEqual([
      [
        {
          p_pipeline_name: "hdx",
          p_scope_key: "format:parquet",
          p_drive_key: "https://data.humdata.org",
          p_is_dry_run: true,
        },
      ],
      0,
      expect.stringContaining(
        "https://data.humdata.org [format:parquet]: delete 2 listing(s)",
      ),
    ]);
  });

  it("prunes each retired scope for real once confirmed", async () => {
    const posts = _mockScopeRpcs([LIVE, RETIRED]);

    await pruneRetiredScopesCommand({ name: "hdx", isDryRun: false, local: false });

    expect(
      _pruneCalls(posts).map((body) => {
        return (body as { p_is_dry_run: boolean }).p_is_dry_run;
      }),
    ).toEqual([true, false]);
  });

  it("changes nothing when the prune is declined", async () => {
    vi.mocked(promptToConfirmReset).mockResolvedValueOnce(false);
    const posts = _mockScopeRpcs([LIVE, RETIRED]);

    await pruneRetiredScopesCommand({ name: "hdx", isDryRun: false, local: false });

    expect(_pruneCalls(posts)).toHaveLength(1);
  });

  it("reports that nothing is retired and prunes nothing", async () => {
    const posts = _mockScopeRpcs([LIVE]);

    await pruneRetiredScopesCommand({ name: "hdx", isDryRun: false, local: false });

    expect([_pruneCalls(posts), _getCombinedLogs()]).toEqual([
      [],
      expect.stringContaining("no retired scopes"),
    ]);
  });

  it("refuses --local against a deployed database before reading anything", async () => {
    vi.mocked(AvaEnv.getLoadedEnvTarget).mockReturnValue("production");
    const posts = _mockScopeRpcs([RETIRED]);

    await expect(
      pruneRetiredScopesCommand({ name: "hdx", isDryRun: true, local: true }),
    ).rejects.toThrow("--local");
    expect([posts, vi.mocked(fetchLivePipelineScopes).mock.calls]).toEqual([
      [],
      [],
    ]);
  });
});
```

- [ ] **Step 4: Watch them fail**

```bash
pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts src/PipelineCli/PruneRetiredScopesCli src/PipelineCli/fetchLivePipelineScopes
```

Expected: FAIL, the modules do not exist.

- [ ] **Step 5: Find retired scopes**

Create `PruneRetiredScopesCli/findRetiredScopes.ts`:

```ts
import type { LiveDriveScopes } from "@ava-cli/PipelineCli/fetchLivePipelineScopes/fetchLivePipelineScopes";
import type { StoredScope } from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";

/** A drive and scope a pipeline has stored but no longer declares. */
export type RetiredScope = Readonly<{ driveKey: string; scopeKey: string }>;

/**
 * The stored drive and scope pairs that are not live, in stored order. A
 * drive the pipeline no longer lists has all of its scopes retired.
 *
 * @param args.stored - What the list RPC returned.
 * @param args.live - What the pipeline declares today.
 * @param args.scopeKey - Keep only this scope, when given.
 */
export function findRetiredScopes(args: {
  stored: readonly StoredScope[];
  live: readonly LiveDriveScopes[];
  scopeKey: string | undefined;
}): RetiredScope[] {
  const livePairs = new Set(
    args.live.flatMap((drive) => {
      return drive.scopeKeys.map((scopeKey) => {
        return JSON.stringify([drive.driveKey, scopeKey]);
      });
    }),
  );
  return args.stored
    .filter((pair) => {
      return (
        !livePairs.has(JSON.stringify([pair.drive_key, pair.scope_key])) &&
        (args.scopeKey === undefined || pair.scope_key === args.scopeKey)
      );
    })
    .map((pair) => {
      return { driveKey: pair.drive_key, scopeKey: pair.scope_key };
    });
}
```

- [ ] **Step 6: Read live scopes**

Create `fetchLivePipelineScopes/fetchLivePipelineScopes.ts`:

```ts
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { getPipelineServerClientConfig } from "@ava-cli/PipelineCli/getPipelineServerClientConfig";
import { findAvandarRepoRoot } from "@ava-cli/PipelineCli/runPipelineLocal";
import { z } from "zod";

/** One drive's live scope keys, as a pipeline declares them today. */
export type LiveDriveScopes = Readonly<{
  driveKey: string;
  scopeKeys: readonly string[];
}>;

/** `GET /:pipelineName/scopes`'s body, which the local script also prints. */
const LiveScopesBodySchema = z.object({
  drives: z.array(
    z.object({ driveKey: z.string(), scopeKeys: z.array(z.string()) }),
  ),
});

async function _fetchServerScopes(
  pipelineName: string,
): Promise<readonly LiveDriveScopes[]> {
  const config = getPipelineServerClientConfig();
  const response = await fetch(
    `${config.baseURL}/${encodeURIComponent(pipelineName)}/scopes`,
    { headers: { authorization: `Bearer ${config.serverSecret}` } },
  );
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `The pipeline server answered ${response.status} listing the ${pipelineName} pipeline's scopes: ${text}`,
    );
  }
  return LiveScopesBodySchema.parse(JSON.parse(text)).drives;
}

function _readLocalScopes(pipelineName: string): readonly LiveDriveScopes[] {
  const repoRoot = findAvandarRepoRoot();
  if (repoRoot === undefined) {
    throw new Error(
      "Could not find the Avandar repo root. Run this command from inside the repository.",
    );
  }
  const spawnResult = spawnSync(
    "pnpm",
    [
      "exec",
      "vite-node",
      "--config",
      "vite.script.config.ts",
      join(repoRoot, "scripts", "listPipelineScopes.ts"),
      pipelineName,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (spawnResult.error) {
    throw spawnResult.error;
  }
  if (spawnResult.status !== 0) {
    throw new Error(
      `Listing the ${pipelineName} pipeline's scopes locally failed: ${(spawnResult.stderr ?? "").trim()}`,
    );
  }
  const lastLine = (spawnResult.stdout ?? "").trim().split("\n").at(-1) ?? "";
  return LiveScopesBodySchema.parse(JSON.parse(lastLine)).drives;
}

/**
 * Lists a pipeline's live scopes: from the pipeline server named by the
 * loaded env file, or with `local`, from this checkout's code through
 * `scripts/listPipelineScopes.ts`.
 *
 * @throws When the server or the script fails, or answers in another shape.
 */
export async function fetchLivePipelineScopes(options: {
  pipelineName: string;
  local: boolean;
}): Promise<readonly LiveDriveScopes[]> {
  return options.local
    ? _readLocalScopes(options.pipelineName)
    : await _fetchServerScopes(options.pipelineName);
}
```

- [ ] **Step 7: Write the command**

Create `PruneRetiredScopesCli/PruneRetiredScopesCli.ts`:

```ts
import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";
import { announcePostgrestTarget } from "@ava-cli/PipelineCli/announcePostgrestTarget/announcePostgrestTarget";
import { fetchLivePipelineScopes } from "@ava-cli/PipelineCli/fetchLivePipelineScopes/fetchLivePipelineScopes";
import { findRetiredScopes } from "@ava-cli/PipelineCli/PruneRetiredScopesCli/findRetiredScopes";
import {
  getPostgrestTarget,
  listStoredScopes,
  pruneScope,
} from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";
import { promptToConfirmReset } from "@ava-cli/PipelineCli/ResetPipelineCli/resetPipelinePrompts";
import { describeScopePruneCounts } from "@ava-cli/PipelineCli/scopePruneCounts/scopePruneCounts";
import {
  printError,
  printInfo,
  printSuccess,
} from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";
import { promiseMapSequential } from "@avandar/utils";
import type { RetiredScope } from "@ava-cli/PipelineCli/PruneRetiredScopesCli/findRetiredScopes";
import type {
  PostgrestTarget,
  ScopePruneCounts,
} from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";

type _PlannedPrune = RetiredScope & Readonly<{ counts: ScopePruneCounts }>;

/**
 * Refuses `--local` outside the development database: a checkout can be
 * behind or ahead of what a deployed server crawls, which would make live
 * scopes look retired.
 */
function _assertLocalOnlyInDevelopment(isLocal: boolean): void {
  if (isLocal && AvaEnv.getLoadedEnvTarget() !== "local") {
    throw new Error(
      "--local reads scopes from this checkout, which can differ from what a deployed pipeline server crawls. Run without --local against staging or production.",
    );
  }
}

function _pruneOne(args: {
  target: PostgrestTarget;
  name: string;
  retired: RetiredScope;
  isDryRun: boolean;
}): Promise<ScopePruneCounts> {
  return pruneScope({
    target: args.target,
    pipelineName: args.name,
    scopeKey: args.retired.scopeKey,
    driveKey: args.retired.driveKey,
    isDryRun: args.isDryRun,
  });
}

function _formatPrune(prune: _PlannedPrune): string {
  return `${prune.driveKey} [${prune.scopeKey}]: ${describeScopePruneCounts(prune.counts)}`;
}

async function _pruneAll(args: {
  target: PostgrestTarget;
  name: string;
  plans: readonly _PlannedPrune[];
}): Promise<void> {
  // Sequential on purpose: each prune is its own transaction, so a failure
  // leaves the earlier ones done and a rerun picks up the rest.
  await promiseMapSequential(args.plans, async (plan) => {
    const counts = await _pruneOne({ ...args, retired: plan, isDryRun: false });
    printSuccess(`Pruned ${_formatPrune({ ...plan, counts })}`);
  });
}

/**
 * Finds the scopes a pipeline has stored but no longer declares, prints
 * what pruning each would do, and after a confirmation prunes them: listings
 * only a retired scope produces are deleted unless a workspace uses them,
 * other listings only lose the key, and the scope's checkpoint is deleted.
 *
 * @param options.name - The pipeline's directory name.
 * @param options.scope - Prune only this scope.
 * @param options.isDryRun - Print the plan and change nothing.
 * @param options.local - Read live scopes from this checkout, not the server.
 */
export async function pruneRetiredScopesCommand(options: {
  name: string;
  scope?: string;
  isDryRun: boolean;
  local: boolean;
}): Promise<void> {
  const { name } = options;
  try {
    _assertLocalOnlyInDevelopment(options.local);
    const target = getPostgrestTarget();
    announcePostgrestTarget(target);
    const [live, stored] = await Promise.all([
      fetchLivePipelineScopes({ pipelineName: name, local: options.local }),
      listStoredScopes({ target, pipelineName: name }),
    ]);
    const retired = findRetiredScopes({ stored, live, scopeKey: options.scope });
    if (retired.length === 0) {
      printSuccess(`The ${name} pipeline has no retired scopes.`);
      return;
    }
    const plans = await promiseMapSequential(retired, async (pair) => {
      const counts = await _pruneOne({ target, name, retired: pair, isDryRun: true });
      return { ...pair, counts };
    });
    plans.forEach((plan) => {
      printInfo(_formatPrune(plan));
    });
    if (options.isDryRun) {
      printInfo("Dry run: nothing was changed.");
      return;
    }
    if (!(await promptToConfirmReset(`Prune ${plans.length} retired scope(s) of ${name}?`))) {
      printInfo("Prune cancelled. Nothing was changed.");
      return;
    }
    await _pruneAll({ target, name, plans });
  } catch (error: unknown) {
    printError(`Failed to prune retired scopes of pipeline: ${name}`);
    printError(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export const PruneRetiredScopesCli = Acclimate.createCLI("prune-retired-scopes")
  .description(
    "Remove what a pipeline wrote for scopes it no longer declares. Prints " +
      "what each retired scope's prune would do, then asks before changing " +
      "anything. Listings a workspace uses are never deleted. Reads live " +
      "scopes from the pipeline server and the database in .env.development, " +
      "or the --staging/--prod ones.",
  )
  .addPositionalArg({
    name: "name",
    required: true,
    description: "The pipeline whose retired scopes to prune.",
    type: "string",
  })
  .addOption({
    name: "--scope",
    type: "string",
    required: false,
    description: "Prune only this retired scope.",
  })
  .addOption({
    name: "--dry-run",
    type: "boolean",
    required: false,
    defaultValue: false,
    description: "Print what would be pruned and change nothing.",
  })
  .addOption({
    name: "--local",
    aliases: ["-l"] as const,
    type: "boolean",
    required: false,
    defaultValue: false,
    description:
      "Read live scopes from this checkout instead of the pipeline server. " +
      "Only against the development database.",
  })
  .action(
    (
      args: Readonly<{
        name: string;
        scope?: string;
        dryRun: boolean;
        local: boolean;
      }>,
    ) => {
      return pruneRetiredScopesCommand({
        name: args.name,
        scope: args.scope,
        isDryRun: args.dryRun,
        local: args.local,
      });
    },
  );
```

If `pruneRetiredScopesCommand` runs over 45 lines after Prettier, move the
"plan, print, dry run" part into a `_planPrunes` helper.

- [ ] **Step 8: Register the command**

In `PipelineCli.ts`, import `PruneRetiredScopesCli` and add
`.addCommand("prune-retired-scopes", PruneRetiredScopesCli)` after the
`reset` command.

- [ ] **Step 9: Run the tests, type-check, and lint**

```bash
pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts
pnpm exec tsc --noEmit -p tsconfig.node.json
pnpm exec eslint apps/ava-cli/src/PipelineCli
pnpm build:ava-cli
ava pipeline prune-retired-scopes --help
```

Expected: all pass, and the help lists `--scope`, `--dry-run`, and `--local`.

- [ ] **Step 10: Commit**

```bash
git add apps/ava-cli/src/PipelineCli
git commit -m "feat(ava-cli): add ava pipeline prune-retired-scopes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Phase G: Docs and verification

### Task 20: Update the docs

**Files:**
- Modify: `packages/node/etl/README.md`
- Modify: `apps/pipeline-server/README.md`
- Modify: `docs/measles-demo/open-data-catalog-architecture.md`
- Modify: `docs/measles-demo/connector-nomenclature.md`
- Modify: `docs/superpowers/specs/2026-10-21-etl-crawl-scopes-design.md`

- [ ] **Step 1: The engine README**

In `packages/node/etl/README.md`:

1. In the intro bullet for `EtlEngine`, say it crawls each scope of each
   drive oldest-first.
2. Replace the "Run modes" table with:

   ```markdown
   | Options | Each crawl's window |
   | --- | --- |
   | `{ mode: "full" }` | No lower bound: every connection is fetched |
   | `{ mode: "incremental" }` | From the scope's checkpoint, or no lower bound when it has none |
   | `{ since }` | From `since` (inclusive), in either mode |
   | `{ until }` | Adds an exclusive upper bound |
   | `{ limit }` | Stops after this many connections across all crawls |
   | `{ scopes }` | Crawls only these scope keys |
   ```

3. Add a **Scopes** paragraph before **Resuming**:

   ```markdown
   **Scopes.** A crawl is one scope of one drive. `listScopes(drive)` returns
   the drive's scopes, each an object with a `key` plus whatever its
   `extract` and `transform` need, and omitting it gives every drive one
   scope, `all`. `extract` should narrow to the scope at the source where it
   can, and `transform` must return only the scope's relations. Keys match
   `ETL_SCOPE_KEY_PATTERN` and are unique within a drive. A key is the
   scope's identity: change it when the scope's meaning changes, and the new
   key crawls from the beginning. Every row records the scopes that produce
   it in `pipeline_scope_keys`. `listScopes()` on the engine returns each
   drive's live keys without crawling.
   ```

4. Replace the **Resuming** and **The high-water mark** paragraphs with:

   ```markdown
   **Resuming.** With `incremental` config, connections must arrive oldest
   first, and each page is written before the next is fetched. After each
   page, the scope's checkpoint moves to the page's newest connection
   timestamp, so an incremental run resumes after a cancelled run, a
   limited run, or a finished one. The lower bound is inclusive, so
   connections that share the checkpoint's timestamp are fetched again and
   skipped if unchanged.

   **Checkpoints** live in the checkpoints table (`output.checkpointsTable`,
   or `stores.checkpoints` in tests), one per pipeline, drive, and scope. A
   checkpoint records what was crawled, not what was written, so a scope
   whose connections all produce no relations still advances. It never moves
   backward, ignores timestamps later than the run's start, and does not
   move during a crawl whose explicit `since` is later than it, which would
   leave a gap.
   ```

5. In **Ordering and timestamps**, replace the third bullet's explanation
   with: "The two should come from one parsed value."
6. In **Failures**, change "drive" to "crawl" where it means one crawl, add
   "`scopes` is empty, invalid, or names a scope no drive declares" to the
   invalid options, and add a bullet: "A drive whose key or scopes cannot be
   read, or whose scope keys are invalid, is reported `failed` once, with
   scope key `listScopes`."
7. In **Caveats**, delete the first bullet (the `since` gap), and in the
   second replace "the first upsert has already moved the high-water mark"
   with "the checkpoint has already moved past the connection".
8. In the output contract's first table row, add `pipeline_scope_keys`, and
   add after the table:

   ```markdown
   The checkpoints table needs `pipeline_name`, `drive_key`, `scope_key`,
   `high_water_mark` (`timestamptz`), and `pipeline_run_id`, unique on the
   first three. It is required when the config has `incremental`.
   ```

9. In "Testing a pipeline", import `createInMemoryCheckpointStore` and pass
   `checkpoints: createInMemoryCheckpointStore()` in the example's `stores`.

Then `grep -n "high-water\|readHighWaterMark" packages/node/etl/README.md`
must print nothing.

- [ ] **Step 2: The pipeline server README**

In `apps/pipeline-server/README.md`, in "Running one pipeline", add these
lines to the example block:

```bash
ava pipeline run hdx --local --incremental --scope format:parquet  # one scope only
ava pipeline reset hdx --scope format:parquet    # forget one scope: its next run starts from the beginning
ava pipeline prune-retired-scopes hdx --dry-run  # what removing undeclared scopes would delete
```

and replace the paragraph's first sentence with: "`--incremental` starts
each scope of each drive at its checkpoint, so it also continues a run that
was cancelled or stopped by `--limit`, and a scope that has never been
crawled starts from the beginning." Add after it:

```markdown
A scope is a slice of a drive that is crawled and resumed on its own: `hdx`
has `format:csv` and `format:parquet`, and a Socrata drive has `all` unless
`CONFIGURED_DRIVES` gives it category or tag scopes. Removing a scope from
the code only stops crawling it. `ava pipeline prune-retired-scopes` deletes
what only retired scopes produced, after a confirmation, and never a listing
a workspace uses. `ava pipeline reset` deletes the pipeline's checkpoints
before its listings, and `--scope` resets one scope.
```

Change "Every run prints one line per drive" to "Every run prints one line
per crawl (a drive and scope)", and "When every drive fails" to "When every
crawl fails".

- [ ] **Step 3: The architecture doc and nomenclature**

In `docs/measles-demo/open-data-catalog-architecture.md`, replace the
sentence "`ava pipeline run <name> --incremental` therefore resumes each
drive from the newest `date_of_last_update` it already holds, whether the
last run finished, was cancelled, or stopped at `--limit`." with:

```markdown
`ava pipeline run <name> --incremental` therefore resumes each scope of
each drive from its checkpoint in `pipeline_scope_checkpoints`, whether the
last run finished, was cancelled, or stopped at `--limit`, and a new scope,
such as a newly supported HDX format, is crawled from the beginning.
```

and add a link to the scopes spec,
`../superpowers/specs/2026-10-21-etl-crawl-scopes-design.md`, after the
existing engine spec link.

In `docs/measles-demo/connector-nomenclature.md`, after the table of layers,
add:

```markdown
**Scope** is not a layer. It is a pipeline's named slice of one drive, such
as the CSV resources on HDX or one category on a Socrata portal, that an
incremental run crawls and resumes on its own. It filters connections and
relations inside a drive. See
[the scopes spec](../superpowers/specs/2026-10-21-etl-crawl-scopes-design.md).
```

- [ ] **Step 4: Write the plan's refinements back into the spec**

In `docs/superpowers/specs/2026-10-21-etl-crawl-scopes-design.md`, add a
section after section 10:

```markdown
## 11. Refinements made while planning

1. The prune RPC takes `(p_pipeline_name, p_scope_key, p_drive_key,
   p_is_dry_run)`. `p_drive_key` may be null for every drive, which is how
   `ava pipeline reset --scope` prunes in one call, and it returns
   `checkpoints_deleted` as a count.
2. A second RPC, `rpc_data_catalog_listings__list_pipeline_scopes`, returns
   a pipeline's distinct stored drive and scope pairs, so prune never reads
   every listing.
3. `data_catalog_listings__pipeline_drive_last_update` is kept: the RPCs and
   the checkpoint seed filter on `pipeline_name` and `api_base_url`.
4. `--local` live scopes come from `scripts/listPipelineScopes.ts`, not a
   mode of `runPipelineOnce.ts`.
5. A drive that fails before its scopes are known, including when its key
   cannot be read or it declares no scopes, has one report entry with scope
   key `listScopes`.
6. `pipeline_scope_checkpoints` is excluded from the desktop SQLite mirror.
7. The app's listing model carries `pipelineScopeKeys`.
8. `ava pipeline reset` deletes checkpoints even when the pipeline has no
   listings.
```

and fix the sections they change: in 5.7, replace the `--list-scopes` mode
of `scripts/runPipelineOnce.ts` with `scripts/listPipelineScopes.ts` and
give the RPC's new parameter order; in 5.9, replace the sentence that drops
the index with one saying it is kept and why.

- [ ] **Step 5: Check for stale wording and em dashes**

```bash
grep -rn "readHighWaterMark\|high-water mark of one drive" packages/node/etl apps/pipeline-server apps/ava-cli docs/measles-demo --include='*.md' --include='*.ts' | grep -v node_modules
git diff -U0 develop -- packages apps docs shared scripts supabase | grep '^+' | grep -n '—'
```

Expected: both print nothing. (`high-water mark` may still appear where it
names a checkpoint's value, as in `high_water_mark`.)

- [ ] **Step 6: Commit**

```bash
git add packages/node/etl/README.md apps/pipeline-server/README.md \
  docs/measles-demo/open-data-catalog-architecture.md \
  docs/measles-demo/connector-nomenclature.md \
  docs/superpowers/specs/2026-10-21-etl-crawl-scopes-design.md
git commit -m "docs(etl): describe crawl scopes, checkpoints, and pruning

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: Verify everything, then run the pipelines for real

Everything below runs against this worktree's switched local stack only.

`ava pipeline reset` and `ava pipeline prune-retired-scopes` (without
`--dry-run`) ask for confirmation and refuse to run without a terminal. Give
them one with `script`, and feed the answers with delays, as in:

```bash
(sleep 3; printf 'y\r'; sleep 3) | script -q /dev/null ava pipeline reset socrata 2>&1 \
  | sed 's/\x1b\[[0-9;?]*[a-zA-Z]//g' | tr -d '\r' | tail -12
```

When a second prompt follows (the in-use listings question), add
`printf '1\r'; sleep 3;` after the first answer.

- [ ] **Step 1: The full automated suite**

```bash
ava supabase status
pnpm --filter @avandar/etl exec vitest run
pnpm --filter @avandar/etl test:supabase
pnpm --filter @avandar/etl build
pnpm --filter @avandar/pipeline-server exec vitest run -c vitest.config.ts
pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts
pnpm exec vitest run shared
pnpm exec tsc --noEmit -p tsconfig.node.json
pnpm type-check
pnpm test:db
pnpm exec eslint packages/node/etl apps/pipeline-server apps/ava-cli/src/PipelineCli shared/connectors/open-data scripts/listPipelineScopes.ts scripts/runPipelineOnce.ts
pnpm build:ava-cli
```

Expected: every command passes. Record the pass counts for the report.

- [ ] **Step 2: M1, the upgrade on real listings**

Reload the listings Task 1 saved, put them back in their pre-scope shape,
and replay the seed migration (local Postgres only):

```bash
DB="postgresql://postgres:postgres@127.0.0.1:55342/postgres"
CSV=.temp/feat-demo-measles/listings-before-scopes.csv
COLUMNS=$(head -1 "$CSV")
psql "$DB" -c "delete from public.pipeline_scope_checkpoints; delete from public.data_catalog_listings where pipeline_name in ('hdx', 'socrata');"
psql "$DB" -c "\copy public.data_catalog_listings ($COLUMNS) from '$CSV' with (format csv, header true)"
psql "$DB" -f supabase/migrations/*_seed_pipeline_scope_keys_and_checkpoints.sql
psql "$DB" -c "select pipeline_name, drive_key, scope_key, high_water_mark from public.pipeline_scope_checkpoints order by 1, 2, 3;"
psql "$DB" -c "select pipeline_name, pipeline_scope_keys, count(*) from public.data_catalog_listings group by 1, 2 order by 1, 2;"
```

If the `\copy` fails on a row whose id already exists, the earlier delete
missed it: delete by `id` from the CSV and retry. Expected: HDX has
`format:csv` and `format:parquet` checkpoints at the same instant, Socrata
has one `all` checkpoint, and every HDX and Socrata listing has one key.

Then, with the pipeline server running locally or with `--local`:

```bash
ava pipeline run hdx --local --incremental
```

Expected: both HDX crawls start at the seeded checkpoint (the report's
window starts there, not at "the start") and write few or no rows. Record
the counts. If Task 1 saved no listings, run `ava pipeline run hdx --local
--limit 200`, then the incremental run, and check the second resumes.

- [ ] **Step 3: M2, one scope starts over**

```bash
psql "$DB" -c "delete from public.pipeline_scope_checkpoints where pipeline_name = 'hdx' and scope_key = 'format:parquet';"
ava pipeline run hdx --local --incremental
```

Expected: `format:parquet` crawls from the start (3 or so datasets on HDX)
and `format:csv` resumes from its checkpoint.

- [ ] **Step 4: M3, a new Socrata scope backfills**

Make a local-only edit, not committed: in
`apps/pipeline-server/pipelines/socrata/configuredDrives/configuredDrives.ts`,
give the NYC drive
`scopes: [{ key: "all" }, { key: "category:education", categories: ["Education"] }]`.

```bash
ava pipeline run socrata --local --incremental
psql "$DB" -c "select pipeline_scope_keys, count(*) from public.data_catalog_listings where pipeline_name = 'socrata' group by 1;"
```

Expected: `all` resumes, `category:education` crawls from the start, and
about 580 listings now carry both keys. Keep the edit for Step 5.

- [ ] **Step 5: M4, retire and prune**

Change the local edit to drop `all`, leaving only `category:education`, then:

```bash
ava pipeline prune-retired-scopes socrata --local --dry-run
```

Expected: one line for `https://data.cityofnewyork.us [all]`, deleting the
listings outside Education, detaching the Education ones, and deleting one
checkpoint. Before the real prune, add one non-Education NYC listing to a
workspace through the app (seed user from `seed/SeedData.ts`, headless
Playwright, screenshots in `.temp/feat-demo-measles/`), or record that you
skipped this part and why. Then:

```bash
ava pipeline prune-retired-scopes socrata --local
```

Answer yes. Expected: the counts match the dry run, and the workspace's
listing is still there with key `all`. Revert the local edit with
`git checkout -- apps/pipeline-server/pipelines/socrata/configuredDrives/configuredDrives.ts`
(this file only).

- [ ] **Step 6: M5, reset**

```bash
ava pipeline reset socrata --scope category:education
ava pipeline reset socrata
ava pipeline run socrata --local --incremental --limit 20
```

Expected: the scope reset removes only that key's listings and checkpoint,
the full reset deletes checkpoints and then listings, and the next
incremental run starts from the beginning.

- [ ] **Step 7: Report**

Report every command's result, the M1 to M5 outcomes with their counts, and
anything skipped and why. Do not commit anything in this task, and confirm
`git status --short` shows only `supabase/config.toml` (and any file you
did not touch) modified.

---

## Self-review checklist (for the plan author, already applied)

- **Spec coverage.** 5.1 scopes: Tasks 7, 8, 10. 5.2 versioned keys: Task 13
  (pinned keys), Task 20. 5.3 checkpoints: Tasks 1, 5, 6, 8, 9. 5.4 run flow:
  Task 10. 5.5 scope keys on rows: Tasks 1, 3, 7. 5.6 API: Tasks 5 to 10.
  5.7 prune and reset: Tasks 2, 16, 18, 19. 5.8 pipelines: Tasks 11 to 14.
  5.9 schema: Tasks 1 to 4. 5.10 CLI and server: Tasks 15 to 19. Section 7
  errors: Tasks 9, 10, 18, 19. Section 8 tests: S1 to S16 across Tasks 7 to
  10, M1 to M5 in Task 21.
- **Placeholders.** None. Where a step depends on a value only the
  implementer sees (a migration timestamp, an existing test's constant
  name), it says exactly what to substitute.
- **Type consistency.** `CheckpointStore.read/write`, `StoredCheckpoint`,
  `EtlScope`, `ETL_DEFAULT_SCOPE`, `ETL_SCOPE_KEY_PATTERN`,
  `ETL_UNLISTED_SCOPE_KEY`, `EtlCrawlReport`, `EtlDriveScopes`,
  `EtlRunOptions.scopes`, `listScopes`, `crawls`, `scopeKey`,
  `pipeline_scope_keys`, `HdxScope.resourceFormat`, `SocrataScope`,
  `ScopePruneCounts`, and `StoredScope` are spelled the same in every task.
