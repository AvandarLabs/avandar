# Production cutover runbook

How Pablo promotes `demo/measles` into `develop`, releases `develop` to
`main` as `0.15.0`, and moves the open data catalog. Production is
`app.avandarlabs.com` on the Supabase project `Avandar`. Staging is
`staging.avandarlabs.com` on `Avandar Staging`. Written 2026-11-24 from
[the cutover plan](production-cutover-plan.md) and
[the implementation plan](../superpowers/plans/2026-11-23-production-cutover.md).
It replaces [the superseded alpha cutover runbook](alpha-cutover-runbook.md):
there is no alpha line, no alpha branch, and no extra Vercel environment.

**How to use this runbook.** Work through section 1 top to bottom. Every
step gives the command or click path, what you should see (**Expect**), and
what to do when you see something else (**If not**). Run commands from the
root of the worktree the step names. Steps that change something outside
your laptop carry a bold mark: **WRITES TO PRODUCTION**, **WRITES TO
STAGING**, **CHANGES STAGING CONFIGURATION**, **CHANGES VERCEL**, **CHANGES
GITHUB SETTINGS**, **CHANGES GOOGLE CLOUD CONSOLE**, **CHANGES POLAR**, or
**PUSHES**. An unmarked step only reads. **Verify**
marks a claim that could not be checked from the repository when this was
written: do the read-only check it gives first. The repository and its
Actions logs are public: secret values, connection strings, and anything
about a user never go into a file, an issue, a chat, or a log. This runbook
names secrets by their variable names only.

## 1. Day-of checklist

The steps follow stage G of [the cutover plan](production-cutover-plan.md),
section 11.

| Step | What | Sections | Touches production | Stop if |
| --- | --- | --- | --- | --- |
| 0 | Tools, shell setup, rules | 2 | No | A tool version differs from 2.3 |
| 1 | Announce the freeze. Rehearse on a local copy of production | 3, 4 | Reads (a dump) | Any row of 4.9 fails |
| 2 | Protect the GitHub `production` environment, then set both environments' names. Third parties. Vercel values | 5, 6, 7 | No. **CHANGES GITHUB SETTINGS**, **CHANGES VERCEL** | 5.6 shows a missing name |
| 3 | Push the integration branch to `demo/measles`. Open the PR into `develop` | 8.1 to 8.4 | No. **PUSHES** | 4.8 is not done, or `pr-develop.yaml` fails |
| 4 | Fast-forward `develop`. `staging.yaml` deploys staging | 8.5, 8.6, 9.1 to 9.4 | No. **PUSHES**, **WRITES TO STAGING** through CI | The staging deploy fails |
| 5 | Load the catalog into staging. Check staging | 9.5 to 9.7 | No. **WRITES TO STAGING** | The staging import or restore check fails |
| 6 | Choose the rollback basis (10.1). Release `0.15.0` with `ava release` (11.1 to 11.4). While the `deploy` job waits, back up production and test the backup (10.2, 10.3), then approve (11.5) | 10.1, 11.1 to 11.4, 10.2, 10.3, 11.5 to 11.9 | **WRITES TO PRODUCTION** through CI, from the approval in 11.5 | 10.3's restore test fails: do not approve |
| 7 | Load the catalog into production. Smoke test | 12, 13 | **WRITES TO PRODUCTION** | Anything in 13 fails: section 14 |
| 8 | Disconnect Vercel's Git integration | 15 | No. **CHANGES VERCEL** | Either `deploy` job did not succeed |
| 9 | Start the privacy fix. Publish the review backlog when ready. Clean up seven days after the smoke test | 16, 17 | 17 deletes the demo resources | |

**The migration audit refresh is still pending** (4.8). It must be done
before step 3, the promotion: 8.5 makes `staging.yaml` apply staging's 10
out-of-order files automatically, and nothing rehearses them. A blocker
found after 8.5 can only be fixed forward. Rollback is section 14. Before
the approval in 11.5, production is untouched: stop and nothing needs
undoing.

## 2. Before you start

### 2.1 Read first

- [The cutover plan](production-cutover-plan.md): decisions D1 to D7, E1, A2, A3,
  H1.
- [The migration audit](alpha-migration-audit.md), dated 2026-11-19. It
  covers 76 files and found no blocker. **Its refresh for production's
  current set and staging's 10 files has not been done** (4.8). It must be
  done before the promotion (step 3).
- The privacy gap at the top of [the feature log](pr-feature-log.md):
  crosswalk layouts and mappings are readable by every Data Sources viewer.
  It ships with this release (D4) and is fixed forward as Linear AVA-611
  (section 16).

### 2.2 Prerequisites

| Check | Command | Expect |
| --- | --- | --- |
| Docker is running (`supabase db dump` runs `pg_dump` in a container) | `docker info --format '{{.ServerVersion}}'` | A version number |
| `gh` can push, as an organization admin | `gh api repos/AvandarLabs/avandar --jq .permissions.admin` | `true` |
| The Supabase CLI is logged in (after 2.4) | `supabase projects list` | `Avandar` and `Avandar Staging` listed |
| `jq` is installed | `jq --version` | A version |
| Node matches `engines` | `node --version` | `v24.x` |
| Free space for the catalog import's temporary copies | `df -h "${TMPDIR:-/tmp}"` | At least 3 GB available (the import needs about 2.6 GB) |

### 2.3 Tools

| Tool | Version | How |
| --- | --- | --- |
| `supabase` | 2.114.0, the repository's pinned CLI | The `supabase` function in 2.4 runs `node_modules/.bin/supabase`. The Homebrew one on `PATH` may be older: do not use it. |
| `pg_dump` | 17.6 or newer | `brew install postgresql@17`. The formula is keg-only: `"$(brew --prefix postgresql@17)/bin/pg_dump" --version` prints 17.12 on 2026-11-24. The default `pg_dump` and `psql` on `PATH` are 14, too old. |
| `psql` | 17.6 or newer, or 18 | The same keg: `"$(brew --prefix postgresql@17)/bin/psql" --version`. It must understand the `\restrict` lines newer `pg_dump` writes, and `importCatalogData.sh` refuses anything older than 15.14, 16.10, 17.6, or 18. psql 17.12 from `postgresql@17` works. So does `/opt/homebrew/opt/libpq@18/bin/psql` (18.6), which the restore checks were run with. Verify with `--version`. |
| `gh` | Logged in, admin on the repository | `gh auth status` |
| `ava` | Built from `develop` in 11.1 | `pnpm build:ava-cli` links one global `ava` to whichever worktree last ran it |

### 2.4 Shell setup (every new terminal)

Run it in every new terminal, from the root of the worktree the step names:
`chore/production-cutover` until 11.1, then `develop`.

```bash
export REPO="$PWD"
supabase() { "$REPO/node_modules/.bin/supabase" "$@"; }
export PSQL_BIN="$(brew --prefix postgresql@17)/bin/psql"
export PG_DUMP_BIN="$(brew --prefix postgresql@17)/bin/pg_dump"
export PROD_REF=bwxxhmtynhrysbxxxutu        # Avandar (production)
export STAGING_REF=frbelerytsmadmmdwgcl     # Avandar Staging
export CUTOVER_DIR="$HOME/avandar-cutover"
export D="$CUTOVER_DIR/dumps"
umask 077                                   # new files: owner only
mkdir -p "$D" "$CUTOVER_DIR/catalog" && chmod 700 "$CUTOVER_DIR"
# libpq reads these before a URL, so a stray one can send psql elsewhere.
unset PGHOST PGHOSTADDR PGPORT PGDATABASE PGUSER PGPASSWORD PGPASSFILE \
  PGSERVICE PGSERVICEFILE PGSYSCONFDIR PGOPTIONS PGTARGETSESSIONATTRS \
  PGSSLMODE PGREQUIRESSL
# with_db_url <url> <command> [args...]: runs the command with the URL, minus
# its password, as its first argument, and the password in PGPASSWORD for
# that one command. `ps` shows every process's arguments to every user, but
# a process's environment only to its own user and root. A shell function's
# own arguments never reach `ps`. A URL whose user part has a ":" it cannot
# split is refused, never passed on whole. Works in bash and zsh.
with_db_url() {
  local url="$1" rest userinfo password
  shift
  rest="${url#*://}"
  userinfo="${rest%%@*}"
  local authority="${rest#*@}"
  authority="${authority%%[/?#]*}"
  if [[ "$url" == postgres*://* && "$rest" == *@* && "$userinfo" == *:* && "$userinfo" != */* && "$authority" != *@* ]]; then
    password="${userinfo#*:}"
    PGPASSWORD="$(printf '%b' "${password//\%/\\x}")" "$1" \
      "${url%%://*}://${userinfo%%:*}@${rest#*@}" "${@:2}"
  elif [[ "$rest" == *@* && "$userinfo" == *:* ]]; then
    # A password it cannot split, such as one with an unencoded "/" or "@".
    # Never print the URL.
    echo "with_db_url: cannot split the password out of the URL. Percent-encode it. Not running $1." >&2
    return 1
  else
    "$1" "$url" "${@:2}"
  fi
}
# One read-only transaction per query.
read_db() { with_db_url "$1" "$PSQL_BIN" -X -P pager=off -q -t -A -v ON_ERROR_STOP=1 \
  -c 'begin transaction read only' -c "$2" -c 'rollback'; }
COUNTS_SQL="select (select count(*) from auth.users) as users, (select count(*) from public.workspaces) as workspaces, (select count(*) from public.dashboards) as dashboards, (select count(*) from public.datasets) as datasets, (select count(*) from public.dataset_columns) as dataset_columns"
AUTH_SEED_EXCLUDES=(-x auth.sessions -x auth.refresh_tokens -x auth.one_time_tokens -x auth.flow_state -x auth.audit_log_entries -x auth.mfa_amr_claims)
# The rehearsal worktree (4.1). Every local reset, `migration up`, and load
# of production data runs behind on_rehearsal_stack: it moves into that
# worktree and succeeds only when its status names the rehearsal's own
# switched stack, never the shared `avandar` stack. `ava` drops an exported
# SUPABASE_PROJECT_ID or SUPABASE_*_PORT before it calls the Supabase CLI,
# but the plain `supabase` here obeys them, so the guard refuses to pass
# while one is exported.
export REHEARSAL="$(wt path chore/production-rehearsal)"
on_rehearsal_stack() { [[ -z "$(env | grep -E '^SUPABASE_(PROJECT_ID|[A-Z0-9_]+_PORT)=')" ]] &&
  [[ -d "$REHEARSAL" ]] && cd "$REHEARSAL" &&
  ava supabase status | grep -F "is on a switched local Supabase database: chore-production-rehearsal." >/dev/null; }
supabase --version
"$PSQL_BIN" --version
"$PG_DUMP_BIN" --version
env | grep '^PG' || echo "no PG variables"
supabase projects list -o json | jq -r '.[] | [.name, (.ref // .id)] | @tsv'
```

**Expect:** `2.114.0`; psql and pg_dump 17.6 or newer (17.12 on
2026-11-24); `no PG variables`; the two refs above next to `Avandar` and
`Avandar Staging`.
**If not:** run `pnpm install --frozen-lockfile` for the CLI, open a new
terminal for stray `PG*` variables, and stop if a ref differs.

The catalog scripts print commands that call "the cutover runbook's
`with_db_url` helper (1.4)". That is the helper above, in 2.4.

**Production's connection string.** Supabase dashboard: project `Avandar` >
**Connect** > **Session pooler** > copy the URI, with the database password
filled in and percent-encoded. Never use port 6543 (the transaction pooler).

```bash
read -rs PROD_DB_URL && export PROD_DB_URL   # paste, Enter: nothing is echoed
[[ "$PROD_DB_URL" == postgres*"://postgres.$PROD_REF:"*"@"*":5432/postgres"* ]] &&
  echo "PROD_DB_URL looks right" &&
  read_db "$PROD_DB_URL" "select current_user, max(version), count(*) from supabase_migrations.schema_migrations"
```

**Expect:** `PROD_DB_URL looks right`, then `postgres|20261013212914|115`
before the release.
**If not:** a different version or count means production moved since the
audit: stop, and redo 4.8 before going on.

**Staging's connection string**, the same way from project
`Avandar Staging` > **Connect** > **Session pooler**:

```bash
read -rs STAGING_DB_URL && export STAGING_DB_URL
[[ "$STAGING_DB_URL" == postgres*"://postgres.$STAGING_REF:"*"@"*":5432/postgres"* ]] &&
  echo "STAGING_DB_URL looks right" &&
  read_db "$STAGING_DB_URL" "select current_user, max(version), count(*) from supabase_migrations.schema_migrations"
```

**Expect:** `STAGING_DB_URL looks right`, then `postgres|20261117210525|<n>`
before the promotion, where `<n>` is the number of files in
`origin/develop`'s `supabase/migrations` if staging's CI applied them all
(`git ls-tree --name-only origin/develop supabase/migrations/ | wc -l`).

### 2.5 Rules for production access and the dumps

`supabase link` makes no database connection by itself. The dangerous case
in CLI 2.114 is a `--linked` database command (`db dump --linked`,
`db push --linked`, and the like) that finds no database password: the CLI
then creates a temporary login role with write access in the project. This
runbook runs no `--linked` command. Every production dump goes through
`--db-url "$PROD_DB_URL"`, which puts the password in the `supabase`
process's arguments, where `ps` shows it to every user of the machine. So
run the cutover on a laptop only you are logged in to. Every `psql` and
`pg_dump` here runs through `with_db_url`, and the catalog scripts read the
URL from `SOURCE_DB_URL` or `TARGET_DB_URL`, so their arguments never hold
it.

| Connects to production | Sections | What it does there |
| --- | --- | --- |
| `read_db "$PROD_DB_URL" ...` | 2.4, 4.2, 4.8, 9.6 (production run), 10.1, 10.2, 11.7, 12, 14.3, 17.5 | Queries in a read-only transaction |
| `supabase db dump --db-url "$PROD_DB_URL" ...` | 4.2, 10.2 | `pg_dump` as `postgres`: reads only |
| `supabase projects api-keys`, `branches list`, `backups list`, `secrets list`, `functions list`, with `--project-ref "$PROD_REF"` | 5.3, 6.1, 6.5, 10.1, 10.2, 13 | Management API reads |
| `with_db_url "$PROD_DB_URL" "$PG_DUMP_BIN" ...` | 9.6 C5 | The catalog backup: reads only |
| `importCatalogData.sh --dry-run`, and the run stopped at its prompt | 9.6 C4, C6 | Reads only, in read-only transactions |
| The `session_replication_role` probe | 9.6 C3 | Opens a transaction, changes one setting inside it, rolls back. Writes no data |
| The foreign key pre-flight | 9.6 C8 | One read-only transaction |
| **WRITES TO PRODUCTION** | 6.1 (only if keys are missing), 10.1 (only if you turn PITR on), 11 (through CI), 12 (catalog import and Parquet copy), 14 (rollback), 17 (optional WDI object delete) | As each step says |

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
  request, chat, or GitHub Actions artifact.
- Delete the dumps when section 17 says so.
- Never print a database URL or key. Read them into variables as above.

## 3. Freeze

### 3.1 Announce it

Tell everyone who merges into `develop` or `demo/measles` that both are
frozen from now until 8.5 lands, and that feature branches cut from
`demo/measles` retarget `develop` afterwards (17.4). Nothing merges into
either branch until then.

### 3.2 Open pull requests into `develop`

```bash
gh pr list --base develop --state open --json number,headRefName,title --jq '.[] | [.number, .headRefName, .title] | @tsv'
gh pr list --base demo/measles --state open --json number,headRefName --jq '.[] | [.number, .headRefName] | @tsv'
```

**Expect:** on 2026-11-23 there were 5 into `develop`. On 2026-11-24 one
remained: PR #330, `feat/oxlint-phase3`. None into `demo/measles`.
**If not:** handle each the way #330 is handled below.

**PR #330 (`feat/oxlint-phase3`).** It targets `develop`, and `develop` is
frozen. Leave it open and unmerged until the promotion lands (8.5). After
that, its author merges `develop` into it, fixes what the merge raises (the
promotion brings 787 demo commits that Oxlint has never linted), and lets
`pr-develop.yaml` run again. If it must merge before the promotion, merge
it, then the integration branch needs another catch-up (3.4) before 8.2:
a push to `develop` makes 8.5's fast-forward impossible until the
integration branch contains it.

### 3.3 Local-only commits

```bash
git fetch origin
git branch -r --contains 003e2964c
git log --oneline origin/develop..develop
```

**Expect:** `003e2964c` (`docs(lint): correct video producer Oxlint
references`) was a docs commit that existed only on the first machine's
local `develop`. On 2026-11-24 it is in `origin/feat/oxlint-phase3`, so it
lands with PR #330 and needs nothing else. The last command prints nothing.
**If not:** a commit listed by the last command exists only on this
machine's `develop`. Push it on its own branch and open a PR after the
promotion, or drop it once you are sure nothing in it is needed. Git
refuses `git branch -f develop` while a worktree has `develop` checked out,
so reset it inside that worktree, which must have no uncommitted changes:
`cd "$(wt sw develop)" && [[ -z "$(git status --porcelain)" ]] && git reset --hard origin/develop`.
Do this on every machine you use.

### 3.4 `develop` moved after planning

The plan was written against `develop` at `ccab27208`. On 2026-11-24
`origin/develop` was at `64b21f636`, which the integration branch did not
contain yet. The final sync of the implementation plan (Task 21) merges
`develop` again and reports the tip commit. Use that tip in 4.1 and 8.1,
never a commit written here.

`develop` also gained a migration after planning:
`20261105212729_add_rpc_workspaces__is_slug_available.sql`. The integration
branch merged it on 2026-11-24: production now applies 80 files, the tree
holds 195, and staging applies 10, one more file for production and the
tree than the plan counted on 2026-11-23. Every count below comes from a
command (`$PROD_PENDING` and `$TREE_COUNT`, 4.1), so take the number it
prints.

## 4. Rehearsal (local)

Restores production into a switched local stack, applies every migration
production does not have yet, and opens old dashboards. Nothing here writes
to production. This is the primary safety check for the migrations while
the audit refresh is pending (4.8).

### 4.1 Create the rehearsal worktree and its own stack

```bash
REHEARSAL="$(wt new chore production-rehearsal chore/production-cutover)" && cd "$REHEARSAL"
export REHEARSAL
git log -1 --format='%h %s'
pnpm install --frozen-lockfile
ava supabase status | grep -m1 -E "switched local|develop local"
[[ -n "$REHEARSAL" && "$PWD" == "$REHEARSAL" ]] && ava supabase switch --no-seed
pnpm fns:update-env
ava supabase status | grep -m1 -E "switched local|develop local"
git fetch origin
export PROD_PENDING="$(comm -23 <(ls supabase/migrations | sort) <(git ls-tree --name-only origin/main supabase/migrations/ | sed 's#.*/##' | sort) | wc -l | tr -d ' ')"
export TREE_COUNT="$(ls supabase/migrations | wc -l | tr -d ' ')"
echo "production applies $PROD_PENDING files, the tree holds $TREE_COUNT"
```

**Expect:** the commit is the tip Task 21's final report names. The second
status line reads `Branch chore/production-rehearsal is on a switched local
Supabase database: chore-production-rehearsal.` The last line reads
`production applies 80 files, the tree holds 195` at the 2026-11-24 tip
(3.4). A later `develop` merge that adds a migration raises both.
**If not:** an empty `echo "$REHEARSAL"` means `wt new` failed: the switch
did not run, and the rest of the block ran in the worktree you started in.
Fix the cause before anything else. Never run 4.3 to 4.6 while the status
line says `This is the develop local Supabase`: they would reset the shared stack every other
worktree uses, and load production's users into it. Fix the switch first
(CLAUDE.md, "Supabase"). From here on, `on_rehearsal_stack` (2.4) guards
every reset and load: `echo "$REHEARSAL"` must print this worktree's path.

### 4.2 Dump production (reads production)

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

**Expect:** counts near 333 users, 48 workspaces, 39 dashboards, 85
datasets, and 20,030 dataset columns (the audit's 2026-11-19 numbers); `1`
for each data file; `0` roles (the CLI drops every Supabase-managed role).
**If not:** a missing footer means a data dump was cut short: dump it again.
A `CREATE ROLE` line names a role production created by hand: read it before
loading. The `sed` removes a setting Postgres 15 rejects, which a newer
`pg_dump` writes.

The rehearsal leaves out Storage (no database dump carries its files),
Google tokens, and Auth sessions. No migration reads them.

### 4.3 Reset the local stack to production's migration version

```bash
on_rehearsal_stack && supabase db reset --local --no-seed --version 20261013212914
on_rehearsal_stack && export LOCAL_DB_URL="$(supabase status -o json | jq -er '.DB_URL')"
[[ "$LOCAL_DB_URL" == postgres*"://"*"@127.0.0.1:"* ]] && echo "local URL ok"
read_db "$LOCAL_DB_URL" "select max(version), count(*) from supabase_migrations.schema_migrations"
```

**Expect:** `local URL ok`, then `20261013212914|115`: the local schema is
`main`'s 115 migrations, as on production. The local stack runs Postgres 15,
like production (`supabase/config.toml`, `major_version = 15`).
**If not:** if the reset did not run, `on_rehearsal_stack` failed: nothing
ran. Stop, and fix the switch (4.1). No `local URL ok` means the wrong
directory: stop.

### 4.4 Compare the schemas (informational)

```bash
supabase db dump --local -f "$D/local-at-prod-version-schema.sql"
diff "$D/prod-rehearsal-schema.sql" "$D/local-at-prod-version-schema.sql" \
  > "$D/schema-drift.diff"; wc -l < "$D/schema-drift.diff"
```

**Expect:** few or no lines.
**If not:** read every difference. One that touches a table, column,
function, or policy a migration reads is drift the audit did not see: stop
and raise it.

### 4.5 Load production's roles and data

```bash
on_rehearsal_stack &&
  with_db_url "$LOCAL_DB_URL" "$PSQL_BIN" -X -P pager=off --single-transaction --set ON_ERROR_STOP=1 \
    --file "$D/prod-rehearsal-roles.sql" \
    --file "$D/prod-rehearsal-data-auth.sql" \
    --file "$D/prod-rehearsal-data-public.sql"
read_db "$LOCAL_DB_URL" "$COUNTS_SQL"
```

**Expect:** psql ends without an error, and the counts equal
`prod-rehearsal-counts.txt`.
**If not:** no psql output at all means `on_rehearsal_stack` failed: nothing
ran. Stop. Otherwise the transaction rolled back: repeat from 4.3 after the fix. An
error on an `auth` table (a missing column or a duplicate key) means the
local Auth version differs from production's: add `-x auth.<table>` for that
table to `AUTH_SEED_EXCLUDES` and repeat 4.2's auth dump, unless it is
`auth.users` or `auth.identities`, which is a blocker to raise.

### 4.6 Apply the migrations production does not have

```bash
rm -f "$D/rehearsal-migration-up.log"
on_rehearsal_stack && supabase migration up --local --include-all 2>&1 | tee "$D/rehearsal-migration-up.log"
grep -c '^Applying migration' "$D/rehearsal-migration-up.log"
read_db "$LOCAL_DB_URL" "select max(version), count(*) from supabase_migrations.schema_migrations"
read_db "$LOCAL_DB_URL" "$COUNTS_SQL"
read_db "$LOCAL_DB_URL" "select to_regclass('public.plugin_installations'), (select count(*) from public.plugin_installations)"
```

**Expect:** `$PROD_PENDING` applying lines (80 at the 2026-11-24 tip) with no
error; then `20261123200200|$TREE_COUNT`; the same counts as 4.5; then
`plugin_installations|0`. Production applies all of them in one
`supabase db push --include-all` (11.6), in timestamp order. The plugin
table is created, dropped, and restored empty within that one push.
**If not:** no `Applying migration` output and no log means
`on_rehearsal_stack` failed: nothing ran. Stop. A failed migration is a
cutover blocker. Record its file and
error, stop, and fix it with a new migration before the release.

### 4.7 Open old dashboards

Pick 5 dashboards from your own workspaces:

```bash
cd "$REHEARSAL"
read -r MY_EMAIL     # your production sign-in email; stays in this shell
read_db "$LOCAL_DB_URL" "select w.slug, d.id, d.name from public.dashboards d join public.workspaces w on w.id = d.workspace_id join public.workspace_memberships m on m.workspace_id = d.workspace_id join auth.users u on u.id = m.user_id where u.email = '$MY_EMAIL' order by d.created_at limit 5"
grep '^VITE_APP_URL=' .env.development
```

If you sign in with Google on production, set a local-only password first.
It writes to the local stack only:

```bash
read -rs LOCAL_PASSWORD     # a throwaway password for this local stack
on_rehearsal_stack &&
  printf '%s\n' "update auth.users set encrypted_password = extensions.crypt(:'pw', extensions.gen_salt('bf')) where email = :'email';" |
  with_db_url "$LOCAL_DB_URL" "$PSQL_BIN" -X -P pager=off -v ON_ERROR_STOP=1 -v pw="$LOCAL_PASSWORD" -v email="$MY_EMAIL"
```

Then start the app in a second terminal, since `pnpm dev` keeps running:
`cd` to the rehearsal worktree (`echo "$REHEARSAL"` prints it) and run
`pnpm dev`. Sign in at the `VITE_APP_URL`, then open each as
`<VITE_APP_URL>/<slug>/dashboards/edit/<id>` and note the result in your own
notes (not in the repository).

**Expect:** each dashboard opens with its title, layout, and every tile's
header, and no error screen. A tile may say its data could not load:
dataset files live in Storage, which no dump carries.
**If not:** an error screen or a tile that fails to parse is a blocker: the
dashboard's stored configuration does not survive the new code. If edge
functions answer 401 with `unexpected "iss"`, run `pnpm fns:update-env` and
restart `pnpm dev`.

### 4.8 The migration audit refresh is pending

The refresh of [the migration audit](alpha-migration-audit.md) against
production's and staging's live data (Task 17 of the implementation plan)
was deferred by Pablo. Per Task 17, an agent session given read-only URLs
runs it, when Pablo chooses to start one. The rehearsal above is the
primary safety check for production's files, but nothing rehearses
staging's 10 out-of-order files, and 8.5 makes `staging.yaml` apply them
automatically. So the refresh, and these read-only checks on live data,
must be done **before step 3 of section 1** (the promotion). A blocker
found after 8.5 can only be fixed forward. Each runs in a read-only
transaction:

```bash
read_db "$PROD_DB_URL" "$COUNTS_SQL"
read_db "$PROD_DB_URL" "select status, count(*) from public.individuals group by 1 order by 1"
read_db "$PROD_DB_URL" "select count(*), count(api_service) from public.catalog_entries__open_data"
read_db "$PROD_DB_URL" "select count(*) from public.datasets__open_data"
OPEN_DATA_MEMBERS_SQL="select o.workspace_id, count(distinct m.user_id) as members, count(distinct m.user_id) filter (where lower(coalesce(u.email, '')) not like '%@avandarlabs.com') as outside from public.datasets__open_data o left join public.workspace_memberships m on m.workspace_id = o.workspace_id left join auth.users u on u.id = m.user_id group by 1 order by 1"
read_db "$PROD_DB_URL" "$OPEN_DATA_MEMBERS_SQL"
read_db "$STAGING_DB_URL" "$OPEN_DATA_MEMBERS_SQL"
read_db "$STAGING_DB_URL" "select version from supabase_migrations.schema_migrations order by 1" > "$D/staging-applied-versions.txt"
comm -23 <(ls "$REHEARSAL/supabase/migrations" | cut -d_ -f1 | sort) <(sort "$D/staging-applied-versions.txt")
```

| Check | Expect, from the 2026-11-19 audit and the plan | If it differs |
| --- | --- | --- |
| Users, workspaces, dashboards, datasets, dataset columns | About 333, 48, 39, 85, 20,030. Growth is fine | A big drop: stop and look |
| `individuals.status` values | 16 rows, every value one the audit mapped to a case status | A value the audit did not list: the status backfill may not map it. Stop and raise it |
| Catalog listings, non-null `api_service` | `6|0` | A non-null `api_service`: the enum recreation may fail. Stop |
| Datasets linked to the catalog | `4` | More than 4: the catalog replace deletes more than planned. Stop |
| Their workspaces, on production | Every row `members` 1 and `outside` 0: Pablo's own single-member test workspaces. A member with no email counts as outside, as in the import's guard | Any `outside` above 0, or `members` 0: the import guard refuses. Stop and raise it |
| Their workspaces, on staging | No rows, or every row `outside` 0 and `members` above 0 | Any `outside` above 0, or `members` 0: the staging import (9.6) would refuse after the promotion landed. Stop and raise it before step 3 |
| Files staging has not applied (last command) | The 10 files of 9.2 | Another file: staging's history differs from the plan. Stop |

Then refresh the audit's verdict for every file of `$PROD_PENDING` and the
staging list, read-only, as the implementation plan's Task 17 describes.

### 4.9 Pass criteria

| Check | Pass |
| --- | --- |
| Every migration applies (4.6) | `$PROD_PENDING` applied, none failed |
| Row counts | Equal before and after the migrations, and equal to production at dump time |
| `plugin_installations` | Exists and is empty after the migrations |
| 5 old dashboards (4.7) | All open without an error screen |
| Schema drift (4.4) | Nothing a migration reads |
| Live checks and audit refresh (4.8) | Every row as expected, before step 3 |

Leave the rehearsal worktree and its stack in place: 10.3 tests the backup
in it.

## 5. GitHub setup

### 5.1 Protect the `production` environment first (A3)

On 2026-11-24 the GitHub `production` environment has no protection: no
deployment branch policy and no required reviewer. Add both **before any
production secret is added** in 5.3. **CHANGES GITHUB SETTINGS.**

Why first: pushing a branch cannot deploy production by itself, since
`production.yaml` deploys only from a push to `main`, and its `deploy` job
runs only for `refs/heads/main` and refuses anything but the tip of `main`.
But a workflow run from another branch, a manual `workflow_dispatch` run or
an edited workflow on a pushed branch, can read production's secrets
whenever the environment allows that branch. Today it allows every branch.
So: branch policy, then secrets, then the push in 8.2.

1. Repository **Settings** > **Environments** > **production** >
   **Deployment branches and tags** > **Selected branches and tags** >
   **Add deployment branch or tag rule** > Ref type **Branch**, name pattern
   `main` > **Add rule**. Add no other rule, and do not choose **Protected
   branches only**.
2. Same screen > **Deployment protection rules** > **Required reviewers** >
   add yourself > clear **Prevent self-review** (you push `main` yourself
   through `ava release`) > **Save protection rules**.

```bash
gh api repos/AvandarLabs/avandar/environments/production \
  --jq '{policy: .deployment_branch_policy, rules: [.protection_rules[].type]}'
gh api repos/AvandarLabs/avandar/environments/production/deployment-branch-policies \
  --jq '.branch_policies[] | {name, type}'
```

**Expect:** `"protected_branches": false`, `"custom_branch_policies": true`,
and the rule types include `required_reviewers` and `branch_policy`; then
one policy, `main`, of type `branch`.
**If not:** fix it in the same screen. Do not go on to 5.3 until both
print as expected.

The `deploy` job then waits for your approval before its first step, so the
backup (10.2) is taken while it waits. A re-run of the job waits again.

### 5.2 The `staging` environment's branch policy: not now

The plan recommended the same protection for `staging`, a `develop` policy.
**Do not add a `develop`-only policy.** Three workflows use the `staging`
environment outside `develop`: `production.yaml`'s `test-quick` and
`test-e2e` run on `main` with `environment: staging`, and `pr-develop.yaml`'s
test jobs run on pull requests with it. A `develop`-only policy would block
`production.yaml`'s `test-quick` on `main`, and its `deploy` job needs
`test-quick`, so production would never deploy. Pull request runs would
likely be blocked too (**verify**: GitHub evaluates a pull request run's
ref, not `develop`). Staging stays unprotected for now. That is a known gap
(section 18): its secrets are readable by any branch's workflow, and no
deployment branch policy is possible while `production.yaml`'s test jobs use
`environment: staging` on `main`. The fix is a later change that gives the
test jobs an environment of their own.

**What A3's protection does not cover.** 5.1 protects only the database
password and the secrets of the `production` environment. Two `staging`
secrets reach further:

- `VERCEL_TOKEN`: 7.5 puts the same token in `staging`. Any branch's
  workflow can read it and run `vercel deploy --prod` on project `avandar`,
  which serves `app.avandarlabs.com`.
- `SUPABASE_ACCESS_TOKEN`: if staging's is a personal access token of an
  account that can also reach project `Avandar`, any branch's workflow can
  reach production through the Management API with it. Supabase personal
  access tokens are account-wide: they reach every project the account
  can. **Verify** which account created staging's token.

**Decision for Pablo: accept this exposure for now, or narrow the staging
tokens.**

| Option | What it takes | Leaves |
| --- | --- | --- |
| (a) Accept it for now | Nothing. Low risk while only maintainers can push branches to the repository | Any branch's workflow can deploy production's web app, and reach production through staging's Supabase token if that token's account can |
| (b) Narrow the staging tokens | Vercel: Account settings > **Tokens** > **Create**, a token of its own for `staging`, with the narrowest scope your plan offers (**verify** whether that is the team or the project: no Vercel token scope known to this runbook limits a token to one environment, so it may still deploy production; it can at least be revoked on its own). Supabase: **Account** > **Access Tokens** > **Generate new token**, created by a separate machine or service account that is a member of the staging project's organization only, never of `Avandar`'s (**verify** that the two projects are in different organizations; if they share one, a separate account does not isolate them). Store both on `staging` only: `gh secret set VERCEL_TOKEN --env staging`, `gh secret set SUPABASE_ACCESS_TOKEN --env staging`. **CHANGES VERCEL**, **CHANGES GITHUB SETTINGS** | Whatever the Vercel scope cannot narrow (**verify**) |

### 5.3 Set the `production` environment's names

`production.yaml`'s "Check the production configuration" step requires the
23 names below, and reads `GEOAPIFY_API_KEY` when it is set. Today the
environment holds only `SUPABASE_ACCESS_TOKEN`, `PRODUCTION_DB_PASSWORD`,
and `PRODUCTION_PROJECT_ID`. It needs 18 more secrets and 3 variables.

| Name | Kind | Exists today | Value |
| --- | --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Secret | Yes | Supabase personal access token |
| `PRODUCTION_DB_PASSWORD` | Secret | Yes | Production database password |
| `PRODUCTION_PROJECT_ID` | Secret | Yes | Production's project ref |
| `PRODUCTION_SB_SECRET_KEY` | Secret | No | Production secret key, unmasked, `sb_secret_...` |
| `VERCEL_TOKEN` | Secret | No | The Vercel token (7.5) |
| `VERCEL_ORG_ID` | Secret | No | Vercel team settings > **General** > **Team ID**, `team_...` |
| `VERCEL_PROJECT_ID` | Secret | No | Project `avandar` > **Settings** > **General** > **Project ID** |
| `GOOGLE_CLIENT_ID` | Secret | No | Production Google OAuth client (6.2) |
| `GOOGLE_CLIENT_SECRET` | Secret | No | Same client |
| `POLAR_ACCESS_TOKEN` | Secret | No | Production Polar organization token (6.3) |
| `UPSTASH_REDIS_API_URL` | Secret | No | Production Upstash database |
| `UPSTASH_REDIS_REST_API_TOKEN` | Secret | No | Same database |
| `RESEND_SENDING_API_KEY` | Secret | No | Resend |
| `RESEND_FULL_ACCESS_API_KEY` | Secret | No | Resend |
| `OPENAI_API_KEY` | Secret | No | OpenAI |
| `OPEN_ROUTER_API_KEY` | Secret | No | OpenRouter |
| `FEATUREBASE_JWT_SECRET` | Secret | No | The same value as the GitHub `staging` environment's: one Featurebase organization (5.4) |
| `AVA_PIPELINE_SERVER_SECRET` | Secret | No | The pipeline server's secret (6.4) |
| `AVA_PIPELINE_SERVER_URL` | Secret, never a variable | No | The pipeline server's URL (6.4). A private hostname does not belong in a public repository's variables |
| `VITE_GOOGLE_PICKER_API_KEY` | Secret | No | Google Picker API key |
| `GEOAPIFY_API_KEY` | Secret, optional to the check | No | Geoapify key. Set it: the `geocode` function needs it, and production has none today. An empty value leaves the project's key untouched |
| `PRODUCTION_SUPABASE_URL` | Variable | No | Exactly `https://<PRODUCTION_PROJECT_ID>.supabase.co` |
| `PRODUCTION_SB_PUBLISHABLE_KEY` | Variable | No | Production publishable key, `sb_publishable_...` |
| `VITE_GOOGLE_PICKER_APP_ID` | Variable | No | Google Picker app ID |

Set every one on the **environment**, never on the repository or the
organization: a same-named repository or organization value silently fills
a missing environment value. Values are never pasted into chat, a file, or
a command line. `gh secret set` prompts and does not echo. Variables are
public, so `--body` is fine for them.

```bash
supabase projects api-keys --project-ref "$PROD_REF" -o json | jq -r '.[] | [.name, .type] | @tsv'
```

**Expect:** a `publishable` and a `secret` key, names and types only.
**If not:** 6.1.

Have ready first: 6.2 (the Google client), 6.3 (the Polar token), 6.4 (the
pipeline server's URL and secret), and the new token from 7.5. They come
later in this runbook, but this loop needs their values.

```bash
for name in AVA_PIPELINE_SERVER_SECRET AVA_PIPELINE_SERVER_URL FEATUREBASE_JWT_SECRET \
  GEOAPIFY_API_KEY GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET OPENAI_API_KEY OPEN_ROUTER_API_KEY \
  POLAR_ACCESS_TOKEN RESEND_FULL_ACCESS_API_KEY RESEND_SENDING_API_KEY UPSTASH_REDIS_API_URL \
  UPSTASH_REDIS_REST_API_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID VERCEL_TOKEN VITE_GOOGLE_PICKER_API_KEY; do
  echo "Production value of $name:"
  gh secret set "$name" --env production || break
done
supabase projects api-keys --project-ref "$PROD_REF" --reveal -o json \
  | jq -j '[.[] | select(.type == "secret")][0].api_key' \
  | gh secret set PRODUCTION_SB_SECRET_KEY --env production
supabase projects api-keys --project-ref "$PROD_REF" -o json \
  | jq -j '[.[] | select(.type == "publishable")][0].api_key' \
  | gh variable set PRODUCTION_SB_PUBLISHABLE_KEY --env production
gh variable set PRODUCTION_SUPABASE_URL --env production --body "https://$PROD_REF.supabase.co"
gh variable set VITE_GOOGLE_PICKER_APP_ID --env production --body '<public value>'
```

**CHANGES GITHUB SETTINGS.** Each `gh secret set` asks for one value. Paste
it from your password manager and press Enter.

### 5.4 Set the `staging` environment's names

`staging.yaml`'s deploy job reads the names in commit `50eff770a`'s body.
The `staging` environment already holds all but four. Add them:

| Name | Kind | Value |
| --- | --- | --- |
| `STAGING_SB_SECRET_KEY` | Secret | Staging's secret key, unmasked, `sb_secret_...` |
| `AVA_PIPELINE_SERVER_URL` | Secret | The pipeline server's URL (6.4). Today it is a variable |
| `STAGING_SB_PUBLISHABLE_KEY` | Variable | Staging's publishable key, `sb_publishable_...` |
| `STAGING_SUPABASE_URL` | Variable | Exactly `https://<STAGING_PROJECT_ID>.supabase.co` |

```bash
supabase projects api-keys --project-ref "$STAGING_REF" --reveal -o json \
  | jq -j '[.[] | select(.type == "secret")][0].api_key' \
  | gh secret set STAGING_SB_SECRET_KEY --env staging
supabase projects api-keys --project-ref "$STAGING_REF" -o json \
  | jq -j '[.[] | select(.type == "publishable")][0].api_key' \
  | gh variable set STAGING_SB_PUBLISHABLE_KEY --env staging
gh variable set STAGING_SUPABASE_URL --env staging --body "https://$STAGING_REF.supabase.co"
gh secret set AVA_PIPELINE_SERVER_URL --env staging
```

**CHANGES GITHUB SETTINGS.** Keep the old `AVA_PIPELINE_SERVER_URL`
**variable** on `staging` until the promotion deletes `demo.yaml` from
`develop` (8.5). 9.4 deletes it. A secret and a variable may share a name
(**verify**: `gh variable list --env staging` and `gh secret list --env
staging` both list it afterwards).

**`FEATUREBASE_JWT_SECRET` (H1, decided).** The GitHub `staging` value is
the source of truth, so nothing changes now. The first staging deploy
overwrites staging's own value, which differed on 2026-11-23, with
GitHub's. A wrong value only drops the user's name, email, and workspace
from feedback posts. 9.3 checks it after the first deploy. Production gets
the same source-of-truth value in 5.3, since both use one Featurebase
organization.

### 5.5 Value rules the configuration check enforces

The deploy job's "Check the production configuration" step (and "Check the
staging configuration", with `STAGING_` in place of `PRODUCTION_`) stops
the run before anything is written when a rule fails:

| Rule | Applies to |
| --- | --- |
| Not empty | The 23 required names. `SUPABASE_DB_PASSWORD` and `SUPABASE_PROJECT_ID` are read from `PRODUCTION_DB_PASSWORD` and `PRODUCTION_PROJECT_ID` |
| Not only whitespace, no leading or trailing whitespace, no carriage return | The 23, and `GEOAPIFY_API_KEY` when set |
| No single quote and no line break | Every value written into the edge function secrets file: the two keys, the URL, the Google, Polar, Upstash, Resend, OpenAI, OpenRouter, Featurebase, and pipeline server values, and `GEOAPIFY_API_KEY` |
| Exactly `https://<PRODUCTION_PROJECT_ID>.supabase.co` | `PRODUCTION_SUPABASE_URL` |
| Starts `sb_publishable_`, then only letters, digits, `_`, `-` | `PRODUCTION_SB_PUBLISHABLE_KEY` |
| Starts `sb_secret_`, then only letters, digits, `_`, `-`. A masked copy fails | `PRODUCTION_SB_SECRET_KEY` |
| Starts `team_`, then only letters and digits | `VERCEL_ORG_ID` |

Put no quotes around any value.

### 5.6 Check the names (before 8.2 and before every release)

```bash
check_env_names() {   # check_env_names <env> "<secrets>" "<variables>"
  echo "$1, missing secrets:"; comm -23 <(tr ' ' '\n' <<<"$2" | sort) \
    <(gh secret list --env "$1" --json name -q '.[].name' | sort)
  echo "$1, missing variables:"; comm -23 <(tr ' ' '\n' <<<"$3" | sort) \
    <(gh variable list --env "$1" --json name -q '.[].name' | sort)
}
check_env_names production "AVA_PIPELINE_SERVER_SECRET AVA_PIPELINE_SERVER_URL FEATUREBASE_JWT_SECRET GEOAPIFY_API_KEY GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET OPENAI_API_KEY OPEN_ROUTER_API_KEY POLAR_ACCESS_TOKEN PRODUCTION_DB_PASSWORD PRODUCTION_PROJECT_ID PRODUCTION_SB_SECRET_KEY RESEND_FULL_ACCESS_API_KEY RESEND_SENDING_API_KEY SUPABASE_ACCESS_TOKEN UPSTASH_REDIS_API_URL UPSTASH_REDIS_REST_API_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID VERCEL_TOKEN VITE_GOOGLE_PICKER_API_KEY" \
  "PRODUCTION_SB_PUBLISHABLE_KEY PRODUCTION_SUPABASE_URL VITE_GOOGLE_PICKER_APP_ID"
check_env_names staging "AVA_PIPELINE_SERVER_SECRET AVA_PIPELINE_SERVER_URL FEATUREBASE_JWT_SECRET GEOAPIFY_API_KEY GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GOOGLE_REDIRECT_URI OPENAI_API_KEY OPEN_ROUTER_API_KEY POLAR_ACCESS_TOKEN RESEND_FULL_ACCESS_API_KEY RESEND_LOCAL_TEST_SEGMENT_ID RESEND_SENDING_API_KEY STAGING_DB_PASSWORD STAGING_PROJECT_ID STAGING_SB_SECRET_KEY SUPABASE_ACCESS_TOKEN UPSTASH_REDIS_API_URL UPSTASH_REDIS_REST_API_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID VERCEL_TOKEN VITE_GOOGLE_PICKER_API_KEY" \
  "STAGING_SB_PUBLISHABLE_KEY STAGING_SUPABASE_URL VITE_GOOGLE_PICKER_APP_ID"
echo "Repository secrets:"; gh secret list --json name -q '.[].name'
echo "Repository variables:"; gh variable list --json name -q '.[].name'
```

**Expect:** nothing under any "missing" line. Only
`CLAUDE_CODE_OAUTH_TOKEN` under repository secrets, and no repository
variables (true on 2026-11-20). Organization secrets: repository
**Settings** > **Secrets and variables** > **Actions** shows none under
**Organization secrets**.
**If not:** set what is missing (5.3, 5.4). Delete any repository or
organization value that shares a name with an environment value.

### 5.7 What happens when a name is missing

The first deploy of each environment stops at its configuration check,
before anything is written, until every name exists. The message names
each problem, such as `VERCEL_TOKEN is empty in the production
environment.` Fix the name and re-run the failed jobs of that run:
`gh run rerun "$STAGING_RUN_ID" --failed` for staging (9.1), or
`gh run rerun "$RUN_ID" --failed` for production (11.5).

## 6. Third parties

### 6.1 Production API keys

```bash
supabase projects api-keys --project-ref "$PROD_REF" -o json | jq -r '.[] | [.name, .type] | @tsv'
```

**Expect:** a `publishable` key and a `secret` key.
**If not:** create them in `Avandar` > **Project Settings** > **API Keys**.
**WRITES TO PRODUCTION** (project configuration, not data).

### 6.2 Google OAuth redirect URI

```bash
echo "https://$PROD_REF.supabase.co/functions/v1/google-auth-callback"
```

Google Cloud console > **APIs & Services** > **Credentials** > the OAuth
client whose ID is the production `GOOGLE_CLIENT_ID` > **Authorized
redirect URIs** must contain the URI printed above. `production.yaml` sets
exactly this as `GOOGLE_REDIRECT_URI`. Add it if missing: **CHANGES GOOGLE
CLOUD CONSOLE**.

Staging too: every staging deploy sets staging's `GOOGLE_REDIRECT_URI` to
staging's own callback, so check staging's OAuth client the same way.

```bash
echo "https://$STAGING_REF.supabase.co/functions/v1/google-auth-callback"
```

Same screen > the OAuth client whose ID is the staging `GOOGLE_CLIENT_ID` >
**Authorized redirect URIs** must contain the URI printed above.
`staging.yaml` writes `<STAGING_SUPABASE_URL>/functions/v1/google-auth-callback`
on every deploy. Add it if missing: **CHANGES GOOGLE CLOUD CONSOLE**.

### 6.3 Polar

**CHANGES POLAR.** Polar dashboard, **production** organization (not the
sandbox) > **Settings** > **Developers** > create an access token > store it
as `POLAR_ACCESS_TOKEN` (5.3). `production.yaml` sets
`POLAR_SERVER_TYPE=production`. Staging keeps `sandbox`.

### 6.4 Pipeline server (before the release)

Follow [the pipeline server runbook](pipeline-server-fly-runbook.md) to
have the server running:

```bash
read -rs PIPELINE_URL   # the server's https URL, from your password manager
curl -s "$PIPELINE_URL/healthz"; echo
unset PIPELINE_URL
```

**Expect:** `{"ok":true}`.
**If not:** fix the server first. The release must not start until it
answers.

The server keeps no Supabase credentials: each request names the project
to load into. Production is pointed at it by its URL and secret, stored as
`AVA_PIPELINE_SERVER_URL` and `AVA_PIPELINE_SERVER_SECRET` in the GitHub
`production` environment (5.3) before the release. The first production
deploy then writes them to production's edge secrets. Neither staging nor
production has them today. That runbook's "set by hand" production step is
now done by every `production.yaml` run.

### 6.5 Production has no Supabase Git integration or Branching

Read only: `Avandar` > **Project Settings** > **Integrations** > **GitHub**
is not connected, and **Branches** shows Branching off.

```bash
supabase branches list --project-ref "$PROD_REF"
```

**Expect:** an error that Branching is not enabled, or no branches.
**If not:** stop. A Git integration on `main` would deploy production
outside `production.yaml`.

The same for staging, read only: `Avandar Staging` > **Project Settings** >
**Integrations** > **GitHub** is not connected (**verify** the label).
Staging has Branching on, for the `demo-measles` branch (9.5): that is
expected, and needs no Git integration.
**If not:** stop. A Supabase Git integration would migrate staging, or
create branches, outside `staging.yaml`. Disconnecting it is **CHANGES
STAGING CONFIGURATION**, yours only.

## 7. Vercel before the cutover

Values and click paths only. Every change here is yours, in the Vercel
dashboard, project `avandar`. **CHANGES VERCEL** where a step changes
something.

### 7.1 `staging.avandarlabs.com` serves the environment named `staging`

**Settings** > **Domains** > `staging.avandarlabs.com`: it must be connected
to the custom environment named `staging` (E1), not to Preview or to a Git
branch. If not: **Edit** > environment `staging` > **Save**. **CHANGES
VERCEL.** **Verify:** the exact label Vercel shows next to the domain.
`staging.yaml` deploys with `--environment=staging`, so a domain on another
environment would keep serving an old build.

### 7.2 Review the `VITE_*` values of Production and of `staging`

**Settings** > **Environment Variables**, filtered to **Production**, then
to `staging`. The deploy jobs drop `VITE_SUPABASE_API_URL`,
`VITE_SUPABASE_ANON_KEY`, and `VITE_APP_URL` (set from GitHub), every
Sensitive value, and the Google Picker pair (set from GitHub). Check the
rest:

| Name | What it does |
| --- | --- |
| `VITE_FEATURE_FLAGS` | Comma-separated flags, defined in `src/config/FeatureFlagConfig.ts`. Compare Production with `staging` and with `demo` |
| `VITE_AVA_DATA_AGENT` | New for production. `on` enables the data agent for every user. Decide the value for each environment |
| `VITE_HIDE_DEV_TOOLS` | `true` hides the router dev tools. Set it on Production |
| `VITE_OFFLINE_CHAT_MOCK` | Must be unset on Production and `staging` |

A `VITE_*` value marked Sensitive never reaches the build: the "Pull the
Vercel production environment" step prints `Sensitive Vercel variables left
out of the build:` and lists them.

### 7.3 Delete every deploy hook

**Settings** > **Git** > **Deploy Hooks** > delete every hook. **CHANGES
VERCEL.** A hook is a URL that deploys outside CI (D2).

### 7.4 Nothing blocks CLI deploys to production

`production.yaml` deploys with `vercel deploy --prebuilt --prod`. Check, in
**Settings** (**verify** each label):

- **Environments** > **Production**: custom domains are assigned to new
  production deployments automatically. If that is off, the CI deploy
  creates a production deployment that does not serve `app.avandarlabs.com`.
- **Deployment Protection**: no rule that stops a CLI deployment or holds
  it for approval.
- No rolling release or deployment check that waits on a Git status.

### 7.5 Make the Vercel token as narrow as Vercel allows

Account settings > **Tokens** > **Create**: scope it to the `avandar` team
(or to the `avandar` project, if your plan offers project-scoped tokens:
**verify**), with an expiry date. Store it as `VERCEL_TOKEN` in both GitHub
environments (5.3 and `gh secret set VERCEL_TOKEN --env staging`), then
delete the old token. With option (b) of 5.2's decision, `staging` gets a
token of its own instead. Either way, a token in `staging` is readable by
any branch's workflow (5.2). **CHANGES VERCEL**, **CHANGES GITHUB SETTINGS.**

## 8. Promote to `develop` (D3)

The promotion is a PR, for CI and the public record, then a fast-forward of
`develop` to the PR head with your admin bypass. A squash would replace 787
commits with one and break every commit ID the feature log cites.

It carries everything on the integration branch: the demo features, the
plugin system (D1), the CI deploys, the catalog move scripts, the GIS fixes,
and the video producer file-name casing fix.

### 8.1 Preconditions

```bash
cd "$(wt go chore/production-cutover)"
git fetch origin
git status -sb
export TIP="$(git rev-parse HEAD)"
git log -1 --format='%h %s' "$TIP"
git merge-base --is-ancestor origin/demo/measles "$TIP" && echo "demo/measles can fast-forward"
git merge-base --is-ancestor origin/develop "$TIP" && echo "develop can fast-forward"
git diff --quiet "$TIP" "refs/heads/chore/production-rehearsal" -- supabase/migrations && echo "rehearsed migrations"
```

Then run 5.6.
**Expect:** `## chore/production-cutover` with no changes; the short SHA is
the tip Task 21's final report names; all three lines print; 5.6 shows
nothing missing; 5.1 is done.
**If not:** a missing `develop can fast-forward` means `develop` moved again
(3.4): stop, and catch the branch up as Task 21 does before going on. A
missing `rehearsed migrations` means the migrations changed after the
rehearsal: repeat section 4 on the new tip.

### 8.2 Push the integration branch to `demo/measles` (**PUSHES**)

```bash
git push origin "$TIP:refs/heads/demo/measles"
gh run list --branch demo/measles --limit 5
```

**Expect:** a fast-forward push. No deploy runs: `demo.yaml` is gone from
this tree, and `vercel.json` turns Vercel's Git deployments off, so Vercel
builds nothing for this push either. `demo.avandarlabs.com` keeps serving
its last build, frozen until section 17.
**If not:** a rejected push means `demo/measles` moved: stop and tell
whoever pushed it.

### 8.3 Open the PR

```bash
gh pr create --base develop --head demo/measles \
  --title "feat: promote the measles demo to develop" \
  --body-file docs/measles-demo/promotion-pr-description.md
```

**Expect:** a PR URL. The body is the whole of
`docs/measles-demo/promotion-pr-description.md`. It says what landed without
review and where the post-commit reviews live. **PUSHES** (creates a public PR).
**If not:** if the file is missing, stop: the integration branch is not the
final one.

### 8.4 Wait for `pr-develop.yaml`

```bash
gh pr checks demo/measles --watch
```

**Expect:** every check passes, `pr-test-e2e` included: `lint-pr-title`,
`lint-typecheck`, `test-quick`, `pr-test-e2e`, `verify-packages`, and
`react-doctor.yml`'s check. No ruleset requires a GitHub status check, so
your admin bypass could fast-forward `develop` even with a red PR. Do not:
staging's CI gate and `ava release` (11.2) need staging's whole run green,
`test-e2e` included.
**If not:** fix on the integration branch, re-run 8.1 to reset `TIP`, push
to `demo/measles` again (8.2), and repeat section 4 if a migration changed.

### 8.5 Fast-forward `develop` (**PUSHES**)

```bash
git fetch origin
git merge-base --is-ancestor origin/develop "$TIP" && echo "still a fast-forward" &&
  [[ "$(git rev-parse origin/demo/measles)" == "$TIP" ]] && echo "PR head is the tip" &&
  git push origin "$TIP:refs/heads/develop"
```

**Expect:** both lines print, then a fast-forward push that your
organization admin role lets through the `Develop` ruleset. The push runs
only when both checks pass, and Git still refuses a non-fast-forward push.
**If not:** `develop` moved (stop, catch up, and repeat 8.2 to 8.4), or the
ruleset refused the push: check that you are an organization admin. Never
force-push `develop`.

### 8.6 What to expect

| What | Expect |
| --- | --- |
| The PR | Shows merged, since its head is now on `develop`. **Verify** on the PR page. The repository has `delete_branch_on_merge: true`: **verify** with `git ls-remote origin refs/heads/demo/measles` whether GitHub deleted `demo/measles` when the PR showed merged. Either way nothing is lost: 17.4 deletes it anyway, and its delete then fails harmlessly |
| Vercel | Builds nothing by itself: `vercel.json` sets `git.deploymentEnabled` to false, and Vercel reads it from the pushed commit |
| `staging.yaml` | Runs for the push and deploys staging step by step (9.1) |
| `release-packages.yaml` | Writes changesets for changed `packages/**` and opens a version PR. Nothing is published to npm until that PR is merged, but only when the run finds changesets. With none, its "Create version PR or publish" step publishes every `@avandar/*` version npm does not have yet. Check that step's log: it must say it opened or updated the version PR, and the version PR must stay unmerged (**verify**) |
| `demo.yaml` | Deleted from `develop` by this push |

## 9. Staging

### 9.1 Watch the staging deploy

```bash
sleep 15
[[ -n "$TIP" ]] && export STAGING_RUN_ID="$(gh run list --workflow staging.yaml --branch develop --limit 5 --json databaseId,headSha --jq ".[] | select(.headSha == \"$TIP\") | .databaseId" | head -1)"
[[ -n "$TIP" && -n "$STAGING_RUN_ID" ]] && gh run watch "$STAGING_RUN_ID"
```

If nothing is watched, either `TIP` is unset (re-run 8.1 in this terminal)
or the run for `TIP` has not started yet: wait a minute and run the block
again.

| Order | Job or step | Writes to staging |
| --- | --- | --- |
| 1 | `lint-typecheck`, then `test-quick` (`test-e2e` alongside, not blocking the deploy) | No |
| 2 | `deploy`: Refuse anything but the tip of develop | No |
| 3 | Check the staging configuration: prints `The staging configuration is complete.` | No |
| 4 | Pull the Vercel staging environment, Build the web app for Vercel | No |
| 5 | Apply migrations (`supabase db push --include-all`) | Yes |
| 6 | Set edge function secrets (overwrites staging's hand-set values, `FEATUREBASE_JWT_SECRET` among them) | Yes |
| 7 | Deploy edge functions | Yes |
| 8 | Deploy the prebuilt web app to Vercel (`--environment=staging`) | Yes |

**Expect:** the run succeeds. `ava release` later needs the whole run,
`test-e2e` included, to pass for the commit it releases (11.2).
**If not:** a failure in steps 2 to 4 left staging untouched: fix (5.7 for
a configuration message) and `gh run rerun "$STAGING_RUN_ID" --failed`. A
failure in step 5 is a migration problem: read 11.9 about the public log
first, then stop and raise it. A failure in 6 to 8: fix and re-run failed
jobs.

### 9.2 The 10 migrations applied, and the domain serves the new build

```bash
read_db "$STAGING_DB_URL" "select max(version), count(*) from supabase_migrations.schema_migrations"
read_db "$STAGING_DB_URL" "select version from supabase_migrations.schema_migrations where version in ('20261112000050','20261112201046','20261113022522','20261113154906','20261113181028','20261113232435','20261114213908','20261123200000','20261123200100','20261123200200') order by 1"
read_db "$STAGING_DB_URL" "select to_regclass('public.plugin_installations')"
```

**Expect:** `20261123200200|<the tip's file count>`; the 10 versions: the 7
dictionary and crosswalk files (applied out of order by `--include-all`),
the restore, and the two slot files; then `plugin_installations`. Then open
`https://staging.avandarlabs.com`, sign in, and press Cmd+K: it shows
`0.15.0-dev`.
**If not:** a missing version means `db push` skipped it: read the run's
"Apply migrations" log. An old version in Cmd+K means the domain is on
another Vercel environment (7.1).

Local databases, and the `demo-measles` branch, that ran the slot migrations
under their old names cannot migrate forward: reset them (section 18).

### 9.3 Check `FEATUREBASE_JWT_SECRET` by digest

`supabase secrets list` shows a digest of each value, never the value.
Compare staging's digest with the digest of the source-of-truth value from
your password manager:

```bash
supabase secrets list --project-ref "$STAGING_REF" -o json \
  | jq -r '.[] | select(.name=="FEATUREBASE_JWT_SECRET") | .value'
read -rs FEATUREBASE_VALUE && printf '%s' "$FEATUREBASE_VALUE" | shasum -a 256 | cut -d' ' -f1; unset FEATUREBASE_VALUE
```

**Expect:** the two digests match. **Verify:** the digest is the SHA-256 of
the value in hex.
**If not:** the password manager does not hold GitHub's value. Take the JWT
secret from Featurebase's dashboard, set it on both environments
(`gh secret set FEATUREBASE_JWT_SECRET --env staging`, then `--env
production`), save it in your password manager, and re-run the staging
deploy job. **CHANGES GITHUB SETTINGS.** Only feedback posts' user details
are affected.

### 9.4 Delete the old `AVA_PIPELINE_SERVER_URL` variable on `staging`

`demo.yaml` is gone from `develop`, and nothing reads the variable now.

```bash
git fetch origin && git rev-parse -q --verify origin/develop >/dev/null &&
  [[ -z "$(git grep -l "vars.AVA_PIPELINE_SERVER_URL" origin/develop -- .github/workflows/)" ]] &&
  echo "nothing reads it" &&
  gh variable delete AVA_PIPELINE_SERVER_URL --env staging
```

**Expect:** `nothing reads it`, then the delete. Without that line, nothing
was deleted: `git grep -n "vars.AVA_PIPELINE_SERVER_URL" origin/develop --
.github/workflows/` shows what still reads it. **CHANGES GITHUB
SETTINGS.**

### 9.5 Export the catalog from `demo-measles` (once, reads staging)

The catalog exists only on the `demo-measles` branch of `Avandar Staging`.
It is not persistent, so it pauses when idle. Check it first:

```bash
cd "$REPO"
supabase branches list --project-ref "$STAGING_REF" -o json \
  | jq '.[] | select(.name=="demo-measles") | {name, persistent, preview_project_status}'
```

**Expect:** `"persistent": false` and `"preview_project_status":
"ACTIVE_HEALTHY"`.
**If not:** a paused branch must be unpaused, or made persistent, before
the export and before the Parquet copies (9.6 C10, 12.1). Both write to
staging's configuration: **CHANGES STAGING CONFIGURATION**, yours only.
`supabase branches unpause demo-measles --project-ref "$STAGING_REF"`, then
list again until it reads `ACTIVE_HEALTHY`.

Export:

```bash
export CATALOG_DUMP="$CUTOVER_DIR/catalog/catalog-$(date -u +%Y%m%d-%H%M).sql"
SOURCE_DB_URL="$(supabase branches get demo-measles --project-ref "$STAGING_REF" -o env \
  | sed -n 's/^POSTGRES_URL_NON_POOLING=//p' | tr -d '"')" \
  bash scripts/catalog-move/exportCatalogData.sh "$CATALOG_DUMP"
ls -lh "$CATALOG_DUMP"
shasum -a 256 "$CATALOG_DUMP" | tee "$CATALOG_DUMP.sha256"
```

`SOURCE_DB_URL` is set for that one command only and is never printed. Its
`?connect_timeout` query is fine for the export. `PG_DUMP_BIN` comes from
2.4.

**Expect:** `Wrote ... Rows per table:` and a count per table. The dry run
on 2026-11-24 wrote a 1.2 GB dump with:

| Table | Rows on 2026-11-24 |
| --- | --- |
| `public.data_catalog_drives` | 5 |
| `public.data_catalog_listings` | 199,564 |
| `public.data_catalog_listings__relation_columns` | 734,450 |
| `public.pipeline_executions` | 13 |
| `public.pipeline_execution_scopes` | 25 |
| `public.pipeline_scope_checkpoints` | 6 |

Record today's counts. Small differences are fine if the branch ran a
pipeline since.
**If not:** the export refuses to overwrite a file and refuses a dump with
anything but catalog rows: read its message.

Check the dump for credentials:

```bash
grep -cE 'sb_secret_|sb_publishable_|ey[J]hbGci|service_role' "$CATALOG_DUMP"
grep -n 'password' "$CATALOG_DUMP" | cut -c1-160 | head -20
```

**Expect:** `0`, then about 6 lines, all public dataset text: on 2026-11-24
they were a guest login a public dataset publishes in its own description,
and survey column names such as `share_passwords_pre` and
`share_passwords_post`.
**If not:** any key, token, or JWT, any hit inside a `pipeline_executions`
row, or a password-looking value that is not part of a public dataset's
published metadata: stop and raise it. Do not load the dump anywhere.

What else the 2026-11-24 dump showed, and so what to expect below: every
listing is an `api_resource` listing. No listing links to Supabase Storage,
so the import reports Storage hosts `none` and needs no
`--rewrite-storage-host`. Only 12 listings have `parquet_cache_status =
'ready'`, so the Parquet copy moves the cache objects of those listings and
nothing else. The alpha runbook's expectations of `pipeline_parquet`
listings, a Storage host, and `Rewrote the Storage URLs of <n> listings.`
no longer hold.

Keep `$CATALOG_DUMP` and its `.sha256`: it is also the archive that lets
the branch be deleted (17.3). Set `CATALOG_DUMP` again in every new
terminal: `export CATALOG_DUMP="$(ls -t "$CUTOVER_DIR"/catalog/catalog-2*.sql | head -1)"`.

### 9.6 The catalog load procedure

Run it for staging now, and for production in section 12, only after the
release migrated production. Staging first is the rehearsal of the
production load (D5). Run C1 to C10 in one terminal: each step reads
variables the earlier ones set.

**What `--replace-existing` does.** In one transaction it deletes every row
of the six catalog tables, loads the dump, and recounts
`data_catalog_facet_counts`. Deleting the listings would strip every
workspace dataset added from the catalog of its `datasets__open_data` row,
so the import first deletes those `public.datasets` rows and everything that
cascades from them (their `datasets__open_data` and `dataset_columns` rows,
bindings, and other detail rows). It nulls
`crosswalks.output_dataset_id`, `datasets__virtual.linked_source_dataset_id`,
and `plugin_data_slot_bindings.dataset_id` where they point at a deleted
dataset. It refuses a dataset whose workspace has no members, or any member
outside `@avandarlabs.com`. On production that is 4 datasets, all in your
own single-member test workspaces, linked to the 6 `world-bank__wdi`
listings. Each deleted dataset adds one `usage_analytics_events` row.

**C1. Set the target.** For staging:

```bash
cd "$REPO"
export TARGET_REF="$STAGING_REF" TARGET_DB_URL="$STAGING_DB_URL"
```

For production (section 12): `export TARGET_REF="$PROD_REF"
TARGET_DB_URL="$PROD_DB_URL"`. Then:

```bash
[[ "$TARGET_DB_URL" == *"$TARGET_REF"* && "$TARGET_DB_URL" != *":6543/"* && ( "$TARGET_DB_URL" != *\?* || "$TARGET_DB_URL" == *"?sslmode="* ) ]] && echo "target URL ok"
```

**Expect:** `target URL ok`. The importer accepts the direct host or the
session pooler on 5432, with a percent-encoded password and no query but
`sslmode`. It reads the URL from `TARGET_DB_URL` and refuses one passed as
an argument.

**C2. Read-only target checks.**

```bash
read_db "$TARGET_DB_URL" "select current_user"
read_db "$TARGET_DB_URL" "select c.relname, pg_get_userbyid(c.relowner) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('data_catalog_drives', 'data_catalog_listings', 'data_catalog_listings__relation_columns', 'pipeline_executions', 'pipeline_execution_scopes', 'pipeline_scope_checkpoints', 'data_catalog_facet_counts', 'datasets__open_data') order by 1"
read_db "$TARGET_DB_URL" "select pg_get_userbyid(p.proowner), has_function_privilege(current_user, p.oid, 'execute') from pg_proc p where p.oid = 'public.data_catalog_facet_counts__refresh()'::regprocedure"
read_db "$TARGET_DB_URL" "select count(*) from pg_extension where extname = 'pg_cron'"
read_db "$TARGET_DB_URL" "select o.dataset_id, o.workspace_id, w.slug, d.name from public.datasets__open_data o join public.datasets d on d.id = o.dataset_id join public.workspaces w on w.id = o.workspace_id order by w.slug, d.name" | tee "$CUTOVER_DIR/catalog/$TARGET_REF-open-data-datasets-before.txt"
df -h "${TMPDIR:-/tmp}"
```

**Expect:** `postgres`; 8 tables, all owned by `postgres`; `postgres|t`;
`0` (no scheduled jobs); the open data datasets (production: the 4 WDI
datasets); at least 3 GB free. In the Supabase dashboard, **Project
Settings** > **Compute and Disk**: free disk at least 3 times the dump's
size.
**If not:** another owner: stop. `pg_cron` installed: list `cron.job`, and
if any job touches the catalog, stop and raise it. Run no `ava pipeline run` against the target until
C10 is done.

**C3. Probe `session_replication_role`.** The printed restore (C7) needs it,
and it was verified only on a local stack. This writes nothing:

```bash
with_db_url "$TARGET_DB_URL" "$PSQL_BIN" -X -P pager=off -v ON_ERROR_STOP=1 \
  -c 'begin' -c 'set local session_replication_role = replica' \
  -c 'show session_replication_role' -c 'rollback'
```

**Expect:** `BEGIN`, `SET`, `replica`, `ROLLBACK`.
**If not:** `permission denied to set parameter "session_replication_role"`
means the printed restore cannot run on this project, so the only way back
from a bad catalog import would be a Supabase backup restore. Stop and
decide before importing.

**C4. Dry run** (reads only):

```bash
export DRY_LOG="$CUTOVER_DIR/catalog/dry-run-$TARGET_REF-$(date +%Y%m%d-%H%M).log"
bash scripts/catalog-move/importCatalogData.sh "$CATALOG_DUMP" --replace-existing --dry-run 2>&1 | tee "$DRY_LOG"
```

Before it prints anything after the first lines, the script reads the dump
about 24 times: expect 5 to 10 minutes of silence for a 1.2 GB dump. It
holds no lock on the target meanwhile.

**Expect**, in order: `Target: <user>@<host>, database postgres`; the
dump's rows, equal to the export's; under `Listings in the dump that link
to Supabase Storage, by host:`, `none`; the foreign keys the replace
reaches, with `on delete cascade` and `on delete set null` lines, and `The
replace deletes or changes <N> dependent rows`; for production, under
`Open data datasets the replace deletes`, 4 entries like:

```text
  dataset <id> "World Development Indicators (WDI)" in workspace <id> "<name>"
    members: <your email> (1 of 1 have an @avandarlabs.com email), guard passes
```

and `The @avandarlabs.com guard passes for all 4 open data datasets.`; the
target's row counts; the listing ids a replace drops (production: the 6
WDI listings); `Make the backup with ...` and the `pg_dump` command; the
plan; and `Dry run: nothing was written.` with no `The import would refuse`
after it.
**If not:** a refusal names its reason. `guard fails`, or other datasets,
workspaces, or members than expected: stop and raise it. Never edit a
workspace's members to make the guard pass. A Storage host other than
`none`: the dump is not the one described in 9.5, stop.

Record the confirmations the real run needs:

```bash
export CONFIRM_TARGET="$(sed -n 's/^Target: \(.*\), database postgres$/\1/p' "$DRY_LOG" | head -1)"
export CASCADE_ROWS="$(sed -n 's/.*The replace deletes or changes \([0-9]*\) dependent rows.*/\1/p' "$DRY_LOG" | head -1)"
echo "cascade rows: $CASCADE_ROWS"
```

**C5. Back up the target's catalog** (reads the target). The backup is
required: the import checks that it was made with `pg_dump` in the last 24
hours and matches the target's tables, row counts, and ids. Every re-run of
the import needs a fresh one.

```bash
cd "$CUTOVER_DIR/catalog"
BACKUP_COMMAND="$(grep -m1 '^  with_db_url "\$TARGET_DB_URL" "\$PG_DUMP_BIN" ' "$DRY_LOG" | sed 's/^ *//')"
printf '%s\n' "$BACKUP_COMMAND" | cut -c1-80
eval "$BACKUP_COMMAND"
export BACKUP_FILE="$(ls -t "$CUTOVER_DIR"/catalog/catalog-backup-*.sql | head -1)"
ls -lh "$BACKUP_FILE"
cd "$REPO"
```

**Expect:** the command starts `with_db_url "$TARGET_DB_URL" "$PG_DUMP_BIN"
--data-only`, `pg_dump` finishes without output, and the newest backup file
is non-empty. Do not count its `COPY` lines: the importer checks the rows.

**C6. Get the restore steps, then stop at the prompt** (writes nothing):

```bash
export STEPS_LOG="$CUTOVER_DIR/catalog/restore-steps-$TARGET_REF-$(date +%Y%m%d-%H%M).log"
bash scripts/catalog-move/importCatalogData.sh "$CATALOG_DUMP" \
  --replace-existing --backup-file "$BACKUP_FILE" 2>&1 | tee "$STEPS_LOG"
```

After the same 5 to 10 minutes, it checks the backup, prints `To restore
the backup later:` with three steps, then the plan, then asks `Type
'<user>@<host>' to continue:`. **Press Ctrl-C at that prompt.** Nothing was
written: the import writes only after both confirmations.
**If not:** a backup refusal (`older than 24 hours`, `holds ... rows of
..., but the target holds ...`, `holds other ... ids`) prints the backup
command again: repeat C5, then C6.

**C7. Save the restore files.**

```bash
export RESTORE_DIR="$CUTOVER_DIR/catalog/restore-$TARGET_REF-$(date +%Y%m%d-%H%M)"
mkdir "$RESTORE_DIR" && cd "$RESTORE_DIR"
bash -c "$(grep -m1 '^       awk -v schema=' "$STEPS_LOG" | sed 's/^ *//')"
sed -n '/^       \\set ON_ERROR_STOP on$/,/^       commit;$/s/^       //p' "$STEPS_LOG" > restore.sql
head -1 restore.sql; tail -1 restore.sql; ls -l restore-rows.sql
cd "$REPO"
```

**Expect:** `\set ON_ERROR_STOP on`, then `commit;`, then a non-empty
`restore-rows.sql`. Keep this folder until section 17.

**C8. Foreign key pre-flight** (one read-only transaction). The restore
checks every foreign key of the restored tables before it commits. Run that
check on today's data now:

```bash
cd "$RESTORE_DIR"
sed -n '/^do \$foreign_keys\$$/,/^end \$foreign_keys\$;$/p' restore.sql > foreign-key-check.sql
wc -l < foreign-key-check.sql
with_db_url "$TARGET_DB_URL" "$PSQL_BIN" -X -P pager=off -v ON_ERROR_STOP=1 \
  -c 'begin transaction read only' -f foreign-key-check.sql -c 'rollback'
cd "$REPO"
```

**Expect:** more than 10 lines, then `BEGIN`, `DO`, `ROLLBACK`.
**If not:** `The restore left rows of ... whose (...) match no row of ...`
means today's data would already fail the restore's check, so the restore
could not be used: stop and raise it.

**C9. Import.** **WRITES TO STAGING** for staging. **WRITES TO
PRODUCTION** for production. Run it in a quiet window.

```bash
cd "$REPO"
echo "cascade rows: $CASCADE_ROWS"
bash scripts/catalog-move/importCatalogData.sh "$CATALOG_DUMP" \
  --replace-existing --backup-file "$BACKUP_FILE" \
  --yes-i-know-the-target "$CONFIRM_TARGET" \
  --yes-i-know-the-cascade "$CASCADE_ROWS" \
  2>&1 | tee "$CUTOVER_DIR/catalog/import-$TARGET_REF-$(date +%Y%m%d-%H%M).log"
```

The flags take the place of the two typed confirmations, and the script
refuses either one when it does not match the target. Leave them out to
type them instead. The backup from C5 must still be under 24 hours old.
After the same silent preparation, the import runs as **one transaction**.
Until it commits, it holds whole-table locks on the catalog tables and
`datasets__open_data`: a user adding a catalog dataset waits, and so does
deleting any dataset or workspace. A failure rolls everything back and
leaves the old catalog intact. **Verify:** time the staging run: expect
production to take about as long.

**Expect:** `After the import, the target holds, per table:` with each
catalog table equal to the dump's rows; for production `Open data datasets
the replace deleted that remain, by id: 0 of 4.`; and `Open data datasets
with no open data details now: 0 public.datasets rows in 0 workspaces.`
**If not:** `The import failed and its transaction rolled back: every
catalog count matches the report, and all <n> open data datasets are still
there.` means nothing changed: fix, take a fresh backup (C5), and run
again. `Refusing to delete open data dataset ...` is the guard: stop and
raise it. `The import failed, and the catalog counts or the open data
datasets differ from the report.`: stop and check the target.

```bash
read_db "$TARGET_DB_URL" "select count(*) from public.data_catalog_facet_counts"
read_db "$TARGET_DB_URL" "select count(*) from public.data_catalog_listings"
read_db "$TARGET_DB_URL" "select count(*) from public.datasets d where d.name = 'World Development Indicators (WDI)'"
read_db "$TARGET_DB_URL" "select count(*) from public.pipeline_executions where cli_argv is not null or actor is not null or host is not null"
```

**Expect:** more than 0; the dump's listing count (keep it for C10); `0`
on production; `0`.

**C10. Copy the Parquet objects.** **WRITES TO STAGING** Storage for
staging. **WRITES TO PRODUCTION** Storage for production. The source branch
must be `ACTIVE_HEALTHY` (9.5).

```bash
cd "$REPO"
export SOURCE_REF="$(supabase branches list --project-ref "$STAGING_REF" -o json | jq -r '.[] | select(.name == "demo-measles") | .project_ref')"
[[ -n "$SOURCE_REF" && "$SOURCE_REF" != "$STAGING_REF" && "$SOURCE_REF" != "$PROD_REF" ]] && echo "source ref ok"
read_db "$TARGET_DB_URL" "select count(*) from public.data_catalog_listings where parquet_cache_folder_path like '%world-bank__wdi%' or metadata->>'storage_object_path' like '%world-bank__wdi%'"
export SOURCE_SUPABASE_URL="https://$SOURCE_REF.supabase.co"
export TARGET_SUPABASE_URL="https://$TARGET_REF.supabase.co"
export SOURCE_SECRET_KEY="$(supabase projects api-keys --project-ref "$SOURCE_REF" --reveal -o json | jq -r '[.[] | select(.type == "secret")][0].api_key')"
export TARGET_SECRET_KEY="$(supabase projects api-keys --project-ref "$TARGET_REF" --reveal -o json | jq -r '[.[] | select(.type == "secret")][0].api_key')"
[[ "$SOURCE_SECRET_KEY" == sb_secret_* && "$TARGET_SECRET_KEY" == sb_secret_* ]] &&
  echo "keys ok" &&
  node scripts/catalog-move/copyCatalogParquet/copyCatalogParquet.ts
echo "exit $?"
```

It takes no argument but `--yes-i-know-the-target <host>`, has no dry run,
prints `Source: ... (read only)` and `Target: ...`, and asks you to type
the target host.
**Expect:** `source ref ok`; `0` (no listing uses the legacy WDI paths);
`keys ok`; then `Listings processed <N> of the target's <M>: copied <c>,
already in the target <a>, replaced 0, failed 0.` with `N` equal to `M` and
to C9's listing count, and `exit 0`. It reads every listing and copies the
cache folders of the listings that have one (12 `ready` listings on
2026-11-24), so `c` counts objects, not listings. Run it again: the second
run must copy 0 and replace 0. Then:

```bash
unset SOURCE_SECRET_KEY TARGET_SECRET_KEY
```

**If not:** `source ref ok` missing: **verify** the branch listing's field
name with `supabase branches list --project-ref "$STAGING_REF" -o json | jq '.[0] | keys'`.
`keys ok` missing: a project has no new-style secret key: stop and raise
it. Each failed object is logged with its path: re-run until `failed` is 0.
`The copy processed a different number of listings than the target holds.
Re-run it.` (exit 1): re-run once, and if `N` and `M` still differ, stop.
`The target has no catalog listings` means C9 has not run.

### 9.7 Staging checks

```bash
read_db "$STAGING_DB_URL" "select id, display_name from public.data_catalog_listings where parquet_cache_status = 'ready' limit 1"
read_db "$STAGING_DB_URL" "select id, display_name from public.data_catalog_listings where access_kind = 'api_resource' and parquet_cache_status is distinct from 'ready' limit 1"
```

On `https://staging.avandarlabs.com`, with the browser's network panel
open:

| Check | Pass |
| --- | --- |
| Sign in | Signed in |
| Browse the catalog | Listings and facet counts appear |
| Open the first listing above and preview it, or add it to a test workspace | Data loads. Every Storage request goes to the staging project's host, none to the `demo-measles` branch's |
| Open the second listing above | Its preview loads from its API |
| Install the epidemiology plugin in a test workspace | It installs and its pages open |
| Cmd+K | `0.15.0-dev` |

**If not:** stop before section 10. Production is still untouched.

## 10. Back up production

Do 10.1 now. Run 10.2 and 10.3 from 11.5, while the `deploy` job waits.

### 10.1 Choose the rollback basis (before 11.4)

```bash
supabase backups list --project-ref "$PROD_REF"
```

Option B truncates every `public` and `auth` table on production and loads
them again. It was tested only on a local stack, where `postgres` owns
everything. Check that production's `postgres` may truncate and insert into
each one. Each privilege is tested on its own, since a list of privileges
passes if any one is held:

```bash
read_db "$PROD_DB_URL" "select format('%I.%I',schemaname,tablename) from pg_tables where schemaname in ('public','auth') and not (schemaname='auth' and tablename='schema_migrations') and not (has_table_privilege(format('%I.%I',schemaname,tablename),'TRUNCATE') and has_table_privilege(format('%I.%I',schemaname,tablename),'INSERT'))"
```

**Expect:** no rows.
**If not:** option B is impossible: choose A.

| Option | What it costs | What a restore loses |
| --- | --- | --- |
| **A (recommended if affordable).** Turn PITR on for the cutover window: `Avandar` > **Project Settings** > **Add-ons** > **Point in time recovery**. **WRITES TO PRODUCTION** (project configuration and billing). Turn it off once the release is settled (17.1). | The add-on's price for the days it is on. **Verify** the price, and whether the compute size must grow first. A compute upgrade restarts the database: a short outage, so do it at a quiet hour, well before the release | Only writes after the second you restore to |
| **B.** No PITR. Start 11.4 right after the daily scheduled backup (its time is in `backups list`), and restore with that backup plus the top-up 10.3 tests | Nothing | Writes since the scheduled backup outside `public` and `auth` (for example Storage rows of files uploaded since: the files stay, the app no longer sees them), and every write after 10.2 |

Write the truncate file 14.3 uses after a scheduled-backup restore:

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

### 10.2 Take the backup (reads production)

**When:** while 11.5's `deploy` job waits for your approval. Writes made
between this backup and the migrations are lost if you restore it, so
approve as soon as 10.3 passes.

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
supabase functions list --project-ref "$PROD_REF" -o json | jq -r '.[].slug' | sort > "$D/prod-$BACKUP_T-function-slugs.txt"
```

**Expect:** every file non-empty; `1` for each data file; the backups list
matches 10.1's choice (PITR on, or a scheduled backup minutes old); the
secrets file lists names and digests only.
**If not:** dump again. Keep the source of every edge function secret value
in your password manager: `secrets list` shows digests, and the release
overwrites the values.

### 10.3 Verify the dump restores

In the rehearsal stack. It rehearses option B: an older snapshot stands in
for the scheduled backup, then the top-up replaces every `public` and
`auth` row with this backup's.

```bash
on_rehearsal_stack && supabase db reset --local --no-seed --version 20261013212914
on_rehearsal_stack && export LOCAL_DB_URL="$(supabase status -o json | jq -er '.DB_URL')"
on_rehearsal_stack && [[ "$LOCAL_DB_URL" == postgres*"://"*"@127.0.0.1:"* ]] &&
  with_db_url "$LOCAL_DB_URL" "$PSQL_BIN" -X -P pager=off --single-transaction --set ON_ERROR_STOP=1 \
    --file "$D/prod-rehearsal-roles.sql" \
    --file "$D/prod-rehearsal-data-auth.sql" \
    --file "$D/prod-rehearsal-data-public.sql" &&
  with_db_url "$LOCAL_DB_URL" "$PSQL_BIN" -X -P pager=off --single-transaction --set ON_ERROR_STOP=1 \
    --file "$CUTOVER_DIR/rollback-truncate.sql" \
    --file "$D/prod-$BACKUP_T-data-app.sql" &&
  read_db "$LOCAL_DB_URL" "$COUNTS_SQL"
```

**Expect:** the counts in `prod-$BACKUP_T-counts.txt`.
**If not:** if nothing ran, `on_rehearsal_stack` failed (this terminal is
usually in the `develop` worktree, on the shared stack): nothing ran. Stop,
run 2.4 here, and check that `echo "$REHEARSAL"` prints the rehearsal
worktree. If the reset fails because the rehearsal stack is stopped
(`ava supabase status` says `Local Supabase is not running`), start it only
behind the guard, `on_rehearsal_stack && ava supabase start`, then run the
block again. Otherwise do not approve. Leave the deployment waiting, or **Reject** it
under **Review deployments**. Fix the cause, take the backup again, and
test again. A failure with `cannot truncate a table referenced in a foreign
key constraint` names a table outside `public` and `auth`: never add
`CASCADE`. Raise it, and choose option A. A failure on an `auth` table that
4.5 had to exclude means the local Auth version differs from production's,
and 10.2's `-data-app` dump excludes nothing. Compare the `auth` tables and
columns the dump loads with the local stack's:

```bash
grep '^COPY auth\.' "$D/prod-$BACKUP_T-data-app.sql" | sed 's/ FROM stdin;$//' | LC_ALL=C sort > "$D/auth-tables-dump.txt"
read_db "$LOCAL_DB_URL" "select format('COPY auth.%I (%s)', c.relname, string_agg(format('%I', a.attname), ', ' order by a.attnum)) from pg_class c join pg_namespace n on n.oid = c.relnamespace join pg_attribute a on a.attrelid = c.oid where n.nspname = 'auth' and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped and a.attgenerated = '' group by c.relname order by 1 collate \"C\"" > "$D/auth-tables-local.txt"
diff "$D/auth-tables-dump.txt" "$D/auth-tables-local.txt" && echo "same auth tables"
```

If `same auth tables` does not print, the lists differ: this test cannot
pass here and option B stays untested. Choose option A.

## 11. Release

### 11.1 Build `ava` on `develop`

`ava` is one global symlink to whichever worktree last ran
`pnpm build:ava-cli`. Build it from `develop` after the promotion landed,
never from another worktree.

```bash
cd "$(wt go develop)"
git fetch origin && git status -sb
[[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/develop)" ]] && echo "develop in sync"
pnpm install --frozen-lockfile
pnpm build:ava-cli
readlink "$(dirname "$(which pnpm)")/ava"
ava release --help | head -3
```

Then run the shell setup (2.4) in this worktree.
**Expect:** `## develop...origin/develop`, no changes, `develop in sync`;
the symlink ends in this worktree's `apps/ava-cli/dist/main.cjs`; the help
starts `ava release: publish a new release of the Avandar app.` and says
`main becomes an exact copy of develop`.
**If not:** pull or reset the local `develop` to `origin/develop` first.
An old help text means another worktree's build: rebuild here.

### 11.2 Preconditions

```bash
gh run list --workflow staging.yaml --branch develop --limit 1 --json headSha,status,conclusion
git rev-parse origin/develop
```

Then run 5.6, and confirm 5.1's reviewer, 6.4's pipeline server, 4.8's
audit refresh, and 10.1's choice.
**Expect:** the newest run's `headSha` equals `origin/develop`, with
`completed` and `success`. `ava release` reads the same run: its verdict
covers the whole run, `test-e2e` included.
**If not:** wait for the run, or re-run its failed jobs until it passes:

```bash
git fetch origin && export DEVELOP_SHA="$(git rev-parse origin/develop)"
export STAGING_RERUN_ID="$(gh run list --workflow staging.yaml --branch develop --limit 5 --json databaseId,headSha --jq ".[] | select(.headSha == \"$DEVELOP_SHA\") | .databaseId" | head -1)"
[[ -n "$STAGING_RERUN_ID" ]] && gh run rerun "$STAGING_RERUN_ID" --failed
```

Nothing re-runs when no `staging.yaml` run exists for `origin/develop`'s
commit yet: wait for it to start, then run the block again.

### 11.3 Dry run

```bash
ava release --dry-run --skip-changelog
```

The dry run asks both version questions too (11.4): press Enter twice.
**Expect:** `Dry run: no local or remote state will change.`; under
Preflight, `On develop, clean, in sync with origin/develop.`; the versions
(current on `main`: `0.14.1`, current on `develop`: `0.15.0-dev`); under
CI, `Staging CI passed. (<sha>)`; the plan:

```text
1. develop:  0.15.0-dev to 0.15.0, pushed
2. main:     set to develop@<sha>'s tree, tagged v0.15.0
3. develop:  0.15.0 to 0.15.1-dev, pushed
```

then `Pushing main deploys production and migrates the production
database.` and `Dry run: stopping before tagging and pushing main.` Nothing
changes.

`--skip-changelog` skips the release notes: on 2026-11-24 there were 2,673
non-merge commits from `v0.14.1` to the integration branch, too many for
one generated summary, and a dry run without it makes a real OpenAI call.
The promotion PR is the record. Notes can be published later with
`ava release notes --version 0.15.0`.

### 11.4 Release (**PUSHES** `main`; nothing is written until 11.5)

`ava release` runs on `develop` only. Do not pass `--yes` or
`--skip-ci-check`. With `--yes`, a CI verdict other than a pass (failed,
pending, missing, or unknown) **stops** the release (A2). Without `--yes`
it asks. Overriding a non-passing verdict takes `--skip-ci-check`: never
here.

```bash
ava release --skip-changelog
```

| Prompt or output | Meaning | Answer |
| --- | --- | --- |
| `On develop, clean, in sync with origin/develop.` | Preflight passed | |
| `What version number do you want for this release?` | The release version | Enter for `0.15.0` |
| `Which version should develop move to next?` | The next dev version | Enter for `0.15.1` |
| `Staging CI passed. (<sha>)` | `staging.yaml` passed for the commit being released | |
| A verdict such as `Staging CI did not pass (failure): <url>`, then `Release anyway?` | CI did not pass | `n`. Fix CI (11.2), then run `ava release` again |
| The plan, then `Pushing main deploys production and migrates the production database.`, then `Release 0.15.0?` | Last chance | `y` |

It then commits `Release: v0.15.0 [skip deploy]` on `develop` and pushes it,
builds the `main` commit from that tree, creates the annotated tag
`v0.15.0`, pushes `main` and the tag together, then commits `Bump version
to 0.15.1-dev [skip deploy]` on `develop` and pushes it. `[skip deploy]` is
not a GitHub keyword: each of the two `develop` pushes starts a
`staging.yaml` run. Expect the run for `Release: v0.15.0` to end red at the
deploy job's `Refuse anything but the tip of develop` step (`develop is at
<sha>, this run is for <sha>`): `develop` has already moved on to the
version bump, so the tip check refuses the stale commit before it touches
staging. That is not a failure. The run for `Bump version to 0.15.1-dev` is
the one that redeploys staging and must pass, and `ava release` checked
staging's CI verdict before it pushed anything.

| Release fails at | State | Do |
| --- | --- | --- |
| Before `Setting develop to 0.15.0` | Nothing changed | Fix, run again |
| `Could not push develop` | Nothing released. A local version commit exists | `cd "$(wt go develop)" && git reset --hard origin/develop`, fix the push, run again |
| `Could not push main and v0.15.0` | `develop` is at `0.15.0` and pushed. `main` and the tag are not | Wait for the new `staging.yaml` run to pass, then `cd "$(wt go develop)" && ava release --version 0.15.0 --next 0.15.1 --skip-changelog` |
| `v0.15.0 is released, but develop could not be bumped to 0.15.1-dev` | Released | `cd "$(wt go develop)" && pnpm version 0.15.1-dev --no-git-tag-version && git commit -m "Bump version to 0.15.1-dev [skip deploy]" -- package.json && git push origin HEAD:refs/heads/develop` |

### 11.5 Approve the `deploy` job (**WRITES TO PRODUCTION**: approving starts the migrations)

```bash
sleep 15
git fetch origin && export MAIN_SHA="$(git rev-parse origin/main)"
export RUN_ID="$(gh run list --workflow production.yaml --branch main --limit 5 --json databaseId,headSha --jq ".[] | select(.headSha == \"$MAIN_SHA\") | .databaseId" | head -1)"
[[ -n "$RUN_ID" ]] && echo "$RUN_ID" > "$CUTOVER_DIR/production-run-id-0.15.0" && gh run watch "$RUN_ID"
```

The run id is saved in `$CUTOVER_DIR/production-run-id-0.15.0`, for the
rollback (14.3). The version in the name keeps a later release from
overwriting it. If nothing is watched, the run for the new `main` commit has not
started yet: wait a minute and run the block again.

When `test-quick` passes, the `deploy` job waits for your approval, and
`gh run watch` keeps waiting with it. Press Ctrl-C to stop watching (the
run keeps waiting), then run 10.2 and 10.3 to take the backup and test it. Then, on the run's page: **Review
deployments** > tick `production` > **Approve and deploy**. This approval is
the production write: the job then migrates production without asking
again.

### 11.6 What each step of the `deploy` job does and prints

| Order | Job or step | Touches production | Prints |
| --- | --- | --- | --- |
| 1 | `lint-typecheck`, then `test-quick` (`test-e2e` alongside, not blocking) | No | Test output. These jobs use the `staging` environment's test secrets |
| 2 | `deploy` waits for approval | No | |
| 3 | Refuse anything but the tip of main | No | Nothing on success. Otherwise `main is at <sha>, this run is for <sha>. Re-run the newest main run.` |
| 4 | Check the production configuration | No | `The production configuration is complete.` or one line per problem (5.5) |
| 5 | Pull the Vercel production environment | No | `Sensitive Vercel variables left out of the build:` and their names, or `(none)` |
| 6 | Build the web app for Vercel | No | The Vercel build output |
| 7 | Apply migrations: `supabase link`, then `supabase db push --include-all` | **Yes** | One line per migration it applies, `$PROD_PENDING` of them (80 at the 2026-11-24 tip), in one push |
| 8 | Set edge function secrets | **Yes** | The CLI's confirmation. The values are in a single-quoted file that is deleted at the end of the step |
| 9 | Deploy edge functions | **Yes** | One line per function. Production gains `connectors`, `file-url`, and `geocode`, and possibly `_eval` (**verify** in the log) |
| 10 | Deploy the prebuilt web app to Vercel (`--prod`) | **Yes** | The deployment URL |

**First-deploy behavior.** `production.yaml` also has `workflow_dispatch`,
but its `deploy` job runs only for `refs/heads/main`, and step 3 refuses
anything but the tip of `main`. So re-running an old run refuses, which is
the point: it would deploy older code over newer. The concurrency group
`production-deploy` runs one deploy at a time, never cancels a running one,
and keeps only the newest pending run.

| Fails at | Production | Do |
| --- | --- | --- |
| Steps 1 to 6 | Untouched | Fix the cause (5.7 for a configuration message), then `gh run rerun "$RUN_ID" --failed` on the newest run. Approve again |
| 7, Apply migrations | Partly migrated: each file applies in its own transaction, so the files before the failing one stay applied | Read 11.9 first, then 14.1, row "A migration fails midway" |
| 8 to 10 | Migrated, but the functions or the app are not deployed: the window in 11.8 is open | Fix the cause and re-run the failed jobs of the newest run at once. The migration step is then a no-op |

### 11.7 Check the version

```bash
gh run view "$RUN_ID" --json jobs --jq '.jobs[] | [.name, .conclusion] | @tsv'
read_db "$PROD_DB_URL" "select max(version), count(*) from supabase_migrations.schema_migrations"
```

**Expect:** a line `deploy`, a tab, `success` (the other jobs may still run:
`test-e2e` does not block the deploy and does not decide this check); then
`20261123200200|<the tip's file count>`. Go to section 12, then 13, without
delay.

### 11.8 The migration window

From the start of "Apply migrations" to the end of "Deploy the prebuilt web
app to Vercel", users with the app open run `main`'s old app against the
migrated schema: catalog tables are renamed,
`rpc_datasets__add_open_data_dataset` takes a new parameter, and
`individuals.status` is gone. The app is built before the migrations, so
the window is the migrations, the secrets, the functions, and the Vercel
upload: expect a few minutes. Staging's run measured the last three:

```bash
gh run view "$STAGING_RUN_ID" --json jobs \
  --jq '.jobs[] | select(.name == "deploy") | .steps[] | [.name, .startedAt, .completedAt] | @tsv'
```

Release at a quiet hour. A tab opened before the deploy keeps the old app
until it reloads.

### 11.9 The Actions logs are public

The repository and its Actions logs are public. The project ref is masked
in the Actions logs because `PRODUCTION_PROJECT_ID` is a secret there, but
the ref itself is public elsewhere: the web app's bundle carries it, and so
does 2.4. The Vercel CLI's
output shows the team slug, the project name, and the deployment URL: low
sensitivity, accepted. A failed `supabase db push` can print Postgres error
details, including row data. **If "Apply migrations" fails** on staging or
production, copy what you need from its log into your private notes, then
delete the run's logs: **Actions** > the run > the **...** menu > **Delete
all logs**.

## 12. Load the catalog into production

Only after 11.7 passed: production has no `data_catalog_listings` table
before the release.

### 12.1 Run the load procedure for production

Run 9.6 from C1 with `export TARGET_REF="$PROD_REF"
TARGET_DB_URL="$PROD_DB_URL"`. C9 and C10 are **WRITES TO PRODUCTION**.
Take a fresh backup (C5): the staging one is for staging. Production's dry
run must list exactly the 4 WDI datasets in your 4 single-member test
workspaces, each `guard passes`, and drop the 6 WDI listings.

### 12.2 Check one listing loads from production's Storage

```bash
read_db "$PROD_DB_URL" "select id, display_name from public.data_catalog_listings where parquet_cache_status = 'ready' limit 1"
```

Open it in `https://app.avandarlabs.com`'s catalog and preview it, or add
it to a test workspace, with the network panel open.
**Expect:** the data loads, and every Storage request goes to production's
project host, none to the `demo-measles` branch's. Keep the `demo-measles`
branch until this passes (17.3).

### 12.3 The catalog restore, and its limits

The restore C7 saved is the only quick way back from a bad catalog import.
**WRITES TO PRODUCTION.** Connect as `postgres` through the direct host or
the **session** pooler, never the transaction pooler (port 6543), where
session settings leak between clients. psql must understand `\restrict`
(17.6 or newer):

```bash
cd "$RESTORE_DIR" &&
  [[ "$RESTORE_DIR" == *"/restore-$TARGET_REF-"* && "$TARGET_DB_URL" == *"$TARGET_REF"* ]] &&
  with_db_url "$TARGET_DB_URL" "$PSQL_BIN" -X -P pager=off -v ON_ERROR_STOP=1 --file restore.sql
read_db "$TARGET_DB_URL" "select (select count(*) from public.data_catalog_listings), (select count(*) from public.datasets__open_data), (select count(*) from public.datasets)"
cd "$REPO"
```

The guard runs the restore only when the restore folder (C7 names it
`restore-<ref>-<time>`) and the URL are both the target's. With no psql
output, it refused: check `TARGET_REF`, `TARGET_DB_URL`, and `RESTORE_DIR`.

What it does: in one transaction (`ON_ERROR_STOP` on, `lock_timeout` 10s)
it stages the backup in a `catalog_restore` schema (dropped before commit),
checks the staged row counts equal the backup's, deletes the catalog,
inserts the backed-up rows under `session_replication_role = replica`,
checks every foreign key of the restored tables, and commits. **Expect:** `COMMIT`, and the counts under
`The target holds, per table:` at the top of the import log (the state
before the import).

What it does **not** bring back:

- Columns the replace nulled on rows that still exist:
  `crosswalks.output_dataset_id`,
  `datasets__virtual.linked_source_dataset_id`, and
  `plugin_data_slot_bindings.dataset_id`. Restore them by hand from the
  backup.
- The `usage_analytics_events` rows the deletes added: one per deleted
  dataset stays.
- Datasets users added from the new catalog after the import: the restore
  deletes their `datasets__open_data` rows and leaves those datasets
  orphaned.
- New-catalog writes: Parquet cache state, freshness checks, pipeline
  executions. The backup overwrites them.
- Storage objects. The copied Parquet objects stay.

It is not scoped to what the replace deleted: it restores the **whole**
backed-up tables. Rows users deleted after the import come back, or, when
their parent is gone, the foreign key check rejects the whole restore. So
roll back promptly, or not at all: the window closes as users act.

Run it from the shell where you ran 12.1, so `TARGET_REF`, `RESTORE_DIR`,
and `TARGET_DB_URL` are production's. In a new terminal, run 2.4, then
`export TARGET_REF="$PROD_REF" TARGET_DB_URL="$PROD_DB_URL"`, then
`export RESTORE_DIR="$(ls -dt "$CUTOVER_DIR"/catalog/restore-"$PROD_REF"-* | head -1)"`.

## 13. Smoke test

On `https://app.avandarlabs.com`, as soon as 11.7 and 12 pass:

| Check | Pass |
| --- | --- |
| Sign in with an existing production account | Signed in |
| Open the old dashboards from 4.7 | They render, with data |
| Browse the catalog | The new catalog, with facet counts |
| Run a query on an existing dataset | Results appear |
| Install the epidemiology plugin in one of your test workspaces | It installs and its pages open |
| Cmd+K | Shows `0.15.0` |
| `supabase functions list --project-ref "$PROD_REF"` | Every function shows an update time from this release |

**If not:** section 14.

## 14. Rollback

### 14.1 Decide

| Situation | Do |
| --- | --- |
| `production.yaml` failed before "Apply migrations" | Nothing to roll back. Production is untouched: stop, fix, release again |
| A migration fails midway | Production is partly migrated, and once a rename has applied, the old app is broken. A transient error (network, lock timeout): re-run the failed jobs of the newest run, and `db push` resumes at the first unapplied file. A bug in a migration, or production data it cannot handle: restore (14.3). `db push` stops at the failing file, so a later-timestamped migration cannot get past it. A fix needs a new migration timestamped before the failing file (staging applies it out of order with `--include-all`), a PR, staging's full CI including `test-e2e`, and `ava release`: hours, not one |
| Migrations applied, a later step failed | Re-run the failed jobs of the newest run (11.6). Not a rollback |
| The catalog import is wrong | 12.3, promptly |
| Deployed, with a bug that loses no data | Fix forward: a fix on `develop`, then `ava release` |
| Deployed, and users are losing data, or the app is unusable with no fix in about an hour | Restore (14.3), redeploy `main`'s previous functions (14.4), promote the previous Vercel deployment (14.5) |

There is no partial rollback: the old app does not match the migrated
schema, and the schema cannot be rolled back without the data.

### 14.2 Stop deploys after a restore

So that no push redeploys the new code onto the restored database:

```bash
gh workflow disable production.yaml
```

**CHANGES GITHUB SETTINGS.** Never move `main` back to an older commit:
that push is itself a production deploy.

A disabled workflow does not run on a push, so the fix release would not
deploy. When the fix is ready, enable the workflow right before its
`ava release` (11.4), or enable it afterwards and start the run for the new
`main` by hand (`gh workflow run production.yaml --ref main`), then approve
it as in 11.5. **CHANGES GITHUB SETTINGS.**

```bash
gh workflow enable production.yaml
```

### 14.3 Restore the database (**WRITES TO PRODUCTION**)

The 10.2 dump files load only into an empty database, and production is
not empty after the migrations. So the restore is Supabase's own, as 10.1
chose:

| Option | Loses | How |
| --- | --- | --- |
| A. PITR | Writes after the chosen second | Below |
| B. Scheduled backup, then the top-up 10.3 tested | Writes since the scheduled backup outside `public` and `auth`, and every write after 10.2 | Below |
| C. The 10.2 dumps, into a new project | Every Storage file, Vault secrets, API keys, the JWT secret (every user signed out), the Auth configuration, edge function secrets and functions, all sessions, and every write after 10.2. Then every production setting must point at the new project | Last resort, below |

**In a new terminal**, first run 2.4 (with `PROD_DB_URL`), then recover
the backup's time stamp and the production run's id:

```bash
export BACKUP_T="$(ls -t "$D"/prod-2*-counts.txt | head -1 | sed -E 's#.*/prod-([0-9]{8}-[0-9]{4})-counts\.txt#\1#')"
export RUN_ID="${RUN_ID:-$(cat "$CUTOVER_DIR/production-run-id-0.15.0")}"
echo "backup $BACKUP_T, run $RUN_ID"
```

**Expect:** the time stamp of 10.2's files and the run id 11.5 saved.
14.4 uses both as well.

**A. PITR.** Restore to the second before the **first** attempt's "Apply
migrations" started. A re-run of failed jobs (11.6, 14.1) is a later
attempt, and its "Apply migrations" started after the first attempt's
migrations had applied, so restoring there leaves production partly
migrated:

```bash
RUN_ID="${RUN_ID:-$(cat "$CUTOVER_DIR/production-run-id-0.15.0")}"
STARTED_AT="$(gh run view "$RUN_ID" --attempt 1 --json jobs --jq '.jobs[] | select(.name == "deploy") | .steps[] | select(.name == "Apply migrations" and .conclusion != "skipped") | .startedAt')"
echo "$STARTED_AT"
RESTORE_TO=""
STARTED_EPOCH="$(date -j -u -f '%Y-%m-%dT%H:%M:%SZ' "$STARTED_AT" +%s)" &&
  RESTORE_TO="$(( STARTED_EPOCH - 5 ))" &&
  date -u -r "$RESTORE_TO" &&
  date -r "$RESTORE_TO" '+local %Y%m%d-%H%M%S'
echo "backup taken at local $BACKUP_T"
```

Check the printed time is after the backup in 10.2 (`BACKUP_T` is local
time, so compare it with the `local` line) and after you approved in 11.5:
the job builds the app between the approval and "Apply migrations".
**If not:** an empty `STARTED_AT`, or an error from `date`, means attempt 1
never reached "Apply migrations" (it failed in steps 3 to 6): run the block
again with `--attempt 2`, and so on, and take the first attempt that
prints a time. The restore below uses the `RESTORE_TO` of the last time
the block ran. Run the restore right after the block that printed the time
you chose. Do not re-run the time block in between.

Only when the time is right, restore. **WRITES TO PRODUCTION**:

```bash
[[ "$RESTORE_TO" =~ ^[0-9]{10}$ ]] && supabase backups restore --project-ref "$PROD_REF" --timestamp "$RESTORE_TO"
```

Or **Database** > **Backups** > **Point in time** in the dashboard, at the
same time. **Verify:** `supabase backups restore --help` lists
`--timestamp`.

When the project is back:

```bash
read_db "$PROD_DB_URL" "select max(version), count(*) from supabase_migrations.schema_migrations"
```

**Expect:** `20261013212914|115`, production's state before the release.
**If not:** a later version means the restore point is after a migration
applied: restore again to an earlier second, never later than the time
printed above.

**B. Scheduled backup, then the top-up.** **Database** > **Backups** >
**Scheduled backups** > **Restore** on the newest backup taken before the
migrations. When the project is back, the top-up runs only on the
restored, pre-migration schema:

```bash
[[ "$(read_db "$PROD_DB_URL" "select max(version) from supabase_migrations.schema_migrations")" == 20261013212914 ]] &&
  echo "pre-migration schema" &&
  with_db_url "$PROD_DB_URL" "$PSQL_BIN" -X -P pager=off --single-transaction --set ON_ERROR_STOP=1 \
    --file "$CUTOVER_DIR/rollback-truncate.sql" \
    --file "$D/prod-$BACKUP_T-data-app.sql" &&
  read_db "$PROD_DB_URL" "$COUNTS_SQL"
```

**Expect:** `pre-migration schema`, then the counts in
`prod-$BACKUP_T-counts.txt`.

**C. Into a new, empty project.** The guard refuses production's and
staging's URLs:

```bash
read -rs EMPTY_DB_URL      # the new project's session pooler URI
[[ -n "$EMPTY_DB_URL" && "$EMPTY_DB_URL" != *"$PROD_REF"* && "$EMPTY_DB_URL" != *"$STAGING_REF"* ]] &&
  with_db_url "$EMPTY_DB_URL" "$PSQL_BIN" -X -P pager=off --single-transaction --set ON_ERROR_STOP=1 \
    --file "$D/prod-$BACKUP_T-roles.sql" \
    --file "$D/prod-$BACKUP_T-schema.sql" \
    --command 'SET session_replication_role = replica' \
    --file "$D/prod-$BACKUP_T-data.sql" \
    --file "$D/prod-$BACKUP_T-history-schema.sql" \
    --file "$D/prod-$BACKUP_T-history-data.sql" &&
  read_db "$EMPTY_DB_URL" "$COUNTS_SQL"
```

**Expect:** the counts in `prod-$BACKUP_T-counts.txt`.

### 14.4 Redeploy `main`'s previous functions and secrets (**WRITES TO PRODUCTION**)

A database restore leaves the new functions deployed. From a checkout of
the previous release, deploy its functions, then delete each function the
previous release did not have. The `supabase` function from 2.4 keeps the
2.114.0 CLI: do not change `REPO` here. In a new terminal, first run 2.4
and the `BACKUP_T` line from the top of 14.3.

```bash
ROLLBACK_DIR="$(wt path chore/production-rollback)"
[[ -d "$ROLLBACK_DIR" ]] || ROLLBACK_DIR="$(wt new chore production-rollback v0.14.1)"
cd "$ROLLBACK_DIR" && [[ "$(git rev-parse HEAD)" == "$(git rev-parse 'v0.14.1^{commit}')" ]] && echo "on v0.14.1" &&
  supabase functions deploy --project-ref "$PROD_REF"
```

**Expect:** `on v0.14.1` is printed. **If not:** nothing was deployed.
Stop. Then list what is deployed and what to delete:

```bash
supabase functions list --project-ref "$PROD_REF" -o json | jq -r '.[].slug' | sort > "$D/functions-after-rollback.txt"
comm -13 "$D/prod-$BACKUP_T-function-slugs.txt" "$D/functions-after-rollback.txt" | tee "$D/functions-to-delete.txt"
```

**Expect:** the last command lists only the functions the release added:
`connectors`, `file-url`, `geocode`, and `_eval` if it was deployed. Read
the list, then delete them:

```bash
while read -r slug; do
  supabase functions delete "$slug" --project-ref "$PROD_REF" </dev/null
done < "$D/functions-to-delete.txt"
```

**If not:** a name you do not expect: delete only the four above, one by
one. **Verify:** `jq '.[0] | keys'` on the JSON shows a `slug` field.

Edge function secrets: compare `supabase secrets list --project-ref
"$PROD_REF"` with `prod-$BACKUP_T-edge-secrets.txt`. A changed digest is a
value the release overwrote. Set the old values from your password manager
through a private file, never on the command line:

```bash
umask 077 && touch "$CUTOVER_DIR/restore-secrets.env"   # write NAME='value' lines into it with an editor
supabase secrets set --project-ref "$PROD_REF" --env-file "$CUTOVER_DIR/restore-secrets.env"
rm -P "$CUTOVER_DIR/restore-secrets.env"
```

### 14.5 Promote the previous Vercel deployment (**CHANGES VERCEL**)

Project `avandar` > **Deployments** > filter **Production** > the last
deployment from before the release (made by the Git integration from
`main` at `8bb5b44f3`) > **...** > **Promote** (Vercel may call it
**Instant Rollback**). **Verify:** if Vercel then says automatic production
domain assignment is paused, the next CI production deployment will not
serve `app.avandarlabs.com` until you undo that pause the same way.

### 14.6 The catalog

The catalog has its own restore (12.3), with its limits. A database restore
(14.3) also puts the old catalog back, since it restores everything.

## 15. Remove the Vercel Git integration

Only after both CI deploys were green, meaning both `deploy` jobs
succeeded: staging's (9.1) and production's (11.7).

1. Project `avandar` > **Settings** > **Git** > **Connected Git
   Repository** > **Disconnect**. **CHANGES VERCEL.**

**What stops:** a preview deployment for every branch and pull request, and
any Git-triggered deployment (already off through `vercel.json`). A CI
preview job can be added later. CI deploys are unaffected: they use the
Vercel CLI and a token.

**Confirm nothing builds on the next push.** After the next push to any
branch:

```bash
gh api 'repos/AvandarLabs/avandar/deployments?per_page=10' \
  --jq '.[] | select(.creator.login == "vercel[bot]") | [.environment, .sha[0:9], .created_at] | @tsv' | head -5
```

**Expect:** no entry newer than the disconnect, and Vercel's
**Deployments** list shows only CI deployments.

**To reconnect:** **Settings** > **Git** > **Connect Git Repository** >
GitHub > `AvandarLabs/avandar`. **CHANGES VERCEL.** `vercel.json` still
keeps Git-triggered deployments off, so reconnecting brings back only the
repository link.

## 16. Start the privacy fix (AVA-611)

The crosswalk privacy gap ships with this release (D4): crosswalk layouts
and mappings are readable by every Data Sources viewer, including a
restricted dataset's column names, source columns, and fill rules when it
is alone in its layout. The warning at the top of
[the feature log](pr-feature-log.md) describes it. Start Linear AVA-611
(High) right after the smoke test: a spec and plan of its own, then a
normal PR into `develop` with a new migration, then a release.

### Publish the review backlog

Nothing in this subsection runs until Pablo pastes the prompt below into a
new agent session.

```text
You are publishing the retroactive review backlog for the public repository
AvandarLabs/avandar. Pablo has approved creating public labels, a public
project board, and 140 public issues. Create nothing else.

1. Read docs/reviews/README.md and section 12 of
   docs/measles-demo/production-cutover-plan.md.
2. Confirm the promotion has landed:
   git fetch origin && git merge-base --is-ancestor origin/demo/measles origin/develop
   If that fails, stop and tell Pablo.
3. Work from origin/develop in a new worktree. Pin the commit:
   PIN="$(git rev-parse origin/develop)"
4. Generate the drafts:
   node scripts/reviews/buildRetroReviewIssues/buildRetroReviewIssues.ts \
     --sha "$PIN" --out .temp/retro-review-issues
   Expect 140 JSON files and order.md.
5. Show Pablo order.md and three drafts, one from each tier. Wait for him to
   say go in this session before creating anything on GitHub.
6. Create the labels that do not exist yet: retro-review,
   retro-review:security, retro-review:data, retro-review:ui.
7. Create a public project board named "Retroactive review" under
   AvandarLabs, with a Status field holding: Not reviewed, In review,
   Findings open, Reviewed. If gh lacks the project scope, ask Pablo to run
   gh auth refresh -s project. If the CLI cannot set the Status options,
   give Pablo the click path and wait.
8. Create the issues in order.md's order, one gh issue create per draft,
   with the draft's title, body, and labels. Add each to the board as
   "Not reviewed". Before creating one, search for an open or closed issue
   whose title starts with "Retro review F<n>:" and skip it if found, so a
   second run is safe. Pause one second between issues.
9. Report the number created, the number skipped, the board's URL, and every
   failure with its output. Do not edit code, do not close or change any
   other issue, and do not push.
```

## 17. Cleanup (D6)

Seven days after the smoke test passes, and after the catalog dump is
archived.

### 17.1 Settle the release

| # | Step | Note |
| --- | --- | --- |
| 1 | If 10.1 chose A: turn PITR off | **WRITES TO PRODUCTION** (configuration) |
| 2 | Archive `$CATALOG_DUMP` and its `.sha256` somewhere private and durable: an encrypted drive or private storage you control. Never a GitHub artifact, issue, or the repository | Check the archived copy's SHA-256 against the `.sha256` file |

### 17.2 Retire the demo in Vercel (**CHANGES VERCEL**)

| # | Step |
| --- | --- |
| 1 | **Settings** > **Domains** > `demo.avandarlabs.com` > **Remove**. Then delete its DNS record at the DNS provider for `avandarlabs.com` |
| 2 | **Settings** > **Environments** > `demo` > delete |

### 17.3 Delete the `demo-measles` Supabase branch (**CHANGES STAGING CONFIGURATION**)

Only after 12.2 passed and 17.1 archived the dump. **Irreversible.**

```bash
supabase branches delete demo-measles --project-ref "$STAGING_REF"
```

### 17.4 Retarget feature branches, then delete the branches (**PUSHES**)

GitHub closes a pull request whose base branch is deleted, so retarget
first:

```bash
gh pr list --base demo/measles --state open --json number --jq '.[].number' \
  | while read -r number; do gh pr edit "$number" --base develop; done
gh pr list --base demo/measles --state open
git push origin --delete demo/measles
git ls-remote --exit-code origin refs/heads/chore/production-cutover && git push origin --delete chore/production-cutover
```

The cutover worktree has its own switched stack too
(`chore-production-cutover`). Undo it before removing the worktree:

```bash
cd "$(wt path chore/production-cutover)" && ava supabase restore &&
  ava supabase status | grep -m1 -E "switched local|develop local"
```

**Expect:** `This branch is back on the develop local Supabase. Its env
files are restored.`, then a status line that reads `This is the develop
local Supabase (avandar). Branch chore/production-cutover uses it.`
`ava supabase restore` deletes only this branch's own local project and its
data, never the shared `avandar` stack.
**If not:** an error from `ava supabase restore` names what it could not
clean up: follow it, and do not remove the worktree until the status line
reads as above. Then:

```bash
cd "$(wt rm chore/production-cutover)"
```

Each retargeted branch merges `develop` and passes `pr-develop.yaml` before
it merges. Then clean up locally:

| # | Step |
| --- | --- |
| 1 | In the rehearsal worktree: `ava supabase restore`, then `wt rm chore/production-rehearsal`. This deletes its local stack and the production copy in it |
| 2 | `wt rm chore/production-rollback`, if 14.4 created it |
| 3 | Reset every local database built before the slot migrations were renamed (section 18) |

### 17.5 Optional: delete the legacy WDI Parquet objects

The 4 WDI datasets the production import deleted read Parquet objects in
bucket `opendata` under `world-bank__wdi/datasets/` (6 objects on
2026-11-20). Nothing uses them now. Check and back them up first (reads
production):

```bash
read_db "$PROD_DB_URL" "select count(*) from public.data_catalog_listings where parquet_cache_folder_path like '%world-bank__wdi%' or metadata->>'storage_object_path' like '%world-bank__wdi%'"
WDI_BACKUP="$CUTOVER_DIR/storage/wdi-legacy" && mkdir -p "$WDI_BACKUP"
read_db "$PROD_DB_URL" "select substr(name, length('world-bank__wdi/datasets/') + 1), metadata->>'size', metadata->>'mimetype', metadata->>'cacheControl' from storage.objects where bucket_id = 'opendata' and name like 'world-bank\_\_wdi/datasets/%' order by name" | tee "$WDI_BACKUP/objects.txt"
while IFS='|' read -r file size mimetype cache_control; do
  supabase storage cp "ss:///opendata/world-bank__wdi/datasets/$file" "$WDI_BACKUP/$file" \
    --project-ref "$PROD_REF" --experimental </dev/null || echo "FAILED $file"
done < "$WDI_BACKUP/objects.txt"
ls -l "$WDI_BACKUP"
```

**Expect:** `0`; the object list; no `FAILED` line; and a backup file for
each object, of the listed size. Then delete them, **WRITES TO
PRODUCTION**. `supabase storage rm` may ask you to confirm: read the names
it lists. Never add `--yes`:

```bash
cut -d'|' -f1 "$WDI_BACKUP/objects.txt" | sed 's#^#ss:///opendata/world-bank__wdi/datasets/#' \
  | xargs -o "$REPO/node_modules/.bin/supabase" storage rm --project-ref "$PROD_REF" --experimental
read_db "$PROD_DB_URL" "select count(*) from storage.objects where bucket_id = 'opendata' and name like 'world-bank\_\_wdi/datasets/%'"
```

**Expect:** `0`. To restore (**WRITES TO PRODUCTION**):

```bash
while IFS='|' read -r file size mimetype cache_control; do
  supabase storage cp "$WDI_BACKUP/$file" "ss:///opendata/world-bank__wdi/datasets/$file" \
    --content-type "$mimetype" --cache-control "$cache_control" \
    --project-ref "$PROD_REF" --experimental </dev/null
done < "$WDI_BACKUP/objects.txt"
```

The delete line names the CLI binary directly, since `xargs` cannot run the
2.4 shell function, and `-o` keeps the terminal attached for the
confirmation prompt.

### 17.6 Delete the cutover files

`rm -rf "$CUTOVER_DIR"` once 17.1 archived the catalog dump and Supabase's
own backups cover the post-cutover state. It holds every production dump,
the catalog backups, the restore folders, and the logs.

## 18. Known gaps

| Gap | State |
| --- | --- |
| Migration audit refresh | Deferred (Task 17): an agent session given read-only URLs runs it when Pablo chooses. The rehearsal is the primary check for production's files, but nothing rehearses staging's 10 out-of-order files. The refresh and the live read-only checks in 4.8 must be done before step 3 of section 1 (the promotion). A blocker found after 8.5 can only be fixed forward |
| Migration counts | `develop` gained `20261105212729_add_rpc_workspaces__is_slug_available.sql` after planning, and the integration branch merged it on 2026-11-24: the tree now holds 195 files, production applies 80, and staging 10, one more file for production and the tree than the plan counted on 2026-11-23. The runbook computes them (`$PROD_PENDING`, `$TREE_COUNT`, 4.1). Staging's 10 files assume its CI already applied that file (4.8 checks it) |
| Quick suite flake | `ReferenceError: window is not defined` from `plugins/epidemiology/src/RegressionModal/RegressionModal.test.tsx` fails the quick suite now and then: Mantine 9.2.0's `Button` loader timer fires after jsdom's teardown under full-suite load. Not a regression. Re-run the quick suite once |
| Crosswalk privacy gap (AVA-611) | Ships with the release (D4). Fixed forward (section 16) |
| `db:validate-migrations` check 3 | Fails by design on the 7 dictionary and crosswalk files, which sort before `develop`'s newest file. It runs in no CI job or hook, and clears once the promotion lands |
| Local databases and the `demo-measles` branch | Any built before the slot migrations were renamed already ran them under their old names, and cannot migrate forward. Reset local stacks (`pnpm db:reset` on a switched stack). The branch is deleted in 17.3 |
| Desktop app `metadata.sqlite` | Files created from `demo/measles` or `develop` before the regeneration stop with `migration history mismatch`. Delete them. The desktop app is private, at version 0.0.0 |
| Five French `.po` entries | Came from `develop` with corrupted control characters. Out of scope for the cutover |
| The `staging` GitHub environment | No branch policy, so any branch's workflow can read its tokens. A `develop`-only policy would break `production.yaml`'s test jobs (5.2). A3's protection covers only the database and the secrets of the `production` environment: with the shared `VERCEL_TOKEN` (7.5), any branch's workflow can run `vercel deploy --prod`, and if staging's `SUPABASE_ACCESS_TOKEN` belongs to an account that can reach `Avandar`, any branch's workflow can reach production too. Pablo's decision in 5.2: accept for now, or narrow the staging tokens |
| Environments restrict branches, not workflows | Any workflow on `main`, including one added through `develop`, can use `production` once it is on `main`. The required reviewer is the stop |
| Test jobs on `main` | `production.yaml`'s `test-quick` and `test-e2e` read the `staging` environment's secrets |
| Catalog restore | Restores whole tables and leaves the gaps listed in 12.3. `session_replication_role` was verified on a local stack only: 9.6 C3 probes each project |
| Catalog script messages | `importCatalogData.sh` calls the `with_db_url` helper "the cutover runbook's ... (1.4)": in this runbook it is 2.4 |
| `[skip deploy]` | Not a GitHub keyword: each release commit on `develop` starts a `staging.yaml` run |
| Release notes | `--skip-changelog` for `0.15.0`: 2,673 non-merge commits since `v0.14.1` on 2026-11-24 |
| `test-e2e` | Never blocks a deploy, but it does decide the run's verdict that `ava release` reads |
| Pull request previews | Stop with the Git integration (section 15). A CI preview job is a later choice |
| `demo.avandarlabs.com` | Frozen at its last build until 17.2 |
| [The pipeline server runbook](pipeline-server-fly-runbook.md) | Still says production's edge secrets are set by hand. CI sets them now |
| Public Actions logs | A failed `supabase db push` can print row data (11.9). The Vercel CLI prints the team slug, project name, and deployment URL |
| `ava` | One global symlink: whoever last ran `pnpm build:ava-cli` decides which code `ava release` runs (11.1) |
