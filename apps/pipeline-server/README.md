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
has `format:csv` and `format:parquet`, and a Socrata drive has `all` unless
`CONFIGURED_DRIVES` gives it category or tag scopes. Removing a scope from
the code only stops crawling it. `ava pipeline prune-retired-scopes` deletes
what only retired scopes produced, after a confirmation, and never a listing
a workspace uses. `ava pipeline reset` deletes the pipeline's checkpoints
before its listings, and `--scope` resets one scope.

## Local development

```bash
pnpm --filter @avandar/pipeline-server dev
```

## Tests

```bash
pnpm --filter @avandar/pipeline-server test
```

## Fly.io setup

Set the required secret before deploying:

```bash
fly secrets set AVA_PIPELINE_SERVER_SECRET=your-secret \
  --config apps/pipeline-server/fly.production.toml
```

Deploy with:

```bash
fly deploy --config apps/pipeline-server/fly.production.toml
```
