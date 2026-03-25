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
