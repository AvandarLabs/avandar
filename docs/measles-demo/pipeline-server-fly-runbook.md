# Pipeline server on Fly: runbook

How to create the pipeline server's Fly machine and deploy it. The server
runs the scheduled data pipelines and builds ODC listings' Parquet copies
(`docs/measles-demo/odc-parquet-cache-spec.md`).

No deployment's Fly details live in this repository. The app, region,
machine size, and volume are read from `.env.pipeline-server.prod`
(gitignored) when `pnpm deploy:pipeline-server` runs. Deploying also needs
Fly credentials with access to the app, so nobody without them can deploy
over it. Anyone self-hosting follows the same steps with a Fly app of their
own.

## The machine

| Setting | Value | Why |
|---|---|---|
| Machine | `performance-1x`, 2 GB | A dedicated CPU, so a long conversion is never throttled. A shared CPU drops to 6.25% of a core once its 500 s burst is spent. Converting DOB Violations' 790 MB CSV peaked under 0.6 GB of memory. |
| Volume | 10 GB at `/data` | A paged copy holds about one 32 MB part on disk at a time. A one-file source (CKAN) is gzipped on disk. 10 GB is headroom for the largest one-file sources. The root disk is only about 8 GB. |
| DuckDB memory limit | `1GB` | About half the machine. DuckDB spills to `/data` past it. |
| Machines | 1, always on | A build runs after its request returns, so the machine must not stop for lack of traffic. A volume attaches to one machine. |
| Cost | About $35 a month | $33 for `performance-1x` with 2 GB, plus $1.50 for the volume ($0.15/GB). Bandwidth out of Fly is extra, roughly $0.02/GB. |

## Before you start

- `flyctl` installed (`brew install flyctl`).
- A Fly account in the organization that will own the app.
- The production Supabase project's URL and service role key, from the
  Supabase dashboard: Project Settings → API. Reading them changes nothing.
  Never paste them into a file in this repository.
- A Socrata app token, optional but raises Socrata's rate limit.

## Steps

1. **Sign in to Fly** and find your organization's slug.

   ```bash
   fly auth login
   fly orgs list
   ```

2. **Fill in the env file.** Pick an app name and the Fly region closest to
   the Supabase project (production Supabase is in `us-east-1`, so `iad`).

   ```bash
   cp .env.pipeline-server.prod.example .env.pipeline-server.prod
   ```

   Set `FLY_APP_NAME` and `FLY_PRIMARY_REGION`. Leave the machine size,
   memory, volume name, and DuckDB limit at the example's values unless you
   are changing the machine. Leave `FLY_API_TOKEN` empty: `fly auth login`
   is enough.

3. **Create the app.** Check first that it does not exist.

   ```bash
   set -a; . ./.env.pipeline-server.prod; set +a
   fly apps list | grep "$FLY_APP_NAME" || fly apps create "$FLY_APP_NAME" --org <org-slug>
   ```

4. **Create the volume**, in the same region as the app.

   ```bash
   fly volumes create "$FLY_VOLUME_NAME" --app "$FLY_APP_NAME" \
     --region "$FLY_PRIMARY_REGION" --size 10 --yes
   ```

5. **Set the server's secrets.** Generate the server secret and save it in
   your password manager first: the app and `ava pipeline` send it to call
   the server, and Fly never shows a secret again. `--stage` stores the
   secrets without starting a machine.

   ```bash
   openssl rand -hex 32   # save this as the pipeline server secret
   fly secrets set --app "$FLY_APP_NAME" --stage \
     AVA_PIPELINE_SERVER_SECRET=<the secret you saved> \
     SUPABASE_URL=<production Supabase URL> \
     SUPABASE_SERVICE_ROLE_KEY=<production service role key> \
     SOCRATA_APP_TOKEN=<Socrata app token>
   ```

6. **Deploy.** This renders the Fly config from the env file, checks your
   Fly credentials, and runs `fly deploy` from the repository root.

   ```bash
   pnpm deploy:pipeline-server
   ```

7. **Check it.**

   ```bash
   fly status --app "$FLY_APP_NAME"
   curl -s "https://$FLY_APP_NAME.fly.dev/healthz"   # {"ok":true}
   fly ssh console --app "$FLY_APP_NAME" -C "df -h /data"
   fly scale show --app "$FLY_APP_NAME"              # performance-1x, 2048 MB, 1 machine
   ```

## Deploying from CI (optional)

Create a token that can only deploy this app, and store it as a CI secret or
in your own `.env.pipeline-server.prod` as `FLY_API_TOKEN`. Never commit it.

```bash
fly tokens create deploy --app "$FLY_APP_NAME"
```

## Rolling back

The volume holds only build scratch space, so there is nothing on it to back
up. Fly keeps daily volume snapshots for 5 days regardless
(`fly volumes snapshots list <volume-id>`).

To roll back the code, deploy an earlier commit:

```bash
git switch --detach <last-good-commit>
pnpm deploy:pipeline-server
git switch -
```

Or redeploy an earlier image directly. `fly releases --app "$FLY_APP_NAME" --image`
lists them, and the deploy script's rendered config is printed by
`apps/pipeline-server/deploy/render-fly-config.sh`.

## Changing the machine

Edit `FLY_VM_SIZE` or `FLY_VM_MEMORY` in `.env.pipeline-server.prod` and run
`pnpm deploy:pipeline-server` again. Keep `AVA_DUCKDB_MEMORY_LIMIT` at about
half the memory. A volume can grow but never shrink:

```bash
fly volumes extend <volume-id> --size 20 --app "$FLY_APP_NAME"
```
