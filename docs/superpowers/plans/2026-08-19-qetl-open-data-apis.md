# QETL Open Data APIs and HDX/CKAN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize `catalog_entries__open_data` from "a Parquet blob a pipeline produced" to a discriminated access shape, and land HDX/CKAN as the first API-backed source, as a plain module with an injected HTTP layer.

**Architecture:** The catalog entry gains an `access_kind` discriminant with two shapes. `shared/CkanClient/` talks CKAN over an injected HTTP layer. `shared/open-data/acquireOpenDataResource.ts` turns one entry into `{ contentKind, bytes, sourceVersion }`. No `SourceWrapper`, no registry change, no cache: at integration time `DatasetParquetWrapper._downloadOpenDataParquet`'s body calls this module.

**Tech Stack:** TypeScript, Zod, Vitest (jsdom project plus the node "executed" project), `@duckdb/node-api`, Postgres 15, pgTAP, SQLite (desktop mirror).

**Spec:** `docs/superpowers/specs/2026-08-19-qetl-open-data-apis-design.md`

---

## Read this before trusting any code block

**Every TypeScript and SQL block in this plan is illustrative and was never
compiled or executed.** They were written against types and schema read out of
the repo, but that is not the same as compiling them. The QETL phase-1 plans
shipped sample code that failed to compile in at least tasks 5, 7, 11 and 14, and
a banner had to be added saying the repo is the authority. This is that banner.

**The repository is the authority.** Read the real types before writing, and treat
a divergence between this plan and the code as the plan being wrong. Report the
divergence rather than bending the code to match.

**Treat a conflict between a code sample and prose as the sample being wrong.**
Two of the five defects found in the earlier plans were the plan contradicting its
own stated invariant.

**Spec section 3 is different.** Its shell transcripts and measured numbers were
produced against the live HDX API and are reproducible. Where this plan cites a
number, it comes from there.

## Conventions this plan follows

Enforced by `docs/rules/typescript.md`, `docs/rules/testing.md`,
`docs/rules/sql.md`, `AGENTS.md`, and the `avandar-code-review` skill.

- **Everything this plan creates under `shared/` is Deno-reachable, so every
  import must carry its `.ts` extension**, and **must not import `@/...`**.
  `pnpm type-check` runs `deno check shared`, so a `@/` import there fails the
  build. This is the single most likely mechanical failure in this plan.
- `type`, never `interface`. `undefined`, never `null`, in model types. String
  literal unions, never TypeScript enums. Named exports, never default.
- Non-exported top-level helpers are prefixed `_`.
- JSDoc on every exported symbol. Comments wrap at 80 characters, describe the
  present, and **never reference this plan, its task numbers, or the spec's
  section numbers** (`AGENTS.md`: a reader has no access to them).
- **Banned names.** No `resolve...` or `_resolve...` for a conversion or lookup
  (`docs/rules/typescript.md:272` and `:310`; violated three times already). No
  function named `probe`, which is reserved for `RelationCachePort`. The
  `wholeRelationAcquirable: "probe"` capability **value** is fine.
- **Pure functions get their own module** and never live beside a client
  singleton. Importing a pure helper out of a client module once dragged
  `@lingui/core/macro` into a Node test and broke it.
- **No test that restates the type system.** A test asserting a field exists is a
  failure; the compiler owns that. Test behaviour, outputs and error branches.
- Split test files live in `__tests__/`.
- Thrown `Error` messages here are **not** user-facing, so they are not
  translated. Nothing in this plan renders text.

**Commands:**

| Purpose | Command |
|---|---|
| Frontend tests (jsdom) | `pnpm test:frontend <pattern>` |
| Executed tests (node, real DuckDB) | `pnpm test:executed <pattern>` |
| Type check (includes `deno check shared`) | `pnpm type-check` |
| Lint (eslint + stylelint + react-doctor) | `pnpm lint` |
| Database tests (pgTAP + privileges) | `pnpm test:db` |
| Reset local database | `pnpm db:reset` |
| Generate a migration | `pnpm db:new-migration <name>` |
| Regenerate DB types | `pnpm db:gen-types` |
| Desktop SQLite migrations | `pnpm desktop:sqlite:gen-migrations` |

**All four of these must be green before Task 1 and after Task 12:**
`pnpm test:frontend`, `pnpm test:executed`, `pnpm type-check`, `pnpm lint`.
`pnpm lint` is in the list because a previous session reported green having run
only the first three and had shipped a stylelint failure.

**Verified green on this branch at `525396e0` on 2026-08-19**, all four, before
any edit. If one is red when you start, stop and find out why rather than
building on it.

## Execution record (2026-08-19)

This plan was executed in the same session that wrote it. Tasks 0 to 12 are done
except where noted. Recorded here so a reader knows what was proved rather than
only planned.

| Task | Outcome |
|---|---|
| 0 | Switched to isolated Supabase project `feat-qetl-hdx` (API 55401, DB 55402) |
| 1 | 17 pgTAP assertions written red. Test 4, the old-style insert, passed at that point and is the back-compat control |
| 2 | Schema and generated migration land with no unintended drop; `unique_parquet_file_pipeline` untouched; CHECKs emitted `not valid` then validated, exactly as predicted |
| 3 | Types and parsers updated, `pnpm db:gen-types` regenerated, `ZodConsistencyTests` compiles unmodified |
| 4 | `toAccess` with 10 tests, including all eight refusal cases |
| 5 | **Partly blocked.** Override body written and verified against real SQLite 3.51. The `.gen.sql` is not generated: the generator fails on a pre-existing migration. See spec 6.6 |
| 6 | `CkanClient`, 11 tests |
| 7 | `openDataErrors` and `getCkanResourceFromPackage`, 14 tests |
| 8 | `buildCkanSourceVersion`, 9 tests |
| 9 | `buildCsvFromDatastoreRecords`, 5 structural plus 11 DuckDB round-trip tests |
| 10 | `acquireOpenDataResource`, 13 tests |
| 11 | 24 mutations applied, all 24 caught, every file restored byte-identical |
| 12 | All four green, plus `pnpm test:db` and `pnpm test:desktop` |

**Three places the plan was wrong, and the code is right:**

1. **The layout moved.** `CkanClient` sits inside `shared/open-data/` rather than
   beside it, so the failure type it raises is a sibling import. And the DuckDB
   round-trip suite lives at `src/lib/openData/__tests__/`, because
   `eslint.config.js:247` forbids relative imports under `shared/` and there is no
   Deno-resolvable alias for `src/`, so a `shared/` test cannot reach the Node-only
   harness at all. Spec 5.4 records both.
2. **One error type, not nine.** `OpenDataAcquisitionFailed` with a `code` union,
   following `WorkspaceMembershipDenied`. Spec 11 records it.
3. **Two tests in this plan would not have caught their own mutation.** The
   column-order tests used `toEqual` on objects, which ignores key order, so a
   writer taking its columns from a record passed them. Found by running mutation
   2, not by reading. They now assert `Object.keys(row)`. This is the case for
   rule 1 in one sentence: the plan's own reasoning about what a test would catch
   was wrong.

**Work added after the first pass, at Pablo's direction (2026-08-19):**

| Item | Outcome |
|---|---|
| The byte proxy | `supabase/functions/open-data/` serves the resource route and is verified live against HDX. `ValidReturnType` already allowed `Response`, so no base64 envelope was needed |
| SSRF defense | `getCkanResourceFromPackage` now requires the resource URL's host to match the catalogued API host, exact match on `https`. 5 tests, 3 mutations |
| Byte-bounded reads | `createOpenDataHttp` caps both the declared `Content-Length` and the streamed total. 12 tests |
| Status mapping | `statusFromOpenDataFailure`, an exhaustive switch in its own module. 12 tests, 2 mutations |
| Desktop | Deferred at Pablo's direction; the override body stays written and SQLite-verified |

That pass also found a **real defect in this plan's own pgTAP test**: its fixtures
used `series.parquet` / `world-bank__wdi`, which are exactly what the World Bank
WDI pipeline writes, so the test failed against any database where that pipeline
had run. Fixtures are now `pgtap-fixture`-prefixed with `.invalid` hosts, and the
suite passes with real catalog rows present, which is the stronger check.

**One finding worth reading before touching the CSV path:** DuckDB's default
reader collapses `,,` and `,"",` to the same NULL, so an absent value and an
empty string are indistinguishable unless the reader is given
`allow_quoted_nulls=false`. Spec 10.2 has the measurement.

---

## Do not commit, push, or open a pull request

The handoff reserves review for Pablo. Leave the worktree dirty. There are **no
commit steps in this plan**, deliberately, unlike the earlier QETL plans.

## File structure

| File | Responsibility |
|---|---|
| `supabase/schemas/00.enum.catalog_entries__open_data__access_kind.sql` | The `access_kind` discriminant type |
| `supabase/schemas/00.enum.catalog_entries__open_data__api_service.sql` | The API protocol type |
| `supabase/schemas/10.catalog_entries__open_data.sql` | Nullability, five columns, three CHECKs, one partial index |
| `supabase/tests/database/catalog_entries_open_data_access.test.sql` | pgTAP for every claim in spec 6.3 and 6.5 |
| `shared/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types.ts` | Read shape and the `OpenDataAccess` union |
| `shared/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntryParsers.ts` | Zod at the DB boundary |
| `shared/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntryModule.ts` | `toAccess(entry)` |
| `apps/desktop/scripts/gen-sqlite-migrations/getManualMigrationBodyFromSourceFile.ts` | The SQLite override body |
| `shared/CkanClient/CkanClient.types.ts` | `CkanPackage`, `CkanResource`, `OpenDataHttp` |
| `shared/CkanClient/CkanClient.schemas.ts` | Zod for CKAN responses |
| `shared/CkanClient/CkanClient.ts` | `package_show`, datastore page, resource bytes |
| `shared/open-data/openDataErrors.ts` | The named error types |
| `shared/open-data/getCkanResourceFromPackage.ts` | Pure resource selection and refusals |
| `shared/open-data/buildCkanSourceVersion.ts` | Pure version token |
| `shared/open-data/buildCsvFromDatastoreRecords.ts` | Pure records to CSV text |
| `shared/open-data/acquireOpenDataResource.ts` | The integration seam |

---

## Task 0: Isolated local Supabase for this branch

Everything in Tasks 1 through 5 writes migrations. `AGENTS.md` requires an
isolated local Supabase project on any branch other than `develop`, and without
it another worktree's `pnpm db:reset` silently reverts this branch's migrations,
or worse, this branch's generated migration contains a `drop` for another
branch's objects.

**Files:** none (this changes only local, uncommitted state).

- [ ] **Step 1: Switch**

```bash
ava supabase switch feat-qetl-hdx
```

The project id is the branch lowercased with non-`[a-z0-9_]` runs replaced by
hyphens, per `AGENTS.md`.

- [ ] **Step 2: Confirm you are not on the shared stack**

```bash
ava supabase status
```

Expected: the first line reads green, and the project id is `feat-qetl-hdx`, not
`avandar`. **If it says `avandar`, stop.** Every migration generated from here
would be taken against a database another worktree also writes to.

- [ ] **Step 3: Note the teardown**

`ava supabase restore` tears it down when this lane closes. Do not run it now.
Do not commit `supabase/config.toml` or the switch's `.env.development` edits;
git hooks enforce this, and they must not be bypassed.

**Acceptance criteria:**
- `ava supabase status` reports project `feat-qetl-hdx` and a green first line.
- `git status` shows no staged change to `supabase/config.toml`.

---

## Task 1: pgTAP tests for the generalized catalog, written red

Spec sections 6.3 and 6.5 are claims about database behaviour, so they are
asserted in SQL before the schema changes. In particular the claim that the
pipeline's `ON CONFLICT (parquet_file_name, pipeline_name)` upsert keeps working
is the highest-value test in this plan, because breaking it breaks a running
pipeline silently.

**Files:**
- Create: `supabase/tests/database/catalog_entries_open_data_access.test.sql`

- [ ] **Step 1: Read an existing pgTAP test for the harness shape**

Read `supabase/tests/database/permissions/exact_data_api_grants.test.sql` and
`supabase/tests/README.md`. Match their `begin; select plan(N); ... select
finish(); rollback;` shape and their role-switching helpers. Do not invent a new
harness.

Note `supabase/tests/**/*.sql` is in `.prettierignore`, so format it by hand to
match its neighbours.

- [ ] **Step 2: Write the tests**

Cover exactly the table in spec 12.2. The `access_kind`-dependent ones will fail
to parse until Task 2 exists, which is the intended red.

Illustrative fragments only (not executed):

```sql
-- Back-compat: an insert written the old way still works and gets a kind.
select lives_ok(
  $$insert into public.catalog_entries__open_data
      (parquet_file_name, display_name, pipeline_name, pipeline_run_id,
       external_organization_name)
    values ('series.parquet', 'Series', 'world-bank__wdi', 'run-1', 'World Bank')$$,
  'a pipeline entry inserts without naming access_kind'
);

-- The pipeline's exact upsert shape must still infer the unique constraint.
select lives_ok(
  $$insert into public.catalog_entries__open_data
      (parquet_file_name, display_name, pipeline_name, pipeline_run_id,
       external_organization_name)
    values ('series.parquet', 'Series v2', 'world-bank__wdi', 'run-2', 'World Bank')
    on conflict (parquet_file_name, pipeline_name)
    do update set display_name = excluded.display_name$$,
  'the pipeline upsert still resolves to unique_parquet_file_pipeline'
);
```

- [ ] **Step 3: Run them to verify they fail**

```bash
pnpm db:reset && supabase test db
```

Expected: FAIL. The `access_kind` cases error on an unknown column; the
back-compat and upsert cases **pass already**, which is correct and is the
baseline they are there to protect.

**Record which cases pass at this point.** They are the back-compat controls, and
if any of them is red after Task 2 the task broke existing behaviour.

**Acceptance criteria:**
- The test file runs under `supabase test db`.
- Every `access_kind`, `api_*` and CHECK case fails; the back-compat and upsert
  cases pass.
- The passing set is written down for comparison after Task 2.

---

## Task 2: Generalize the catalog schema

**Read the `supabase-declarative-schema` skill before this task.** `AGENTS.md`
mandates it for any schema change and it takes precedence over this plan on schema
matters.

**Files:**
- Create: `supabase/schemas/00.enum.catalog_entries__open_data__access_kind.sql`
- Create: `supabase/schemas/00.enum.catalog_entries__open_data__api_service.sql`
- Modify: `supabase/schemas/10.catalog_entries__open_data.sql`
- Create (generated): `supabase/migrations/<timestamp>_generalize_open_data_catalog_access.sql`

- [ ] **Step 1: The two enum files**

One type per file, `00.` prefix, following `00.enum.datasets__source_type`'s
neighbours.

```sql
-- 00.enum.catalog_entries__open_data__access_kind.sql
create type public.catalog_entries__open_data__access_kind as enum(
  'pipeline_parquet',
  'api_resource'
);
```

```sql
-- 00.enum.catalog_entries__open_data__api_service.sql
create type public.catalog_entries__open_data__api_service as enum('ckan');
```

- [ ] **Step 2: Amend the table file**

In `10.catalog_entries__open_data.sql`, per spec 6.1:

1. Drop `not null` from `parquet_file_name`, `pipeline_name`, `pipeline_run_id`.
2. **Append** the five new columns to the end of the column list
   (`supabase-declarative-schema`: append, to keep the diff quiet):
   `access_kind` (not null, default `'pipeline_parquet'`), `api_service`,
   `api_base_url`, `api_resource_id`, `api_resource_format`.
3. Add the three CHECK constraints from spec 6.1, both halves of each.
4. Add the partial unique index from spec 6.3.
5. **Leave `constraint unique_parquet_file_pipeline unique (parquet_file_name,
   pipeline_name)` byte-identical.** Spec 6.3 explains why converting it to a
   partial index breaks the pipeline upsert. Do not tidy it.
6. **Add no `REVOKE`.** The existing `grant select ... to authenticated` and the
   `service_role` grants stay exactly as they are. Per the skill, schema files
   declare privileges positively and only functions need a revoke; this task adds
   no function.

Every new column gets a `--` comment, matching every existing column in the file.

- [ ] **Step 3: Generate the migration**

```bash
pnpm db:reset
pnpm db:new-migration generalize_open_data_catalog_access
```

`pnpm db:reset` immediately before, with no intervening database command, is
mandatory: it is what guarantees the diff is taken against a database built only
from this branch's migrations.

- [ ] **Step 4: Read the generated migration, do not hand-edit it**

Check for four things:

1. **Any `drop` of anything you did not touch is a bug, not a change.** `AGENTS.md`
   is explicit: assume it is the cross-worktree bug until proven otherwise. Reset,
   regenerate, and compare before trusting it. Task 0 should have prevented this.
2. `unique_parquet_file_pipeline` is **not** dropped or recreated.
3. The CHECK constraints appear as `add constraint ... check (...) not valid`
   followed by `validate constraint`. This is what migra emits by itself
   (`20260517193144_requires_app_access_column.sql:14`). **If the pair is absent,
   re-read the migration; do not add the statements by hand.**
4. The privileges block appended by `reconcile-privileges` is left alone. Do not
   "tidy" it into a smaller delta: `pg_default_acl` differs between Supabase
   project vintages, so a local delta is not a remote delta.

- [ ] **Step 5: Run the pgTAP tests green**

```bash
pnpm db:reset && pnpm test:db
```

Expected: PASS, including `pnpm db:validate-privileges`, which `test:db` gates.

- [ ] **Step 6: Compare against the Task 1 baseline**

Every case that passed in Task 1 Step 3 must still pass. A back-compat or upsert
case that is now red means this task broke existing behaviour, and the fix is in
the schema, not in the test.

**Acceptance criteria:**
- `pnpm test:db` passes.
- The generated migration drops nothing that was not intentionally changed.
- `unique_parquet_file_pipeline` is unchanged in both the schema file and the
  migration.
- All Task 1 back-compat and upsert cases still pass.

---

## Task 3: Model types and parsers

**Files:**
- Modify: `shared/types/database.types.ts` (regenerated, never hand-edited)
- Modify: `shared/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types.ts`
- Modify: `shared/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntryParsers.ts`
- Create: `shared/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntryParsers.test.ts`

- [ ] **Step 1: Regenerate the database types**

```bash
pnpm db:gen-types
```

`shared/types/database.types.ts` is in `.prettierignore` and is generated. Do not
edit it by hand.

- [ ] **Step 2: Write the failing parser test**

The parser round-trip is behaviour (null becomes undefined, snake becomes camel),
so it is testable. **Do not** write a test asserting the new fields exist on the
type: the `ZodConsistencyTests` block at the bottom of the parsers file already
enforces schema/type agreement at compile time, and a runtime existence check
would restate the type system.

Test that a DB row for an API entry parses with `parquetFileName: undefined` and
`apiService: "ckan"`, and that a pipeline row parses with the `api_*` fields
undefined.

- [ ] **Step 3: Run it to verify it fails**

```bash
pnpm test:frontend OpenDataCatalogEntryParsers
```

Expected: FAIL, `DBReadSchema` rejects the unknown keys.

- [ ] **Step 4: Update the types**

In `OpenDataCatalogEntry.types.ts`, change three fields to `string | undefined`
and add the five new ones, each with a doc comment. Add `"accessKind"` to the
`SetOptional` list in `Insert` if the column's default makes it optional on
insert.

- [ ] **Step 5: Update the parsers**

Add to `DBReadSchema`: `access_kind` as a literal union matching the enum,
`api_service` as `z.literal("ckan").nullable()`, and the three text columns as
`z.string().nullable()`. Loosen `parquet_file_name`, `pipeline_name` and
`pipeline_run_id` to `.nullable()`.

The `ZodConsistencyTests` block fails to compile if any column is missed. That is
the intended guard; do not weaken it to make progress.

- [ ] **Step 6: Run green**

```bash
pnpm test:frontend OpenDataCatalogEntryParsers && pnpm type-check
```

**Acceptance criteria:**
- Both tests pass and `pnpm type-check` is clean, including `deno check shared`.
- `ZodConsistencyTests` compiles without modification to its shape.
- `database.types.ts` shows only generated changes.

---

## Task 4: `OpenDataCatalogEntryModule.toAccess`

The one place the null-checks live, so no consumer tests four fields (spec 6.4).

**Files:**
- Create: `shared/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntryModule.ts`
- Create: `shared/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntryModule.test.ts`
- Modify: `shared/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.ts` (re-export)

- [ ] **Step 1: Write the failing test**

Three behaviours: a pipeline row yields `{ kind: "pipeline_parquet", ... }`; an
API row yields `{ kind: "api_resource", ... }`; **a row satisfying neither yields
`undefined`**. The third is the one that matters. A row whose `access_kind` says
`api_resource` but whose `api_resource_id` is undefined can reach a stale client
even though the database forbids it, and returning a half-built union would push
null-checks back out to every call site.

- [ ] **Step 2: Run it to verify it fails**

```bash
pnpm test:frontend OpenDataCatalogEntryModule
```

Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

Follow `RelationRefModule.ts` as the pattern: a plain exported object, `match`
from `ts-pattern` on the discriminant with `.exhaustive()` so a third
`access_kind` fails to compile here.

Named `toAccess`, not `resolveAccess`: it converts the whole receiver into another
representation of itself, which is the `to` shape in
`docs/rules/typescript.md:265`.

- [ ] **Step 4: Wire the namespace**

Follow `OpenDataCatalogEntry.ts`'s existing re-export of the parsers, and
`RelationRef.ts`'s namespace-merging pattern, so callers import one
`OpenDataCatalogEntry` symbol and reach `OpenDataCatalogEntry.toAccess`. Also
export the `OpenDataAccess` type through the namespace, per `AGENTS.md`'s models
rule that app code must not import from `*.types.ts`.

- [ ] **Step 5: Run green**

```bash
pnpm test:frontend OpenDataCatalogEntryModule && pnpm type-check
```

**Acceptance criteria:**
- Three tests pass; the `undefined` case is one of them.
- `.exhaustive()` is used, so adding an enum value fails to compile here.
- No consumer needs to import `OpenDataCatalogEntry.types.ts`.

---

## Task 5: The desktop SQLite mirror

**This is the task most likely to be skipped and most likely to break one
platform silently.** `catalog_entries__open_data` is in
`apps/desktop/sync/syncable-tables.ts:40`, so rows arrive on desktop from
Postgres, and the mirror still declares
`"parquet_file_name" TEXT NOT NULL` (`apps/desktop/migrations/20260329222138_*.gen.sql:16`).
An API-kind row would fail to insert there.

**Files:**
- Modify: `apps/desktop/scripts/gen-sqlite-migrations/getManualMigrationBodyFromSourceFile.ts`
- Create (generated): `apps/desktop/migrations/<timestamp>_generalize_open_data_catalog_access.gen.sql`

- [ ] **Step 1: Confirm the generator flags it**

```bash
pnpm desktop:sqlite:gen-migrations
```

Expected: a "needs hand-edit" warning naming the new migration, because
`partition.ts:45` routes `ALTER COLUMN` to `needsHandEdit` and SQLite has no
`ALTER COLUMN`.

If Python or `uv` is unavailable, `sqlglot` cannot run. **Report that as a blocker
and stop this task.** Do not hand-write a file into `apps/desktop/migrations/`:
those files are generated and their headers say so.

- [ ] **Step 2: Write the override body**

Add one entry to `_MANUAL_MIGRATION_BODIES`, keyed by the Postgres migration
basename. Read the three existing entries first: they establish both the format
and the reasoning to reuse.

The body performs the standard SQLite table rebuild, because SQLite cannot relax a
`NOT NULL` in place: create the table with the relaxed columns and the five new
ones, copy every row, drop the old table, rename. Also create the partial unique
index; SQLite supports partial indexes.

Following the precedent's reasoning, and stated in the body's comment:

- **The two enums are not mirrored.** SQLite has no enums, so both columns are
  `TEXT`. Postgres constrains the values upstream.
- **The CHECK constraints are not mirrored.** SQLite cannot
  `ALTER TABLE ADD CONSTRAINT`, and rows only ever arrive from a Postgres that
  already validated them.
- **`unique_parquet_file_pipeline` is preserved** on the rebuilt table.

Every statement must be idempotent-safe in the shape the other overrides use.

- [ ] **Step 3: Regenerate and read the output**

```bash
pnpm desktop:sqlite:gen-migrations
```

Read the generated file. Confirm no `NOT NULL` remains on the three relaxed
columns and that the five new columns are present.

- [ ] **Step 4: Verify the desktop suite still passes**

```bash
pnpm test:desktop
```

**Acceptance criteria:**
- The generated `.gen.sql` has no `NOT NULL` on `parquet_file_name`,
  `pipeline_name` or `pipeline_run_id`.
- All five new columns and the partial index are present.
- The override body explains, in comments, what it does not mirror and why.
- `pnpm test:desktop` passes.
- Nothing under `apps/desktop/migrations/` was hand-written.

---

## Task 6: `CkanClient`

Talks CKAN over an injected HTTP layer. No state, no singleton, no module-level
`fetch`. Independent of Tasks 1 through 5; it may be built first if the database
is blocked.

**Files:**
- Create: `shared/CkanClient/CkanClient.types.ts`
- Create: `shared/CkanClient/CkanClient.schemas.ts`
- Create: `shared/CkanClient/CkanClient.ts`
- Create: `shared/CkanClient/CkanClient.test.ts`

- [ ] **Step 1: Write the failing tests**

Cover, per spec 12.1:

- `package_show` requests `{baseUrl}/api/3/action/package_show?id={datasetId}`.
- A `200` body of `{ success: false, error: { __type: "Validation Error" } }`
  raises `CkanActionFailed` carrying `__type`. **This is the one that catches the
  real bug**: CKAN can return `200` with `success: false`, so reading `result`
  without checking `success` yields `undefined` where a package was expected.
- A `403` on a datastore action raises `CkanAuthorizationRequired`. Fixture the
  real HDX body from spec 3.2:
  `{"error": {"__type": "Authorization Error", "message": "Access denied: Action datastore_search requires an authenticated user"}, "success": false}`.
- Zod rejects a `package_show` result with no `resources` array.
- **A resource with `mimetype: null` parses.** 40% of real HDX resources are
  (spec 3.4), so a required `mimetype` would reject nearly half of HDX.

- [ ] **Step 2: Run to verify they fail**

```bash
pnpm test:frontend CkanClient
```

Expected: FAIL, module not found.

- [ ] **Step 3: Implement the types**

`OpenDataHttp` has two members, `getJson` and `getBytes`, and they are separate
because spec 3.1 measured different CORS answers for metadata and bytes. Do not
collapse them into one `fetch`-shaped dependency: that hides the constraint that
forces a proxy.

`CkanResource` requires `id`, `url`, `format`, `url_type`, `size`,
`last_modified`, `hash`, `datastore_active`, and makes `mimetype` optional.
Field names stay CKAN's own snake_case at this boundary, because this type is a
description of someone else's wire format, not an Avandar model.

- [ ] **Step 4: Implement the Zod schemas and the client**

Validate at the boundary. Check `success` before touching `result`, always.

- [ ] **Step 5: Run green**

```bash
pnpm test:frontend CkanClient && pnpm type-check
```

`pnpm type-check` matters here specifically: this is the first new code under
`shared/`, so it is where a missing `.ts` import extension or a stray `@/` import
will surface in `deno check shared`.

**Acceptance criteria:**
- Every test above passes.
- No module-level `fetch` and no client singleton import anywhere in the folder.
- `mimetype` is optional; `format` is required.
- `pnpm type-check` clean.

---

## Task 7: `openDataErrors` and `getCkanResourceFromPackage`

Pure resource selection and every refusal. This is where spec 1.3's readme-first
hazard is defeated.

**Files:**
- Create: `shared/open-data/openDataErrors.ts`
- Create: `shared/open-data/getCkanResourceFromPackage.ts`
- Create: `shared/open-data/getCkanResourceFromPackage.test.ts`

- [ ] **Step 1: Write the failing tests**

The load-bearing one first:

- **Selection from a package whose first resource is a readme.** Build the fixture
  from the real shape in spec 1.3: resource 0 is `TXT` / 961 bytes /
  `How To Understand This Data.txt`, resource 1 is the CSV. Ask for resource 1's
  id and assert resource 1 comes back. **This is the test that fails if a
  first-resource fallback ever creeps in**, which is the most likely silent bug in
  this plan.
- An unknown `api_resource_id` raises `CkanResourceNotFound`.
- `url_type: "api"` raises `CkanResourceIsRemoteApi`. Fixture the real one from
  spec 3.5, including its `http://` URL.
- `format: "zip"` and `format: "TXT"` raise `CkanResourceFormatUnsupported`
  naming the format.
- A live `format` differing from the entry's `api_resource_format` raises
  `CkanResourceFormatChanged`.
- **A `size` above the ceiling raises `CkanResourceTooLarge`.** The ceiling is a
  parameter, not a constant, so the test names a small one.
- Format matching is case-insensitive: CKAN reports `CSV`, `csv` and `Csv` in the
  wild.

- [ ] **Step 2: Run to verify they fail**

```bash
pnpm test:frontend getCkanResourceFromPackage
```

- [ ] **Step 3: Implement the errors**

One named type per row of spec 11. Each carries structured fields, not a
formatted sentence, so a caller can branch and a component can translate. None is
user-facing copy, so none goes through Lingui.

- [ ] **Step 4: Implement the selection**

`get` is the correct prefix: it looks a resource up inside its source, and the
source is named. Do **not** call it `resolveResource`.

Order the refusals as spec 7.2: remote API, then unreadable format, then format
mismatch, then size. Size last among the refusals but still **before** any byte
fetch, which is the point of using `size` from metadata.

- [ ] **Step 5: Run green**

```bash
pnpm test:frontend getCkanResourceFromPackage && pnpm type-check
```

**Acceptance criteria:**
- Every test passes, including the readme-first selection test.
- No function is named `resolve...`, `_resolve...` or `probe`.
- Nothing in this module imports a client.

---

## Task 8: `buildCkanSourceVersion`

**Files:**
- Create: `shared/open-data/buildCkanSourceVersion.ts`
- Create: `shared/open-data/buildCkanSourceVersion.test.ts`

- [ ] **Step 1: Write the failing tests**

- A non-empty `hash` yields `ckan:hash:<hash>`. Use the real MD5 from spec 3.4,
  `32e316c0337f8a9b9117999a595f8e86`.
- An **empty-string** `hash` falls back to `ckan:mtime:<last_modified>:<size>`.
  Empty string, not undefined: the real `readme.txt` resource in spec 1.3 has
  `"hash": ""`, and a truthiness check that only tests for `undefined` would emit
  `ckan:hash:` with nothing after it.
- **The two forms cannot collide.** A resource whose `hash` is empty and a
  resource whose `hash` happens to equal the other's mtime string produce
  different tokens. This is what the prefix is for.
- The token is a single string with no whitespace, so it survives being used as a
  key component.

- [ ] **Step 2: Run to verify they fail, then implement, then run green**

```bash
pnpm test:frontend buildCkanSourceVersion
```

`build` is the correct prefix per `AGENTS.md`: it produces a string from seed
data, so `build{Thing}From{Seed}`.

Import `SourceVersion` as a type from
`shared/models/relations/RelationCapabilities/RelationCapabilities.types.ts`.
**Read that file; do not edit it.** It is a frozen contract, and a type-only
import is a read.

**Acceptance criteria:**
- Four tests pass, including the empty-string case and the collision case.
- Nothing anywhere parses or splits the token.
- `shared/models/relations/` is unmodified: confirm with
  `git status shared/models/relations`.

---

## Task 9: `buildCsvFromDatastoreRecords`, tested against real DuckDB

Pure, and the one piece a datastore follow-up would otherwise get wrong. **Tested
by round-tripping through DuckDB, not by asserting on the CSV string.** The
handoff records that this exact approach caught two bugs in an earlier CSV writer
that a string assertion passed.

**Files:**
- Create: `shared/open-data/buildCsvFromDatastoreRecords.ts`
- Create: `shared/open-data/__tests__/buildCsvFromDatastoreRecords.test.ts`
- Create: `shared/open-data/__tests__/buildCsvFromDatastoreRecords.executed.test.ts`

- [ ] **Step 1: Confirm the harness reaches `shared/`**

`vitest.executed.config.ts` includes `**/*.executed.test.ts` and excludes only
`node_modules/**`, `apps/**`, `packages/**` and `tests/e2e/**`, so a file under
`shared/open-data/__tests__/` is collected. Verify before writing the suite:

```bash
pnpm test:executed --list
```

Expected: the new file appears once it exists. If it does not, fix the path rather
than moving the test into the jsdom project, where DuckDB cannot run.

- [ ] **Step 2: Write the failing executed test**

Use `withDuckDb` from `src/lib/sql/__tests__/executedDuckDb.ts`. Write the built
CSV to a temp file, `read_csv` it, and assert on **the rows DuckDB returns**.

Cases, each a real CSV hazard:

- An embedded comma.
- An embedded double quote.
- An embedded newline inside a quoted field.
- A null against an empty string, asserting they stay distinguishable.
- **A record missing an optional key**, asserting the remaining values land in
  the right columns rather than shifting left. This is the case that proves
  column order comes from `fields` and not from `Object.keys(records[0])`.
- Column order follows `fields` even when the first record's key order differs.

Note `shared/` is Deno-checked, so if writing a temp file needs `node:fs`, keep it
in the **test** file, which is where a Node-only import is acceptable, and never
in the module.

- [ ] **Step 3: Run to verify it fails**

```bash
pnpm test:executed buildCsvFromDatastoreRecords
```

- [ ] **Step 4: Add a real HDX fixture**

Check in the 235-byte real HDX CSV verified in spec 3, with its provenance URL in
a comment:
`https://data.humdata.org/dataset/f973ecd3-c145-413e-8ae4-8e5da49e6dee/resource/9da55974-adf5-4106-988c-d3c92333ea0a/download/fts_requirements_funding_covid_mwi.csv`.
Assert DuckDB reads its 13 columns and 1 data row. This gives the suite one case
that is real rather than authored.

- [ ] **Step 5: Implement and run green**

Take column order from `fields`, in order. Never from `Object.keys`.

```bash
pnpm test:executed buildCsvFromDatastoreRecords && pnpm type-check
```

**Acceptance criteria:**
- Every assertion is on DuckDB's rows; **no test asserts on the CSV string**.
- The missing-optional-key case passes.
- The real HDX fixture parses to 13 columns and 1 row.
- Both the jsdom and executed files pass.

---

## Task 10: `acquireOpenDataResource`, the integration seam

**Files:**
- Create: `shared/open-data/acquireOpenDataResource.ts`
- Create: `shared/open-data/acquireOpenDataResource.test.ts`

- [ ] **Step 1: Write the failing tests**

Every one injects `OpenDataHttp`. Nothing touches the network.

- An API-kind entry for a CSV resource returns `contentKind: "csv"`, the **exact
  bytes** `getBytes` yielded, and the token from Task 8. This is the handoff's
  done-bar.
- A Parquet-format resource returns `contentKind: "parquet"`.
- `datastoreActive` is returned as read from `package_show` and **nothing branches
  on it**. Assert it comes back `true` for a `datastore_active: true` fixture
  while the file path is still taken, which is spec 7.1's decision made
  executable.
- **The size ceiling: an oversized resource raises `CkanResourceTooLarge` and
  `getBytes` is never called.** Pair it in the same file with a positive control
  where `getBytes` **is** called, so `expect(getBytes).not.toHaveBeenCalled()`
  cannot pass because the whole thing threw earlier for an unrelated reason. The
  handoff calls out this exact failure mode: a bare negative assertion passing for
  the wrong reason.
- An entry whose access shape satisfies neither union member raises
  `OpenDataAccessShapeInvalid`.
- A pipeline-kind entry is **refused** by this module. It does not handle the
  Parquet-URL path; the caller keeps that unchanged (spec 13.2). Refusing loudly
  is what stops a silent behaviour change to existing datasets.
- `getJson` is called exactly once for a successful acquisition, proving the probe
  costs no extra call (spec 7.1). Assert the call count, with a positive control.

- [ ] **Step 2: Run to verify they fail**

```bash
pnpm test:frontend acquireOpenDataResource
```

- [ ] **Step 3: Implement**

Compose Tasks 4, 6, 7 and 8. The whole function should read as: get the access
shape, one `package_show`, select the resource, build the token, fetch the bytes.
Keep it under 45 lines (`AGENTS.md`); extract if it grows.

Two logging rules from spec 11, both about the presigned S3 redirect measured in
spec 3.1: **never log the download `Location` header or the URL it yields** (it is
a credential), and never put response bytes in an error message.

`acquire...` is an action, so it needs no `to`/`get`/`build` prefix.

- [ ] **Step 4: Run green**

```bash
pnpm test:frontend acquireOpenDataResource && pnpm type-check
```

**Acceptance criteria:**
- Every test passes, with a positive control beside each `not.toHaveBeenCalled()`.
- `getJson` is called once per acquisition.
- The module imports no client singleton and no DuckDB.
- Nothing under `src/clients/qetl/` or `shared/models/relations/` was modified.

---

## Task 11: Mutation testing

Handoff rule 1, and not optional. In this project a code-quality review found a
real defect in **every single task** of the phase-1 session, and the recurring one
was implementers writing spy or structural tests and *reasoning* they would fail
rather than proving it.

**Files:** none in the repo. **Mutants live in the session scratch directory,
outside the repo**, because a previous agent left mutant files where the
type-checker found them.

- [ ] **Step 1: For each mutation: apply, run, restore, verify byte-identical**

```bash
# Pattern. SRC is the file, SCRATCH is outside the repo.
cp "$SRC" "$SCRATCH/original.ts"
# apply the mutation to $SRC
pnpm test:frontend <pattern>          # expect the NAMED test to go red
cp "$SCRATCH/original.ts" "$SRC"
diff "$SCRATCH/original.ts" "$SRC" && echo "byte-identical"
```

- [ ] **Step 2: The mutations, and which test must catch each**

| # | Mutation | Must go red |
|---|---|---|
| 1 | Select the first resource instead of the named one | Task 7's readme-first selection test |
| 2 | Column order from `Object.keys(records[0])` instead of `fields` | Task 9's missing-optional-key DuckDB test |
| 3 | Remove the `size` pre-flight | Task 7 and Task 10 ceiling tests, **and the positive control stays green** |
| 4 | Prefer `last_modified` over `hash` | Task 8's `ckan:hash:` test |
| 5 | Drop the `ckan:hash:` / `ckan:mtime:` prefix | Task 8's collision test |
| 6 | Return `result` without checking `success` | Task 6's `CkanActionFailed` test |
| 7 | Make `mimetype` required in the Zod schema | Task 6's `mimetype: null` test |
| 8 | Treat `hash: ""` as present | Task 8's empty-string fallback test |
| 9 | Branch on `datastoreActive` and take a datastore path | Task 10's `datastoreActive` test |
| 10 | Convert `unique_parquet_file_pipeline` to a partial index in `supabase/schemas/` | Task 1's pgTAP upsert test (via `pnpm db:reset && pnpm test:db`) |

Mutation 10 is worth the reset cost: it is exactly the "cleanup" spec 6.3 warns
about, and a future reader will be tempted by it. Restore the schema file and
regenerate afterwards; **do not leave a stray migration behind.** Confirm with
`git status supabase/`.

- [ ] **Step 3: Report**

For each mutation: which test went red, and its name. A mutation that no test
catches is a missing test, not an acceptable gap. Write the test and re-run.

**Acceptance criteria:**
- All ten mutations were applied and each was caught by a **named** test.
- Every mutated file is byte-identical to its original, verified with `diff`.
- No mutant file remains anywhere under the repo, and `git status` is clean of
  them.
- Every `not.toHaveBeenCalled()` in the suite has a positive control beside it.

---

## Task 12: Full verification

- [ ] **Step 1: Run all four, in this order, and read the output**

```bash
pnpm test:frontend
pnpm test:executed
pnpm type-check
pnpm lint
```

All four must be green. `pnpm lint` is included because a session once reported
green having run only the first three and had shipped a stylelint failure.

- [ ] **Step 2: Run the database suite**

```bash
pnpm db:reset && pnpm test:db
```

- [ ] **Step 3: Run the desktop suite**

```bash
pnpm test:desktop
```

- [ ] **Step 4: Confirm the boundaries were respected**

```bash
git status --short
git diff --stat -- src/clients/qetl shared/models/relations
```

The second command must print nothing. Those paths belong to other lanes.

- [ ] **Step 5: Do not trust an editor diagnostic over `pnpm type-check`**

Editor diagnostics in this repo fire spuriously and have been wrong repeatedly,
including as confident type errors on files that compile cleanly. `pnpm type-check`
is the authority.

- [ ] **Step 6: Report**

Report: what changed; the four command results; which mutation each test caught;
every file touched outside the owned set (expected: the two `apps/desktop/` paths
from Task 5, and nothing else); and **the two open escalations**, which are not
defects in this work but blockers on it:

1. **The byte proxy does not exist** (spec 5.3). HDX acquisition works in Node
   and on desktop and fails in the browser at the byte fetch, because HDX sends
   `access-control-allow-origin: https://data.humdata.org` on the download path
   (spec 3.1). This blocks a browser demo and is outside this lane.
2. **HDX's datastore actions are anonymous-forbidden** (spec 3.2), so the pushdown
   half of the proposal's section 11.2 is unreachable for HDX without an API key.
   The file path is not a fallback; it is the path.

**Acceptance criteria:**
- All four verification commands green, plus `pnpm test:db` and `pnpm test:desktop`.
- `git diff --stat -- src/clients/qetl shared/models/relations` prints nothing.
- Nothing committed, nothing pushed, no pull request.
- Both escalations reported, not buried.

---

## Self-review

Before reporting done, check each:

- [ ] No function named `resolve...`, `_resolve...`, or `probe` anywhere added.
      Verify: `grep -rn 'resolve\|probe' shared/open-data shared/CkanClient`.
- [ ] Every file added under `shared/` uses `.ts` import extensions and imports no
      `@/...`. `pnpm type-check` proves it via `deno check shared`.
- [ ] No pure function lives in a module that also imports a client singleton.
- [ ] No test restates the type system: no `typeof` check, no `toBeDefined()` on a
      non-nullable value.
- [ ] Every `not.toHaveBeenCalled()` has a positive control beside it.
- [ ] Every CSV assertion goes through DuckDB, not through a string comparison.
- [ ] `shared/models/relations/` is unmodified.
- [ ] No `SourceWrapper` was written and `createDefaultRegistry` was not touched.
- [ ] `unique_parquet_file_pipeline` is unchanged in the schema file and not
      dropped in the migration.
- [ ] The generated migration drops nothing unintended.
- [ ] No comment references this plan, a task number, or a spec section number.
- [ ] No em dashes in any added comment or document.
- [ ] Mutants are outside the repo and every mutated file is byte-identical.
