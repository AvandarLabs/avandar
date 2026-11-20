# Alpha cutover runbook

How Pablo turns `demo/measles` into the alpha line and moves production
(`app.avandarlabs.com`, Supabase project `Avandar`) from `main` to `alpha`.
The spec is Stage 1 of [alpha-launch-plan.md](alpha-launch-plan.md); section
10 maps each of its steps to a step here.

How to read it:

- Every step has a command or click path, what you should see (**Expect**),
  and what to do when you see something else (**If not**).
- Steps that change production say **Writes to production**. 1.5 lists every
  command here that connects to production and what it does there.
- Run commands from the root of the alpha-line worktree (today
  `demo/measles`, `alpha-dev` after 6.4) unless the step names another
  directory.
- A step that says **Verify** could not be checked without touching
  production or a web console when this runbook was written. It gives the
  read-only check to run first.

## Day-of checklist

| # | Phase | Steps | Who, where | Stop if |
| --- | --- | --- | --- | --- |
| 1 | Setup, days before | 1, 3, 4, 5 | Pablo: laptop, GitHub, Vercel, Supabase, Google, Polar | 3.5 shows a missing name |
| 2 | Rehearsal, days before | 2, then 6.1 | Pablo: laptop, local stack | Any row of 2.9 fails |
| 3 | Lock `main` out | 6.2 | Pablo: GitHub | A `migrate` job runs on `main`, or Vercel's Production deployment changes |
| 4 | Build and gate `ava` | 6.3 | Pablo: laptop | The help text is not the alpha-line one |
| 5 | `alpha-dev` live | 6.4, 6.5, then 6.11 for `alpha-dev` | Pablo: GitHub, laptop | `alpha-dev.yaml` is not green; seed counts differ |
| 6 | Create `alpha` | 6.7 | Pablo: laptop | Any `STOP` line |
| 7 | **Release: writes to production** | **6.8**, with 6.6 taken while the `deploy` job waits for approval | Pablo: laptop, GitHub approval | 6.6's restore test fails: do not approve |
| 8 | Smoke test | 6.9 | Pablo: browser | Anything fails: section 7 |
| 9 | **Catalog into production: writes to production** | **6.11** for production | Pablo: laptop | The dry run would refuse, or names another Storage host |
| 10 | Cleanup | 8 | Pablo | |

The rollback basis (5.8) is decided before day 7: PITR on, or a release
started right after the daily backup.

## 1. Before you start

### 1.1 Read the audit and the plan

- [alpha-migration-audit.md](alpha-migration-audit.md): **no blockers.** No
  migration is expected to fail on production's data, and none destroys user
  data. The risk is the deploy order: the app deployed from `main` breaks
  against the migrated schema, so the migrations and the alpha app deploy
  back to back (6.10), after a backup (6.6).
- [alpha-launch-plan.md](alpha-launch-plan.md): the decisions and Stage 1.
- The audit counted 333 users, 48 workspaces, 39 dashboards, and 85 datasets
  in production on 2026-11-19. Your counts in 2.2 may be a little higher.

### 1.2 Prerequisites

| Check | Command | Expect |
| --- | --- | --- |
| `feat/alpha-line` is merged into `demo/measles` and pushed | `git fetch origin && git cat-file -e origin/demo/measles:.github/workflows/alpha.yaml && echo ok` | `ok` |
| Docker is running (`supabase db dump` runs `pg_dump` in a container) | `docker info --format '{{.ServerVersion}}'` | A version number |
| `gh` can push to the repository | `gh api repos/AvandarLabs/avandar --jq .permissions.push` | `true` |
| The Supabase CLI is logged in (after 1.4) | `supabase login`, then `supabase projects list` | `Avandar` and `Avandar Staging` listed |
| `jq` is installed | `jq --version` | A version |
| Node matches `engines` | `node --version` | `v24.x` |

### 1.3 Tools

| Tool | Version | How |
| --- | --- | --- |
| `supabase` | 2.114.0, the repo's pinned CLI | The `supabase` function in 1.4 runs `node_modules/.bin/supabase`. The Homebrew one on `PATH` is 2.98.2: do not use it. |
| `psql`, `pg_dump` | libpq 18 | `brew install libpq`, then `/opt/homebrew/opt/libpq@18/bin/psql --version` prints `psql (PostgreSQL) 18.x`. The `psql` on `PATH` is 14 (Homebrew `postgresql@14`). `importCatalogData.sh` needs psql 15.14, 16.10, 17.6, 18, or newer. |
| `gh` | Logged in with push access | `gh auth status` |
| `vercel` | Optional | Every Vercel change here is a dashboard click path. CI pins 64.7.0. |

### 1.4 Shell setup (every new terminal)

```bash
# From the root of the alpha-line worktree.
export REPO="$PWD"
supabase() { "$REPO/node_modules/.bin/supabase" "$@"; }
export PSQL_BIN=/opt/homebrew/opt/libpq@18/bin/psql
export PG_DUMP_BIN=/opt/homebrew/opt/libpq@18/bin/pg_dump
export PROD_REF=bwxxhmtynhrysbxxxutu        # Avandar (production)
export STAGING_REF=frbelerytsmadmmdwgcl     # Avandar Staging
export CUTOVER_DIR="$HOME/alpha-cutover"
export D="$CUTOVER_DIR/dumps"
umask 077                                   # new files: owner only
mkdir -p "$D" "$CUTOVER_DIR/catalog" && chmod 700 "$CUTOVER_DIR"
# libpq reads these before a URL, so a stray one can send psql elsewhere.
unset PGHOST PGHOSTADDR PGPORT PGDATABASE PGUSER PGPASSWORD PGPASSFILE \
  PGSERVICE PGSERVICEFILE PGSYSCONFDIR PGOPTIONS PGTARGETSESSIONATTRS \
  PGSSLMODE PGREQUIRESSL
# One read-only transaction per query.
read_db() { "$PSQL_BIN" "$1" -X -P pager=off -q -t -A -v ON_ERROR_STOP=1 \
  -c 'begin transaction read only' -c "$2" -c 'rollback'; }
COUNTS_SQL="select (select count(*) from auth.users) as users, (select count(*) from public.workspaces) as workspaces, (select count(*) from public.dashboards) as dashboards, (select count(*) from public.datasets) as datasets"
AUTH_SEED_EXCLUDES=(-x auth.sessions -x auth.refresh_tokens -x auth.one_time_tokens -x auth.flow_state -x auth.audit_log_entries -x auth.mfa_amr_claims)
supabase --version
env | grep '^PG' || echo "no PG variables"
supabase projects list -o json | jq -r '.[] | [.name, (.ref // .id)] | @tsv'
```

**Expect:** `2.114.0`, `no PG variables`, and the two refs above next to
`Avandar` and `Avandar Staging`.
**If not:** run `pnpm install --frozen-lockfile` for the CLI, open a new
terminal for stray `PG*` variables, and stop if a ref differs.

Production's connection string, for the dumps, the read-only checks, and the
catalog import. In the Supabase dashboard: project `Avandar` > **Connect** >
**Session pooler** > copy the URI, with the database password filled in and
percent-encoded.

```bash
read -rs PROD_DB_URL && export PROD_DB_URL   # paste, Enter: nothing is echoed
[[ "$PROD_DB_URL" == postgresql://postgres.$PROD_REF:*@*:5432/postgres* ]] &&
  echo "PROD_DB_URL looks right" &&
  read_db "$PROD_DB_URL" "select current_user, max(version), count(*) from supabase_migrations.schema_migrations"
```

**Expect:** `PROD_DB_URL looks right`, then `postgres|20261013212914|115`.
**If not:** a different version or count means production moved since the
audit: stop and re-run the audit's checks before going on. Never use port
6543 (the transaction pooler).

### 1.5 Rules for production access and the dumps

This runbook never runs `supabase link` or a `--linked` command. In CLI
2.114 those create a temporary login role in the target project, with write
access, and after 3 failed connection retries they delete the project's
network bans. Every production dump goes through `--db-url "$PROD_DB_URL"`
instead.

| Connects to production | Steps | What it does there |
| --- | --- | --- |
| `read_db "$PROD_DB_URL" ...` | 1.4, 2.2, 6.6, 6.11 | Queries in a read-only transaction |
| `supabase db dump --db-url "$PROD_DB_URL" ...` | 2.2, 6.6 | `pg_dump` over the session pooler as `postgres`: reads only |
| `supabase projects api-keys`, `branches list`, `backups list`, `secrets list`, `functions list`, with `--project-ref "$PROD_REF"` | 3.3, 5.1, 5.5, 5.8, 6.6, 6.9 | Management API reads |
| `supabase storage cp ... --project-ref "$PROD_REF"` (optional) | 2.8 | Storage downloads |
| `"$PG_DUMP_BIN" "$PROD_DB_URL" ...`, `importCatalogData.sh ... --dry-run` | 6.11.4, 6.11.5 | Reads only (the importer's report runs in read-only transactions) |
| **Writes to production** | 5.1 (only if keys are missing), 5.8 (only if you turn PITR on), 6.8, 6.11.6, 6.11.7, section 7 | As each step says |

The dumps hold real user data. The sensitive tables:

| Table | Holds |
| --- | --- |
| `auth.users`, `auth.identities` | Emails, password hashes, OAuth identities |
| `auth.sessions`, `auth.refresh_tokens`, `auth.one_time_tokens`, `auth.flow_state`, `auth.mfa_amr_claims` | Live sign-in material |
| `auth.audit_log_entries` | Sign-in history with IP addresses |
| `public.tokens__google` | Users' Google OAuth tokens |

- Keep every dump in `$CUTOVER_DIR` (mode 700, files 600 through the
  `umask`), outside the repository and outside iCloud-synced folders.
- Never commit a dump, and never upload one anywhere: no issue, pull
  request, or GitHub Actions artifact. The repository is public.
- Delete the dumps when section 8 says so.
- Never print a database URL or key. Read them into variables as above.

## 2. Rehearsal (local)

Restores production into a switched local stack, applies the 76 alpha-only
migrations, dumps the result for `alpha-dev`, and opens old dashboards.
Nothing here writes to production.

### 2.1 Create the throwaway worktree and its own stack

```bash
wt new chore/alpha-rehearsal demo/measles
cd <the path wt printed>
git status -sb && git log -1 --format='%h %s'
ava supabase status
ava supabase switch --no-seed
ava supabase status
export REHEARSAL="$PWD"
```

**Expect:** the branch sits at `origin/demo/measles`'s tip, and the second
`ava supabase status` names the branch's own project,
`chore-alpha-rehearsal`, on its first line.
**If not:** never run 2.3 to 2.7 while status says `This is the develop
local Supabase`: they would reset the shared stack every other worktree
uses. Fix the switch first (CLAUDE.md, "Supabase").

### 2.2 Dump production (reads production)

```bash
cd "$REHEARSAL"
read_db "$PROD_DB_URL" "$COUNTS_SQL" | tee "$D/prod-rehearsal-counts.txt"
supabase db dump --db-url "$PROD_DB_URL" --role-only -f "$D/prod-rehearsal-roles.sql"
supabase db dump --db-url "$PROD_DB_URL" -f "$D/prod-rehearsal-schema.sql"
supabase db dump --db-url "$PROD_DB_URL" --data-only --use-copy -s public \
  -x public.tokens__google -f "$D/prod-rehearsal-data-public.sql"
supabase db dump --db-url "$PROD_DB_URL" --data-only --use-copy -s auth \
  "${AUTH_SEED_EXCLUDES[@]}" -f "$D/prod-rehearsal-data-auth.sql"
for f in "$D"/prod-rehearsal-*.sql; do
  sed -i '' '/^SET transaction_timeout = 0;$/d' "$f"
done
grep -c 'PostgreSQL database dump complete' "$D/prod-rehearsal-data-public.sql" "$D/prod-rehearsal-data-auth.sql"
grep -c '^CREATE ROLE' "$D/prod-rehearsal-roles.sql"
```

**Expect:** counts near 333, 48, 39, 85; non-empty files; `1` for each data
file; and `0` (the CLI drops every Supabase-managed role).
**If not:** a missing footer means a data dump was cut short: dump it again.
A `CREATE ROLE` line names a role production created by hand: read it before
loading. The `sed` removes a setting Postgres 15 rejects, which a newer
`pg_dump` writes.

The rehearsal leaves out Storage (no database dump carries its files, and
Storage's own tables differ between Supabase versions), Google tokens, and
Auth sessions and tokens. None of them is read by a migration.

### 2.3 Reset the local stack to production's migration version

```bash
cd "$REHEARSAL"
ava supabase status      # must name chore-alpha-rehearsal
supabase db reset --local --no-seed --version 20261013212914
export LOCAL_DB_URL="$(supabase status -o json | jq -er '.DB_URL')"
[[ "$LOCAL_DB_URL" == postgresql://*@127.0.0.1:* ]] && echo "local URL ok"
read_db "$LOCAL_DB_URL" "select max(version), count(*) from supabase_migrations.schema_migrations"
```

**Expect:** `local URL ok`, then `20261013212914|115`: the local schema is
`main`'s 115 migrations, as in production.
**If not:** no `local URL ok` means you are in the wrong directory: stop.

### 2.4 Compare the schemas (informational)

```bash
supabase db dump --local -f "$D/local-at-prod-version-schema.sql"
diff "$D/prod-rehearsal-schema.sql" "$D/local-at-prod-version-schema.sql" \
  > "$D/schema-drift.diff"; wc -l < "$D/schema-drift.diff"
```

**Expect:** few or no lines.
**If not:** read every difference. One that touches a table, column,
function, or policy a migration reads is drift the audit did not see: stop
and check it against the audit.

### 2.5 Load production's roles and data

```bash
"$PSQL_BIN" "$LOCAL_DB_URL" -X -P pager=off --single-transaction --set ON_ERROR_STOP=1 \
  --file "$D/prod-rehearsal-roles.sql" \
  --file "$D/prod-rehearsal-data-auth.sql" \
  --file "$D/prod-rehearsal-data-public.sql"
read_db "$LOCAL_DB_URL" "$COUNTS_SQL"
```

**Expect:** psql ends without an error, and the counts equal
`prod-rehearsal-counts.txt`.
**If not:** the transaction rolled back, so repeat from 2.3 after the fix. An
error on an `auth` table (a missing column or a duplicate key) means the
local Auth version differs from production's: add `-x auth.<table>` for that
table to `AUTH_SEED_EXCLUDES` and repeat 2.2's auth dump, unless it is
`auth.users` or `auth.identities`, which is a blocker to raise.

### 2.6 Apply the alpha-only migrations

```bash
ava supabase status      # must name chore-alpha-rehearsal
supabase migration up --local --include-all
read_db "$LOCAL_DB_URL" "select max(version), count(*) from supabase_migrations.schema_migrations"
read_db "$LOCAL_DB_URL" "$COUNTS_SQL"
```

**Expect:** 76 `Applying migration ...` lines with no error, then
`20261116192935|191` (or the alpha-dev tip's newest migration and count),
and the same counts as 2.5.
**If not:** a failed migration is a cutover blocker. Record its file and
error, stop, and fix it on `alpha-dev` as a new migration before cutover.

### 2.7 Dump the migrated data for `alpha-dev`, before any app use

Right after 2.6, before `pnpm dev` and before 2.8's password change, so the
`auth` rows are production's, untouched. 6.5 loads these files into
`alpha-dev`.

```bash
cd "$REHEARSAL"
ava supabase status      # must name chore-alpha-rehearsal
read_db "$LOCAL_DB_URL" "$COUNTS_SQL" | tee "$D/alpha-dev-seed-counts.txt"
supabase db dump --local --data-only --use-copy -s public \
  -x public.data_catalog_facet_counts -x public.tokens__google \
  -f "$D/alpha-dev-seed-public.sql"
supabase db dump --local --data-only --use-copy -s auth \
  "${AUTH_SEED_EXCLUDES[@]}" -f "$D/alpha-dev-seed-auth.sql"
grep -c 'PostgreSQL database dump complete' "$D/alpha-dev-seed-public.sql" "$D/alpha-dev-seed-auth.sql"
git -C "$REHEARSAL" rev-parse HEAD:supabase/migrations | tee "$D/alpha-dev-seed-migrations-tree.txt"
```

**Expect:** the counts of 2.6, and `1` for each file. The seed keeps the
users' emails, as the plan approved, and leaves out Google tokens, Auth
sessions and tokens, and the facet counts (6.11 recounts them). The last
line records which migrations the seed was built with.

### 2.8 Open old dashboards

Pick 5 dashboards from your own workspaces:

```bash
read_db "$LOCAL_DB_URL" "select w.slug, d.id, d.name, d.created_at from public.dashboards d join public.workspaces w on w.id = d.workspace_id join public.workspace_memberships m on m.workspace_id = d.workspace_id join auth.users u on u.id = m.user_id where u.email = '<your production email>' order by d.created_at limit 5"
grep '^VITE_APP_URL=' .env.development
pnpm dev
```

Sign in at the `VITE_APP_URL` with your production email and password. If
you sign in with Google in production, set a local-only password first. This
writes to the local stack only, after 2.7 already took the seed:

```bash
"$PSQL_BIN" "$LOCAL_DB_URL" -X -P pager=off -v ON_ERROR_STOP=1 -c "update auth.users set encrypted_password = extensions.crypt('<a local-only password>', extensions.gen_salt('bf')) where email = '<your production email>'"
```

Open each as `<VITE_APP_URL>/<slug>/dashboards/edit/<id>` and record it:

| # | Workspace slug | Dashboard id | Name | Result |
| --- | --- | --- | --- | --- |
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

**Expect:** each dashboard opens with its title, layout, and every tile's
header, and no error screen. A tile may say its data could not load: dataset
files live in Storage (`workspaces/<workspace-id>/datasets/<dataset-id>.parquet`),
which no dump carries.
**If not:** an error screen or a tile that fails to parse is a blocker: the
dashboard's stored config does not survive the alpha code. If edge functions
answer 401 with `unexpected "iss"`, run `pnpm fns:update-env` and restart
`pnpm dev`.

Optional, to see one dashboard with its data: copy its workspace's dataset
files from production Storage (a read) into the local stack.

```bash
cd "$REHEARSAL"
supabase storage cp -r "ss:///workspaces/<workspace-id>/datasets" \
  "$CUTOVER_DIR/storage/<workspace-id>/datasets" --project-ref "$PROD_REF"
supabase storage cp -r "$CUTOVER_DIR/storage/<workspace-id>/datasets" \
  "ss:///workspaces/<workspace-id>/datasets" --local
```

**Verify:** if the CLI says the command is experimental, add `--experimental`.

### 2.9 Pass criteria

| Check | Pass |
| --- | --- |
| Every migration applies (2.6) | 76 applied, none failed |
| `auth.users`, `workspaces`, `dashboards` row counts | Equal before and after the migrations, and equal to production at dump time |
| The `alpha-dev` seed (2.7) | Taken before any app use, every file complete |
| 5 named old dashboards (2.8) | All open without an error screen |
| Schema drift (2.4) | Nothing a migration reads |

Leave the rehearsal worktree and its stack in place: 6.6 tests the backup in
it.

## 3. GitHub setup (Pablo, portal)

### 3.1 Restrict the `production` environment by branch

Repository **Settings** > **Environments** > **Production** > **Deployment
branches and tags** > **Selected branches and tags** > **Add deployment
branch or tag rule** > Ref type **Branch**, name pattern `alpha` > **Add
rule**. Repeat with `main`. Do not add tag rules, and do not choose
**Protected branches only**.

`main` stays allowed until 6.2 lands the lock-out on `main`, so today's
mainline release can still deploy production. 6.2 removes it.

```bash
gh api repos/AvandarLabs/avandar/environments/production --jq '.deployment_branch_policy'
gh api repos/AvandarLabs/avandar/environments/production/deployment-branch-policies \
  --jq '.branch_policies[] | {name, type}'
```

**Expect:** `protected_branches` false and `custom_branch_policies` true,
then `alpha` and `main`, both `branch`.
**If not:** fix the rule in the same screen. Today the policy is `null`: any
branch may use the environment.

This restricts the environment's credentials by branch, and that is all. The
Staging environment has no branch policy, and its tokens (a Supabase access
token among them) are usable by any branch: only workflow code keeps other
workflows away from production (section 9).

### 3.2 Add a required reviewer (required for the cutover)

**Production** > **Deployment protection rules** > **Required reviewers** >
add yourself > clear **Prevent self-review** > **Save protection rules**.

```bash
gh api repos/AvandarLabs/avandar/environments/production --jq '[.protection_rules[].type]'
```

**Expect:** `["required_reviewers"]` among the types.
The `deploy` job then waits for approval before its first step, so the
backup (6.6) is taken while it waits, right before the migrations. A re-run
of the job waits for approval again.

### 3.3 Set the `production` environment's secrets and variables

`alpha.yaml`'s "Check the production configuration" step requires the 23
names below, plus `GEOAPIFY_API_KEY` when set. The commit that added the
workflow lists `GOOGLE_REDIRECT_URI` and `RESEND_LOCAL_TEST_SEGMENT_ID` too:
only the test jobs read those, from `staging`. The workflow file wins.

| Name | Kind | Exists today | Value |
| --- | --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Secret | Yes | Supabase personal access token |
| `PRODUCTION_DB_PASSWORD` | Secret | Yes | Production database password |
| `PRODUCTION_PROJECT_ID` | Secret | Yes | `$PROD_REF` |
| `PRODUCTION_SUPABASE_URL` | Variable | No | Exactly `https://<PRODUCTION_PROJECT_ID>.supabase.co` |
| `PRODUCTION_SB_PUBLISHABLE_KEY` | Variable | No | Production publishable key, `sb_publishable_...` |
| `PRODUCTION_SB_SECRET_KEY` | Secret | No | Production secret key, unmasked, `sb_secret_...` |
| `VERCEL_TOKEN` | Secret | No | Vercel token with access to the team |
| `VERCEL_ORG_ID` | Secret | No | The team's Team ID, `team_...` |
| `VERCEL_PROJECT_ID` | Secret | No | Project `avandar`'s ID, `prj_...` |
| `GOOGLE_CLIENT_ID` | Secret | No | Production Google OAuth client |
| `GOOGLE_CLIENT_SECRET` | Secret | No | Same client |
| `POLAR_ACCESS_TOKEN` | Secret | No | Production Polar organization token (5.3) |
| `UPSTASH_REDIS_API_URL` | Secret | No | Production Upstash database |
| `UPSTASH_REDIS_REST_API_TOKEN` | Secret | No | Same database |
| `RESEND_SENDING_API_KEY` | Secret | No | Resend |
| `RESEND_FULL_ACCESS_API_KEY` | Secret | No | Resend |
| `OPENAI_API_KEY` | Secret | No | OpenAI |
| `OPEN_ROUTER_API_KEY` | Secret | No | OpenRouter |
| `FEATUREBASE_JWT_SECRET` | Secret | No | Featurebase |
| `AVA_PIPELINE_SERVER_SECRET` | Secret | No | The pipeline server's secret (5.4) |
| `AVA_PIPELINE_SERVER_URL` | Variable | No | `https://<fly app>.fly.dev` (5.4) |
| `VITE_GOOGLE_PICKER_API_KEY` | Secret | No | Google Picker API key |
| `VITE_GOOGLE_PICKER_APP_ID` | Variable | No | Google Picker app ID |
| `GEOAPIFY_API_KEY` | Secret, optional | No | Leave unset to keep the key already set on the project |

Set every one on the **environment**, never on the repository or the
organization. A same-named repository or organization value silently fills a
missing environment value. Secrets prompt for the value, so it stays out of
shell history:

```bash
gh secret set VERCEL_TOKEN --env production
gh variable set PRODUCTION_SUPABASE_URL --env production --body "https://$PROD_REF.supabase.co"
supabase projects api-keys --project-ref "$PROD_REF" -o json \
  | jq -j '[.[] | select(.type == "publishable")][0].api_key' \
  | gh variable set PRODUCTION_SB_PUBLISHABLE_KEY --env production
supabase projects api-keys --project-ref "$PROD_REF" --reveal -o json \
  | jq -j '[.[] | select(.type == "secret")][0].api_key' \
  | gh secret set PRODUCTION_SB_SECRET_KEY --env production
```

**Verify:** run the `api-keys` command without the pipe first, and without
`--reveal`, to see its JSON shape and that both key types exist (5.1).

### 3.4 Value rules the configuration check enforces

| Rule | Applies to |
| --- | --- |
| Not empty | The 23 required names |
| No leading or trailing whitespace, no carriage return | The 23, and `GEOAPIFY_API_KEY` |
| No single quote, no line break | Every value written to the edge function secrets file |
| `https://<PRODUCTION_PROJECT_ID>.supabase.co`, exactly | `PRODUCTION_SUPABASE_URL` |
| `^sb_publishable_[A-Za-z0-9_-]+$` | `PRODUCTION_SB_PUBLISHABLE_KEY` |
| `^sb_secret_[A-Za-z0-9_-]+$` (a masked copy fails) | `PRODUCTION_SB_SECRET_KEY` |
| `^team_[A-Za-z0-9]+$` | `VERCEL_ORG_ID` |

No quotes around any value.

### 3.5 Check the names before every release

```bash
expected_secrets="AVA_PIPELINE_SERVER_SECRET FEATUREBASE_JWT_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET OPENAI_API_KEY OPEN_ROUTER_API_KEY POLAR_ACCESS_TOKEN PRODUCTION_DB_PASSWORD PRODUCTION_PROJECT_ID PRODUCTION_SB_SECRET_KEY RESEND_FULL_ACCESS_API_KEY RESEND_SENDING_API_KEY SUPABASE_ACCESS_TOKEN UPSTASH_REDIS_API_URL UPSTASH_REDIS_REST_API_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID VERCEL_TOKEN VITE_GOOGLE_PICKER_API_KEY"
expected_vars="AVA_PIPELINE_SERVER_URL PRODUCTION_SB_PUBLISHABLE_KEY PRODUCTION_SUPABASE_URL VITE_GOOGLE_PICKER_APP_ID"
echo "Missing secrets:"; comm -23 <(tr ' ' '\n' <<<"$expected_secrets" | sort) \
  <(gh secret list --env production --json name -q '.[].name' | sort)
echo "Missing variables:"; comm -23 <(tr ' ' '\n' <<<"$expected_vars" | sort) \
  <(gh variable list --env production --json name -q '.[].name' | sort)
echo "Repository secrets:"; gh secret list --json name -q '.[].name'
echo "Repository variables:"; gh variable list --json name -q '.[].name'
```

**Expect:** nothing under either "Missing" line, only
`CLAUDE_CODE_OAUTH_TOKEN` under repository secrets, and no repository
variables. Organization secrets: repository **Settings** > **Secrets and
variables** > **Actions** shows none under **Organization secrets** (the API
needs `admin:org`).
**If not:** set what is missing (3.3), and delete any repository or
organization value that shares a name with one in 3.3.

### 3.6 Check the Staging environment for `deploy-mainline`

```bash
gh secret list --env staging --json name -q '.[].name' \
  | grep -xE 'VERCEL_TOKEN|VERCEL_ORG_ID|VERCEL_PROJECT_ID|STAGING_PROJECT_ID|VITE_GOOGLE_PICKER_API_KEY'
gh variable list --env staging --json name -q '.[].name' | grep -x VITE_GOOGLE_PICKER_APP_ID
```

**Expect:** 5 names, then 1 (true on 2026-11-20).
**If not:** add the missing ones to `staging` before 6.2.

The `alpha` ruleset is set in 6.7, once `alpha` exists, and the branch rename
is 6.4.

## 4. Vercel setup (Pablo only, dashboard)

### 4.1 Create the `alpha-dev` environment

Project `avandar` > **Settings** > **Environments** > **Create Environment** >
name `alpha-dev`, branch tracking off > import variables from `demo` >
**Save**.

It must not define `VITE_SUPABASE_API_URL`, `VITE_SUPABASE_ANON_KEY`, or
`VITE_APP_URL`: `alpha-dev.yaml` sets them from the Supabase branch and fails
on purpose when Vercel has them. **Verify:** if the dialog has no import
option, add the `demo` values by hand under **Settings** > **Environment
Variables**, filtered to `demo`.

### 4.2 Add `alpha.avandarlabs.com`

**Settings** > **Domains** > **Add Domain** > `alpha.avandarlabs.com` >
connect it to the `alpha-dev` environment > **Save**. Create the DNS record
Vercel shows (a `CNAME` for `alpha`) at the DNS provider for
`avandarlabs.com`.

```bash
dig +short CNAME alpha.avandarlabs.com
```

**Expect:** the value Vercel showed, and **Valid Configuration** in Vercel.

### 4.3 Create the `mainline` environment

**Create Environment** > name `mainline`, branch tracking off, **no** import
(never from Production). Then **Settings** > **Environment Variables**, for
`mainline` only, with **Sensitive** off on each:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_API_URL` | `https://frbelerytsmadmmdwgcl.supabase.co`, exactly the staging project's URL |
| `VITE_SUPABASE_ANON_KEY` | Staging's publishable key (Supabase `Avandar Staging` > **Project Settings** > **API Keys**) |
| `VITE_APP_URL` | The URL the mainline build is opened at (decide first, below) |

`deploy-mainline` (the lock-out `production.yaml`) fails before building when
any of the three is Sensitive, when `VITE_SUPABASE_API_URL` is not
`https://<STAGING_PROJECT_ID>.supabase.co`, or when the key or app URL is
empty. Copy any other variable the build needs from the Preview environment,
not from Production.

`VITE_APP_URL` has no value yet. Recommended: add `mainline.avandarlabs.com`
to the `mainline` environment (as in 4.2), use
`https://mainline.avandarlabs.com`, and add
`https://mainline.avandarlabs.com/**` to `Avandar Staging` > **Authentication**
> **URL Configuration** > **Redirect URLs** (a staging change) so sign-in
works there.

### 4.4 Review Production's `VITE_*` values for alpha

`alpha.yaml` builds from Vercel's Production environment. It drops
`VITE_SUPABASE_API_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_APP_URL` (set
from GitHub), every Sensitive value, and the Google Picker pair (from
GitHub). Compare the rest with `demo`:

| Name | What it does on alpha |
| --- | --- |
| `VITE_FEATURE_FLAGS` | Comma-separated: `disable-self-registration`, `disable-manual-data`, `disable-geo-explorer`, `disable-profile-manager`, `enable-user-feedback`, `disable-duckdb-spatial`, `enable-gis-isochrone` |
| `VITE_AVA_DATA_AGENT` | New on alpha. `on` turns the data agent on for every user |
| `VITE_HIDE_DEV_TOOLS` | `true` hides the router dev tools |
| `VITE_OFFLINE_CHAT_MOCK` | Must be unset in production |

A `VITE_*` value marked Sensitive never reaches the build: the run log of
"Pull the Vercel production environment" lists those it left out.

### 4.5 Delete deploy hooks for `main` and `alpha`

**Settings** > **Git** > **Deploy Hooks** > delete any hook whose branch is
`main` or `alpha`.

### 4.6 Production branch

**Settings** > **Environments** > **Production** > **Branch Tracking**: it
must never be `alpha`. `vercel.json` turns off Git-integration deploys for
`main`, `alpha`, and `alpha-dev`, and Vercel reads that setting from the
pushed commit, so a commit without it would deploy. Turning branch tracking
off for Production is optional and can wait until after cutover.

## 5. Supabase and third-party setup

### 5.1 Production API keys

```bash
supabase projects api-keys --project-ref "$PROD_REF"
```

**Expect:** a publishable key and a secret key (new-style).
**If not:** create them in `Avandar` > **Project Settings** > **API Keys**.
**Writes to production** (project configuration, not data).

### 5.2 Google OAuth redirect URI

Google Cloud console > **APIs & Services** > **Credentials** > the OAuth
client whose ID is the production `GOOGLE_CLIENT_ID` > **Authorized redirect
URIs** must contain
`https://bwxxhmtynhrysbxxxutu.supabase.co/functions/v1/google-auth-callback`.
`alpha.yaml` sets exactly this as `GOOGLE_REDIRECT_URI`. Add it if missing.

### 5.3 Polar

Polar dashboard, **production** organization (not the sandbox) > **Settings**
> **Developers** > create an access token > store it as
`POLAR_ACCESS_TOKEN` (3.3). `alpha.yaml` sets `POLAR_SERVER_TYPE=production`.

### 5.4 Pipeline server

Follow [pipeline-server-fly-runbook.md](pipeline-server-fly-runbook.md) to
have the server running (`curl -s "https://<fly app>.fly.dev/healthz"`
answers `{"ok":true}`). The server keeps no Supabase credentials. Store its
URL as `AVA_PIPELINE_SERVER_URL` and its secret as
`AVA_PIPELINE_SERVER_SECRET` (3.3). That runbook's "set by hand" production
step is now done by every `alpha.yaml` run, which overwrites both secrets.

### 5.5 Production has no Git integration or Branching

Read only: `Avandar` > **Project Settings** > **Integrations** > **GitHub**
is not connected (or has no production branch), and **Branches** shows
Branching off.

```bash
supabase branches list --project-ref "$PROD_REF"
```

**Expect:** an error that Branching is not enabled, or no branches.
**If not:** stop: a Git integration on `main` would deploy production outside
`alpha.yaml`.

### 5.6 The `alpha-dev` Supabase branch (before 6.4)

```bash
supabase branches list --project-ref "$STAGING_REF" -o json \
  | jq '.[] | select(.name=="alpha-dev") | {name, persistent, status}'
```

**Expect:** no output, since `alpha-dev.yaml` creates it.
**If not:** when it exists with `"persistent": false`, run
`supabase branches update alpha-dev --persistent --project-ref "$STAGING_REF"`
and check again. The workflow's script now makes it persistent too. Re-check
after 6.4 and before 6.5.

### 5.7 Keep the `demo-measles` branch alive until 6.11 (writes to staging)

The catalog and its Parquet files are copied from the `demo-measles` branch
of `Avandar Staging`. It is not persistent, so it pauses when idle, and
nothing deploys it once `demo.yaml` is gone with the merge.

```bash
supabase branches list --project-ref "$STAGING_REF" -o json \
  | jq '.[] | select(.name=="demo-measles") | {name, persistent, status, preview_project_status}'
supabase branches update demo-measles --persistent --project-ref "$STAGING_REF"
```

**Expect:** the branch, then, after the update, `"persistent": true` on a
second listing.
**If not:** a `preview_project_status` other than `ACTIVE_HEALTHY` means it
paused: `supabase branches unpause demo-measles --project-ref "$STAGING_REF"`,
then list again until it reads `ACTIVE_HEALTHY`. If the branch is gone, the
production copy uses `alpha-dev` as its source instead (6.11.1).

### 5.8 Choose the rollback basis

Decide before 6.8 which restore section 7 will use. Check today's state:

```bash
supabase backups list --project-ref "$PROD_REF"
```

| Option | What it costs | What a restore loses |
| --- | --- | --- |
| **A (recommended if affordable).** Turn PITR on for the cutover window: `Avandar` > **Project Settings** > **Add-ons** > **Point in time recovery**. **Writes to production** (project configuration and billing). Turn it off again after the release is settled. | The add-on's price for the days it is on. **Verify:** the dashboard shows the price and whether the compute size must grow first | Only writes after the second you restore to (the start of "Apply migrations", when `main`'s app was already broken) |
| **B.** No PITR. Start 6.8 right after the daily scheduled backup (its time is in `backups list`), and restore with the scheduled backup plus the top-up 6.6 tests | Nothing | Writes since the scheduled backup to anything outside `public` and `auth` (for example the Storage rows of files uploaded since: the files stay, the app no longer sees them), and every write after 6.6. Without the top-up, a scheduled backup alone loses up to about 24 hours of every user's writes |

## 6. Cutover

| Step | Touches production | When |
| --- | --- | --- |
| 6.1 Rehearsal passed | No | First |
| 6.2 Lock-out to `develop`, then `main` | No (stops `main` deploying it) | Before 6.7 |
| 6.3 `ava` gates and build | No | Before 6.4 |
| 6.4 Rename and push `alpha-dev` | No | After 5.6 |
| 6.5 Seed `alpha-dev` | No | Right after 6.4's first deploy |
| 6.6 Back up production | Reads | While 6.8's `deploy` job waits for approval |
| 6.7 Create `alpha` | No | After 6.2 |
| 6.8 `ava release` | **Yes** | After 5.8 is decided |
| 6.9 Smoke test | Reads | Right after 6.8 |
| 6.11 Catalog into production | **Yes** | After 6.8 deployed |

### 6.1 Confirm the rehearsal passed

Every row of 2.9 passes, and the rehearsal ran on exactly the migrations
`alpha-dev` will release:

```bash
cd "$REPO" && git fetch origin
[[ "$(cat "$D/alpha-dev-seed-migrations-tree.txt")" == "$(git rev-parse origin/demo/measles:supabase/migrations)" ]] &&
  echo "same migrations"
```

Use `origin/alpha-dev` in place of `origin/demo/measles` after 6.4.
**Expect:** `same migrations`.
**If not:** a migration changed since the rehearsal: repeat 2.2 to 2.7 on
the new tip, since the seed must match `alpha-dev`'s schema too.

### 6.2 Merge the lock-out into `develop`, then `main`

Until this lands on `main`, a push to `main` can still migrate and deploy
production. The order matters: `ava release` makes `main` an exact copy of
`develop`'s tree, so a mainline release after a `main`-only merge would bring
the old `production.yaml` back.

**6.2.1 Into `develop`.** Push `chore/mainline-lockout` (off `develop`) and
merge it with a squash PR titled
`chore(ci)!: stop main from deploying production`. Then:

```bash
git fetch origin
export DEVELOP_SHA="$(git rev-parse origin/develop)"
git diff "$DEVELOP_SHA" origin/demo/measles -- .github/workflows/production.yaml vercel.json
```

Use `origin/alpha-dev` in place of `origin/demo/measles` after 6.4.
**Expect:** no diff: the alpha line already carries the same final files.
**If not:** stop and reconcile.

**6.2.2 Record Vercel's current Production deployment.**

```bash
gh api 'repos/AvandarLabs/avandar/deployments?environment=Production&per_page=10' \
  --jq '[.[] | select(.creator.login == "vercel[bot]")][0] | {sha, created_at}'
```

Write down the `sha` and `created_at` it prints (2026-11-20: `8bb5b44f3`,
`2026-11-06T16:01:28Z`).

**6.2.3 Into `main`**, from a branch off `main` that takes `develop`'s two
files verbatim. The commit runs only when exactly those two files changed:

```bash
wt new chore/mainline-lockout-main main
cd <the path wt printed>
git fetch origin && git reset --hard origin/main &&
  git checkout "$DEVELOP_SHA" -- .github/workflows/production.yaml vercel.json &&
  [[ "$(git diff --cached --name-only | tr '\n' ' ')" == ".github/workflows/production.yaml vercel.json " ]] &&
  git commit -m "chore(ci)!: stop main from deploying production" \
    -m "BREAKING CHANGE: main deploys to the mainline Vercel environment. alpha serves production." &&
  git push -u origin chore/mainline-lockout-main &&
  gh pr create --base main --head chore/mainline-lockout-main \
    --title "chore(ci)!: stop main from deploying production" \
    --body "Takes develop's production.yaml and vercel.json verbatim: main deploys the mainline Vercel environment and no longer migrates production."
gh pr merge chore/mainline-lockout-main --squash
```

**Expect:** a PR URL, then the merge. The merge needs your admin bypass (the
`Main` ruleset restricts updates): if `gh` refuses, add `--admin`.
**If not:** a chain that stops before `git commit` means other files
changed, so the base was wrong: start over.

**6.2.4 Confirm `main` no longer deploys production.**

```bash
RUN_ID="$(gh run list --workflow production.yaml --branch main --limit 1 --json databaseId --jq '.[0].databaseId')"
gh run watch "$RUN_ID"
gh run view "$RUN_ID" --json headSha,jobs --jq '.headSha, .jobs[].name'
gh api 'repos/AvandarLabs/avandar/deployments?environment=Production&per_page=10' \
  --jq '[.[] | select(.creator.login == "vercel[bot]")][0] | {sha, created_at}'
```

**Expect:** the merge commit's sha, then jobs `lint-typecheck`, `test-quick`,
`test-e2e`, `deploy-mainline`, and no `migrate`; `deploy-mainline` succeeds;
the last command prints the same `sha` and `created_at` as 6.2.2; Vercel's
**Deployments** list shows a `mainline` deployment and no new Production one.
**If not:** a `deploy-mainline` failure names the Vercel `mainline` value to
fix (4.3): fix it and `gh run rerun "$RUN_ID" --failed`. Production is
untouched either way. A `migrate` job means the merge took the wrong file:
cancel the run (`gh run cancel "$RUN_ID"`) at once.

**6.2.5 Remove `main` from the production environment.** 3.1's screen >
delete the `main` rule. Re-run 3.1's two commands: only `alpha` remains.

### 6.3 `ava` gates and build

- **Port the alpha-line `ava-cli` to `develop` only after 6.2.1.** Its
  mainline release says pushing `main` "does not touch production", which is
  only true once the lock-out is on `develop`, and through the next release,
  on `main`.
- **Before 6.2.3 has merged, never run a mainline `ava release` with an
  `ava` built from an alpha-line worktree.** The `ava` symlink points at
  whichever worktree last ran `pnpm build:ava-cli`. Check it with the
  `readlink` below, and rebuild from a `develop` worktree when you need a
  mainline release first.
- This branch changes `ava release`. Build it from the alpha-line worktree:

```bash
cd "$REPO"
pnpm install --frozen-lockfile
pnpm build:ava-cli
readlink "$(dirname "$(which pnpm)")/ava"
ava release --help | head -3
ava release --dry-run --skip-changelog
```

**Expect:** the symlink ends in this worktree's
`apps/ava-cli/dist/main.cjs`; the help says "Run it on alpha-dev to release
alpha"; the dry run refuses before changing anything. On `demo/measles` it
says `Releases are cut from "alpha-dev" or "develop" (currently on
"demo/measles")`. On `alpha-dev` before 6.7 it says `origin/alpha does not
exist` and prints the push 6.7 runs.
**If not:** an old help text means another worktree's build: rebuild here.

### 6.4 Rename `demo/measles` to `alpha-dev` and push it

Do 5.6 and 5.7 first. Then rename on GitHub: repository > **Branches** >
`demo/measles` > the **...** menu > **Rename branch** > `alpha-dev`. Or:

```bash
gh api -X POST repos/AvandarLabs/avandar/branches/demo%2Fmeasles/rename -f new_name=alpha-dev --jq .name
```

**Expect:** `alpha-dev`. Open PRs into `demo/measles` now target `alpha-dev`.

Point the local branch at it, then push. A rename starts no workflow, and
`ava release` needs a run for the tip, so push a commit:

```bash
cd "$REPO"
git fetch origin --prune
git branch -m demo/measles alpha-dev
git branch -u origin/alpha-dev alpha-dev
git status -sb
git commit --allow-empty -m "chore(ci): first alpha-dev deploy"
git push origin HEAD:refs/heads/alpha-dev
sleep 15
ALPHA_DEV_RUN_ID="$(gh run list --workflow alpha-dev.yaml --branch alpha-dev --limit 1 --json databaseId --jq '.[0].databaseId')"
gh run watch "$ALPHA_DEV_RUN_ID"
```

**Expect:** `## alpha-dev...origin/alpha-dev` with nothing ahead or behind
before the commit. The run creates the persistent `alpha-dev` Supabase
branch, migrates it, sets its edge function secrets, deploys its functions,
points its Auth at `alpha.avandarlabs.com`, and deploys
`https://alpha.avandarlabs.com`. Re-run 5.6's command: `"persistent": true`.
**If not:**

| Symptom | Do |
| --- | --- |
| "Remove VITE_SUPABASE_API_URL ... from the Vercel 'alpha-dev' environment" | Remove them (4.1), then `gh run rerun "$ALPHA_DEV_RUN_ID" --failed` |
| `VERCEL_ORG_ID must be the avandar team's Team ID` | Fix it in the `staging` environment, re-run |
| Branch not healthy after 900 s | Check the branch in the Supabase dashboard, re-run |

`alpha-dev.yaml` is also the gate `ava release` reads: the newest run for
the tip must be a completed `success`. A failing `test-e2e` blocks the
release even though it does not block the deploy. A run for the tip that
concurrency cancelled is fixed with `gh run rerun <its databaseId>`, from
`gh run list --workflow alpha-dev.yaml --branch alpha-dev --json databaseId,headSha,conclusion`.
**Verify:** `gh workflow run alpha-dev.yaml --ref alpha-dev` also starts one,
but GitHub may refuse a manual run of a workflow that is not on the default
branch. Then push another empty commit.

### 6.5 Seed the `alpha-dev` Supabase branch

The seed is 2.7's files: production's data as the rehearsal migrated it,
dumped before any use of the rehearsal app. Production's raw dump would not
load: it has `main`'s schema (for example `catalog_entries` and
`individuals.status`), and `alpha-dev` already has the alpha schema. This
writes to the `alpha-dev` branch of `Avandar Staging`, not to production.

**6.5.1 Connect to the branch (never print the URL).** `supabase branches
get` adds `?connect_timeout=10`, which the catalog importer refuses, so the
query is stripped:

```bash
export ALPHA_DEV_REF="$(supabase branches list --project-ref "$STAGING_REF" -o json | jq -r '.[] | select(.name == "alpha-dev") | .project_ref')"
ALPHA_DEV_DB_URL="$(supabase branches get alpha-dev --project-ref "$STAGING_REF" -o env | grep '^POSTGRES_URL_NON_POOLING=' | cut -d= -f2- | tr -d '"')"
export ALPHA_DEV_DB_URL="${ALPHA_DEV_DB_URL%%\?*}"
[[ -n "$ALPHA_DEV_REF" && "$ALPHA_DEV_REF" != "$STAGING_REF" && "$ALPHA_DEV_DB_URL" == *"$ALPHA_DEV_REF"* && "$ALPHA_DEV_DB_URL" != *\?* ]] &&
  echo "alpha-dev URL ok" &&
  read_db "$ALPHA_DEV_DB_URL" "$COUNTS_SQL" &&
  read_db "$ALPHA_DEV_DB_URL" "select max(version), count(*) from supabase_migrations.schema_migrations" &&
  read_db "$ALPHA_DEV_DB_URL" "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' and (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text::int > 0 order by 1"
```

**Expect:** `alpha-dev URL ok`; counts `0|0|0|0`; the same version and count
as 2.6; and no non-empty table, or only `data_catalog_facet_counts`.
**If not:** a connection error on the direct host (`db.<ref>.supabase.co`,
IPv6 only) means using the branch's session pooler: the pooled URL on port
5432 instead of 6543.

```bash
ALPHA_DEV_DB_URL="$(supabase branches get alpha-dev --project-ref "$STAGING_REF" -o env | grep '^POSTGRES_URL=' | cut -d= -f2- | tr -d '"')"
ALPHA_DEV_DB_URL="${ALPHA_DEV_DB_URL%%\?*}"
export ALPHA_DEV_DB_URL="${ALPHA_DEV_DB_URL/:6543\//:5432/}"
echo "${ALPHA_DEV_DB_URL#*@}"      # host, port, and database only
```

**Expect:** `<pooler host>:5432/postgres`, and the user (not printed) is
`postgres.<ALPHA_DEV_REF>`. Then run the checks above again. **Verify:** if
the pooled URL has another shape, copy the branch's **Connect** > **Session
pooler** URI with `read -rs ALPHA_DEV_DB_URL`. Any non-empty table besides
`data_catalog_facet_counts` holds rows a migration wrote: compare them with
the rehearsal's, and add `-x public.<table>` to 2.7's public dump when they
match.

**6.5.2 Load roles, then auth, then public.**

```bash
"$PSQL_BIN" "$ALPHA_DEV_DB_URL" -X -P pager=off --single-transaction --set ON_ERROR_STOP=1 \
  --file "$D/prod-rehearsal-roles.sql" \
  --file "$D/alpha-dev-seed-auth.sql" \
  --file "$D/alpha-dev-seed-public.sql"
read_db "$ALPHA_DEV_DB_URL" "$COUNTS_SQL"
```

**Expect:** no error, and counts equal to `alpha-dev-seed-counts.txt`, which
equal production at rehearsal time.
**If not:** the transaction rolled back, so nothing loaded. A duplicate key
names a table that already had rows (6.5.1). A missing column in an `auth`
table means the branch's Auth version is older than the local stack's: load
the auth rows as production dumped them instead, which the branch's hosted
Auth reads:

```bash
"$PSQL_BIN" "$ALPHA_DEV_DB_URL" -X -P pager=off --single-transaction --set ON_ERROR_STOP=1 \
  --file "$D/prod-rehearsal-roles.sql" \
  --file "$D/prod-rehearsal-data-auth.sql" \
  --file "$D/alpha-dev-seed-public.sql"
```

The alpha migrations change no `auth` table, so production's auth rows are
the same rows the rehearsal migrated, and 2.2 already left out the session
tables.

**6.5.3 Load the catalog** into `alpha-dev` with 6.11, target `alpha-dev`.

**6.5.4 Check the site.** Sign in at `https://alpha.avandarlabs.com` with
your production account and open the 5 dashboards from 2.8 (no data files:
Storage is not copied). From here `alpha-dev` holds real users' emails:
anything there that sends email can reach them.

### 6.6 Back up production (reads production)

**When:** while 6.8's `deploy` job waits for your approval (3.2). Writes made
between this backup and the migrations are lost if you restore it, so
approve as soon as the restore test passes.

```bash
cd "$REHEARSAL"
export BACKUP_T="$(date +%Y%m%d-%H%M)"
read_db "$PROD_DB_URL" "$COUNTS_SQL" | tee "$D/prod-$BACKUP_T-counts.txt"
supabase db dump --db-url "$PROD_DB_URL" --role-only -f "$D/prod-$BACKUP_T-roles.sql"
supabase db dump --db-url "$PROD_DB_URL" -f "$D/prod-$BACKUP_T-schema.sql"
supabase db dump --db-url "$PROD_DB_URL" --data-only --use-copy -f "$D/prod-$BACKUP_T-data.sql"
supabase db dump --db-url "$PROD_DB_URL" --data-only --use-copy -s public,auth -f "$D/prod-$BACKUP_T-data-app.sql"
supabase db dump --db-url "$PROD_DB_URL" -s supabase_migrations -f "$D/prod-$BACKUP_T-history-schema.sql"
supabase db dump --db-url "$PROD_DB_URL" --data-only --use-copy -s supabase_migrations -f "$D/prod-$BACKUP_T-history-data.sql"
for f in "$D"/prod-"$BACKUP_T"-*.sql; do sed -i '' '/^SET transaction_timeout = 0;$/d' "$f"; done
grep -c 'PostgreSQL database dump complete' "$D/prod-$BACKUP_T-data.sql" "$D/prod-$BACKUP_T-data-app.sql"
supabase backups list --project-ref "$PROD_REF"
supabase secrets list --project-ref "$PROD_REF" > "$D/prod-$BACKUP_T-edge-secrets.txt"
supabase functions list --project-ref "$PROD_REF" > "$D/prod-$BACKUP_T-functions.txt"
```

**Expect:** every file non-empty; `1` for each data file; the backups list
matches 5.8's choice (PITR on, or a scheduled backup minutes old); the
secrets file lists names and digests only.
**If not:** re-dump. Keep the source of every edge function secret value
(your password manager): `secrets list` shows digests, and 6.8 overwrites the
values.

The truncate step 7.2 uses after a scheduled-backup restore:

```bash
cat > "$CUTOVER_DIR/rollback-truncate.sql" <<'SQL'
do $$
declare table_list text;
begin
  select string_agg(format('%I.%I', schemaname, tablename), ', ' order by schemaname, tablename)
    into table_list
    from pg_tables
   where schemaname in ('public', 'auth')
     and not (schemaname = 'auth' and tablename = 'schema_migrations');
  execute 'truncate table ' || table_list;
end $$;
SQL
```

Restore test, in the rehearsal stack. It rehearses option B of 5.8: an older
snapshot stands in for the scheduled backup, then the top-up replaces every
`public` and `auth` row with this backup's.

```bash
cd "$REHEARSAL"
ava supabase status      # must name chore-alpha-rehearsal
supabase db reset --local --no-seed --version 20261013212914
export LOCAL_DB_URL="$(supabase status -o json | jq -er '.DB_URL')"
[[ "$LOCAL_DB_URL" == postgresql://*@127.0.0.1:* ]] &&
  "$PSQL_BIN" "$LOCAL_DB_URL" -X -P pager=off --single-transaction --set ON_ERROR_STOP=1 \
    --file "$D/prod-rehearsal-roles.sql" \
    --file "$D/prod-rehearsal-data-auth.sql" \
    --file "$D/prod-rehearsal-data-public.sql" &&
  "$PSQL_BIN" "$LOCAL_DB_URL" -X -P pager=off --single-transaction --set ON_ERROR_STOP=1 \
    --file "$CUTOVER_DIR/rollback-truncate.sql" \
    --file "$D/prod-$BACKUP_T-data-app.sql" &&
  read_db "$LOCAL_DB_URL" "$COUNTS_SQL"
```

**Expect:** the counts in `prod-$BACKUP_T-counts.txt`.
**If not:** do not approve. Leave the deployment waiting, or **Reject** it
under **Review deployments**. Fix the cause, take the backup again, and test
again; then approve, or after a reject run `gh run rerun "$RUN_ID" --failed`
and approve the new wait. A failure with "cannot truncate a table referenced
in a foreign key constraint" names a table outside `public` and `auth`: never
add `CASCADE`, raise it instead, and with option B undecided, choose A.

### 6.7 Create `alpha` at `main`'s commit

Safe only while `main` has no `alpha.yaml` (a push would deploy `main`'s
code to production) and only after 6.2 (so the tree has `"alpha": false` and
no `migrate` job). The push runs only when every check passes:

```bash
cd "$REPO" && git fetch origin &&
  ! git cat-file -e origin/main:.github/workflows/alpha.yaml 2>/dev/null &&
  git show origin/main:vercel.json | grep -q '"alpha": false' &&
  git show origin/main:.github/workflows/production.yaml | grep -q '^  deploy-mainline:' &&
  ! git ls-remote --exit-code origin refs/heads/alpha >/dev/null &&
  echo "all checks passed" &&
  git push origin refs/remotes/origin/main:refs/heads/alpha
gh run list --branch alpha --limit 5
```

**Expect:** `all checks passed`, the push creates `alpha`, and no run starts.
Vercel shows no deployment for `alpha`.
**If not:** no `all checks passed` means one check failed and nothing was
pushed. Run the checks one at a time to see which.

Then protect `alpha` like `main`. Save this as
`$CUTOVER_DIR/alpha-ruleset.json`:

```json
{
  "name": "Alpha",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/alpha"], "exclude": [] } },
  "bypass_actors": [
    { "actor_id": 1, "actor_type": "OrganizationAdmin", "bypass_mode": "always" },
    { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }
  ],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "creation" },
    { "type": "update" },
    { "type": "required_linear_history" },
    {
      "type": "pull_request",
      "parameters": {
        "allowed_merge_methods": ["squash"],
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_approving_review_count": 0,
        "required_review_thread_resolution": false
      }
    }
  ]
}
```

```bash
gh api -X POST repos/AvandarLabs/avandar/rulesets --input "$CUTOVER_DIR/alpha-ruleset.json" --jq '{id, name}'
gh api repos/AvandarLabs/avandar/rules/branches/alpha --jq '.[].type'
```

**Expect:** `Alpha`, then the six rule types. These are the `Main` ruleset's
rules: no deletion, no force-push, and only admins (the release) may update
`alpha`, so nobody else can push or merge into it.
**If not:** when the API refuses a field, create the same ruleset in
**Settings** > **Rules** > **Rulesets** > **New branch ruleset**: target
`alpha`; bypass Organization admin and Repository admin; restrict creations,
updates, and deletions; require linear history; require a pull request
(squash only); block force pushes.

### 6.8 Run `ava release` on `alpha-dev` (**Writes to production**)

**6.8.1 Preconditions.**

```bash
cd "$REPO"
git fetch origin && git status -sb      # alpha-dev, in sync, no tracked changes
pnpm build:ava-cli                       # if alpha-dev moved since 6.3
gh run list --workflow alpha-dev.yaml --branch alpha-dev --limit 1 \
  --json headSha,status,conclusion
git rev-parse origin/alpha-dev
```

Then run 3.5, and confirm 3.2's reviewer and 5.8's choice.
**Expect:** the newest run's `headSha` equals `origin/alpha-dev`, with
`completed` and `success`; 3.5 shows nothing missing.

**6.8.2 Dry run.**

```bash
ava release --dry-run --skip-changelog
```

**Expect:** the yellow banner `ALPHA release: alpha-dev to alpha. Deploys
PRODUCTION (app.avandarlabs.com).`; the plan below with your versions; a
`Dry run: stopping before tagging and pushing alpha` warning. Nothing
changes.

**6.8.3 Release.** Never pass `--yes`: it releases on a CI verdict other than
a pass without asking. Pass `--skip-changelog` (section 9: the first alpha
notes would cover about 2,000 commits).

```bash
ava release --skip-changelog
```

| Prompt or output | Meaning | Answer |
| --- | --- | --- |
| Banner, then `On alpha-dev, clean, in sync with origin/alpha-dev.` | Preflight passed | |
| `What version number do you want for this release? (-alpha is added automatically)` | Release version, bare `X.Y.Z` | Enter for `0.15.0` |
| `Which version should alpha-dev move to next?` | Next dev version | Enter for `0.15.1` |
| `alpha-dev CI passed.` | `alpha-dev.yaml` passed for the tip | |
| Anything else, then `Release anyway?` | CI did not pass for the tip | `n`, then fix CI |
| Plan: `1. alpha-dev: 0.15.0-alpha-dev to 0.15.0-alpha, pushed`, `2. alpha: set to alpha-dev@<sha>'s tree, tagged v0.15.0-alpha`, `3. alpha-dev: 0.15.0-alpha to 0.15.1-alpha-dev, pushed` | What it will do | |
| `Pushing alpha deploys PRODUCTION ...`, then `Release 0.15.0-alpha to PRODUCTION?` | Last chance | `y` |

The release commits `Release: v0.15.0-alpha [skip deploy]` on `alpha-dev` and
pushes it, builds the `alpha` commit from that tree, creates the annotated
tag `v0.15.0-alpha`, pushes `alpha` and the tag atomically, then commits
`Bump version to 0.15.1-alpha-dev [skip deploy]` and pushes it.

| Release fails at | State | Do |
| --- | --- | --- |
| Before `Setting alpha-dev to 0.15.0-alpha` | Nothing changed | Fix, run again |
| `Could not push alpha-dev` | Nothing released; a local version commit exists | `git reset --hard origin/alpha-dev`, fix the push, run again |
| Pushing `alpha` and the tag | `alpha-dev` is at `0.15.0-alpha` and pushed; `alpha` and the tag are not | That push started an `alpha-dev.yaml` run for the release commit. Wait until it is `completed` and `success`, `test-e2e` included (`gh run list --workflow alpha-dev.yaml --branch alpha-dev --limit 1 --json headSha,status,conclusion`), then `ava release --version 0.15.0 --next 0.15.1 --skip-changelog` |
| Bumping `alpha-dev` | Released | `pnpm version 0.15.1-alpha-dev --no-git-tag-version && git commit -m "Bump version to 0.15.1-alpha-dev [skip deploy]" -- package.json && git push origin HEAD:refs/heads/alpha-dev` |

`[skip deploy]` is not a GitHub skip keyword, so each of the two `alpha-dev`
pushes starts an `alpha-dev.yaml` run. The first is cancelled or redeploys
`alpha-dev` at `0.15.0-alpha`: harmless.

**6.8.4 Watch `alpha.yaml`.**

```bash
sleep 15
RUN_ID="$(gh run list --workflow alpha.yaml --branch alpha --limit 1 --json databaseId --jq '.[0].databaseId')"
gh run watch "$RUN_ID"
```

| Order | Job or step | Touches production |
| --- | --- | --- |
| 1 | `lint-typecheck`, then `test-quick` (with `test-e2e` alongside, not blocking) | No |
| 2 | `deploy` waits for your approval: take 6.6 now, then **Review deployments** > **Approve and deploy** | No |
| 3 | Refuse anything but the tip of alpha | No |
| 4 | Check the production configuration | No |
| 5 | Pull the Vercel production environment; build the web app | No |
| 6 | Apply migrations (`supabase db push --include-all`) | **Yes** |
| 7 | Set edge function secrets | **Yes** |
| 8 | Deploy edge functions | **Yes** |
| 9 | Deploy the prebuilt web app to Vercel (`--prod`) | **Yes** |

| Fails at | Production | Do |
| --- | --- | --- |
| Steps 1 to 5 | Untouched | Fix the cause (3.3 for a configuration failure), then `gh run rerun "$RUN_ID" --failed` on the newest run, or release again for a code fix |
| 6, Apply migrations | Partly migrated: each migration file applies in its own transaction, so the files before the failing one stay applied | 7.1, row "A migration fails midway" |
| 7 to 9 | Migrated, but the app or functions are not deployed, so the window in 6.10 is open | Fix the cause and re-run failed jobs of the newest run at once. The migrations step is then a no-op |

Only re-run the newest `alpha` run. Re-running an older one fails at step 3,
which is the point: it would deploy older code over newer.

### 6.9 Smoke test

On `https://app.avandarlabs.com`, as soon as 6.8 finishes:

| Check | Pass |
| --- | --- |
| Sign in with an existing production account | Signed in |
| Open the 5 dashboards from 2.8 | They render, with data |
| Run a query on an existing dataset | Results appear |
| Cmd+K | Shows `0.15.0-alpha` |
| `supabase functions list --project-ref "$PROD_REF"` | Updated times for every function |
| Browse the catalog | After 6.11: the new catalog |

**If not:** section 7.

### 6.10 The migration window

From the start of "Apply migrations" to the end of "Deploy the prebuilt web
app to Vercel", the app users have open is `main`'s, against the migrated
schema: catalog tables are renamed, `rpc_datasets__add_open_data_dataset`
takes a new parameter, and `individuals.status` is gone. `alpha.yaml` builds
the app before the migrations, so the window is the migrations, the secrets
step, the deploy of 15 edge functions, and the Vercel upload: expect a few
minutes, under 10. 6.4's `alpha-dev` run measures the functions part:

```bash
gh run view "$ALPHA_DEV_RUN_ID" --json jobs \
  --jq '.jobs[] | select(.name == "deploy") | .steps[] | [.name, .startedAt, .completedAt] | @tsv'
```

Its "Set edge function secrets" and "Deploy edge functions" steps match
`alpha.yaml`'s. Its "Build and deploy to Vercel" step overstates the last
part, since it includes the build that `alpha.yaml` runs before the window
opens.

Release at a quiet hour. A browser tab opened before the deploy keeps `main`'s
app until it reloads.

### 6.11 Load the catalog and copy its Parquet files

Run for `alpha-dev` first (6.5.3), then for production, and production only
after 6.8 migrated it and deployed the app. Production has no
`data_catalog_listings` table before that.

**What `--replace-existing` does to users.** In one transaction it deletes
every row of the catalog tables (`data_catalog_drives`,
`data_catalog_listings`, `data_catalog_listings__relation_columns`,
`pipeline_executions`, `pipeline_execution_scopes`,
`pipeline_scope_checkpoints`), loads the `demo-measles` catalog, rewrites its
Storage links, and recounts `data_catalog_facet_counts`.
`datasets__open_data.catalog_listing_id` is `on delete cascade`, so every
workspace dataset added from the catalog loses its `datasets__open_data`
row, even when the new catalog brings back a listing with the same id. The
`datasets` rows, their columns, and dashboards that use them stay, but the
importer says it plainly: those datasets "stay listed but can no longer
load". Production has 4. Check on `alpha-dev` what a user then sees (open one
of the 4 there) before you run it on production.

**6.11.1 Export the catalog (once, reads staging).** Check 5.7 first:

```bash
cd "$REPO"
supabase branches list --project-ref "$STAGING_REF" -o json \
  | jq '.[] | select(.name=="demo-measles") | {persistent, preview_project_status}'
export SOURCE_REF="$(supabase branches list --project-ref "$STAGING_REF" -o json | jq -r '.[] | select(.name == "demo-measles") | .project_ref')"
SOURCE_DB_URL="$(supabase branches get demo-measles --project-ref "$STAGING_REF" -o env | grep '^POSTGRES_URL_NON_POOLING=' | cut -d= -f2- | tr -d '"')"
SOURCE_DB_URL="${SOURCE_DB_URL%%\?*}"
export CATALOG_DUMP="$CUTOVER_DIR/catalog/catalog-$(date +%Y%m%d).sql"
bash scripts/alpha/exportCatalogData.sh "$SOURCE_DB_URL" "$CATALOG_DUMP"
grep -nE 'sb_secret_|sb_publishable_|eyJhbGci|service_role|password' "$CATALOG_DUMP" | cut -c1-160 | head -20
```

**Expect:** `"persistent": true` and `ACTIVE_HEALTHY`; `Wrote ... Rows per
table:` with a count for each of the 6 tables (record them); and no
credential among the `grep` hits.
**If not:** a paused branch: unpause it (5.7). A key, JWT, or password in a
listing: stop. The export refuses to overwrite a file and refuses a dump
with anything but catalog rows.

**Fallback source.** If `demo-measles` is gone after `alpha-dev`'s own 6.11
run, export from `alpha-dev` instead: it then holds the whole catalog and,
after 6.11.7, every Parquet object. Set `SOURCE_REF="$ALPHA_DEV_REF"` and
`SOURCE_DB_URL="$ALPHA_DEV_DB_URL"` and run the export with a new file name.
The rest of 6.11 reads `SOURCE_REF` either way.

**6.11.2 Set the target.** For `alpha-dev`:
`export TARGET_REF="$ALPHA_DEV_REF" TARGET_DB_URL="$ALPHA_DEV_DB_URL"`. For
production: `export TARGET_REF="$PROD_REF" TARGET_DB_URL="$PROD_DB_URL"`. The
URL must be the direct host or the session pooler on 5432 (never 6543), with
a percent-encoded password and no query parameter but `sslmode`: 6.5.1
already stripped `connect_timeout`. The importer needs psql 15.14, 16.10,
17.6, 18, or newer (`PSQL_BIN`, 1.4).

**6.11.3 Read-only target checks.**

```bash
read_db "$TARGET_DB_URL" "select current_user"
read_db "$TARGET_DB_URL" "select c.relname, pg_get_userbyid(c.relowner) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('data_catalog_drives', 'data_catalog_listings', 'data_catalog_listings__relation_columns', 'pipeline_executions', 'pipeline_execution_scopes', 'pipeline_scope_checkpoints', 'data_catalog_facet_counts', 'datasets__open_data') order by 1"
read_db "$TARGET_DB_URL" "select p.proacl, pg_get_userbyid(p.proowner), has_function_privilege(current_user, p.oid, 'execute') from pg_proc p where p.oid = 'public.data_catalog_facet_counts__refresh()'::regprocedure"
read_db "$TARGET_DB_URL" "select count(*) from pg_extension where extname = 'pg_cron'"
read_db "$TARGET_DB_URL" "select o.dataset_id, o.workspace_id, w.slug, d.name, o.catalog_listing_id from public.datasets__open_data o join public.datasets d on d.id = o.dataset_id join public.workspaces w on w.id = o.workspace_id order by w.slug, d.name" | tee "$CUTOVER_DIR/catalog/$TARGET_REF-open-data-datasets-before.txt"
ls -lh "$CATALOG_DUMP"
```

**Expect:** `postgres`; 8 tables, all owned by `postgres`; owner `postgres`
with execute `t` (the ACL grants only `service_role` besides the owner); `0`
(no scheduled jobs); the 4 open data datasets with their workspaces (keep
the file); and the dump's size. In the dashboard, **Project Settings** >
**Compute and Disk**: free disk at least 3 times that size.
**If not:** another user or owner: stop. `pg_cron` installed: list
`cron.job` and pause any catalog job.

Pause pipeline runs: run no `ava pipeline run` against the target until
6.11.7 is done. Nothing in the repository schedules them. A Parquet copy
build a user starts can still touch a listing: the import waits at most 10
seconds for each lock and rolls back if it cannot get one.

**6.11.4 Dry run.**

```bash
bash scripts/alpha/importCatalogData.sh "$TARGET_DB_URL" "$CATALOG_DUMP" \
  --replace-existing --rewrite-storage-host "$SOURCE_REF.supabase.co" "$TARGET_REF.supabase.co" \
  --dry-run
```

**Expect:** `Target: postgres...@<host>`; the dump's rows; under Storage
hosts, only `<SOURCE_REF>.supabase.co`; under foreign keys,
`public.datasets__open_data.(catalog_listing_id) -> public.data_catalog_listings: on delete cascade, 4 rows deleted`;
`The cascade leaves 4 public.datasets rows in <N> workspaces`; the listing
ids a replace drops; the plan; and `Dry run: nothing was written.` with no
"would refuse" after it.
**If not:** another Storage host means a listing points outside the source
project: stop. A "would refuse" names the reason. A refusal about
`connect_timeout` means the URL kept its query: strip it as in 6.5.1.

**6.11.5 Back up the target's catalog (reads the target).**

```bash
export BACKUP_FILE="$CUTOVER_DIR/catalog/catalog-backup-$TARGET_REF-$(date +%Y%m%d-%H%M).sql"
"$PG_DUMP_BIN" "$TARGET_DB_URL" --data-only --no-owner --no-privileges \
  --table 'public.data_catalog_drives' --table 'public.data_catalog_listings' \
  --table 'public.data_catalog_listings__relation_columns' \
  --table 'public.pipeline_executions' --table 'public.pipeline_execution_scopes' \
  --table 'public.pipeline_scope_checkpoints' --table 'public.data_catalog_facet_counts' \
  --table 'public.datasets__open_data' --file "$BACKUP_FILE"
```

These are the catalog, the facet counts, and the one dependent table the dry
run reported. If 6.11.6 refuses the backup, it prints the exact `pg_dump`
command to use instead. The backup must be under 24 hours old.

**6.11.6 Import** (**Writes to production** when the target is production).

```bash
bash scripts/alpha/importCatalogData.sh "$TARGET_DB_URL" "$CATALOG_DUMP" \
  --replace-existing --backup-file "$BACKUP_FILE" \
  --rewrite-storage-host "$SOURCE_REF.supabase.co" "$TARGET_REF.supabase.co" \
  | tee "$CUTOVER_DIR/catalog/import-$TARGET_REF.log"
```

It prints how to restore the backup (keep that log), the plan, then asks you
to type `<user>@<host>` and `delete <N> dependent rows`.
**Expect:** `Rewrote the Storage URLs of <n> listings.`, catalog counts equal
to the dump's, and `Open data datasets with no open data details now: 4
public.datasets rows in <N> workspaces.`
**If not:** `The import failed and its transaction rolled back: every count
matches the report.` means nothing changed: fix and run again. Counts that
differ from the report: stop and check the target.

```bash
read_db "$TARGET_DB_URL" "select count(*) from public.data_catalog_facet_counts"
read_db "$TARGET_DB_URL" "select count(*) from public.data_catalog_listings l where l::text like '%$SOURCE_REF%'"
read_db "$TARGET_DB_URL" "select count(*) from public.data_catalog_listings"
```

**Expect:** more than 0; then 0; then the listing count (keep it for
6.11.7).

**6.11.7 Copy the Parquet files** (**Writes to production** Storage when the
target is production). Keys come from the environment only, and the copy
runs only when both keys look right:

```bash
cd "$REPO"
export SOURCE_SUPABASE_URL="https://$SOURCE_REF.supabase.co"
export TARGET_SUPABASE_URL="https://$TARGET_REF.supabase.co"
export SOURCE_SECRET_KEY="$(supabase projects api-keys --project-ref "$SOURCE_REF" --reveal -o json | jq -r '[.[] | select(.type == "secret")][0].api_key')"
export TARGET_SECRET_KEY="$(supabase projects api-keys --project-ref "$TARGET_REF" --reveal -o json | jq -r '[.[] | select(.type == "secret")][0].api_key')"
[[ "$SOURCE_SECRET_KEY" == sb_secret_* && "$TARGET_SECRET_KEY" == sb_secret_* ]] &&
  echo "keys ok" &&
  node scripts/alpha/copyCatalogParquet/copyCatalogParquet.ts
echo "exit $?"
unset SOURCE_SECRET_KEY TARGET_SECRET_KEY   # after the last run
```

It accepts no argument but `--yes-i-know-the-target <host>` (no dry run), and
asks you to type the target host.
**Expect:** `Listings processed <N> of the target's <M>: copied <c>, already
in the target <a>, replaced <r>, failed 0.`, with `N` equal to `M` and to
6.11.6's listing count, and `exit 0`. Run it again until `failed` is 0, then
once more: that run must copy 0 and replace 0.
**If not:** each failure is logged with its path. `The copy processed a
different number of listings than the target holds. Re-run it.` (exit 1):
re-run once; if `N` and `M` still differ, stop, compare `M` with 6.11.6's
count, and raise it, since listings changed under the copy or the API capped
a page. `The target has no catalog listings` means 6.11.6 has not run.

**6.11.8 Check one listing of each kind loads from the target's Storage.**

```bash
read_db "$TARGET_DB_URL" "select id, display_name from public.data_catalog_listings where access_kind = 'pipeline_parquet' limit 1"
read_db "$TARGET_DB_URL" "select id, display_name from public.data_catalog_listings where parquet_cache_status = 'ready' limit 1"
```

Open each in the target site's catalog and preview or add it to a test
workspace, with the browser's network panel open. **Expect:** the data loads,
and every Storage request goes to `<TARGET_REF>.supabase.co`, none to
`<SOURCE_REF>.supabase.co`. Keep the `demo-measles` branch until this passes
on production (section 8).

## 7. Rollback

### 7.1 Decide

| Situation | Do |
| --- | --- |
| `alpha.yaml` failed before "Apply migrations" | Nothing to roll back. Production is untouched: stop, fix, release again |
| A migration fails midway | Production is partly migrated, and once a rename has applied, `main`'s app is already broken. A transient error (network, lock timeout): re-run failed jobs of the newest run, and `db push` resumes at the first unapplied file. A bug in the migration: fix forward with a new migration on `alpha-dev` and release, if that takes under about an hour; otherwise restore (7.2) |
| Migrations applied, a later step failed | Re-run failed jobs of the newest run (6.8.4). Not a rollback |
| Deployed, with a bug that loses no data | Fix forward: a fix on `alpha-dev`, then `ava release` |
| Deployed, and users are losing data, or the app is unusable with no fix in about an hour | Restore (7.2), redeploy `main`'s app and functions (7.3) |

There is no partial rollback: `main`'s code does not match the migrated
schema, and the schema cannot be rolled back without the data.

After any restore, stop `alpha.yaml` from running until the fix is on
`alpha`, so no push redeploys the alpha code onto the restored database:

```bash
gh workflow disable alpha.yaml
gh workflow enable alpha.yaml     # only once the fix is released
```

### 7.2 Restore the database (**Writes to production**)

The 6.6 dump files load only into an empty database, and production is not
empty after the migrations. So the restore is Supabase's own, as 5.8 chose:

| Option | Loses | How |
| --- | --- | --- |
| A. PITR (5.8 turned it on) | Writes after the chosen second | Below |
| B. Scheduled backup, then the top-up 6.6 tested | Writes since the scheduled backup outside `public` and `auth` (Storage rows of files uploaded since, among them); every write after 6.6 | Below |
| C. The 6.6 dumps, into a new project | Every Storage file (no dump carries them), Vault secrets (the CLI's data dump leaves out the `vault` schema), API keys, the JWT secret (every user signed out), the Auth configuration, edge function secrets and functions, all sessions, and every write after 6.6. Then every production setting must point at the new project (refs, keys, URLs, OAuth, Vercel) | Last resort, below |

**A. PITR.** Restore to the second before "Apply migrations" started:

```bash
STARTED_AT="$(gh run view "$RUN_ID" --json jobs --jq '.jobs[] | select(.name == "deploy") | .steps[] | select(.name == "Apply migrations") | .startedAt')"
echo "$STARTED_AT"
RESTORE_TO="$(( $(date -j -u -f '%Y-%m-%dT%H:%M:%SZ' "$STARTED_AT" +%s) - 5 ))"
supabase backups restore --project-ref "$PROD_REF" --timestamp "$RESTORE_TO"
```

Or **Database** > **Backups** > **Point in time** in the dashboard.

**B. Scheduled backup, then the top-up.** **Database** > **Backups** >
**Scheduled backups** > **Restore** on the newest backup taken before the
migrations. When the project is back, the top-up runs only on the restored,
pre-migration schema:

```bash
[[ "$(read_db "$PROD_DB_URL" "select max(version) from supabase_migrations.schema_migrations")" == 20261013212914 ]] &&
  echo "pre-migration schema" &&
  "$PSQL_BIN" "$PROD_DB_URL" -X -P pager=off --single-transaction --set ON_ERROR_STOP=1 \
    --file "$CUTOVER_DIR/rollback-truncate.sql" \
    --file "$D/prod-$BACKUP_T-data-app.sql" &&
  read_db "$PROD_DB_URL" "$COUNTS_SQL"
```

**Expect:** `pre-migration schema`, then the counts in
`prod-$BACKUP_T-counts.txt`.

**C. Into a new, empty project.** With libpq 18 `psql`; the `sed` in 6.6
already removed the `SET transaction_timeout` line Postgres 15 rejects. The
guard refuses production's URL:

```bash
read -rs EMPTY_DB_URL      # the new project's session pooler URI
[[ -n "$EMPTY_DB_URL" && "$EMPTY_DB_URL" != *"$PROD_REF"* ]] &&
  "$PSQL_BIN" "$EMPTY_DB_URL" -X -P pager=off --single-transaction --set ON_ERROR_STOP=1 \
    --file "$D/prod-$BACKUP_T-roles.sql" \
    --file "$D/prod-$BACKUP_T-schema.sql" \
    --command 'SET session_replication_role = replica' \
    --file "$D/prod-$BACKUP_T-data.sql" \
    --file "$D/prod-$BACKUP_T-history-schema.sql" \
    --file "$D/prod-$BACKUP_T-history-data.sql" &&
  read_db "$EMPTY_DB_URL" "$COUNTS_SQL"
```

**Expect:** the counts in `prod-$BACKUP_T-counts.txt`.

### 7.3 Redeploy `main`'s app and functions (**Writes to production**)

- **App:** Vercel project `avandar` > **Deployments** > filter Production >
  the last deployment from `main` (the `sha` from 6.2.2) > **...** > **Promote
  to Production** (Vercel may call it **Instant Rollback**). **Verify:** if
  Vercel then says automatic production assignment is paused, the next alpha
  release's deployment must be promoted by hand the same way.
- **Edge functions:** a database restore leaves the alpha functions deployed.
  From a checkout of that `main` commit, deploy its 12 functions and delete
  the 3 that only alpha has (`connectors`, `file-url`, `geocode`):
  `supabase functions deploy --prune --project-ref "$PROD_REF"`. Compare
  afterwards with `prod-$BACKUP_T-functions.txt`. Or fix forward instead.
- **Edge function secrets:** compare `supabase secrets list --project-ref
  "$PROD_REF"` with `prod-$BACKUP_T-edge-secrets.txt`. A changed digest is a
  value 6.8 overwrote. Set the old value again from its source with
  `supabase secrets set --project-ref "$PROD_REF" NAME=<value>`. Values
  cannot be read back.
- **Never move `alpha` back to an older commit.** That push is itself a
  production deploy. Use Vercel's promote for the app, and keep `alpha.yaml`
  disabled (7.1).
- **Catalog:** 6.11 has its own restore, printed by the importer and kept in
  `import-<ref>.log`.

## 8. Cleanup

| # | Step | Note |
| --- | --- | --- |
| 1 | Vercel: **Settings** > **Domains** > `demo.avandarlabs.com` > **Remove**, and delete its DNS record | |
| 2 | Vercel: **Settings** > **Environments** > `demo` > delete | |
| 3 | `supabase branches delete demo-measles --project-ref "$STAGING_REF"` | **Irreversible.** Only after 6.11.7 and 6.11.8 pass on production |
| 4 | `main` removed from the production environment (6.2.5) | Re-run 3.1's check |
| 5 | Delete `chore/mainline-lockout-main` and its worktree (`wt`) | |
| 6 | Port the alpha-line `ava-cli` to `develop` (6.3) | Once the lock-out is on `develop` |
| 7 | Optional: turn Vercel Production branch tracking off (4.6) | |
| 8 | If 5.8 chose A: turn PITR off once the release is settled | **Writes to production** configuration |
| 9 | In the rehearsal worktree: `ava supabase restore`, then remove it with `wt` | Deletes its local stack and the data in it |
| 10 | `rm -rf "$D"/prod-rehearsal-* "$D"/alpha-dev-seed-* "$D"/local-at-prod-version-schema.sql "$D"/schema-drift.diff "$CUTOVER_DIR/storage"` | Once 6.5 passes |
| 11 | `rm -rf "$CUTOVER_DIR"` | 7 days after the release is settled, once Supabase's own backups cover the post-cutover state. It holds every dump, the catalog backups, and the logs |

## 9. Known gaps (not blockers)

| Gap | Current state |
| --- | --- |
| The previous tag mixes the lines | `listSortedReleaseTags` reads every `v*` tag with `--sort=v:refname`, which orders `v0.15.0`, `v0.15.0-alpha`, `v0.15.1`, `v0.15.1-alpha`, so the tag before an alpha release can be a mainline one, and the reverse. For `v0.15.0-alpha` it is `v0.14.1`, so its notes would cover the whole line since `main`: on 2026-11-20, 2,009 non-merge commits (2,163 counting merges) from `v0.14.1` to `feat/alpha-line`. Count it at release time with `git rev-list --count --no-merges v0.14.1..origin/alpha-dev`. Hence `--skip-changelog` in 6.8 |
| `ava release get-prod-version` | Reads `origin/main`. Production's version is now `origin/alpha`'s |
| Dry runs call OpenAI | `ava release --dry-run` makes one real call unless `--skip-changelog` |
| The Staging GitHub environment | No branch policy: any branch's workflow can read its tokens, including a Supabase access token (Stage 2.8) |
| `staging.yaml` | `supabase link --project-ref $SUPABASE_PROJECT_ID` is unquoted |
| `alpha-dev.yaml` does not rehearse `alpha.yaml` | No configuration check, and its secrets file is unquoted `KEY=value`, so a value with `#` would be cut. Consider porting both |
| Workflow-level concurrency on `alpha.yaml` | A release waits for the previous run to finish, `test-e2e` included (up to 70 minutes). Only the newest pending run survives |
| Environments restrict branches, not workflows | Any workflow on `alpha`, including one added through `alpha-dev`, can use `production` |
| `[skip deploy]` | Not a GitHub keyword: the release's `alpha-dev` commits each start a run |
| Test jobs' Supabase CLI | 2.98.2 in `test-quick` and `test-e2e`, 2.114.0 in `deploy` |
| `pipeline-server-fly-runbook.md` | Still says production edge secrets are set by hand |
| Guardrails 2.1 to 2.10 | Not built: [alpha-launch-plan.md](alpha-launch-plan.md), Stage 2 |

## 10. Stage 1 mapping

| Stage 1 step ([alpha-launch-plan.md](alpha-launch-plan.md)) | Runbook |
| --- | --- |
| 1. Confirm the rehearsal passed | 2, 6.1 |
| 2. Rename `demo/measles` to `alpha-dev` | 6.4 |
| 3. Push `alpha-dev`, seed its branch, load the catalog, check the site | 5.6, 6.4, 6.5, 6.11 |
| 4. Back up production and verify the dump restores | 5.8, 6.6 |
| 5. Merge the lock-out into `develop`, then `main`; confirm `main` no longer deploys production | 6.2 |
| 6. Create `alpha` by hand, then `ava release` on `alpha-dev` | 6.7, 6.8, 6.10 |
| 7. Load the catalog and copy the Parquet files into production | 5.7, 6.11 |
| 8. Smoke test | 6.9, 6.11.8 |
| 9. Remove `demo`; delete `demo-measles` | 8 |
| Rollback | 7 |
