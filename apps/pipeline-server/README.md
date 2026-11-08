# Pipeline Server

This service receives authenticated `POST /:pipelineName/run` requests and runs
the requested pipeline.

The current placeholder implementation returns the pipeline name as a plain text
response.

## Endpoint

- `POST /:pipelineName/run`
- Header: `Authorization: Bearer $AVA_PIPELINE_SERVER_SECRET`
- Example: `POST /daily-sync/run`

## Environment variables

- `AVA_PIPELINE_SERVER_SECRET` (required): Bearer token required to trigger a
  pipeline run.
- `HOST` (optional): Defaults to `0.0.0.0`.
- `PORT` (optional): For localhost only, defaults to `4611`.
- `SOCRATA_APP_TOKEN` (optional): App token for the `socrata` pipeline, which
  raises the Socrata API's rate limit. Locally, copy `.env.pipelines.example`
  at the repo root to `.env.pipelines.local` and fill it in. In production,
  set it as a Fly secret. The `hdx` pipeline needs no key: HDX API tokens only
  grant write access and do not raise read rate limits.

## Running one pipeline

```bash
ava pipeline run socrata --local                # full run: write every listing that changed
ava pipeline run socrata --local --incremental  # per scope, only what changed since the last run
ava pipeline run socrata --local --since 2026-10-01T00:00:00Z --until 2026-10-08T00:00:00Z
ava pipeline run socrata --local --limit 10     # stop after 10 datasets
ava pipeline reset socrata                      # delete this pipeline's checkpoints and listings
ava pipeline run hdx --local --incremental --scope format:parquet  # one scope only
ava pipeline reset hdx --scope format:parquet    # forget one scope: its next run starts from the beginning
ava pipeline prune-retired-scopes hdx --dry-run  # what removing undeclared scopes would delete
```

`--incremental` starts each scope of each drive at its checkpoint, so it
also continues a run that was cancelled or stopped by `--limit`, and a scope
that has never been crawled starts from the beginning. `--since` and `--until` take ISO 8601 timestamps with a
timezone, and `--since` cannot be combined with `--incremental`.
`world-bank__wdi` supports full runs only: its sources carry no modification
time, so `--incremental`, `--since`, and `--until` are rejected. `--limit`
must be a positive integer. Invalid options are rejected before anything
runs (HTTP 400 from the server). Every run prints one line per crawl (a
drive and scope): its window, how many datasets it fetched, and how many
listings it wrote or left unchanged. When every crawl fails, the report is still printed before the
command exits with an error. `ava pipeline reset` selects listings by their
`pipeline_name`.

A scope is a slice of a drive that is crawled and resumed on its own: `hdx`
has `format:csv`, `format:parquet`, and `format:other` (every other
format), and a Socrata drive has `all` unless `socrata.pipeline.yaml` gives
it category or tag scopes. The Socrata drives, and how each Discovery API
result maps onto catalog metadata, live in
`pipelines/socrata/socrata.pipeline.yaml`. They are NYC Open Data
(`data.cityofnewyork.us`), NY State Open Data (`data.ny.gov`), and NY State
Department of Health (`health.data.ny.gov`). Removing a scope from
the code only stops crawling it. `ava pipeline prune-retired-scopes` deletes
what only retired scopes produced, after a confirmation, and never a listing
a workspace uses. `ava pipeline reset` deletes the pipeline's checkpoints
before its listings, and `--scope` resets one scope.

Every listing is written in one transaction with its relation columns, so
the two always land together, and deleting a listing (by reset or prune)
deletes its columns too.

Every asset a drive lists becomes a listing, so a catalog search finds it
even when a workspace cannot add it. `is_workspace_loadable` says which
ones a workspace can add, and `source_url` links to the original either
way. A listing is unloadable when its pipeline cannot read the asset (a
Socrata map, file, link, story, or chart, a Socrata dataset with no
exported columns, or an HDX resource that is not a hosted CSV or Parquet
file with readable columns), or when its format is in
`pipelines/etl.config.yaml`. That file holds the formats no pipeline's
listings can be added in (PDF, XLSX, and others), with per-pipeline
overrides. Supporting a format later means removing it there and flipping
`is_workspace_loadable` on the matching listings with a data migration, not
a re-crawl.

Each listing records in `date_column_type_last_verified` when its
column types were checked against real data, and only a listing with
verified column types can be added to a workspace:

- `socrata` takes each dataset's columns from the Discovery API, as text
  with Socrata's type label as the original type, unverified. The list can
  name columns the CSV export lacks. Any other asset type is listed
  unloadable, with no columns.
- `hdx` uses the headers HDX's file check recorded, as text of unknown
  original type, unverified. When those are missing or ambiguous, a Parquet
  file's footer is read with DuckDB, giving verified types, and a CSV gets
  no columns until the app verifies it.
- `world-bank__wdi` builds Parquet files, so its column types are verified
  when written.

The app verifies unverified or stale column types later from a sample of
the source, and a pipeline rewrite keeps those verified columns as long as
the pipeline's own view of the columns has not changed.

## Pipeline config files

Each drive-index pipeline has one YAML file beside its `run.ts`, read once at
the start of a run:

- `pipelines/socrata/socrata.pipeline.yaml`: Socrata's drives (portals).
- `pipelines/hdx/hdx.pipeline.yaml`: HDX's one drive.

A file lists the pipeline's `drives`, what each organization level is called
(`organizationLabels`), and `fields`, which map the source's record onto the
catalog's common metadata. A drive can replace the labels and override any
field. Mapped values come from a dotted path into the source record (`from`),
a constant (`value`), or a script under the pipeline's `mappers/` directory
(`script`). A script default-exports `(record, context) => value`, and a
script that throws nulls only its own field for that record and logs a
warning. The full shape is in
[`catalog-field-mapping-design.md`](../../docs/measles-demo/catalog-field-mapping-design.md).

`pipelines/etl.config.yaml` still holds what every pipeline shares: the
formats no pipeline's listings can be added in. A pipeline's own overrides of
it live under `workspaceLoadability` in its `.pipeline.yaml`.

### Adding a portal

To index another Socrata portal:

1. Add a drive to `socrata.pipeline.yaml`: its `baseUrl` (`https://`, no
   trailing slash) and `organization1_name`, such as
   `organization1_name: { value: State of Illinois }`. A drive without
   `organization1_name` fails the config when it loads.
2. If the portal's organization levels are named differently from the
   defaults, give the drive its own `organizationLabels`. A drive's labels
   replace the defaults whole, so list every level the drive fills.
3. Map any field the portal records differently, per drive, with `from`,
   `value`, or a script under `pipelines/socrata/mappers/`. Fields the drive
   omits use the pipeline's shared `fields`.
4. Try it against the local stack only (check `ava supabase status` first):

   ```bash
   ava pipeline run socrata --local --limit 20
   ```

   Then check the rows in `data_catalog_listings`: `organization1_name`
   through `organization4_name`, `domains`, `tags`, `description`, and
   `drive_id`, and the drive's row in `data_catalog_drives`.

A new drive is crawled from scratch on its next run. A field mapping that
changes rewrites the affected listings on the next full run, but not on an
incremental one, which only touches datasets that changed.

`ava pipeline run --local` hides the runner's warnings when the run
succeeds: it prints only the report, and keeps stderr only for a failed run.
Mapping warnings (a script that threw, a value that would not coerce, a
dataset skipped for a missing `organization1_name`) are therefore invisible
there. To see them, run the runner directly from the repo root, with the
environment `ava` normally loads (`.env.development`) exported in the shell:

```bash
pnpm exec vite-node --config vite.script.config.ts scripts/runPipelineOnce.ts socrata --limit 20
```

It takes the same flags as `ava pipeline run`, and prints warnings to stderr
as they happen.

## Execution history

Every `ava pipeline run`, `reset`, and `prune-retired-scopes` is recorded in
`pipeline_executions` (one row per command per pipeline) and
`pipeline_execution_scopes` (one row per drive and scope it worked on), with
the exact argv or HTTP body, the outcome, stage timings, and the counts and
sizes behind them. Nothing in the app reads them. Query them directly:

```sql
-- When was each Socrata drive last crawled, and did it succeed?
select distinct on (drive_key) drive_key, started_at, status
from pipeline_execution_scopes
where pipeline_name = 'socrata'
order by drive_key, started_at desc;
```

`pnpm deploy:pipeline-server` passes the commit as `AVA_CODE_VERSION`, so
server runs record it.

## Local development

```bash
pnpm --filter @avandar/pipeline-server dev
```

## Tests

```bash
pnpm --filter @avandar/pipeline-server test
```

## Fly.io setup

No deployment's Fly details live in this repository.
`deploy/fly.toml.template` is filled from `.env.pipeline-server.prod` at the
repository root (gitignored; copy `.env.pipeline-server.prod.example`), and
deploying needs Fly credentials with access to that app. To self-host, point
the env file at a Fly app of your own.

Set the server's secrets on the app before the first deploy:

```bash
fly secrets set --app <app> AVA_PIPELINE_SERVER_SECRET=your-secret \
  SOCRATA_APP_TOKEN=...
```

The server keeps no Supabase credentials. Every run names the project to
load into, in the `X-Ava-Supabase-Url` and `X-Ava-Supabase-Service-Role-Key`
headers, so one server loads into demo, production, or a local stack,
whichever its caller holds the key for. `ava pipeline run` sends the
`VITE_SUPABASE_API_URL` and `SUPABASE_SERVICE_ROLE_KEY` of the env file it
loaded. The key is never logged or recorded with the run.

Deploy with:

```bash
pnpm deploy:pipeline-server
```

`docs/measles-demo/pipeline-server-fly-runbook.md` walks through creating the
app, its volume, and its secrets.

Deploy order for crawl scopes (`pipeline_scope_checkpoints`): run the
migrations before deploying the new pipeline server, and run no pipeline
while migrating. Then rebuild `ava` (`pnpm build:ava-cli`) on every machine
that runs it. An old `ava pipeline reset` deletes listings but not
checkpoints, so the next incremental run would skip them, and an old CLI
cannot parse the new `crawls` report.
