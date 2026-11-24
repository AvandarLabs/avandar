# Production cutover runbook

How Pablo promotes `demo/measles` into `develop`, releases `develop` to
`main` as `0.15.0`, and moves the open data catalog. Production is
`app.avandarlabs.com` on the Supabase project `Avandar`. Staging is
`staging.avandarlabs.com` on `Avandar Staging`. Written 2026-11-24 from
[the cutover plan](production-cutover-plan.md) and
[the implementation plan](../superpowers/plans/2026-11-23-production-cutover.md).
It replaces [the superseded alpha cutover runbook](alpha-cutover-runbook.md):
there is no alpha line, no alpha branch, and no extra Vercel environment.

**How to use this runbook.** Work through the checklist in section 1 from
top to bottom. Before the first step, read section 2: it says which
terminal and which browser page each step uses ("Where to run things"), how
every step is laid out ("How to read a step"), and what to paste into a new
terminal (2.4). Steps that change something outside your laptop carry a
bold mark: **WRITES TO PRODUCTION**, **WRITES TO STAGING**, **CHANGES
STAGING CONFIGURATION**, **CHANGES VERCEL**, **CHANGES GITHUB SETTINGS**,
**CHANGES GOOGLE CLOUD CONSOLE**, or **PUSHES**. A step
without a mark only reads. **Verify** marks a claim that could not be
checked from the repository when this was written: do the read-only check
it describes before you rely on the claim.

The repository and its GitHub Actions logs are public. Secret values,
connection strings, and anything about a user never go into a file, an
issue, a chat, or a log. This runbook names secrets by their variable names
only, and says for each one where you get the value (2.4, 6.4, and 6.6).

**This cutover changes no CI/CD (M1).** The web app deploys through
Vercel's Git integration, as it does today: a push to `develop` deploys
staging and a push to `main` deploys production, built with the variables
already set in Vercel. `develop`'s existing `staging.yaml` and
`production.yaml` migrate the two databases and deploy the edge functions,
and nothing is added to GitHub or changed in Vercel.

**Where secrets live (L1).** Secrets stay where they are today: GitHub
(what the CI jobs themselves need), Vercel (the web app's build variables),
Fly.io (the pipeline server), and each Supabase project's edge function
secrets (set by hand, never by CI). Moving the deploys into CI and
managing every secret in GitHub are follow-up work (section 16).

## 1. Day-of checklist

The steps follow stage G of [the cutover plan](production-cutover-plan.md),
section 11. Each row is one sitting: do its sections in the order listed,
and do not start the next row while the "Stop if" column of this row is
true. The "Touches production" column says whether the row can change
production at all.

| Step | What | Sections | Touches production | Stop if |
| --- | --- | --- | --- | --- |
| 0 | Tools, shell setup, rules | 2 | No | A tool version differs from 2.3 |
| 1 | Announce the freeze. Rehearse on a local copy of production | 3, 4 | Reads (a dump) | Any row of 4.9 fails |
| 2 | Check that the GitHub `production` environment still has its protection and its three secrets (read-only: nothing is added to GitHub). Third parties, including the missing edge function secrets on staging, and on production now or before 11.4 (6.6, recommended, not blocking). Vercel needs nothing (7) | 5, 6, 7 | Only if you set production's edge function secrets now (6.6): **WRITES TO PRODUCTION** (configuration, no data). Also **CHANGES STAGING CONFIGURATION** (6.6), and **CHANGES GOOGLE CLOUD CONSOLE** only if 6.2 finds a redirect URI missing | 5.1 or 5.6 shows a missing protection rule or a missing name |
| 3 | Push the integration branch to `demo/measles`. Open the PR into `develop` | 8.1 to 8.4 | No. **PUSHES** | 4.8 is not done, or `pr-develop.yaml` fails |
| 4 | Fast-forward `develop`. Vercel deploys the staging app, and `staging.yaml` migrates staging and deploys its edge functions | 8.5, 8.6, 9.1, 9.2 | No. **PUSHES**, **WRITES TO STAGING** through Vercel and CI | Staging's `migrate` job fails at `supabase db push` (9.1). A functions deploy that fails with `Module not found` is the known flake: re-run it (9.1) |
| 5 | Load the catalog into staging. Check staging | 9.5 to 9.7 | No. **WRITES TO STAGING** | The staging import or restore check fails |
| 6 | Choose the rollback basis, back up production, and test the backup (10.1 to 10.3). Then release `0.15.0` with `ava release` (11.1 to 11.4): the push to `main` makes Vercel deploy the new app to production. When `production.yaml`'s `migrate` job waits for approval, approve it at once (11.5) | 10, 11 | **WRITES TO PRODUCTION**: the app through Vercel from the push in 11.4, the database and edge functions through CI from the approval in 11.5 | 10.3's restore test fails: do not release |
| 7 | Load the catalog into production. Smoke test | 12, 13 | **WRITES TO PRODUCTION** | Anything in 13 fails: section 14 |
| 8 | Start the privacy fix. Publish the review backlog when ready. Narrow the staging tokens (section 16, Narrow the staging tokens). Plan the CI deploy and secrets follow-up (section 16, Move deploys to CI and manage secrets in GitHub). Clean up seven days after the smoke test. Vercel's Git integration stays connected (15) | 16, 17 | 17 deletes the demo resources | |

**The migration audit refresh is still pending** (4.8). It must be done
before step 3, the promotion. The reason: the push in 8.5 makes the
`staging.yaml` workflow apply staging's 11 pending migration files, 8 of
them out of order, automatically, and nothing rehearses those files first.
A blocker found after 8.5 can only be fixed forward, with a new migration.
Rollback is section 14. Until the push to `main` in 11.4, production's app
and database are untouched (6.6 and 10.1 may add configuration only): you
can stop at any point before that and nothing needs undoing. From 11.4 on,
Vercel serves the new app on production, and from your approval in 11.5
the `migrate` job writes to the database.

## 2. Before you start

**Where to run things.** The runbook uses a few terminals and a few
browser sites. Each step says which one. The terminals:

| Terminal or place | Directory | When you use it | Paste first |
| --- | --- | --- | --- |
| **The cutover terminal** | The cutover worktree: `cd "$(wt go chore/production-cutover)"` (on Pablo's laptop, `~/src/worktrees/avandar/chore/production-cutover`). Some blocks `cd` it elsewhere (4.1 into the rehearsal worktree, 3.3 into `develop`, 8.1 back): that is expected, because every block that needs a particular directory starts with its own `cd` | Sections 2 to 10 | 2.4 setup, all three parts |
| **The app terminal** | The rehearsal worktree: `cd "$(wt path chore/production-rehearsal)"` | 4.7 only. It runs `pnpm dev`, which keeps running | Nothing |
| **The develop terminal** | A new terminal. 11.1's first line, `cd "$(wt go develop)"`, puts it in the `develop` worktree | 11.1 to 13 | 11.1's block, then 2.4 setup parts 1 and 2 |
| **The rollback terminal** | A new terminal in the `develop` worktree: `cd "$(wt go develop)"` | Section 14, only if you roll back | 2.4 setup parts 1 and 2 |
| **The cleanup terminal** | A new terminal in the `develop` worktree: `cd "$(wt go develop)"` | Section 17, seven days later | 2.4 setup parts 1 and 2 |
| **A new agent session** | Any | Section 16's backlog prompt | Nothing: the prompt is self-contained |

**2.4 setup** means the three parts of 2.4, pasted in order into a terminal
that is already in the directory the table names: part 1 (the setup
block), part 2 (production's connection string, `PROD_DB_URL`), and part 3
(staging's connection string, `STAGING_DB_URL`). Shell variables live only
in the terminal that set them, so a new terminal starts with none of them.

The browser sites, each signed in with an account that has admin rights:

| Site | What it is called below | Used in |
| --- | --- | --- |
| `supabase.com/dashboard`, projects `Avandar` (production) and `Avandar Staging` | The Supabase dashboard | 2.4, 6.1, 6.5, 9.6 C2, 10.1, 14.3 |
| `github.com/AvandarLabs/avandar` | GitHub | 5, 9.1, 11.5, 11.9 |
| `vercel.com`, team `avandar`, project `avandar` | The Vercel dashboard | 7 (optional), 9.2, 14.5, 17.2 |
| `console.cloud.google.com` | The Google Cloud console | 6.2 |
| `myprojects.geoapify.com` | The Geoapify dashboard | 6.6 |
| `staging.avandarlabs.com`, `app.avandarlabs.com` | The staging app, the production app | 9.2, 9.7, 12.2, 13 |

**How to read a step.** Most steps follow the same pattern:

- **Where:** the terminal or browser page from the tables above. When a
  step does not say, it runs in the same terminal as the step before it.
- **Do:** a command block to paste, or a click path. A click path is
  written `Site > page > button`, with each label in bold as the site
  shows it. Where a label could not be checked, the step says the label
  may read slightly differently, or marks it **Verify**.
- **Expect:** what you should see when the step worked.
- **If not:** what the other outcomes mean and what to do next. "Stop"
  means do not go on to the next step: production's app and database are
  untouched until the push to `main` in 11.4, so stopping before then is
  always safe.

A bold mark such as **WRITES TO PRODUCTION** means that step changes
something outside your laptop (the full list is at the top of this
runbook). Numbers such as "4.8" or "9.6 C5" point to that subsection or
that lettered step of this runbook. Paste a command block whole, unless the
step says to run its lines one at a time.

### 2.1 Read first

- [The cutover plan](production-cutover-plan.md): decisions D1 to D7, A2,
  A3, K1, L1, and M1. M1: this cutover changes no CI/CD. D2 (CI deploys
  everything, with no Vercel Git integration) is deferred until after the
  cutover (M1). E1 is not used in this cutover: Vercel's Git integration
  deploys staging, as today. A3 is already in place (5.1 checks it). H1
  no longer applies: it chose which `FEATUREBASE_JWT_SECRET` value CI would
  write to staging, and under L1 CI writes no edge function secret.
- [The migration audit](alpha-migration-audit.md), dated 2026-11-19. It
  covers 76 files and found no blocker. **Its refresh for production's
  current set and staging's 11 files has not been done** (4.8). It must be
  done before the promotion (step 3).
- The privacy gap at the top of [the feature log](pr-feature-log.md):
  crosswalk layouts and mappings are readable by every Data Sources viewer.
  It ships with this release (D4) and is fixed forward as Linear AVA-611
  (section 16).

### 2.2 Prerequisites

**Where:** the cutover terminal. Run each command in the table and compare
its output with the last column. Run the Supabase row after 2.4 part 1,
since it needs the `supabase` function that part defines.

| Check | Command | Expect |
| --- | --- | --- |
| Docker is running (`supabase db dump` runs `pg_dump` in a container) | `docker info --format '{{.ServerVersion}}'` | A version number |
| `gh` can push, as an organization admin | `gh api repos/AvandarLabs/avandar --jq .permissions.admin` | `true` |
| The Supabase CLI is logged in (after 2.4) | `supabase projects list` | `Avandar` and `Avandar Staging` listed |
| `jq` is installed | `jq --version` | A version |
| Node matches `engines` | `node --version` | `v24.x` |
| Free space for the catalog import's temporary copies | `df -h "${TMPDIR:-/tmp}"` | At least 3 GB available (the import needs about 2.6 GB) |

**If not:** start Docker Desktop for the Docker row. For `gh`, run
`gh auth login` and sign in as an organization admin. For the Supabase
row, run `supabase login` after 2.4 part 1: it opens the browser and
stores a personal access token on this laptop only (the next paragraph
says what that token is). Install `jq` with `brew install jq`. Install
Node 24 with the version manager you use for this repository.

**The Supabase access token, for the CLI.** `supabase login` creates a
personal access token (a string that starts `sbp_`) for your account and
saves it on this laptop. You never copy it by hand. Every token the
dashboard lists is under Supabase dashboard > your avatar > **Account
preferences** > **Access Tokens** (the labels may read slightly
differently). A new token does not break any existing one, so logging in
again is safe. It reaches every project your account can reach, production
included, so it never leaves this laptop. The GitHub secret
`SUPABASE_ACCESS_TOKEN` is a separate token that already exists (5.1).

### 2.3 Tools

These are the versions the steps were tested with. 2.4 part 1 prints the
first three, so you check them there.

| Tool | Version | How |
| --- | --- | --- |
| `supabase` | 2.114.0, the repository's pinned CLI | The `supabase` function in 2.4 runs `node_modules/.bin/supabase`. The Homebrew one on `PATH` may be older: do not use it. |
| `pg_dump` | 17.6 or newer | `brew install postgresql@17`. The formula is keg-only: `"$(brew --prefix postgresql@17)/bin/pg_dump" --version` prints 17.12 on 2026-11-24. The default `pg_dump` and `psql` on `PATH` are 14, too old. |
| `psql` | 17.6 or newer, or 18 | The same keg: `"$(brew --prefix postgresql@17)/bin/psql" --version`. It must understand the `\restrict` lines newer `pg_dump` writes, and `importCatalogData.sh` refuses anything older than 15.14, 16.10, 17.6, or 18. psql 17.12 from `postgresql@17` works. So does `/opt/homebrew/opt/libpq@18/bin/psql` (18.6), which the restore checks were run with. Verify with `--version`. |
| `gh` | Logged in, admin on the repository | `gh auth status` |
| `ava` | Built from `develop` in 11.1 | `pnpm build:ava-cli` links one global `ava` to whichever worktree last ran it |

### 2.4 Shell setup (every new terminal)

**Where:** every new terminal, after you `cd` into the directory "Where to
run things" names for it: the cutover worktree until 11.1, then the
`develop` worktree. The setup records the directory you are in as `REPO`
(`export REPO="$PWD"`), and every `supabase` command then runs the CLI
installed in that worktree. Pasted in the wrong directory, it points
`supabase` at a copy that may not exist.

It has three parts. Paste them in order. Part 3 is needed only in the
cutover terminal.

**Part 1: the setup block.** Paste it whole:

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
# Auth tables the data dump (4.2) leaves out. Four exist only in production's
# Auth version, so loading them fails on the local stack. auth.saml_providers
# exists locally but lacks production's dedicated_scope column. All five held
# 0 rows on 2026-11-24, and the rehearsal does not need them.
AUTH_SEED_EXCLUDES=(-x auth.sessions -x auth.refresh_tokens -x auth.one_time_tokens -x auth.flow_state -x auth.audit_log_entries -x auth.mfa_amr_claims -x auth.mfa_recovery_code_sets -x auth.mfa_recovery_codes -x auth.scim_tokens -x auth.scim_users -x auth.saml_providers)
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
env | grep -E '^PG(HOST|HOSTADDR|PORT|DATABASE|USER|PASSWORD|PASSFILE|SERVICE|SERVICEFILE|SYSCONFDIR|OPTIONS|TARGETSESSIONATTRS|SSLMODE|REQUIRESSL)=' || echo "no PG variables"
supabase projects list -o json | jq -r '.[] | [.name, (.ref // .id)] | @tsv'
```

What it does: defines `supabase` as the repository's pinned CLI; points
`PSQL_BIN` and `PG_DUMP_BIN` at the Postgres 17 tools; sets the two project
refs (a project's ref is its 20-letter ID, the part before `.supabase.co`
in its URL, and is not secret); creates the private folder
`~/avandar-cutover` (`CUTOVER_DIR`) with `dumps` and `catalog` inside it;
clears every `PG*` variable; defines the helpers described below; then
prints the tool versions and your Supabase projects.

**Expect:** the last lines print `2.114.0` (the CLI), then psql and pg_dump
17.6 or newer (17.12 on 2026-11-24), then `no PG variables`, then one line
per project with the two refs above next to `Avandar` and `Avandar
Staging`.
**If not:** a missing or different CLI version means this worktree has no
`node_modules`: run `pnpm install --frozen-lockfile` here, then paste part 1
again. A line other than `no PG variables` means a `PG*` variable is set
by your shell profile: open a new terminal and remove it from the profile
first. No project list means the CLI is not logged in: run `supabase
login` (2.2). If a ref differs from the one above, stop: you would be
pointing every step at the wrong project.

The helpers part 1 defines, used throughout:

- `read_db "<url>" "<sql>"` runs one query in a read-only transaction and
  prints each row as values separated by `|`, for example
  `postgres|20261013212914|115`. It cannot write.
- `with_db_url "<url>" <command> ...` runs `psql` or `pg_dump` against a
  database without the password appearing in the process list (`ps`): it
  takes the password out of the URL and hands it over in `PGPASSWORD`. If
  it says `cannot split the password out of the URL`, the password in the
  URL is not percent-encoded: redo part 2 or 3, which encodes it for you.
  The catalog scripts print commands that call "the cutover runbook's
  `with_db_url` helper (1.4)". That is this helper, in 2.4.
- `on_rehearsal_stack` moves into the rehearsal worktree (4.1) and
  succeeds only when that worktree runs its own local Supabase stack. Every
  reset and load in sections 4 and 10 runs behind it, so none of them can
  touch the shared local stack other worktrees use.

**Part 2: production's connection string (`PROD_DB_URL`).** Every step
that reads production, and the production catalog load, connects through
this one variable.

*Where to get the two values you need.* The connection string has two
pieces, and they come from different places:

1. **The URI, with a placeholder for the password.** In the browser:
   Supabase dashboard > project **Avandar** > the **Connect** button at the
   top of the project page. In the dialog, choose the **Session pooler**
   connection (the dialog may show it as a third box after **Direct
   connection** and **Transaction pooler**, or as a **Method** menu: the
   labels may read slightly differently), and copy its URI. It has the
   shape `postgresql://postgres.<ref>:[YOUR-PASSWORD]@<pooler host>:5432/postgres`.
   The text `[YOUR-PASSWORD]` is a literal placeholder: leave it in. The
   dashboard never shows the database password. If the URI you copied has
   no `[YOUR-PASSWORD]` in it, copy it again from the **Session pooler**
   entry.
2. **The database password.** It is the password set when the project was
   created (or last reset), and it lives in your password manager: look for
   the production Supabase database password. The GitHub secret
   `PRODUCTION_DB_PASSWORD` holds the same value, but GitHub never displays
   a secret after it is saved, so you cannot copy it from there. If the
   password is lost, the only way to get one is Supabase dashboard >
   **Avandar** > **Project Settings** > **Database** > **Reset database
   password**. That is **WRITES TO PRODUCTION**: it immediately breaks
   everything that connects with the old password, including
   `production.yaml`'s migration step, until you also update the GitHub
   secret (`gh secret set PRODUCTION_DB_PASSWORD --env production`, **CHANGES
   GITHUB SETTINGS**). Avoid it unless the password is truly gone, and save
   the new one in the password manager at once.

**Use the session pooler, port 5432, never port 6543.** Port 6543 is the
transaction pooler. It hands each transaction to whichever server
connection is free, so a setting one script makes for its session (the
catalog restore's `session_replication_role`, for example) can leak into
another client's queries. The session pooler keeps one server connection
per client. Check that the port in the URI you copied is `5432`.

*Then, in the terminal,* run these three blocks one at a time. Each one
ends with a `read` that waits for you to type or paste a value, so pasting
them all at once would feed the next lines to `read` instead.

Block 1. Paste it, press Enter, then paste the database password from your
password manager and press Enter. Nothing is shown while you paste, and
that is expected:

```bash
read -rs DBPW                                     # type or paste the password, press Enter (nothing is echoed)
```

Block 2. The first line percent-encodes the password into `ENC` and forgets
the plain copy, so characters such as `@ : / # ? & %` cannot break the
URL. The second line waits: paste the URI you copied from the dashboard,
the one with `[YOUR-PASSWORD]` in it, and press Enter. The URI holds only
the placeholder, not the password, so it is safe for it to show on screen:

```bash
ENC="$(jq -rn --arg p "$DBPW" '$p|@uri')"; unset DBPW
read -r URI_TEMPLATE                              # paste the copied URI, press Enter
```

Block 3. The first line puts the encoded password in place of
`[YOUR-PASSWORD]`, exports the result as `PROD_DB_URL`, and forgets the
pieces. The check after it looks only at the shape of the URL: user
`postgres.<production ref>`, a password, port `5432`, database `postgres`.
Only when the shape is right does it run one read-only query on production:

```bash
export PROD_DB_URL="${URI_TEMPLATE/\[YOUR-PASSWORD\]/$ENC}"; unset URI_TEMPLATE ENC
[[ "$PROD_DB_URL" == postgres*"://postgres.$PROD_REF:"*"@"*":5432/postgres"* ]] &&
  echo "PROD_DB_URL looks right" &&
  read_db "$PROD_DB_URL" "select current_user, max(version), count(*) from supabase_migrations.schema_migrations"
```

**Expect:** `PROD_DB_URL looks right`, then `postgres|20261013212914|115`
before the release. That is the user you connected as, the newest migration
production has applied, and how many it has applied.
**If not:** no `PROD_DB_URL looks right` means the URI is not production's
session pooler URI: check the ref and the port, and redo the three blocks.
`password authentication failed` means the password is wrong: redo the
three blocks with the right one. A different version or count means
production moved since the audit: stop, and redo 4.8 before going on.

`jq` sees the password in its arguments for a fraction of a second, and
`supabase db dump --db-url` (2.5) sees the whole URL for as long as it
runs. Both are why the cutover runs on a laptop only you are logged in to.

**Part 3: staging's connection string (`STAGING_DB_URL`).** Only the
cutover terminal needs it. The same three blocks, with staging's values:

- The URI: Supabase dashboard > project **Avandar Staging** > **Connect** >
  **Session pooler**, port 5432, with `[YOUR-PASSWORD]` in it.
- The password: staging's database password, in your password manager. The
  GitHub secret `STAGING_DB_PASSWORD` holds the same value and cannot be
  displayed. Resetting it (**Avandar Staging** > **Project Settings** >
  **Database** > **Reset database password**) is **CHANGES STAGING
  CONFIGURATION**, breaks `staging.yaml` until you run `gh secret set
  STAGING_DB_PASSWORD --env staging` (**CHANGES GITHUB SETTINGS**), and is
  for a lost password only.

Block 1, then type or paste staging's password:

```bash
read -rs DBPW                                     # type or paste the password, press Enter (nothing is echoed)
```

Block 2, then paste staging's URI:

```bash
ENC="$(jq -rn --arg p "$DBPW" '$p|@uri')"; unset DBPW
read -r URI_TEMPLATE                              # paste the copied URI, press Enter
```

Block 3:

```bash
export STAGING_DB_URL="${URI_TEMPLATE/\[YOUR-PASSWORD\]/$ENC}"; unset URI_TEMPLATE ENC
[[ "$STAGING_DB_URL" == postgres*"://postgres.$STAGING_REF:"*"@"*":5432/postgres"* ]] &&
  echo "STAGING_DB_URL looks right" &&
  read_db "$STAGING_DB_URL" "select current_user, max(version), count(*) from supabase_migrations.schema_migrations"
```

**Expect:** `STAGING_DB_URL looks right`, then `postgres|20261117210525|<n>`
before the promotion. `<n>` is the number of migration files on
`origin/develop`, if staging's CI applied them all. This command, in the
same terminal, prints that number:
`git ls-tree --name-only origin/develop supabase/migrations/ | wc -l`.
**If not:** the same causes as part 2. A smaller `<n>` means staging has
not applied every `develop` migration: 4.8's last check lists which. On
2026-11-24 one of them is expected: staging's CI has been red since
2026-11-20, so staging has not applied `develop`'s own
`20261105212729_add_rpc_workspaces__is_slug_available.sql`. The promotion
applies it (9.2). Note the `<n>` printed here: 9.2 compares against it.

### 2.5 Rules for production access and the dumps

Nothing to run here: these are the rules every later step follows.

`supabase link` makes no database connection by itself. The dangerous case
in CLI 2.114 is a `--linked` database command (`db dump --linked`,
`db push --linked`, and the like) that finds no database password: the CLI
then creates a temporary login role with write access in the project. This
runbook runs no `--linked` command. Every production dump goes through
`--db-url "$PROD_DB_URL"`, which puts the password in the `supabase`
process's arguments, where `ps` shows it to every user of the machine. So
run the cutover on a laptop only you are logged in to. Every `psql` and
`pg_dump` here runs through `with_db_url`, and the catalog scripts read the
URL from the `SOURCE_DB_URL` or `TARGET_DB_URL` variable, so their
arguments never hold it.

Every command that connects to production, and what it does there. PITR,
in the last row, is Supabase's point-in-time recovery add-on (10.1):

| Connects to production | Sections | What it does there |
| --- | --- | --- |
| `read_db "$PROD_DB_URL" ...` | 2.4, 4.2, 4.8, 9.6 (production run), 10.1, 10.2, 11.7, 12, 14.3, 17.5 | Queries in a read-only transaction |
| `supabase db dump --db-url "$PROD_DB_URL" ...` | 4.2, 10.2 | `pg_dump` as `postgres`: reads only |
| `supabase projects api-keys`, `branches list`, `backups list`, `secrets list`, `functions list`, with `--project-ref "$PROD_REF"` | 6.1, 6.2, 6.5, 6.6, 10.1, 10.2, 13 | Management API reads |
| `with_db_url "$PROD_DB_URL" "$PG_DUMP_BIN" ...` | 9.6 C5 | The catalog backup: reads only |
| `importCatalogData.sh --dry-run`, and the run stopped at its prompt | 9.6 C4, C6 | Reads only, in read-only transactions |
| The `session_replication_role` probe | 9.6 C3 | Opens a transaction, changes one setting inside it, rolls back. Writes no data |
| The foreign key pre-flight | 9.6 C8 | One read-only transaction |
| **WRITES TO PRODUCTION** | 6.1 (only if keys are missing), 6.6 (the missing edge function secrets: configuration, no data), 10.1 (only if you turn PITR on), 11 (the app through Vercel from the push to `main`, the database and functions through CI from the approval), 12 (catalog import and Parquet copy), 14 (rollback), 17 (optional WDI object delete) | As each step says |

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
- Delete the dumps when section 17 says so (17.6).
- Never print a database URL or key. Read them into variables the way 2.4
  parts 2 and 3 do, and never `echo` them.

## 3. Freeze

### 3.1 Announce it

**Where:** your team's chat. Tell everyone who merges into `develop` or
`demo/measles` that both are frozen from now until 8.5 lands, and that
feature branches cut from `demo/measles` will be retargeted to `develop`
afterwards (17.4). Nothing merges into either branch until then.

### 3.2 Open pull requests into `develop`

**Where:** the cutover terminal (any directory inside the repository
works for `gh`). This lists the open pull requests into each frozen
branch:

```bash
gh pr list --base develop --state open --json number,headRefName,title --jq '.[] | [.number, .headRefName, .title] | @tsv'
gh pr list --base demo/measles --state open --json number,headRefName --jq '.[] | [.number, .headRefName] | @tsv'
```

**Expect:** the first command lists the pull requests into `develop`, one
per line: on 2026-11-23 there were 5, and on 2026-11-24 one remained, PR
#330, `feat/oxlint-phase3`. The second prints nothing: no pull request
into `demo/measles`.
**If not:** handle each extra pull request the way #330 is handled below.

**PR #330 (`feat/oxlint-phase3`).** It targets `develop`, and `develop` is
frozen. Leave it open and unmerged until the promotion lands (8.5). After
that, its author merges `develop` into it, fixes what the merge raises (the
promotion brings 787 demo commits that Oxlint has never linted), and lets
`pr-develop.yaml` run again. If it must merge before the promotion, merge
it, then the integration branch needs another catch-up (3.4) before 8.2:
a push to `develop` makes 8.5's fast-forward impossible until the
integration branch contains it.

### 3.3 Local-only commits

**Where:** the cutover terminal. This checks for commits that exist only on
this laptop's `develop` and would be lost:

```bash
git fetch origin
git branch -r --contains 003e2964c
git log --oneline origin/develop..develop
```

**Expect:** The commit is already on `origin/develop` and on the
`origin/feat/oxlint-phase3` branch (PR #330), so nothing is stranded. The
second command normally lists `origin/develop` and `origin/feat/oxlint-phase3`.
Git also prints an `origin/HEAD -> origin/develop` line. That line is a
pointer to the default branch, not a separate branch. The important check is
the last command: an empty result means this machine's local `develop` has no
commits that GitHub lacks.

Background: `003e2964c` (`docs(lint): correct video producer Oxlint
references`) was a docs commit that once existed only on the first machine's
local `develop`. It is now an ancestor of `origin/develop` (`cd877216f`) and
of the cutover branch.

**If the second command prints nothing:** this clone cannot see the commit on
any remote branch. Run `git fetch origin` again, then run
`git cat-file -t 003e2964c`, which prints `commit` if this clone has the
object, and `git rev-parse --short origin/develop`, which should print
`cd877216f` or a newer commit. If the commit exists locally but no remote
branch contains it, it exists only on this machine. It is a docs-only change
(a comment fix in Oxlint docs), so it is safe to leave behind, or to push on
its own branch after the promotion. The last command (empty) already shows
that local `develop` does not hold it.

**If not:** a commit listed by the last command exists only on this
machine's `develop`. Push it on its own branch and open a PR after the
promotion, or drop it once you are sure nothing in it is needed. Then
reset the local `develop` to GitHub's. Git refuses `git branch -f develop`
while a worktree has `develop` checked out, so reset it inside that
worktree, which must have no uncommitted changes. This line moves the
cutover terminal into the `develop` worktree; run `cd "$REPO"` afterwards
to come back:
`cd "$(wt sw develop)" && [[ -z "$(git status --porcelain)" ]] && git reset --hard origin/develop`.
Do this check on every machine you use.

### 3.4 `develop` moved after planning

Nothing to run here: this explains why the counts later in the runbook are
computed rather than written down.

The plan was written against `develop` at `ccab27208`. On 2026-11-24
`origin/develop` was at `64b21f636`, which the integration branch did not
contain yet. The final sync of the implementation plan (Task 21) merges
`develop` again and reports the tip commit. Use that tip in 4.1 and 8.1,
never a commit written here.

`develop` also gained a migration after planning:
`20261105212729_add_rpc_workspaces__is_slug_available.sql`. The integration
branch merged it on 2026-11-24: production now applies 80 files, the tree
holds 195, one more file for production and the tree than the plan counted
on 2026-11-23. Staging applies 11: the 10 files `develop` lacks, and that
same `develop` file, which staging has not applied because its CI has been
red since 2026-11-20. 8 of the 11 are older than staging's newest applied
file, so they apply out of order. Every production and tree count below
comes from a command (`$PROD_PENDING` and `$TREE_COUNT`, 4.1), so take the
number it prints.

## 4. Rehearsal (local)

This section copies production into a local Supabase stack of its own (a
"switched" stack, which no other worktree uses), applies every migration
production does not have yet, and opens old dashboards against the result.
Nothing here writes to production: it only reads production to make the
copy. This is the primary safety check for the migrations while the audit
refresh is pending (4.8).

**Where:** the cutover terminal, with 2.4 setup done, for every step except
the app in 4.7.

### 4.1 Create the rehearsal worktree and its own stack

This block creates the rehearsal worktree (a new branch,
`chore/production-rehearsal`, cut from the cutover branch), moves the
cutover terminal into it, installs its packages, gives it its own local
Supabase stack with `ava supabase switch`, and counts the migration files:

```bash
REHEARSAL="$(wt new chore production-rehearsal chore/production-cutover)" && cd "$REHEARSAL"
export REHEARSAL
git log -1 --format='%h %s'
pnpm install --frozen-lockfile
ava supabase status | grep -E "switched local|develop local"
[[ -n "$REHEARSAL" && "$PWD" == "$REHEARSAL" ]] && ava supabase switch --no-seed
pnpm fns:update-env
ava supabase status | grep -E "switched local|develop local"
git fetch origin
export PROD_PENDING="$(comm -23 <(ls supabase/migrations | sort) <(git ls-tree --name-only origin/main supabase/migrations/ | sed 's#.*/##' | sort) | wc -l | tr -d ' ')"
export TREE_COUNT="$(ls supabase/migrations | wc -l | tr -d ' ')"
echo "production applies $PROD_PENDING files, the tree holds $TREE_COUNT"
```

**Expect:** the `git log` line shows the tip commit that the final report
of Task 21 (in the implementation plan) names. The first status line may
say `This is the develop local Supabase`; the second, after the switch,
must read `Branch chore/production-rehearsal is on a switched local
Supabase database: chore-production-rehearsal.` The last line reads
`production applies 80 files, the tree holds 195` at the 2026-11-24 tip
(3.4). A later `develop` merge that adds a migration raises both numbers.
**If not:** run `echo "$REHEARSAL"`. If it prints nothing, `wt new` failed:
the switch did not run, and the rest of the block ran in the worktree you
started in. Fix the cause before anything else. Never run 4.3 to 4.6 while
the second status line says `This is the develop local Supabase`: they
would reset the shared stack every other worktree uses, and load
production's users into it. Fix the switch first (the repository's
`CLAUDE.md`, section "Supabase", explains it). From here on,
`on_rehearsal_stack` (2.4) guards every reset and load, and
`echo "$REHEARSAL"` must print this worktree's path.

### 4.2 Dump production (reads production)

This block records production's row counts, then dumps production's roles,
schema, and data (minus Google tokens and Auth sign-in material) into
`~/avandar-cutover/dumps`. It needs `PROD_DB_URL` from 2.4 part 2. The data
dumps take a few minutes:

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

**Expect:** the first line holds counts near 333 users, 48 workspaces, 39
dashboards, 85 datasets, and 20,030 dataset columns (the audit's
2026-11-19 numbers). Then each of the two data files shows `1` (its "dump
complete" footer is there), and the roles file shows `0` (the CLI leaves
out every Supabase-managed role). The `sed` loop in the middle removes a
setting that a newer `pg_dump` writes and Postgres 15 rejects.
**If not:** a `0` for a data file means that dump was cut short: run its
`supabase db dump` line again. A number above `0` for roles means
production has a role someone created by hand: open the roles file, read
the `CREATE ROLE` lines, and decide whether it is safe to load before 4.5.

The rehearsal leaves out Storage (no database dump carries its files),
Google tokens, and Auth sessions. No migration reads them.

### 4.3 Reset the local stack to production's migration version

This block rebuilds the rehearsal's local database with only the
migrations production has, then saves its connection URL in
`LOCAL_DB_URL` and checks it points at this laptop (`127.0.0.1`):

```bash
on_rehearsal_stack && supabase db reset --local --no-seed --version 20261013212914
on_rehearsal_stack && export LOCAL_DB_URL="$(supabase status -o json | jq -er '.DB_URL')"
[[ "$LOCAL_DB_URL" == postgres*"://"*"@127.0.0.1:"* ]] && echo "local URL ok"
read_db "$LOCAL_DB_URL" "select max(version), count(*) from supabase_migrations.schema_migrations"
```

**Expect:** the reset's own output, then `local URL ok`, then
`20261013212914|115`: the local schema is `main`'s 115 migrations, as on
production. The local stack runs Postgres 15, like production
(`supabase/config.toml`, `major_version = 15`).
**If not:** if the reset printed nothing, `on_rehearsal_stack` failed and
nothing ran. Stop, and fix the switch (4.1). No `local URL ok` means
`LOCAL_DB_URL` is not a local URL, so the terminal is in the wrong
directory: stop, and check `echo "$REHEARSAL"` and `pwd`.

### 4.4 Compare the schemas (informational)

This dumps the local schema and compares it with production's, from 4.2.
The differences go to `schema-drift.diff`, and the block prints how many
lines that file has:

```bash
supabase db dump --local -f "$D/local-at-prod-version-schema.sql"
diff "$D/prod-rehearsal-schema.sql" "$D/local-at-prod-version-schema.sql" \
  > "$D/schema-drift.diff"; wc -l < "$D/schema-drift.diff"
```

**Expect:** a small number, or `0`.
**If not:** open `~/avandar-cutover/dumps/schema-drift.diff` and read every
difference. One that touches a table, column, function, or policy (RLS,
row-level security) that a migration reads is drift the audit did not see:
stop and raise it. Differences in nothing a migration reads are fine.

### 4.5 Load production's roles and data

This loads the production dumps from 4.2 into the local database in one
transaction, then prints the local row counts:

```bash
on_rehearsal_stack &&
  with_db_url "$LOCAL_DB_URL" "$PSQL_BIN" -X -P pager=off --single-transaction --set ON_ERROR_STOP=1 \
    --file "$D/prod-rehearsal-roles.sql" \
    --file "$D/prod-rehearsal-data-auth.sql" \
    --file "$D/prod-rehearsal-data-public.sql"
read_db "$LOCAL_DB_URL" "$COUNTS_SQL"
```

**Expect:** psql ends without an `ERROR` line, and the counts equal the
first line of `~/avandar-cutover/dumps/prod-rehearsal-counts.txt` (4.2).
**If not:** no psql output at all means `on_rehearsal_stack` failed and
nothing ran: stop. An `ERROR` line means the whole transaction rolled back,
so nothing was loaded. The database is still exactly as 4.3 and 4.4 left
it, so after the fix below you go straight back to this load without
repeating 4.3 or 4.4. Repeat from 4.3 only when you are unsure of the
database's state, such as after opening a new terminal or changing the
stack. An error on an `auth` table means the local Auth version differs
from production's. A missing table fails with a line such as
`ERROR:  relation "auth.mfa_recovery_code_sets" does not exist`, which is
what the four tables in 2.4 part 1 cause when they are missing locally. A
missing column fails with a line such as
`ERROR:  column "dedicated_scope" of relation "saml_providers" does not exist`,
which is what `auth.saml_providers` causes. To find every mismatch at once,
run this read-only check in the open terminal. It compares each COPY
block's table and columns in both dumps with the local database, and prints
one line per mismatch with that block's row count:

```bash
# Read-only. Prints one line per mismatch, and nothing when both dumps match.
read_db "$LOCAL_DB_URL" "select table_schema || '.' || table_name || '.' || column_name from information_schema.columns where table_schema in ('auth','public')" > "$D/local-columns.txt"
for f in "$D/prod-rehearsal-data-auth.sql" "$D/prod-rehearsal-data-public.sql"; do
  awk '
    !inside && /^COPY [^ ]+ \(/ { t=$2; gsub(/"/,"",t); c=$0; sub(/^[^(]*\(/,"",c); sub(/\) FROM stdin;.*/,"",c); gsub(/[" ]/,"",c); n=0; inside=1; next }
    inside && /^\\\.$/ { print t "\t" n "\t" c; inside=0; next }
    inside { n++ }' "$f"
done | while IFS=$'\t' read -r tbl rows cols; do
  if ! grep -qF "$tbl." "$D/local-columns.txt"; then echo "$tbl ($rows rows): table missing locally"; continue; fi
  for col in $(echo "$cols" | tr ',' ' '); do
    grep -qxF "$tbl.$col" "$D/local-columns.txt" || echo "$tbl ($rows rows): local table lacks column $col"
  done
done
```

No output means every table and column in both dumps exists locally, so
the load needs no more exclusions. Each printed line names a table to
exclude when it is an `auth` table with 0 rows. For each one, run
`AUTH_SEED_EXCLUDES+=(-x auth.<table>)` once in the open terminal, so the
array holds it. (A new terminal needs the updated `AUTH_SEED_EXCLUDES` line
from 2.4 part 1 instead.) A mismatch on `auth.users` or `auth.identities`,
on any `public` table, or on any table with rows is a blocker: stop and
raise it. Do not exclude it. Once every printed line is excluded, run
`cd "$REHEARSAL"`, re-run only the auth dump line of 4.2, which is `supabase db dump --db-url "$PROD_DB_URL" --data-only --use-copy -s auth "${AUTH_SEED_EXCLUDES[@]}" -f "$D/prod-rehearsal-data-auth.sql"`,
then run the `sed -i ''` cleanup and the `grep -c` check on that one file
only: `sed -i '' '/^SET transaction_timeout = 0;$/d' "$D/prod-rehearsal-data-auth.sql"`
and `grep -c 'PostgreSQL database dump complete' "$D/prod-rehearsal-data-auth.sql"`,
which should print `1`. Then run this block's load again, without
repeating 4.3 or 4.4.

### 4.6 Apply the migrations production does not have

This applies every pending migration to the local copy, the same way
production's deploy will, logs the output, and then checks the result:

```bash
rm -f "$D/rehearsal-migration-up.log"
on_rehearsal_stack && supabase migration up --local --include-all 2>&1 | tee "$D/rehearsal-migration-up.log"
grep -c '^Applying migration' "$D/rehearsal-migration-up.log"
read_db "$LOCAL_DB_URL" "select max(version), count(*) from supabase_migrations.schema_migrations"
read_db "$LOCAL_DB_URL" "$COUNTS_SQL"
read_db "$LOCAL_DB_URL" "select to_regclass('public.plugin_installations'), (select count(*) from public.plugin_installations)"
```

**Expect:** the `grep -c` line prints the number in `$PROD_PENDING` (80 at
the 2026-11-24 tip; `echo "$PROD_PENDING"` shows it), with no error in the
log. Then `20261123200200|<the number in $TREE_COUNT>`, then the same
counts as 4.5, then `plugin_installations|0`. Production applies all of
these files in one plain `supabase db push` (11.6), in timestamp order:
every pending file is newer than production's newest applied file, so it
needs no `--include-all`. The plugin table is created, dropped, and restored empty within that
one push, which is why it ends empty here.
**If not:** no `Applying migration` output and no log means
`on_rehearsal_stack` failed and nothing ran: stop. A failed migration is a
cutover blocker: record its file name and error in your own notes, stop,
and fix it with a new migration before the release.

### 4.7 Open old dashboards

This picks 5 dashboards from your own workspaces in the local copy and
prints the local app's address. Paste the first two lines first: the
`read -r MY_EMAIL` line waits for you to type the email you sign in to
`app.avandarlabs.com` with, and press Enter. Then paste the last two lines.
The email stays in this terminal only.

```bash
cd "$REHEARSAL"
read -r MY_EMAIL     # your production sign-in email; stays in this shell
read_db "$LOCAL_DB_URL" "select w.slug, d.id, d.name from public.dashboards d join public.workspaces w on w.id = d.workspace_id join public.workspace_memberships m on m.workspace_id = d.workspace_id join auth.users u on u.id = m.user_id where u.email = '$MY_EMAIL' order by d.created_at limit 5"
grep '^VITE_APP_URL=' .env.development
```

**Expect:** up to 5 lines of `<workspace slug>|<dashboard id>|<name>`, then
a line `VITE_APP_URL=http://localhost:<port>`. Keep both in your own notes
for this step and for the smoke test (13).

If you sign in with Google on production, your local copy has no password
for you, so set a local-only one first. Paste the first line alone: it
waits for you to make up a throwaway password, type it, and press Enter
(nothing is shown). Then paste the rest. This writes to the local stack
only:

```bash
read -rs LOCAL_PASSWORD     # a throwaway password for this local stack
on_rehearsal_stack &&
  printf '%s\n' "update auth.users set encrypted_password = extensions.crypt(:'pw', extensions.gen_salt('bf')) where email = :'email';" |
  with_db_url "$LOCAL_DB_URL" "$PSQL_BIN" -X -P pager=off -v ON_ERROR_STOP=1 -v pw="$LOCAL_PASSWORD" -v email="$MY_EMAIL"
```

psql prints `UPDATE 1` when it set the password.

Then start the app in the app terminal (see "Where to run things"), since
`pnpm dev` keeps running: open a new terminal, run
`cd "$(wt path chore/production-rehearsal)"`, then `pnpm dev`. In the
browser, go to the `VITE_APP_URL` printed above and sign in with your email
and production password (or the local password you just set). Then open
each dashboard at `<VITE_APP_URL>/<slug>/dashboards/edit/<id>`, using the
slug and id from the list above, and note the result in your own notes
(not in the repository).

**Expect:** each dashboard opens with its title, layout, and every tile's
header, and no error screen. A tile may say its data could not load:
dataset files live in Storage, which no dump carries.
**If not:** an error screen or a tile that fails to parse is a blocker: the
dashboard's stored configuration does not survive the new code. Record
which dashboard and the error, and stop. If edge functions answer 401 with
`unexpected "iss"` (visible in the browser's network panel), stop `pnpm
dev` with Ctrl-C in the app terminal, run `pnpm fns:update-env` there, and
start `pnpm dev` again. When you are done, stop `pnpm dev` with Ctrl-C.

### 4.8 The migration audit refresh is pending

The refresh of [the migration audit](alpha-migration-audit.md) against
production's and staging's live data (Task 17 of the implementation plan)
was deferred by Pablo. Per Task 17, an agent session given read-only URLs
runs it, when Pablo chooses to start one. The rehearsal above is the
primary safety check for production's files, but nothing rehearses
staging's 11 pending files (8 of them out of order), and 8.5 makes
`staging.yaml` apply them automatically. So the refresh, and these read-only checks on live data,
must be done **before step 3 of section 1** (the promotion). A blocker
found after 8.5 can only be fixed forward.

**Where:** the cutover terminal, which has both `PROD_DB_URL` and
`STAGING_DB_URL` (2.4 parts 2 and 3) and `REHEARSAL` (4.1). Each query runs
in a read-only transaction. Compare each output with the table after the
block:

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
| Files staging has not applied (last command) | The 11 versions of 9.2, `20261105212729` among them | Another file: staging's history differs from the plan. Stop |

Then refresh the audit's verdict for every file counted in `$PROD_PENDING`
and every file in the staging list, read-only, as the implementation
plan's Task 17 describes.

### 4.9 Pass criteria

The rehearsal passes only when every row below holds. If any row fails,
stop: do not start section 5.

| Check | Pass |
| --- | --- |
| Every migration applies (4.6) | `$PROD_PENDING` applied, none failed |
| Row counts | Equal before and after the migrations, and equal to production at dump time |
| `plugin_installations` | Exists and is empty after the migrations |
| 5 old dashboards (4.7) | All open without an error screen |
| Schema drift (4.4) | Nothing a migration reads |
| Live checks and audit refresh (4.8) | Every row as expected, before step 3 |

Leave the rehearsal worktree and its stack in place: 10.3 tests the backup
in it. Section 17.4 removes both.

## 5. GitHub setup

Nothing is added to GitHub in this cutover (M1). This section only reads:
it checks that the `production` environment still has the protection it
has had since 2026-11-24, and that both environments still hold the names
their `migrate` jobs read.

### 5.1 The `production` environment is already protected (A3)

On 2026-11-24 the GitHub `production` environment already had a deployment
branch policy that allows only `main`, and a required reviewer. Its secrets
are exactly the three that `production.yaml`'s `migrate` job reads:
`SUPABASE_ACCESS_TOKEN`, `PRODUCTION_DB_PASSWORD`, and
`PRODUCTION_PROJECT_ID`.

**Where:** the cutover terminal (any directory inside the repository works
for `gh`). These three commands only read: the protection rules, the
branch policy, and the secret names, never a value:

```bash
gh api repos/AvandarLabs/avandar/environments/production \
  --jq '{branch_policy: .deployment_branch_policy, rules: [.protection_rules[].type]}'
gh api repos/AvandarLabs/avandar/environments/production/deployment-branch-policies \
  --jq '.branch_policies[] | {name, type}'
gh secret list --env production --json name -q '.[].name' | sort
```

**Expect:** the first command prints
`{"branch_policy":{"custom_branch_policies":true,"protected_branches":false},"rules":["branch_policy","required_reviewers"]}`
(the order of the two rules may differ). The second prints
`{"name":"main","type":"branch"}`. The third prints exactly
`PRODUCTION_DB_PASSWORD`, `PRODUCTION_PROJECT_ID`, and
`SUPABASE_ACCESS_TOKEN`, one per line.

**What the reviewer rule means for the release.** `production.yaml`'s
`migrate` job waits for your approval before its first step, and every
re-run of it waits again (11.5, 11.6). Vercel does not wait: it deploys the
new app as soon as `main` is pushed (11.4).

**If not:** a missing rule means someone removed it. Put it back in the
browser (**CHANGES GITHUB SETTINGS**): GitHub > the repository's
**Settings** tab > **Environments** (left sidebar, under "Code and
automation") > **production**. Under **Deployment branches and tags**,
choose **Selected branches and tags** and add one rule with **Ref type**
**Branch** and the name pattern `main`, and no other rule (not **Protected
branches only**). Under **Deployment protection rules**, tick **Required
reviewers**, pick yourself, clear **Prevent self-review** (you push `main`
yourself through `ava release`, so with it on you could never approve), and
click **Save protection rules**. Then run the block again. A missing secret
name: stop and raise it before 11.4, since the `migrate` job cannot run
without it. An extra name does no harm.

### 5.2 The `staging` environment's branch policy: not now

Nothing to change here.

**Do not add a `develop`-only policy to `staging`.** Three workflows use
the `staging` environment outside `develop`: `production.yaml`'s
`test-quick` and `test-e2e` run on `main` with `environment: staging`, and
`pr-develop.yaml`'s test jobs run on pull requests with it. A
`develop`-only policy would block `production.yaml`'s `test-quick` on
`main`, and its `migrate` job needs `test-quick`, so production would never
migrate. Pull request runs would likely be blocked too (**verify**: GitHub
evaluates a pull request run's ref, not `develop`).

**The exposure.** So `staging` stays unprotected, and any branch's workflow
can read its secrets (section 18). Two of them reach further than staging.
5.1's protection covers only the `production` environment's secrets:

- `VERCEL_TOKEN`: a Vercel token for project `avandar`, the same project
  that serves `app.avandarlabs.com`. Any branch's workflow can read it and
  run `vercel deploy --prod` with it. No workflow in this cutover uses it.
- `SUPABASE_ACCESS_TOKEN`: if it is a personal access token of an account
  that can also reach project `Avandar`, any branch's workflow can reach
  production through the Management API with it. Supabase personal access
  tokens reach every project the account can.

**Decided (K1, Pablo, 2026-11-24):** accept this exposure for the cutover,
and narrow the staging tokens after the full cutover (section 16, Narrow the
staging tokens). Only maintainers can push branches to the repository, so the
risk is low until then.

### 5.3 Nothing to add to the `production` environment

Nothing to run here. `production.yaml`'s `migrate` job reads only the three
secrets 5.1 lists, and all three exist. The values a CI deploy of the web
app would need belong to the follow-up (section 16, Move deploys to CI and
manage secrets in GitHub).

### 5.4 The `staging` environment needs nothing new

Nothing to run here. `staging.yaml`'s `migrate` job reads three names from
the GitHub `staging` environment: `SUPABASE_ACCESS_TOKEN`,
`STAGING_DB_PASSWORD`, and `STAGING_PROJECT_ID`. The other names in that
environment belong to the test jobs, which use `environment: staging` too:
leave them as they are. 5.6 checks the three names.

### 5.5 No deploy checks in this cutover

Nothing to run here. `develop`'s `migrate` jobs run `supabase link`,
`supabase db push`, and `supabase functions deploy`, and have no step that
checks the configuration before they write. The configuration and Vercel
build checks were part of the CI deploy jobs, which are deferred (section
16). 5.1 and 5.6 check the names instead.

### 5.6 Check the names (before 8.2 and before every release)

**Where:** the cutover terminal (in 11.2, the develop terminal). This
lists, for each environment, every name its `migrate` job reads that
GitHub does not have, then the repository-level names that could shadow
them. It reads names only, never values:

```bash
check_env_names() {   # check_env_names <env> "<names the migrate job reads>"
  echo "$1, missing secrets:"; comm -23 <(tr ' ' '\n' <<<"$2" | sort) \
    <(gh secret list --env "$1" --json name -q '.[].name' | sort)
}
check_env_names production "PRODUCTION_DB_PASSWORD PRODUCTION_PROJECT_ID SUPABASE_ACCESS_TOKEN"
check_env_names staging "STAGING_DB_PASSWORD STAGING_PROJECT_ID SUPABASE_ACCESS_TOKEN"
echo "Repository secrets:"; gh secret list --json name -q '.[].name'
echo "Repository variables:"; gh variable list --json name -q '.[].name'
```

**Expect:** nothing under either "missing secrets" line. Only
`CLAUDE_CODE_OAUTH_TOKEN` under "Repository secrets", and nothing under
"Repository variables" (true on 2026-11-20). Then check organization
secrets in the browser: GitHub > the repository's **Settings** >
**Secrets and variables** > **Actions** shows none under **Organization
secrets**.
**If not:** a missing name: stop and raise it. It is set with
`gh secret set <NAME> --env <environment>`, pasting the value at its
prompt (**CHANGES GITHUB SETTINGS**). Delete any repository or
organization value that shares a name with one of these environment
values, since it silently fills a missing environment value (same page,
the trash icon next to it, **CHANGES GITHUB SETTINGS**).

### 5.7 What happens when a check fails

Nothing to run here. The checks this subsection described belonged to the
deferred CI deploy jobs. What to do when a `migrate` job fails is in 9.1
for staging and in 11.6 for production.

## 6. Third parties

These steps check that each outside service points at the right project,
and set the three edge function secrets both Supabase projects are missing
(6.6). None of them changes GitHub: CI does not read these values.

### 6.1 Production API keys

**Where:** the cutover terminal. The catalog's Parquet copy (9.6 and 12)
reads each project's new-style secret key with the CLI, so production must
have one. This lists production's API keys by name and type only, never a
key.

```bash
supabase projects api-keys --project-ref "$PROD_REF" -o json | jq -r '.[] | [.name, .type] | @tsv'
```

**Expect:** a line with type `publishable` and a line with type `secret`.
**If not:** create the missing one in the browser: Supabase dashboard >
**Avandar** > **Project Settings** > **API Keys** (the new-style
publishable and secret keys, not the legacy `anon` and `service_role`
ones; the labels may read slightly differently). **WRITES TO PRODUCTION**
(project configuration, not data). Creating a key does not disable any
existing one.

### 6.2 Google OAuth redirect URI

Each Supabase project holds its own `GOOGLE_REDIRECT_URI` edge function
secret, set by hand, and CI does not change it. Google accepts a sign-in
only when that URI is listed on the project's OAuth client. Both
projects' callbacks have this shape:
`https://<project ref>.supabase.co/functions/v1/google-auth-callback`.

**Where:** the cutover terminal, then the Google Cloud console. First,
this prints production's callback URI, then compares the digest of
production's `GOOGLE_REDIRECT_URI` with the digest of that URI. Both
lines only read, and no value is printed:

```bash
echo "https://$PROD_REF.supabase.co/functions/v1/google-auth-callback"
supabase secrets list --project-ref "$PROD_REF" -o json \
  | jq -r '.[] | select(.name=="GOOGLE_REDIRECT_URI") | .value'
printf '%s' "https://$PROD_REF.supabase.co/functions/v1/google-auth-callback" | shasum -a 256 | cut -d' ' -f1
```

**Expect:** the URI, then two identical 64-character digests.
**Verify:** the digest is the SHA-256 of the value in hex, so a mismatch
may also mean `secrets list` computes it differently. A mismatch, or no
first digest, means production's secret holds another URI (or none):
check it before the release, since it was set by hand and nothing in
this runbook changes it.

Then, in the browser: Google Cloud console > pick the project that holds
production's OAuth client (the project picker at the top) > **APIs &
Services** > **Credentials** > under **OAuth 2.0 Client IDs**, click the
production client > **Authorized redirect URIs** must contain the URI
printed above. If it is missing: **Add URI**, paste it, **Save**.
**CHANGES GOOGLE CLOUD CONSOLE**. Which client is production's: the one
whose client ID production uses today. If your password manager does not
say, the client's name in the list usually does (**verify** before you
rely on a name).

Staging too. This prints staging's callback URI and the same two digests
for staging:

```bash
echo "https://$STAGING_REF.supabase.co/functions/v1/google-auth-callback"
supabase secrets list --project-ref "$STAGING_REF" -o json \
  | jq -r '.[] | select(.name=="GOOGLE_REDIRECT_URI") | .value'
printf '%s' "https://$STAGING_REF.supabase.co/functions/v1/google-auth-callback" | shasum -a 256 | cut -d' ' -f1
```

Same Google Cloud console page > the OAuth client staging uses >
**Authorized redirect URIs** must contain the URI printed above. If it is
missing: **Add URI**, paste it, **Save**. **CHANGES GOOGLE CLOUD
CONSOLE**.

### 6.3 Polar

Nothing to do. Production's Polar token and `POLAR_SERVER_TYPE` are edge
function secrets set by hand on the production project, and CI does not
change them, so no new Polar token is needed for this cutover.

### 6.4 Pipeline server (before the release)

The server must be running, and production must point at it, before the
release. If it is not running, follow [the pipeline server
runbook](pipeline-server-fly-runbook.md) first. Production points at it
through two edge function secrets, `AVA_PIPELINE_SERVER_URL` and
`AVA_PIPELINE_SERVER_SECRET`, which neither project has today. 6.6 sets
them by hand on both projects. Without them, the open data catalog's copy
builds stay turned off, and everything else works.

**Where to get its URL and secret.** Both projects use the same server,
so the same two values.

- `AVA_PIPELINE_SERVER_URL`: `https://<app name>.fly.dev`, with no path and
  no trailing `/`. The app name is `FLY_APP_NAME` in your local
  `.env.pipeline-server.prod` file (step 2 of the pipeline server runbook),
  and `fly apps list` lists it too. It is not a password, but it stays out
  of the repository and its logs, because a public repository should not
  publish the hostname.
- `AVA_PIPELINE_SERVER_SECRET`: the value made with `openssl rand -hex 32`
  in step 5 of the pipeline server runbook (64 hexadecimal characters),
  saved in your password manager then. Fly never shows a secret again. If
  it is lost, generating a new one means setting it on the server (`fly
  secrets set`, which restarts it) and again on both Supabase projects
  (6.6). Avoid this unless it is truly lost.

**Where:** the cutover terminal. Check that the server answers. Paste the
first line alone, paste the URL at its prompt and press Enter (nothing is
shown), then paste the other two lines:

```bash
read -rs PIPELINE_URL   # the server's https URL, from your password manager
curl -s "$PIPELINE_URL/healthz"; echo
unset PIPELINE_URL
```

**Expect:** `{"ok":true}`.
**If not:** an empty line or an error page means the server is down or the
URL is wrong: check the URL, then fix the server with its runbook. The
release must not start until it answers.

The server keeps no Supabase credentials: each request names the project
to load into. That runbook's "set by hand" production step is 6.6 of this
runbook.

### 6.5 Production has no Supabase Git integration or Branching

**Where:** the Supabase dashboard, then the cutover terminal. Look, change
nothing: Supabase dashboard > **Avandar** > **Project Settings** >
**Integrations** > **GitHub** must say it is not connected, and the
**Branches** page (left sidebar) must show Branching off. Then confirm from
the terminal:

```bash
supabase branches list --project-ref "$PROD_REF"
```

**Expect:** an error that Branching is not enabled, or an empty list.
**If not:** stop. A Git integration on `main` would deploy production
outside `production.yaml`. Raise it before going on.

The same for staging, again only looking: Supabase dashboard > **Avandar
Staging** > **Project Settings** > **Integrations** > **GitHub** must say
it is not connected (**verify** the label). Staging has Branching on, for
the `demo-measles` branch (9.5): that is expected, and needs no Git
integration.
**If not:** stop. A Supabase Git integration would migrate staging, or
create branches, outside `staging.yaml`. Disconnecting it is **CHANGES
STAGING CONFIGURATION**, and only you make that change.

### 6.6 Set the missing edge function secrets by hand

Three edge function secrets the new code reads are on neither Supabase
project today (names checked on 2026-11-24). CI does not set edge function
secrets, so you set them by hand, on each project:

| Name | Needed for | Without it |
| --- | --- | --- |
| `GEOAPIFY_API_KEY` | Address search (the `geocode` function) | Address search answers 503, `Address search is not configured` |
| `AVA_PIPELINE_SERVER_URL` | The open data catalog's copy builds | Copy builds stay turned off. Nothing else is affected |
| `AVA_PIPELINE_SERVER_SECRET` | The same copy builds | The same |

**Recommended, not blocking.** The release works without these three:
only address search (503) and the catalog's copy builds (off) need them,
as the table says. You may set them later, by hand, at any time.

**When:** best on staging before the promotion (8.5), and on production
before the release (11.4). Doing either earlier is safe: it adds configuration only,
changes no data, and the functions production runs today (`v0.14.1`) do
not read these names. Every other secret either project needs already
exists there, and stays as it is.

**Where to get each value.**

- `GEOAPIFY_API_KEY`: your password manager first. Otherwise
  `myprojects.geoapify.com` > your project > **API Keys**. Shape: a
  32-character string. Always visible there. The same key can serve both
  projects.
- `AVA_PIPELINE_SERVER_URL` and `AVA_PIPELINE_SERVER_SECRET`: 6.4 says
  where. The same two values go on both projects.

**Where:** the cutover terminal for staging. For production, the cutover
terminal or the develop terminal, whichever you are in, as long as it had
2.4 setup part 1. First paste this block. It only defines a function,
`set_edge_secrets`, and runs nothing:

```bash
# set_edge_secrets <project ref>: asks for each value without showing it,
# writes NAME='value' lines into a private file (mode 600) under
# $CUTOVER_DIR, sets them on that one project, and deletes the file, even
# when stopped with Ctrl-C. Enter alone skips a name and leaves it as it is
# on the project. A value with a single quote, a line break, or a leading
# or trailing space is refused, and then nothing is set. No value reaches
# the command line or the shell history. Works in bash and zsh.
set_edge_secrets() (
  ref="$1"
  file="$CUTOVER_DIR/edge-secrets-$ref.env"
  if [[ -z "$ref" || ! -d "$CUTOVER_DIR" ]]; then
    echo "Paste 2.4 setup part 1 first. Nothing was set." >&2
    exit 1
  fi
  trap 'rm -f "$file"' EXIT
  trap 'rm -f "$file"; exit 130' INT TERM HUP
  umask 077
  : > "$file" || exit 1
  for name in GEOAPIFY_API_KEY AVA_PIPELINE_SERVER_URL AVA_PIPELINE_SERVER_SECRET; do
    printf '%s for %s (Enter alone skips it): ' "$name" "$ref"
    IFS= read -rs value
    echo
    if [[ -z "$value" ]]; then
      echo "  skipped: $name stays as it is on the project"
      continue
    fi
    if [[ "$value" == *"'"* || "$value" == *$'\n'* || "$value" == *$'\r'* ||
      "$value" == [[:space:]]* || "$value" == *[[:space:]] ]]; then
      echo "$name has a single quote, a line break, or a leading or trailing space. Nothing was set." >&2
      exit 1
    fi
    if [[ "$name" == AVA_PIPELINE_SERVER_URL && ("$value" != https://* || "$value" == */) ]]; then
      echo "AVA_PIPELINE_SERVER_URL must start with https:// and have no trailing /. Nothing was set." >&2
      exit 1
    fi
    printf "%s='%s'\n" "$name" "$value" >> "$file"
  done
  if [[ ! -s "$file" ]]; then
    echo "No value given. Nothing was set."
    exit 0
  fi
  supabase secrets set --project-ref "$ref" --env-file "$file"
)
```

Why single quotes: the CLI reads the file as a `.env` file, where an
unquoted value ends at a `#`. Inside single quotes every character is kept
as it is, which is why a value that itself holds a single quote is
refused.

**Staging. CHANGES STAGING CONFIGURATION.** Paste this line, then answer
the three prompts: paste each value and press Enter (nothing is shown):

```bash
set_edge_secrets "$STAGING_REF"
```

**Production. WRITES TO PRODUCTION** (configuration, no data). The same,
with production's ref:

```bash
set_edge_secrets "$PROD_REF"
```

**Expect:** for each project, the three prompts, then the CLI's
confirmation (it may read `Finished supabase secrets set.`; the wording may
differ). The private file is already gone when the prompt comes back.
**If not:** a refusal message means nothing was set on that project: fix
the value in your password manager and run the line again. An error from
the CLI also leaves the file deleted: read the error, then run the line
again.

Then check each project by name. This reads names only, never a value or
a digest:

```bash
supabase secrets list --project-ref "$STAGING_REF" -o json | jq -r '.[].name' \
  | grep -E '^(GEOAPIFY_API_KEY|AVA_PIPELINE_SERVER_URL|AVA_PIPELINE_SERVER_SECRET)$' | sort
supabase secrets list --project-ref "$PROD_REF" -o json | jq -r '.[].name' \
  | grep -E '^(GEOAPIFY_API_KEY|AVA_PIPELINE_SERVER_URL|AVA_PIPELINE_SERVER_SECRET)$' | sort
ls "$CUTOVER_DIR"/edge-secrets-*.env 2>/dev/null || echo "no secrets files left"
```

**Expect:** the three names for each project you have done (before you
do production, its command prints nothing), then `no secrets files left`.
**If not:** a missing name means it was skipped or not set: run that
project's line again. A file listed by the last command was left by an
interrupted run: delete it with `rm -f` and the path it printed.

## 7. Vercel before the cutover

**Nothing changes in Vercel for this cutover** (M1). This section is a
short orientation, and you may skip it. Every change in Vercel is yours:
no command in this runbook changes Vercel. **CHANGES VERCEL** marks the one
optional step that changes something.

**Where:** the Vercel dashboard in the browser, team `avandar`, project
`avandar` (open `vercel.com`, pick the `avandar` team at the top left, then
the `avandar` project).

### 7.1 How the app deploys today

Nothing to change. Vercel's Git integration builds every push to `develop`
into the Vercel environment named `staging`, which serves
`staging.avandarlabs.com`, and every push to `main` into Production, which
serves `app.avandarlabs.com`. Each build uses the variables already set in
that Vercel environment. Other pushed branches get preview deployments, as
they always have. A deployment is ready a few minutes after its push.

### 7.2 Optional: turn the data agent on for everyone (**CHANGES VERCEL**)

`VITE_AVA_DATA_AGENT` set to `on` enables the data agent for every user.
It is new for production. If you want it, set it in project `avandar` >
**Settings** > **Environment Variables** (**verify** the label: it may sit
under **Settings** > **Environments** > the environment instead), for
Production, and for `staging` if you want it there too. Vite copies a
`VITE_` value into the app when it builds, so the value takes effect at the
next deployment: set it before 8.5 (staging) or 11.4 (production) to have
it in the release's build, or set it afterwards and let the next push
deploy it. Leaving it unset changes nothing.

### 7.3 Deploy hooks

Nothing to change: deploy hooks stay as they are. Removing them belongs to
the CI deploy follow-up (section 16, Move deploys to CI and manage secrets
in GitHub).

### 7.4 CLI deploys

Nothing to check: nothing deploys with the Vercel command-line tool in this
cutover.

### 7.5 The Vercel token

Nothing to create: GitHub gets no Vercel token in this cutover. The token
the `staging` environment already holds is section 16's (Narrow the staging
tokens).

## 8. Promote to `develop` (D3)

The promotion is a PR, for CI and the public record, then a fast-forward of
`develop` to the PR head with your admin bypass. A squash would replace 787
commits with one and break every commit ID the feature log cites.

It carries everything on the integration branch: the demo features, the
plugin system (D1), the catalog move scripts, the GIS fixes, and the video
producer file-name casing fix. Its workflows and `vercel.json` are
`develop`'s own copies, unchanged (M1).

**Where:** the cutover terminal for every step of this section, plus
GitHub in the browser to look at the PR.

### 8.1 Preconditions

This moves the cutover terminal back into the cutover worktree, saves its
commit as `TIP`, and checks that `demo/measles` and `develop` can both
fast-forward to it and that its migrations are the ones you rehearsed:

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

Then run 5.6's block in the same terminal.
**Expect:** `## chore/production-cutover` with no changed files listed
under it; the short SHA is the tip Task 21's final report names;
`demo/measles can fast-forward`, `develop can fast-forward`, and
`rehearsed migrations` all print; 5.6 shows nothing missing; and 5.1
printed the protection as expected.
**If not:** a missing `develop can fast-forward` means `develop` moved again
(3.4): stop, and catch the branch up as Task 21 does before going on. A
missing `demo/measles can fast-forward` means someone pushed to
`demo/measles`: stop and ask who. A missing `rehearsed migrations` means
the migrations changed after the rehearsal: repeat section 4 on the new
tip.

### 8.2 Push the integration branch to `demo/measles` (**PUSHES**)

This pushes `TIP` (from 8.1, same terminal) to `demo/measles` on GitHub,
then lists that branch's recent workflow runs:

```bash
git push origin "$TIP:refs/heads/demo/measles"
gh run list --branch demo/measles --limit 5
```

**Expect:** the push prints `<old>..<new>  <commit> -> demo/measles` (a
fast-forward, no `forced update`). The run list shows no new deploy run:
`demo.yaml` is gone from this tree. Vercel's Git integration may build a
preview deployment for this push, as it does for pushed branches: that
changes nothing on staging or production. `demo.avandarlabs.com` keeps
serving its last build, frozen until section 17 (**verify** in the Vercel
dashboard > project `avandar` > **Deployments** that a deployment for this
push, if there is one, is marked Preview, not `demo`).
**If not:** a rejected push means `demo/measles` moved: stop and talk to
whoever pushed it.

### 8.3 Open the PR

This opens the promotion pull request (PR) from `demo/measles` into
`develop`, with the prepared description:

```bash
gh pr create --base develop --head demo/measles \
  --title "feat: promote the measles demo to develop" \
  --body-file docs/measles-demo/promotion-pr-description.md
```

**PUSHES** (creates a public PR).
**Expect:** the PR's URL. Open it in the browser: its description is the
whole of `docs/measles-demo/promotion-pr-description.md`, which says what
landed without review and where the post-commit reviews live.
**If not:** `no such file` means the file is missing, or the terminal is not
in the cutover worktree (run 8.1 again). If the file is missing from the
worktree, stop: the integration branch is not the final one.

### 8.4 Wait for `pr-develop.yaml`

This follows the PR's checks live until they all finish. It can take tens
of minutes:

```bash
gh pr checks demo/measles --watch
```

**Expect:** every check passes, `pr-test-e2e` included. `pr-develop.yaml`
is `develop`'s own and runs `lint-pr-title`, `lint-typecheck`,
`test-quick`, `pr-test-e2e`, and `verify-packages`; `react-doctor.yml`
adds its own check, and Vercel may add one for its preview deployment.
`lint-typecheck` has failed on `develop` since 2026-11-20 because of a
video producer file-name casing bug; this branch fixes it (`33c4034e1`), so
it passes here. No ruleset requires a GitHub status check, so
your admin bypass could fast-forward `develop` even with a red PR. Do not:
staging's CI gate and `ava release` (11.2) need staging's whole run green,
`test-e2e` included.
**If not:** fix the cause with a commit on the integration branch
(`chore/production-cutover`), re-run 8.1 to reset `TIP`, push to
`demo/measles` again (8.2), and repeat section 4 if a migration changed.
The open PR picks up the new push by itself.

### 8.5 Fast-forward `develop` (**PUSHES**)

This checks, once more, that `develop` can fast-forward to `TIP` and that
the PR's head is `TIP`, and only then pushes `TIP` to `develop`. This push
is the promotion: Vercel deploys the new app to staging, and `staging.yaml`
migrates staging (section 9).

```bash
git fetch origin
git merge-base --is-ancestor origin/develop "$TIP" && echo "still a fast-forward" &&
  [[ "$(git rev-parse origin/demo/measles)" == "$TIP" ]] && echo "PR head is the tip" &&
  git push origin "$TIP:refs/heads/develop"
```

**Expect:** `still a fast-forward` and `PR head is the tip` print, then a
fast-forward push to `develop` that your organization admin role lets
through the `Develop` ruleset (GitHub's branch rules for `develop`). The
push runs only when both checks pass, and Git still refuses a
non-fast-forward push.
**If not:** a missing first line means `develop` moved: stop, catch up as
in 8.1, and repeat 8.2 to 8.4. A missing second line means `demo/measles`
is not at `TIP`: run 8.2 again. A push refused by the ruleset means your
account is not an organization admin: check your role. Never force-push
`develop`.

### 8.6 What to expect

Nothing to run here, except the two **Verify** checks in the first row and
the log check in the `release-packages.yaml` row. This is what the push
in 8.5 starts:

| What | Expect |
| --- | --- |
| The PR | Shows merged, since its head is now on `develop`. **Verify** on the PR page. The repository has `delete_branch_on_merge: true`: **verify** with `git ls-remote origin refs/heads/demo/measles` whether GitHub deleted `demo/measles` when the PR showed merged. Either way nothing is lost: 17.4 deletes it anyway, and its delete then fails harmlessly |
| Vercel | Its Git integration builds `develop` and deploys it to staging (`staging.avandarlabs.com`) within minutes, with the variables of the Vercel `staging` environment. Until `staging.yaml`'s `migrate` job finishes, the new staging app runs on the old staging schema and the old edge functions. Vercel also keeps building previews for other pushed branches, as it always has |
| `staging.yaml` | Runs for the push: `lint-typecheck`, then `test-quick` and `test-e2e`, then `migrate`, which applies staging's 11 pending migrations and deploys the edge functions (9.1) |
| `release-packages.yaml` | Writes changesets for changed `packages/**` and opens a version PR. Nothing is published to npm until that PR is merged, but only when the run finds changesets. With none, its "Create version PR or publish" step publishes every `@avandar/*` version npm does not have yet. Check that step's log: it must say it opened or updated the version PR, and the version PR must stay unmerged (**verify**) |
| `demo.yaml` | Deleted from `develop` by this push |

## 9. Staging

**Where:** the cutover terminal for every step of this section. It still
holds `TIP` (8.1) and `STAGING_DB_URL` (2.4 part 3).

### 9.1 Watch the staging deploy

The push in 8.5 starts two things that run independently. Vercel's Git
integration builds the app and deploys it to staging within a few minutes:
nothing to run for that, and 9.2 checks it. `staging.yaml` runs the checks,
then migrates staging and deploys its edge functions. Until its `migrate`
job finishes, the new staging app runs on the old schema.

This block waits 15 seconds for GitHub to start the `staging.yaml` run for
the push in 8.5, saves that run's id as `STAGING_RUN_ID`, and follows it
live until it ends:

```bash
sleep 15
[[ -n "$TIP" ]] && export STAGING_RUN_ID="$(gh run list --workflow staging.yaml --branch develop --limit 5 --json databaseId,headSha --jq ".[] | select(.headSha == \"$TIP\") | .databaseId" | head -1)"
[[ -n "$TIP" && -n "$STAGING_RUN_ID" ]] && gh run watch "$STAGING_RUN_ID"
```

If the block ends without following a run, either `TIP` is unset (re-run
8.1 in this terminal) or the run for `TIP` has not started yet: wait a
minute and run the block again. The run's jobs and steps, in order:

| Order | Job or step | Writes to staging | Takes about |
| --- | --- | --- | --- |
| 1 | `lint-typecheck` | No | 3 minutes |
| 2 | `test-quick`, with `test-e2e` alongside. `test-e2e` does not block `migrate`, but it does decide the run's verdict | No | 12 minutes (`test-e2e` longer) |
| 3 | `migrate`: `Run supabase link --project-ref $SUPABASE_PROJECT_ID` | No | Seconds |
| 4 | `migrate`: `Run supabase db push --include-all`, one line per migration, 11 of them | Yes | Seconds |
| 5 | `migrate`: `Run supabase functions deploy`, one line per function | Yes | Under a minute |

The `staging` environment has no protection rules, so `migrate` starts
without an approval. The run never changes staging's edge function
secrets: they stay as set by hand on the project (6.6).

**Expect:** `gh run watch` ends with every job green and the run marked
successful. `ava release` later needs the whole run, `test-e2e` (the
end-to-end browser tests) included, to pass for the commit it releases
(11.2).

**The known functions deploy flake.** Supabase CLI 2.98.2, which
`develop`'s workflows pin, tries import map entries in random order when it
bundles the edge functions. So `@avandar/utils/sql` sometimes resolves to
the wrong file, and `Run supabase functions deploy` fails with
`Module not found ".../packages/shared/utils/src/sql/index.ts"`. It
happened on staging with `develop`'s own code on 2026-11-20, and the next
run deployed fine: expect about one failure in two attempts. `db push` runs
before it, so the migrations are already applied, and staging runs the new
schema with the old edge functions until a re-run passes. The fix is to
re-run the failed job until it passes. The repeated `db push` finds nothing
to apply. GitHub re-runs jobs only after the whole run has ended,
`test-e2e` included, so wait for `gh run watch` to end first. Then, in this
terminal, this shows whether the failure is the flake, re-runs only the
failed jobs, and follows the new attempt:

```bash
gh run view "$STAGING_RUN_ID" --log-failed | grep -F 'Module not found' | head -3
gh run rerun "$STAGING_RUN_ID" --failed
sleep 15
gh run watch "$STAGING_RUN_ID"
```

**Expect:** the first command prints at least one `Module not found` line
naming `packages/shared/utils/src/sql/index.ts`, and the re-run ends with
`migrate` green. If it fails the same way again, run the block again, as
often as it takes. The run's page in the browser has a **Re-run failed
jobs** button that does the same as the second line. A failed `test-e2e`
is re-run too, which takes longer but does not block `migrate`.
**If not:** if the first command prints nothing, the failure is something
else: find it in the table below. Bumping the CLI version would fix the
flake, but it is a CI change and waits for the follow-up (section 16, Move
deploys to CI and manage secrets in GitHub).

**If the run fails** at a step other than the flake, open the run in the
browser (GitHub > **Actions** > the run) to see which step failed, then
find it below. Re-run commands run here, in the cutover terminal, which
holds `STAGING_RUN_ID`:

| Stops at | Staging | Do |
| --- | --- | --- |
| `lint-typecheck` or `test-quick` | Database and functions untouched. Vercel already serves the new app, on the old schema | Fix the cause, then `gh run rerun "$STAGING_RUN_ID" --failed`. A known flaky test is in section 18 ("Quick suite flake") |
| `Run supabase link` | Untouched | Read the step's log, fix the cause, then re-run the same way |
| `Run supabase db push --include-all` | Partly migrated | A migration problem: read 11.9 about the public log first, then stop and raise it |
| `Run supabase functions deploy`, with `Module not found` | Migrated, old functions | The flake: the block above |
| `Run supabase functions deploy`, another error | Migrated, old functions | Fix the cause and re-run the same way |
| `test-e2e` only | Migrated and deployed | Read its report. A flaky test: re-run the same way. `ava release` needs the run green (11.2) |

### 9.2 The 11 migrations applied, and the domain serves the new build

These four read-only queries show staging's newest migration and count,
which of the 11 expected versions it has, whether the plugin table exists,
and every file in the tree that staging still lacks:

```bash
read_db "$STAGING_DB_URL" "select max(version), count(*) from supabase_migrations.schema_migrations"
read_db "$STAGING_DB_URL" "select version from supabase_migrations.schema_migrations where version in ('20261105212729','20261112000050','20261112201046','20261113022522','20261113154906','20261113181028','20261113232435','20261114213908','20261123200000','20261123200100','20261123200200') order by 1"
read_db "$STAGING_DB_URL" "select to_regclass('public.plugin_installations')"
comm -23 <(ls supabase/migrations | cut -d_ -f1 | sort) <(read_db "$STAGING_DB_URL" "select version from supabase_migrations.schema_migrations" | sort)
```

**Expect:** first `20261123200200|<n>`, where `<n>` is 11 more than the
count 2.4 part 3 printed. Then all 11 versions, one per line: `develop`'s
own `20261105212729` and the 7 dictionary and crosswalk files (these 8
applied out of order by `--include-all`), then the restore and the two
slot files. Then `plugin_installations`. The last command prints nothing:
staging has every file in the tree. Then, in the browser, open
`https://staging.avandarlabs.com`, sign in, and press Cmd+K: the command
palette shows the version `0.15.0-dev`.
**If not:** a missing version means `db push` skipped it: read the
`Run supabase db push --include-all` step's log in the run (GitHub >
**Actions** > the run > `migrate`). An older version in Cmd+K means
Vercel's build for the push has not finished, or failed: in the Vercel
dashboard > project `avandar` > **Deployments**, the newest deployment for
the `staging` environment must show the commit `echo "${TIP:0:9}"` prints,
marked Ready. Reload the page once it is. A failed build shows its log
there: stop and raise it.

Local databases, and the `demo-measles` branch, that ran the slot migrations
under their old names cannot migrate forward: reset them (section 18).

### 9.3 No secrets check after the deploy

Nothing to run here. CI writes no edge function secrets (L1), so there is
no value to compare after the deploy, and H1's `FEATUREBASE_JWT_SECRET`
check no longer applies.

### 9.4 The old `AVA_PIPELINE_SERVER_URL` variable on `staging`

Nothing to run here: leave the variable as it is. No workflow reads it
after the promotion, and removing it is not part of this cutover.

### 9.5 Export the catalog from `demo-measles` (once, reads staging)

The catalog exists only on the `demo-measles` branch of `Avandar Staging`
(a Supabase branch: a separate database Supabase runs alongside the
staging project). It is not persistent, so it pauses when idle. This
checks its state first:

```bash
cd "$REPO"
supabase branches list --project-ref "$STAGING_REF" -o json \
  | jq '.[] | select(.name=="demo-measles") | {name, persistent, preview_project_status}'
```

**Expect:** `"persistent": false` and `"preview_project_status":
"ACTIVE_HEALTHY"`.
**If not:** a paused branch must be unpaused, or made persistent, before
the export and before the Parquet copies (9.6 C10, 12.1). Both change
staging's configuration: **CHANGES STAGING CONFIGURATION**, and only you
run them. To unpause, run
`supabase branches unpause demo-measles --project-ref "$STAGING_REF"`, then
run the block above again every minute or so until it reads
`ACTIVE_HEALTHY`.

**The export.** It needs the branch's own connection string, which you
never copy by hand: the CLI prints the branch's settings, and the `sed`
picks out the `POSTGRES_URL_NON_POOLING` line (the branch's direct
connection URL, password included) and hands it to the export script as
`SOURCE_DB_URL`. The block writes the dump into `~/avandar-cutover/catalog`
and records its SHA-256 checksum next to it. Expect it to take several
minutes:

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
2.4 part 1.

**Expect:** `Wrote ... Rows per table:` and a count per table, then the
file's size and its checksum. The dry run on 2026-11-24 wrote a 1.2 GB
dump with:

| Table | Rows on 2026-11-24 |
| --- | --- |
| `public.data_catalog_drives` | 5 |
| `public.data_catalog_listings` | 199,564 |
| `public.data_catalog_listings__relation_columns` | 734,450 |
| `public.pipeline_executions` | 13 |
| `public.pipeline_execution_scopes` | 25 |
| `public.pipeline_scope_checkpoints` | 6 |

Record today's counts in your notes: C4 compares against them. Small
differences from this table are fine if the branch ran a pipeline since.
**If not:** the export refuses to overwrite an existing file, and refuses a
dump that holds anything but catalog rows. Read its message, fix the
cause, and run the block again (it picks a new file name each minute).
An error before any row count, such as a connection error, usually means
the branch is paused: see the paragraph above.

Then check the dump for credentials. The first command counts lines that
look like a Supabase key or a JWT (JSON Web Token, the format of Supabase's
legacy keys); the second shows the first 20 lines that mention `password`,
cut to 160 characters:

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
the branch be deleted (17.3). `CATALOG_DUMP` lives only in this terminal.
In any new terminal that runs the load (the develop terminal in 12.1, for
example), set it again after 2.4 setup, to the newest dump:
`export CATALOG_DUMP="$(ls -t "$CUTOVER_DIR"/catalog/catalog-2*.sql | head -1)"`.

### 9.6 The catalog load procedure

Run it for staging now, and for production in section 12, only after the
release migrated production. Staging first is the rehearsal of the
production load (D5).

**Where:** for staging, the cutover terminal. For production, the develop
terminal (12.1). Run C1 to C10 in that one terminal, in order: each step
reads variables the earlier ones set. The terminal needs 2.4 setup and
`CATALOG_DUMP` (9.5). Much of the time goes to the script reading the 1.2
GB dump: C4, C6, and C9 each sit silent for 5 to 10 minutes before
printing anything, which is normal.

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

**C1. Set the target.** Every later step acts on `TARGET_REF` and
`TARGET_DB_URL`. For staging, run:

```bash
cd "$REPO"
export TARGET_REF="$STAGING_REF" TARGET_DB_URL="$STAGING_DB_URL"
```

For production (section 12), run `cd "$REPO"` and then
`export TARGET_REF="$PROD_REF" TARGET_DB_URL="$PROD_DB_URL"` instead.
Then, for either, check the URL's shape: it must contain the target's ref,
must not use port 6543, and may carry no query except `sslmode`:

```bash
[[ "$TARGET_DB_URL" == *"$TARGET_REF"* && "$TARGET_DB_URL" != *":6543/"* && ( "$TARGET_DB_URL" != *\?* || "$TARGET_DB_URL" == *"?sslmode="* ) ]] && echo "target URL ok"
```

**Expect:** `target URL ok`. The importer accepts the direct host or the
session pooler on 5432, with a percent-encoded password and no query but
`sslmode`. It reads the URL from `TARGET_DB_URL` and refuses one passed as
an argument.
**If not:** the URL is not the target's, or is the transaction pooler: set
it again with 2.4 part 2 or 3, then repeat C1.

**C2. Read-only target checks.** In order, these print the user you
connect as, the owner of each catalog table, the owner of the facet count
refresh function and whether you may run it, whether `pg_cron` (Postgres's
job scheduler) is installed, the open data datasets the replace will
delete (also saved to a file), and the free space for the import's
temporary files:

```bash
read_db "$TARGET_DB_URL" "select current_user"
read_db "$TARGET_DB_URL" "select c.relname, pg_get_userbyid(c.relowner) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('data_catalog_drives', 'data_catalog_listings', 'data_catalog_listings__relation_columns', 'pipeline_executions', 'pipeline_execution_scopes', 'pipeline_scope_checkpoints', 'data_catalog_facet_counts', 'datasets__open_data') order by 1"
read_db "$TARGET_DB_URL" "select pg_get_userbyid(p.proowner), has_function_privilege(current_user, p.oid, 'execute') from pg_proc p where p.oid = 'public.data_catalog_facet_counts__refresh()'::regprocedure"
read_db "$TARGET_DB_URL" "select count(*) from pg_extension where extname = 'pg_cron'"
read_db "$TARGET_DB_URL" "select o.dataset_id, o.workspace_id, w.slug, d.name from public.datasets__open_data o join public.datasets d on d.id = o.dataset_id join public.workspaces w on w.id = o.workspace_id order by w.slug, d.name" | tee "$CUTOVER_DIR/catalog/$TARGET_REF-open-data-datasets-before.txt"
df -h "${TMPDIR:-/tmp}"
```

**Expect:** `postgres`; 8 lines of `<table>|postgres`; `postgres|t`; `0`
(no job scheduler); the open data datasets (on production, the 4 WDI
datasets); and at least 3 GB available on this laptop. Then check the
target's own disk in the browser: Supabase dashboard > the target project
> **Project Settings** > **Compute and Disk** must show free disk of at
least 3 times the dump's size (`ls -lh "$CATALOG_DUMP"` prints the size).
**If not:** a table owned by another user: stop and raise it. A `1` for
`pg_cron`: list its jobs with
`read_db "$TARGET_DB_URL" "select jobname, command from cron.job"`, and if
any job touches the catalog, stop and raise it. Too little disk on either
side: free space first. From now until C10 is done, run no
`ava pipeline run` against the target.

**C3. Probe `session_replication_role`.** The catalog restore that C7
saves needs to set this Postgres setting (it turns off triggers and
foreign key checks while rows are reloaded), and that was verified only on
a local stack. This opens a transaction, sets it, shows it, and rolls
back, so it writes nothing:

```bash
with_db_url "$TARGET_DB_URL" "$PSQL_BIN" -X -P pager=off -v ON_ERROR_STOP=1 \
  -c 'begin' -c 'set local session_replication_role = replica' \
  -c 'show session_replication_role' -c 'rollback'
```

**Expect:** four lines: `BEGIN`, `SET`, `replica`, `ROLLBACK`.
**If not:** `permission denied to set parameter "session_replication_role"`
means the saved restore cannot run on this project, so the only way back
from a bad catalog import would be a Supabase backup restore (14.3). Stop
and decide whether that is acceptable before importing.

**C4. Dry run** (reads only). This runs the import script in dry-run mode:
it checks everything the real import would check and prints its plan, but
writes nothing. The log is saved as `DRY_LOG`, which C4's last block and C5
read:

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
**If not:** a refusal (`The import would refuse ...`) names its reason.
`guard fails`, or other datasets, workspaces, or members than expected:
stop and raise it. Never edit a workspace's members to make the guard
pass. A Storage host other than `none` means the dump is not the one
described in 9.5: stop.

Then save, from the dry run's log, the two confirmations the real import
needs: the target's `<user>@<host>`, and the number of dependent rows the
replace deletes or changes:

```bash
export CONFIRM_TARGET="$(sed -n 's/^Target: \(.*\), database postgres$/\1/p' "$DRY_LOG" | head -1)"
export CASCADE_ROWS="$(sed -n 's/.*The replace deletes or changes \([0-9]*\) dependent rows.*/\1/p' "$DRY_LOG" | head -1)"
echo "cascade rows: $CASCADE_ROWS"
```

**Expect:** `cascade rows: <a number>`, the same number the dry run
printed after `The replace deletes or changes`.
**If not:** an empty number means the dry run did not finish: read the end
of `$DRY_LOG` and run C4 again.

**C5. Back up the target's catalog** (reads the target). The backup is
required: the import checks that it was made with `pg_dump` in the last 24
hours and matches the target's tables, row counts, and ids. Every re-run of
the import needs a fresh one. This block takes the `pg_dump` command the
dry run printed, shows its first 80 characters, runs it from the catalog
folder, and saves the new file's path as `BACKUP_FILE`:

```bash
cd "$CUTOVER_DIR/catalog"
BACKUP_COMMAND="$(grep -m1 '^  with_db_url "\$TARGET_DB_URL" "\$PG_DUMP_BIN" ' "$DRY_LOG" | sed 's/^ *//')"
printf '%s\n' "$BACKUP_COMMAND" | cut -c1-80
eval "$BACKUP_COMMAND"
export BACKUP_FILE="$(ls -t "$CUTOVER_DIR"/catalog/catalog-backup-*.sql | head -1)"
ls -lh "$BACKUP_FILE"
cd "$REPO"
```

**Expect:** the printed command starts `with_db_url "$TARGET_DB_URL"
"$PG_DUMP_BIN" --data-only`, `pg_dump` finishes without output, and `ls`
shows a non-empty backup file. Do not count its `COPY` lines: the importer
checks the rows.
**If not:** an empty printed command means the dry run's log has no backup
command: run C4 again. A `pg_dump` error: fix it and run C5 again.

**C6. Get the restore steps, then stop at the prompt** (writes nothing).
This runs the real import with the backup, which first prints the steps
that would restore the backup. You stop it at its first question, before
it writes anything. The output is saved as `STEPS_LOG`, which C7 reads:

```bash
export STEPS_LOG="$CUTOVER_DIR/catalog/restore-steps-$TARGET_REF-$(date +%Y%m%d-%H%M).log"
bash scripts/catalog-move/importCatalogData.sh "$CATALOG_DUMP" \
  --replace-existing --backup-file "$BACKUP_FILE" 2>&1 | tee "$STEPS_LOG"
```

**Expect:** after the same 5 to 10 minutes of silence, it checks the
backup, prints `To restore the backup later:` with three steps, then the
plan, then asks `Type '<user>@<host>' to continue:`. **Press Ctrl-C at
that prompt.** Nothing was written: the import writes only after both
confirmations.
**If not:** a backup refusal (`older than 24 hours`, `holds ... rows of
..., but the target holds ...`, `holds other ... ids`) prints the backup
command again: repeat C5, then C6.

**C7. Save the restore files.** This makes a folder for this target's
restore (`RESTORE_DIR`), runs the restore's first printed step (an `awk`
command that writes `restore-rows.sql` from the backup), copies the
printed SQL into `restore.sql`, and shows the first and last lines:

```bash
export RESTORE_DIR="$CUTOVER_DIR/catalog/restore-$TARGET_REF-$(date +%Y%m%d-%H%M)"
mkdir "$RESTORE_DIR" && cd "$RESTORE_DIR"
bash -c "$(grep -m1 '^       awk -v schema=' "$STEPS_LOG" | sed 's/^ *//')"
sed -n '/^       \\set ON_ERROR_STOP on$/,/^       commit;$/s/^       //p' "$STEPS_LOG" > restore.sql
head -1 restore.sql; tail -1 restore.sql; ls -l restore-rows.sql
cd "$REPO"
```

**Expect:** `\set ON_ERROR_STOP on`, then `commit;`, then an `ls -l` line
for a non-empty `restore-rows.sql`. Keep this folder until section 17.
**If not:** `mkdir` fails if the folder exists (two runs in one minute):
wait a minute and run the block again. A different first or last line
means C6's log is incomplete: run C6 again.

**C8. Foreign key pre-flight** (one read-only transaction). The restore
checks every foreign key (a column that must match a row in another table)
of the restored tables before it commits. This runs that same check on
today's data now, read-only, to show the restore could pass:

```bash
cd "$RESTORE_DIR"
sed -n '/^do \$foreign_keys\$$/,/^end \$foreign_keys\$;$/p' restore.sql > foreign-key-check.sql
wc -l < foreign-key-check.sql
with_db_url "$TARGET_DB_URL" "$PSQL_BIN" -X -P pager=off -v ON_ERROR_STOP=1 \
  -c 'begin transaction read only' -f foreign-key-check.sql -c 'rollback'
cd "$REPO"
```

**Expect:** a line count above 10, then `BEGIN`, `DO`, `ROLLBACK`.
**If not:** `The restore left rows of ... whose (...) match no row of ...`
means today's data would already fail the restore's check, so the restore
could not be used: stop and raise it.

**C9. Import.** **WRITES TO STAGING** for staging. **WRITES TO
PRODUCTION** for production. Run it at a quiet hour. This prints the
cascade count from C4, then runs the import for real with the backup from
C5 and the two confirmations from C4, and logs everything to an `import-`
file in the catalog folder:

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
leaves the old catalog intact. **Verify:** time the staging run, and plan
for production to take about as long.

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

Then check the result with four read-only queries: the facet counts were
rebuilt, the listing count, no WDI dataset is left, and no pipeline
execution row carries a command line, user, or host from the source:

```bash
read_db "$TARGET_DB_URL" "select count(*) from public.data_catalog_facet_counts"
read_db "$TARGET_DB_URL" "select count(*) from public.data_catalog_listings"
read_db "$TARGET_DB_URL" "select count(*) from public.datasets d where d.name = 'World Development Indicators (WDI)'"
read_db "$TARGET_DB_URL" "select count(*) from public.pipeline_executions where cli_argv is not null or actor is not null or host is not null"
```

**Expect:** a number above 0; the dump's listing count (note it for C10);
`0` on production (staging may have its own); `0`.
**If not:** a `0` facet count or a different listing count: stop and raise
it. A non-zero last count means the dump carried private run details:
stop and raise it.

**C10. Copy the Parquet objects.** **WRITES TO STAGING** Storage for
staging. **WRITES TO PRODUCTION** Storage for production. The source branch
must be `ACTIVE_HEALTHY` (9.5). This copies the cached Parquet files
(columnar data files the catalog previews read) from the `demo-measles`
branch's Storage into the target's. The block finds the branch's own ref,
checks it is neither staging nor production, checks that no listing uses
the legacy WDI paths, fetches both projects' secret keys with the CLI into
variables (you copy nothing), and starts the copy script:

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

The script takes no argument but `--yes-i-know-the-target <host>`, and has
no dry run. It prints `Source: ... (read only)` and `Target: ...`, then
asks `Type the target host (<host>) to copy into it:`. Type the host it
shows in the parentheses and press Enter.
**Expect:** `source ref ok`; `0` (no listing uses the legacy WDI paths);
`keys ok`; then `Listings processed <N> of the target's <M>: copied <c>,
already in the target <a>, replaced 0, failed 0.` with `N` equal to `M` and
to C9's listing count, and `exit 0`. It reads every listing and copies the
cache folders of the listings that have one (12 `ready` listings on
2026-11-24), so `c` counts objects, not listings. Run the block again: the
second run must copy 0 and replace 0. Then forget the two keys:

```bash
unset SOURCE_SECRET_KEY TARGET_SECRET_KEY
```

**If not:** if `source ref ok` is missing, nothing was copied: **verify**
the branch listing's field name with
`supabase branches list --project-ref "$STAGING_REF" -o json | jq '.[0] | keys'`.
If `keys ok` is missing, nothing was copied: a project has no new-style
secret key, so stop and raise it. Each failed object is logged with its
path: run the block again until `failed` is 0. `The copy processed a
different number of listings than the target holds. Re-run it.` (exit 1):
run the block once more, and if `N` and `M` still differ, stop. `The target
has no catalog listings` means C9 has not run.

### 9.7 Staging checks

This picks two listings to test: one whose data is cached as Parquet in
Storage, and one that loads from its source's API. Each prints as
`<id>|<name>`:

```bash
read_db "$STAGING_DB_URL" "select id, display_name from public.data_catalog_listings where parquet_cache_status = 'ready' limit 1"
read_db "$STAGING_DB_URL" "select id, display_name from public.data_catalog_listings where access_kind = 'api_resource' and parquet_cache_status is distinct from 'ready' limit 1"
```

Then, in the browser, on `https://staging.avandarlabs.com`, with the
browser's network panel open (Developer Tools > **Network**), check each
row:

| Check | Pass |
| --- | --- |
| Sign in | Signed in |
| Browse the catalog | Listings and facet counts appear |
| Open the first listing above and preview it, or add it to a test workspace | Data loads. Every Storage request goes to the staging project's host, none to the `demo-measles` branch's |
| Open the second listing above | Its preview loads from its API |
| Install the epidemiology plugin in a test workspace | It installs and its pages open |
| Cmd+K | `0.15.0-dev` |

The Storage host is the project URL's host: `<STAGING_REF>.supabase.co`
for staging, and the branch's own ref for `demo-measles`.
**If not:** stop before section 10 and raise what failed. Production is
still untouched.

## 10. Back up production

Do all of section 10 in the cutover terminal, after section 9 and right
before section 11: choose the rollback basis, take the backup, and test that
it restores, all **before** `ava release` pushes `main` (11.4). The order
matters because the push deploys the new app at once (Vercel), and every
minute between the push and the migration is a minute of the new app on the
old schema. So the backup comes first, and 11.5's approval follows the
moment `migrate` asks for it.

Production is quiet (no active users, D4), so a backup taken shortly before
the release is current. Any production write between this backup and the
migration would be missing from it if you restore it (option B). PITR
(option A) covers that gap, since it restores to any second.

### 10.1 Choose the rollback basis (before 11.4)

This lists production's backups: the daily scheduled ones, with their
times, and whether PITR (point-in-time recovery, which can restore to any
second) is on:

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

**Expect:** no output: `postgres` may truncate and insert into every one.
**If not:** each printed table is one `postgres` cannot reload, so option B
is impossible: choose A.

Then choose one of the two options and note which in your notes (11.2
asks for it):

| Option | What it costs | What a restore loses |
| --- | --- | --- |
| **A (recommended if affordable).** Turn PITR on for the cutover window: Supabase dashboard > **Avandar** > **Project Settings** > **Add-ons** > **Point in time recovery** > choose a retention period > confirm. **WRITES TO PRODUCTION** (project configuration and billing). Turn it off once the release is settled (17.1). | The add-on's price for the days it is on. **Verify** the price, and whether the compute size must grow first. A compute upgrade restarts the database: a short outage, so do it at a quiet hour, well before the release | Only writes after the second you restore to |
| **B.** No PITR. Start 11.4 right after the daily scheduled backup (its time is in `backups list`), and restore with that backup plus the top-up 10.3 tests | Nothing | Writes since the scheduled backup outside `public` and `auth` (for example Storage rows of files uploaded since: the files stay, the app no longer sees them), and every write after 10.2 |

Whichever you choose, write the truncate file that 10.3 tests and 14.3
uses after a scheduled-backup restore. This only writes a file on this
laptop, `~/avandar-cutover/rollback-truncate.sql`, and prints nothing:

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

**When:** after 10.1, right before section 11. Writes made between this
backup and the migrations are lost if you restore it under option B, so go
on to section 11 as soon as 10.3 passes.

**Where:** the cutover terminal. Run 10.2 and 10.3 in this same terminal: 10.3 reads
`BACKUP_T`, which 10.2 sets. The first line moves the terminal into the
rehearsal worktree, which is expected. The block saves production's row
counts, dumps the roles, schema, all data, the `public` and `auth` data on
their own, and the migration history, then records the backups list, the
edge function secrets (names and digests only), and the deployed functions.
The dumps take several minutes:

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

**Expect:** `1` for each of the two data files; a backups list that
matches 10.1's choice (PITR on, or a scheduled backup minutes old); and no
errors. `ls -l "$D"/prod-"$BACKUP_T"-*` shows every file non-empty, and the
secrets file lists names and digests only.
**If not:** a `0`, an empty file, or an error: run the block again (it
uses a new time stamp). The secrets file is a record only: the release
does not change edge function secrets, since CI writes none (L1).

### 10.3 Verify the dump restores

**Where:** the cutover terminal, right after 10.2. This runs on the
rehearsal's local stack only, behind `on_rehearsal_stack`, and rehearses
option B: the rehearsal dump from 4.2 stands in for the scheduled backup,
then the top-up empties every `public` and `auth` table and loads this
backup's rows. Then it prints the local row counts:

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

**Expect:** the reset's output, psql's output with no `ERROR`, and then
the same counts as `cat "$D/prod-$BACKUP_T-counts.txt"` prints.
**If not:** if nothing ran, `on_rehearsal_stack` failed: stop, check that
this terminal had 2.4 setup, and that `echo "$REHEARSAL"` prints the
rehearsal worktree. If the reset fails because the rehearsal stack is stopped
(`ava supabase status` says `Local Supabase is not running`), start it only
behind the guard, `on_rehearsal_stack && ava supabase start`, then run the
block again. For any other failure, do not start section 11: nothing has
been released yet. Fix the cause, take the backup again (10.2), and test again. A
failure with `cannot truncate a table referenced in a foreign key
constraint` names a table outside `public` and `auth`: never add
`CASCADE`. Raise it, and choose option A. A failure on an `auth` table that
4.5 had to exclude means the local Auth version differs from production's,
and 10.2's `-data-app` dump excludes nothing. This compares the `auth`
tables and columns the dump loads with the local stack's:

```bash
grep '^COPY auth\.' "$D/prod-$BACKUP_T-data-app.sql" | sed 's/ FROM stdin;$//' | LC_ALL=C sort > "$D/auth-tables-dump.txt"
read_db "$LOCAL_DB_URL" "select format('COPY auth.%I (%s)', c.relname, string_agg(format('%I', a.attname), ', ' order by a.attnum)) from pg_class c join pg_namespace n on n.oid = c.relnamespace join pg_attribute a on a.attrelid = c.oid where n.nspname = 'auth' and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped and a.attgenerated = '' group by c.relname order by 1 collate \"C\"" > "$D/auth-tables-local.txt"
diff "$D/auth-tables-dump.txt" "$D/auth-tables-local.txt" && echo "same auth tables"
```

If `same auth tables` does not print, the lists differ (`diff` shows how):
this test cannot pass here and option B stays untested. Choose option A,
turn PITR on (10.1), and only then release (section 11).

## 11. Release

### 11.1 Build `ava` on `develop`

`ava` is one global symlink to whichever worktree last ran
`pnpm build:ava-cli`. Build it from `develop` after the promotion landed,
never from another worktree.

**Where:** open a new terminal. This becomes the develop terminal for the
rest of the release. The block moves it into the `develop` worktree,
checks that the local `develop` matches GitHub's, installs packages,
builds `ava`, and shows where the `ava` link points and the first lines of
`ava release --help`:

```bash
cd "$(wt go develop)"
git fetch origin && git status -sb
[[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/develop)" ]] && echo "develop in sync"
pnpm install --frozen-lockfile
pnpm build:ava-cli
readlink "$(dirname "$(which pnpm)")/ava"
ava release --help | sed -n '1,3p'
```

**Expect:** `## develop...origin/develop` with no changed files listed,
then `develop in sync`; the `readlink` path ends in this worktree's
`apps/ava-cli/dist/main.cjs`; and the help starts `ava release: publish a
new release of the Avandar app.` and says `main becomes an exact copy of
develop`.
**If not:** no `develop in sync` means the local `develop` is behind or
ahead: run `git pull --ff-only` here (or reset it as 3.3 shows), then run
the block again. An older help text, or a link into another worktree,
means another worktree's build: run `pnpm build:ava-cli` here again.

Then, in this same terminal, which is now in the `develop` worktree, paste
2.4 setup parts 1 and 2. Part 3 (staging) is not needed here.

### 11.2 Preconditions

**Where:** the develop terminal. This shows the newest `staging.yaml` run
on `develop` and the commit `origin/develop` is at:

```bash
gh run list --workflow staging.yaml --branch develop --limit 1 --json headSha,status,conclusion
git rev-parse origin/develop
```

Then run 5.6's block here, and confirm from your notes that 5.1 printed the
reviewer rule, 6.4's pipeline server answers, 6.6's edge function secrets
are set on production if you chose to set them now (recommended, not
blocking), 4.8's audit refresh is done, 10.3 passed, and PITR is on if 10.1
chose A.
**Expect:** the run's `headSha` equals the commit printed on the next
line, with `"status":"completed"` and `"conclusion":"success"`. `ava
release` reads the same `staging.yaml` run: its verdict covers the whole
run, `test-e2e` included, and with `--yes` it stops on any verdict but a
pass (A2).
**If not:** if the run is still going, wait for it. If it failed, re-run
its failed jobs until it passes. This block finds the run for
`origin/develop`'s commit and re-runs only its failed jobs:

```bash
git fetch origin && export DEVELOP_SHA="$(git rev-parse origin/develop)"
export STAGING_RERUN_ID="$(gh run list --workflow staging.yaml --branch develop --limit 5 --json databaseId,headSha --jq ".[] | select(.headSha == \"$DEVELOP_SHA\") | .databaseId" | head -1)"
[[ -n "$STAGING_RERUN_ID" ]] && gh run rerun "$STAGING_RERUN_ID" --failed
```

Nothing re-runs when no `staging.yaml` run exists for `origin/develop`'s
commit yet: wait for it to start, then run the block again.

### 11.3 Dry run

**Where:** the develop terminal. This rehearses the release and changes
nothing:

```bash
ava release --dry-run --skip-changelog
```

The dry run asks both version questions too (11.4): press Enter twice to
accept the defaults.
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
**If not:** a preflight or CI line other than the ones above names the
problem: fix it (11.1 for the preflight, 11.2 for CI) and run the dry run
again.

`--skip-changelog` skips the release notes: on 2026-11-24 there were 2,673
non-merge commits from `v0.14.1` to the integration branch, too many for
one generated summary, and a dry run without it makes a real OpenAI call.
The promotion PR is the record. Notes can be published later with
`ava release notes --version 0.15.0`.

### 11.4 Release (**PUSHES** `main`: from this push, Vercel deploys the new app to production)

`ava release` runs on `develop` only. Do not pass `--yes` or
`--skip-ci-check`. With `--yes`, a CI verdict other than a pass (failed,
pending, missing, or unknown) **stops** the release (A2). Without `--yes`
it asks. Overriding a non-passing verdict takes `--skip-ci-check`: never
here.

**What the push to `main` starts.** Two things, at once and independently:

- **Vercel deploys the new app to production.** Its Git integration builds
  `main` and makes it the Production deployment of `app.avandarlabs.com`
  within a few minutes. From then on, production serves the new app
  against the old schema and the old edge functions, until 11.5's
  `migrate` job finishes. Production has no active users (D4), which is
  why this is acceptable for this release (11.8).
- **`production.yaml` starts.** It runs `lint-typecheck` (about 3 minutes)
  and `test-quick` (about 12 minutes), and then its `migrate` job waits for
  your approval (11.5). Nothing writes to the database until you approve.

10.2 and 10.3 must have passed before you start this step.

**Where:** the develop terminal. Answer the prompts as the table after the
block says:

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
not a GitHub keyword, and Vercel does not read it either: each of the two
`develop` pushes starts a `staging.yaml` run and a Vercel staging build.
Both runs simply run. Their `migrate` jobs find no migration to apply,
since staging already has every file (9.2), and deploy the same edge
functions again, so the flake (9.1) can fail either one: re-run it as 9.1
says. The run for `Bump version to 0.15.1-dev` is the one the next release
checks, so it must end green. `ava release` checked staging's CI verdict
before it pushed anything.

**If not:** if the release stops with an error, find the message in the
first column below and do what the last column says, in the develop
terminal:

| Release fails at | State | Do |
| --- | --- | --- |
| Before `Setting develop to 0.15.0` | Nothing changed | Fix, run again |
| `Could not push develop` | Nothing released. A local version commit exists | `cd "$(wt go develop)" && git reset --hard origin/develop`, fix the push, run again |
| `Could not push main and v0.15.0` | `develop` is at `0.15.0` and pushed. `main` and the tag are not | Wait for the new `staging.yaml` run to pass, then `cd "$(wt go develop)" && ava release --version 0.15.0 --next 0.15.1 --skip-changelog` |
| `v0.15.0 is released, but develop could not be bumped to 0.15.1-dev` | Released | `cd "$(wt go develop)" && pnpm version 0.15.1-dev --no-git-tag-version && git commit -m "Bump version to 0.15.1-dev [skip deploy]" -- package.json && git push origin HEAD:refs/heads/develop` |

### 11.5 Approve the `migrate` job (**WRITES TO PRODUCTION**: approving runs the migrations)

**Where:** the develop terminal, then GitHub in the browser. This waits 15
seconds for GitHub to start the `production.yaml` run for the new `main`,
saves its id as `RUN_ID` (and in a file, for the rollback), and follows it
live:

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

When `test-quick` passes, about 15 minutes after the push, the `migrate`
job waits for your approval, and `gh run watch` keeps waiting with it.
**Approve it right away**: the backup (10.2) already exists, and every
minute of waiting is a minute of the new app on the old schema.

1. In the browser, open the run's page: GitHub > **Actions** >
   **CI/CD for Production** (left sidebar; the workflow file is
   `production.yaml`) > the newest run, or run
   `gh run view "$RUN_ID" --web` in another terminal. Click **Review
   deployments**, tick `production`, and click **Approve and deploy**.
   This approval is the production write: the job then migrates
   production and deploys the edge functions without asking again.
2. Keep following the run with `gh run watch "$RUN_ID"` in the develop
   terminal, or on the run's page. 11.6 says what each step does.

### 11.6 What each step of the `migrate` job does and prints

These are `production.yaml`'s jobs and steps as `develop` has them. GitHub
names each unnamed step "Run" and the first line of its command:

| Order | Job or step | Touches production | Prints |
| --- | --- | --- | --- |
| 1 | `lint-typecheck` (about 3 minutes) | No. Vercel already serves the new app (11.4) | Lint and type-check output |
| 2 | `test-quick` (about 12 minutes), with `test-e2e` alongside, which does not block `migrate` | No | Test output. These jobs use the `staging` environment's test secrets |
| 3 | `migrate` waits for approval (11.5) | No | |
| 4 | `migrate`: `Run supabase link --project-ref $SUPABASE_PROJECT_ID` | No | The link output. The project ref is masked (11.9) |
| 5 | `migrate`: `Run supabase db push` | **Yes** | One line per migration it applies, `$PROD_PENDING` of them (80 at the 2026-11-24 tip), in timestamp order. Plain `db push`, with no `--include-all`, is enough: every pending file is newer than production's newest applied file (4.6). On the last production release it took 2 seconds |
| 6 | `migrate`: `Run supabase functions deploy` | **Yes** | One line per function. Production gains `connectors`, `file-url`, and `geocode`, and possibly `_eval` (**verify** in the log). It took 33 seconds last time |

The job never changes production's edge function secrets: they stay as
set by hand on the project (6.6).

**Re-runs.** `production.yaml` has no concurrency group and does not check
that its commit is still the tip of `main`. A re-run, or a
`workflow_dispatch` run started on `main`, migrates and deploys the
functions of the commit that run checked out. `db push` applies only the
files production lacks, but `functions deploy` deploys that run's code, so
only ever re-run the newest run. The `production` environment allows only
`main` (5.1), so a run started on another branch cannot use it.

**The functions deploy flake** (9.1) can fail step 6 here too: about one
attempt in two, with `Module not found ".../packages/shared/utils/src/sql/index.ts"`.
The migrations are already applied by then, so production runs the new
schema with the old edge functions until a re-run passes. GitHub re-runs
jobs only after the whole run has ended, and `test-e2e` runs about 15
minutes longer than `migrate`, so wait for `gh run watch` to end. Then, in
the develop terminal, this shows whether the failure is the flake and
re-runs only the failed jobs:

```bash
gh run view "$RUN_ID" --log-failed | grep -F 'Module not found' | head -3
gh run rerun "$RUN_ID" --failed
```

The re-run's `migrate` waits for approval again: approve it on the run's
page as in 11.5 (**WRITES TO PRODUCTION**), then follow it with
`gh run watch "$RUN_ID"`. The repeated `db push` finds nothing to apply.
Repeat until `migrate` is green.

If the run fails anywhere else, find the failed step in the first column
below and do what the last column says. Re-run commands run in the develop
terminal, which holds `RUN_ID`:

| Fails at | Production | Do |
| --- | --- | --- |
| `lint-typecheck` or `test-quick` | `migrate` never runs: the database and functions are untouched, but Vercel already serves the new app on the old schema | Decide at once. A flaky test (section 18, "Quick suite flake"): `gh run rerun "$RUN_ID" --failed`, then approve as in 11.5. A real failure: fix forward (a fix on `develop`, staging green, `ava release`), or promote the previous Vercel deployment (14.5) until the fix is released |
| `Run supabase link` | Untouched database, new app | Read the step's log, fix the cause, then re-run the same way. Approve again |
| `Run supabase db push` | Partly migrated: each file applies in its own transaction, so the files before the failing one stay applied | Read 11.9 first, then section 14 (14.1, row "A migration fails midway") |
| `Run supabase functions deploy`, with `Module not found` | Migrated, old functions | The flake: the block above |
| `Run supabase functions deploy`, another error | Migrated, old functions | Fix the cause and re-run the failed jobs of the newest run at once. Approve again |

### 11.7 Check the version

**Where:** the develop terminal, after the run's `migrate` job finished.
This lists each job's result, then production's newest migration and
count:

```bash
gh run view "$RUN_ID" --json jobs --jq '.jobs[] | [.name, .conclusion] | @tsv'
read_db "$PROD_DB_URL" "select max(version), count(*) from supabase_migrations.schema_migrations"
```

**Expect:** a line `migrate`, a tab, `success` (the other jobs may still
run: `test-e2e` does not block `migrate` and does not decide this check);
then `20261123200200|<n>`, where `<n>` is the tip's migration file count
(`ls supabase/migrations | wc -l` in the develop worktree prints it, 195 at
the 2026-11-24 tip). Go to section 12, then 13, without delay.
**If not:** a `migrate` line with `failure`: 11.6. A lower migration
version or count: the migration step did not finish, so read its log (11.9
first) and go to 14.1.

### 11.8 The migration window

Two windows, both accepted for this release because production has no
active users (D4):

- **New app, old schema.** From the push in 11.4 until `Run supabase db
  push` finishes, production serves the new app against the old schema and
  the old edge functions. That is at least about 16 minutes
  (`lint-typecheck`, `test-quick`, and the start of `migrate`), plus however
  long the approval waits. Anything in the new app that needs a table,
  column, or function the pending migrations add, or one of the new edge
  functions, fails in that window. If `test-quick` fails, the window stays open until
  a fix is released or the previous Vercel deployment is promoted (11.6,
  14.5).
- **New schema, old functions.** From `Run supabase db push` until `Run
  supabase functions deploy` finishes: under a minute, or until a re-run
  passes when the flake strikes (11.6).

A browser tab opened before the Vercel deployment keeps the old app until
it reloads, and the old app breaks once the migrations rename catalog
tables, add a parameter to `rpc_datasets__add_open_data_dataset`, and drop
`individuals.status`. Staging's run measured the steps. To see how long each step of
staging's `migrate` job took, run this in the cutover terminal, where 9.1
set `STAGING_RUN_ID` (the develop terminal does not have it):

```bash
gh run view "$STAGING_RUN_ID" --json jobs \
  --jq '.jobs[] | select(.name == "migrate") | .steps[] | [.name, .startedAt, .completedAt] | @tsv'
```

It prints one line per step: its name, start time, and end time.

### 11.9 The Actions logs are public

The repository and its Actions logs are public. The project ref is masked
in the Actions logs because `PRODUCTION_PROJECT_ID` is a secret there, but
the ref itself is public elsewhere: the web app's bundle carries it, and so
does 2.4. A failed `supabase db push` can print Postgres error details,
including row data. **If `Run supabase db push` fails** on staging or
production, copy what you need from its log into your private notes, then
delete the run's logs in the browser: GitHub > **Actions** > the run > the
**...** menu at the top right > **Delete all logs**. Anyone can read them
until you do.

## 12. Load the catalog into production

Only after 11.7 passed: production has no `data_catalog_listings` table
before the release.

**Where:** the develop terminal, which has 2.4 setup parts 1 and 2 (11.1).

### 12.1 Run the load procedure for production

1. In the develop terminal, set `CATALOG_DUMP` to the dump 9.5 made:
   `export CATALOG_DUMP="$(ls -t "$CUTOVER_DIR"/catalog/catalog-2*.sql | head -1)"`,
   then `echo "$CATALOG_DUMP"` must print its path.
2. Run 9.6 from C1 to C10 in this terminal, with the production target in
   C1: `cd "$REPO"`, then
   `export TARGET_REF="$PROD_REF" TARGET_DB_URL="$PROD_DB_URL"`.
3. C9 and C10 are **WRITES TO PRODUCTION**. Take a fresh backup in C5: the
   staging one is for staging only.
4. Production's dry run (C4) must list exactly the 4 WDI datasets, in your
   4 single-member test workspaces, each with `guard passes`, and drop the
   6 WDI listings. Anything else: stop, as C4 says.

### 12.2 Check one listing loads from production's Storage

This picks one listing whose data is cached in production's Storage:

```bash
read_db "$PROD_DB_URL" "select id, display_name from public.data_catalog_listings where parquet_cache_status = 'ready' limit 1"
```

In the browser, open that listing (by its name) in
`https://app.avandarlabs.com`'s catalog and preview it, or add it to a
test workspace, with the network panel open (Developer Tools >
**Network**).
**Expect:** the data loads, and every Storage request goes to production's
project host (`<PROD_REF>.supabase.co`), none to the `demo-measles`
branch's.
**If not:** stop, and keep the `demo-measles` branch: 17.3 deletes it only
after this passes. A request to the branch's host means the copy (C10) did
not run for production, or a listing still points at the branch: raise it.

### 12.3 The catalog restore, and its limits

Run this only if the catalog import went wrong (14.1). The restore C7
saved is the only quick way back from a bad catalog import. **WRITES TO
PRODUCTION.** Connect as `postgres` through the direct host or the
**session** pooler, never the transaction pooler (port 6543), where
session settings leak between clients. `PROD_DB_URL` from 2.4 part 2 is
already the session pooler. psql must understand `\restrict` (17.6 or
newer), which `PSQL_BIN` from 2.4 part 1 does.

**Where:** the develop terminal, where you ran 12.1, so `TARGET_REF`,
`RESTORE_DIR`, and `TARGET_DB_URL` are production's. In a new terminal,
see the last paragraph of this subsection first. The block moves into the
restore folder, checks that the folder and the URL both belong to the
target, runs the restore, and prints the counts afterwards:

```bash
cd "$RESTORE_DIR" &&
  [[ "$RESTORE_DIR" == *"/restore-$TARGET_REF-"* && "$TARGET_DB_URL" == *"$TARGET_REF"* ]] &&
  with_db_url "$TARGET_DB_URL" "$PSQL_BIN" -X -P pager=off -v ON_ERROR_STOP=1 --file restore.sql
read_db "$TARGET_DB_URL" "select (select count(*) from public.data_catalog_listings), (select count(*) from public.datasets__open_data), (select count(*) from public.datasets)"
cd "$REPO"
```

The guard runs the restore only when the restore folder (C7 names it
`restore-<ref>-<time>`) and the URL are both the target's. If psql printed
nothing, the guard refused and nothing ran: check
`echo "$TARGET_REF" "$RESTORE_DIR"` (never echo the URL).

What it does: in one transaction (`ON_ERROR_STOP` on, `lock_timeout` 10s)
it stages the backup in a `catalog_restore` schema (dropped before commit),
checks the staged row counts equal the backup's, deletes the catalog,
inserts the backed-up rows under `session_replication_role = replica`,
checks every foreign key of the restored tables, and commits.
**Expect:** `COMMIT`, then counts equal to the ones under `The target
holds, per table:` near the top of the import log (`import-<ref>-<time>.log`
in `~/avandar-cutover/catalog`), which is the state before the import.
**If not:** an `ERROR` line means the transaction rolled back and nothing
changed. The foreign key check's message names the rows that no longer
match: raise it rather than forcing the restore.

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

**In a new terminal** (if the develop terminal is gone): `cd "$(wt go
develop)"`, paste 2.4 setup parts 1 and 2, then run
`export TARGET_REF="$PROD_REF" TARGET_DB_URL="$PROD_DB_URL"`, then
`export RESTORE_DIR="$(ls -dt "$CUTOVER_DIR"/catalog/restore-"$PROD_REF"-* | head -1)"`,
then the restore block above.

## 13. Smoke test

**Where:** the browser, on `https://app.avandarlabs.com`, as soon as 11.7
and 12 pass. The last row runs in the develop terminal. Check each row and
note the result in your own notes:

| Check | Pass |
| --- | --- |
| Sign in with an existing production account | Signed in |
| Open the old dashboards from 4.7, at `https://app.avandarlabs.com/<slug>/dashboards/edit/<id>` | They render, with data |
| Browse the catalog | The new catalog, with facet counts |
| Run a query on an existing dataset | Results appear |
| Install the epidemiology plugin in one of your test workspaces | It installs and its pages open |
| Cmd+K | Shows `0.15.0` |
| Search for an address where the app offers address search (the `geocode` function) | Results appear, if 6.6 set `GEOAPIFY_API_KEY` on production. Without it the search answers 503, `Address search is not configured`: expected, and fixed by setting it with 6.6, not a reason to roll back |
| `supabase functions list --project-ref "$PROD_REF"` | Every function shows an update time from this release |

**If not:** go to section 14 and use its first table (14.1) to decide what
to do.

## 14. Rollback

**Where:** the rollback terminal: open a new terminal, run
`cd "$(wt go develop)"`, then paste 2.4 setup parts 1 and 2. Part 2 asks
for production's database password and Session pooler URI again, exactly
as in 2.4. Use the `develop` worktree for this setup even when you later
deploy older code (14.4): the setup's `supabase` must stay the 2.114.0 CLI
from that worktree. Browser steps say which site.

### 14.1 Decide

Find the row that matches what happened, and do what it says:

| Situation | Do |
| --- | --- |
| `production.yaml` failed before `Run supabase db push` | The database and edge functions are untouched, but Vercel already serves the new app on the old schema (11.8). No database rollback: fix forward and release again, or promote the previous Vercel deployment (14.5) until the fix is released |
| A migration fails midway | Production is partly migrated, and once a rename has applied, the old app is broken. A transient error (network, lock timeout): re-run the failed jobs of the newest run and approve again (11.6), and `db push` resumes at the first unapplied file. A bug in a migration, or production data it cannot handle: restore (14.3). `db push` stops at the failing file, so a later-timestamped migration cannot get past it. A fix needs a new migration timestamped before the failing file (staging applies it out of order with `--include-all`), a PR, staging's full CI including `test-e2e`, and `ava release`: hours, not one |
| Migrations applied, a later step failed | Re-run the failed jobs of the newest run (11.6). Not a rollback |
| The catalog import is wrong | 12.3, promptly |
| Deployed, with a bug that loses no data | Fix forward: a fix on `develop`, then `ava release` |
| Deployed, and users are losing data, or the app is unusable with no fix in about an hour | Restore (14.3), redeploy `main`'s previous functions (14.4), promote the previous Vercel deployment (14.5) |

There is no partial rollback: the old app does not match the migrated
schema, and the schema cannot be rolled back without the data.

### 14.2 Stop deploys after a restore

Do this as soon as you decide to restore (14.3), so that no push to `main`
migrates the restored database again. It does not stop Vercel: its Git
integration stays connected, so any push to `main` still deploys that
commit's app to production, whatever the workflow does. In the rollback
terminal:

```bash
gh workflow disable production.yaml
```

**CHANGES GITHUB SETTINGS.** It prints nothing on success. Never move
`main` back to an older commit: that push is itself a production deploy.

A disabled workflow does not run on a push, so the fix release would not
migrate, while Vercel would still deploy its app. When the fix is ready,
enable the workflow right before its
`ava release` (11.4), or enable it afterwards and start the run for the new
`main` by hand (`gh workflow run production.yaml --ref main`), then approve
it as in 11.5. **CHANGES GITHUB SETTINGS.** This is the command that
turns it back on, for that later moment, not now:

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

First, in the rollback terminal (2.4 setup parts 1 and 2 done), recover
the backup's time stamp and the production run's id. Both live in files
from 10.2 and 11.5, so this works in any new terminal:

```bash
export BACKUP_T="$(ls -t "$D"/prod-2*-counts.txt | head -1 | sed -E 's#.*/prod-([0-9]{8}-[0-9]{4})-counts\.txt#\1#')"
export RUN_ID="${RUN_ID:-$(cat "$CUTOVER_DIR/production-run-id-0.15.0")}"
echo "backup $BACKUP_T, run $RUN_ID"
```

**Expect:** `backup <date>-<time>, run <number>`: the time stamp of 10.2's
files and the run id 11.5 saved. 14.4 uses both as well.
**If not:** an empty value means the file is missing: check
`ls "$D"` and `ls "$CUTOVER_DIR"`. You are probably in a terminal without
2.4 setup part 1.

Then follow only the option 10.1 chose: A, B, or (as a last resort) C.

**A. PITR.** Restore to the second before the **first** attempt's `Run
supabase db push` step (in the `migrate` job) started. A re-run of failed
jobs (11.6, 14.1) is a later attempt, and its `Run supabase db push`
started after the first attempt's migrations had applied, so restoring
there leaves production partly migrated. This block reads that start time
from GitHub, takes 5 seconds
off it, saves the result as `RESTORE_TO` (seconds since 1970, the form
the CLI takes), and prints it in UTC and in local time, next to the
backup's local time:

```bash
RUN_ID="${RUN_ID:-$(cat "$CUTOVER_DIR/production-run-id-0.15.0")}"
STARTED_AT="$(gh run view "$RUN_ID" --attempt 1 --json jobs --jq '.jobs[] | select(.name == "migrate") | .steps[] | select(.name == "Run supabase db push" and .conclusion != "skipped") | .startedAt')"
echo "$STARTED_AT"
RESTORE_TO=""
STARTED_EPOCH="$(date -j -u -f '%Y-%m-%dT%H:%M:%SZ' "$STARTED_AT" +%s)" &&
  RESTORE_TO="$(( STARTED_EPOCH - 5 ))" &&
  date -u -r "$RESTORE_TO" &&
  date -r "$RESTORE_TO" '+local %Y%m%d-%H%M%S'
echo "backup taken at local $BACKUP_T"
```

**Expect:** the start time from GitHub, then the restore time in UTC, then
a `local <date>-<time>` line, then `backup taken at local <date>-<time>`.
Check that the restore time is after the backup in 10.2 (`BACKUP_T` is
local time, so compare it with the `local` line) and after you approved in
11.5: the job only checks out the code, installs the CLI, and runs
`supabase link` between the approval and `Run supabase db push`, so the
restore point is seconds after the approval (10 seconds on the last
production release).
**If not:** an empty `STARTED_AT`, or an error from `date`, means attempt 1
never reached `Run supabase db push` (it failed earlier, for example in
`test-quick` or `Run supabase link`): run the block
again with `--attempt 2`, and so on, and take the first attempt that
prints a time. The restore below uses the `RESTORE_TO` of the last time
the block ran. Run the restore right after the block that printed the time
you chose. Do not re-run the time block in between.

Only when the time is right, restore. **WRITES TO PRODUCTION**. The guard
runs the restore only when `RESTORE_TO` is a 10-digit number:

```bash
[[ "$RESTORE_TO" =~ ^[0-9]{10}$ ]] && supabase backups restore --project-ref "$PROD_REF" --timestamp "$RESTORE_TO"
```

Or do the same in the browser: Supabase dashboard > **Avandar** >
**Database** > **Backups** > **Point in time** > pick the same time (the UTC
line printed above; the dashboard may show local time, so check which) >
restore. **Verify:** `supabase backups restore --help` lists
`--timestamp`. The project is unavailable while it restores: the
dashboard shows its progress. That can take a while.

When the dashboard shows the project as healthy again, check its
migration state:

```bash
read_db "$PROD_DB_URL" "select max(version), count(*) from supabase_migrations.schema_migrations"
```

**Expect:** `20261013212914|115`, production's state before the release.
**If not:** a later version means the restore point is after a migration
applied: restore again to an earlier second, never later than the time
printed above.

Then go to 14.4.

**B. Scheduled backup, then the top-up.** In the browser: Supabase
dashboard > **Avandar** > **Database** > **Backups** > **Scheduled
backups** > **Restore** on the newest backup taken before the migrations
(its time is before 11.5's approval). **WRITES TO PRODUCTION**. The project
is unavailable while it restores. When the dashboard shows it as healthy
again, run the top-up in the rollback terminal. **WRITES TO PRODUCTION**.
It first checks that production is back at the pre-migration version, and
only then empties every `public` and `auth` table and loads the rows from
10.2's backup, in one transaction, then prints the row counts:

```bash
[[ "$(read_db "$PROD_DB_URL" "select max(version) from supabase_migrations.schema_migrations")" == 20261013212914 ]] &&
  echo "pre-migration schema" &&
  with_db_url "$PROD_DB_URL" "$PSQL_BIN" -X -P pager=off --single-transaction --set ON_ERROR_STOP=1 \
    --file "$CUTOVER_DIR/rollback-truncate.sql" \
    --file "$D/prod-$BACKUP_T-data-app.sql" &&
  read_db "$PROD_DB_URL" "$COUNTS_SQL"
```

**Expect:** `pre-migration schema`, then psql's output with no `ERROR`,
then the same counts as `cat "$D/prod-$BACKUP_T-counts.txt"` prints. Then
go to 14.4.
**If not:** no `pre-migration schema` means the restore did not bring back
the pre-migration version, and nothing was loaded: check the backup you
chose. An `ERROR` rolled the top-up back: raise it.

**C. Into a new, empty project.** Last resort only. It needs a new
Supabase project, created in the browser (Supabase dashboard > **New
project**, in the same region as production), with a database password you
set at creation and save in your password manager. Then build its
connection string the same way as 2.4 part 2, from the new project's
**Connect** > **Session pooler** URI and that password, in three blocks.

Block 1, then type or paste the new project's password:

```bash
read -rs DBPW                                     # type or paste the password, press Enter (nothing is echoed)
```

Block 2, then paste the new project's Session pooler URI (port 5432, with
`[YOUR-PASSWORD]` in it):

```bash
ENC="$(jq -rn --arg p "$DBPW" '$p|@uri')"; unset DBPW
read -r URI_TEMPLATE                              # paste the copied URI, press Enter
```

Block 3 puts the password into the URI. Its guard refuses production's and
staging's URLs, then loads the roles, the schema, the data, and the
migration history from 10.2's dumps in one transaction, and prints the row
counts. It writes to the new project only:

```bash
EMPTY_DB_URL="${URI_TEMPLATE/\[YOUR-PASSWORD\]/$ENC}"; unset URI_TEMPLATE ENC
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

**Expect:** the same counts as `cat "$D/prod-$BACKUP_T-counts.txt"`
prints.
**If not:** no output at all means the guard refused (the URL is
production's or staging's, or empty): redo the three blocks with the new
project's values. An `ERROR` rolled everything back: raise it.

### 14.4 Redeploy `main`'s previous functions (**WRITES TO PRODUCTION**)

A database restore leaves the new functions deployed. From a checkout of
the previous release, deploy its functions, then delete each function the
previous release did not have. The `supabase` function from 2.4 keeps the
2.114.0 CLI: do not change `REPO` here.

**Where:** the rollback terminal. In a new terminal, first do the
rollback terminal setup (top of section 14) and the `BACKUP_T` line from
14.3. This block finds or creates a worktree of the previous release,
`v0.14.1`, moves into it, checks that it is exactly that release, and only
then deploys its functions to production:

```bash
ROLLBACK_DIR="$(wt path chore/production-rollback)"
[[ -d "$ROLLBACK_DIR" ]] || ROLLBACK_DIR="$(wt new chore production-rollback v0.14.1)"
cd "$ROLLBACK_DIR" && [[ "$(git rev-parse HEAD)" == "$(git rev-parse 'v0.14.1^{commit}')" ]] && echo "on v0.14.1" &&
  supabase functions deploy --project-ref "$PROD_REF"
```

**Expect:** `on v0.14.1`, then one deploy line per function.
**If not:** without `on v0.14.1`, nothing was deployed: stop and check
`echo "$ROLLBACK_DIR"` and `git log -1` there.

Then list what is deployed now, and save the functions the release added
(deployed now, but not in 10.2's list) to `functions-to-delete.txt`:

```bash
supabase functions list --project-ref "$PROD_REF" -o json | jq -r '.[].slug' | sort > "$D/functions-after-rollback.txt"
comm -13 "$D/prod-$BACKUP_T-function-slugs.txt" "$D/functions-after-rollback.txt" | tee "$D/functions-to-delete.txt"
```

**Expect:** the last command lists only the functions the release added:
`connectors`, `file-url`, `geocode`, and `_eval` if it was deployed. Read
the list. If it holds only those, delete them with this loop, one
`supabase functions delete` per line of the file:

```bash
while read -r slug; do
  supabase functions delete "$slug" --project-ref "$PROD_REF" </dev/null
done < "$D/functions-to-delete.txt"
```

**If not:** if the list has a name you do not expect, do not run the loop.
Instead delete only the four above, one at a time, with
`supabase functions delete <name> --project-ref "$PROD_REF"`. **Verify:**
`supabase functions list --project-ref "$PROD_REF" -o json | jq '.[0] | keys'`
shows a `slug` field. If it does not, both lists above are wrong: delete
by name, as just described.

**Edge function secrets: nothing to restore.** The release does not change
them, since CI writes no edge function secret (L1). The three that 6.6
added by hand are new names that `v0.14.1`'s functions do not read, so
leave them in place.

### 14.5 Promote the previous Vercel deployment (**CHANGES VERCEL**)

**Where:** the Vercel dashboard. Project `avandar` > **Deployments** >
filter the list to **Production** > find the last deployment from before
the release (made by the Git integration from `main` at commit
`8bb5b44f3`, shown on each deployment's row) > its **...** menu >
**Promote** (Vercel may call it **Instant Rollback**) > confirm.
**Expect:** the promoted deployment is marked as the current production
deployment, and `app.avandarlabs.com` serves the old app after a reload.
The Git integration stays connected, so a later push to `main` deploys
again: Vercel builds that commit and makes it production's deployment.
**Verify:** if Vercel then says automatic production domain assignment is
paused (an Instant Rollback can pause it), a later push to `main` builds but
does not serve `app.avandarlabs.com` until you undo that pause on the same
page.

Promoting the previous deployment alone, with no database restore, is the
way back when `production.yaml` stopped before `Run supabase db push`
(14.1): the old app then matches the old schema again.

### 14.6 The catalog

Nothing to run here. The catalog has its own restore (12.3), with its
limits. A database restore (14.3) also puts the old catalog back, since it
restores everything, so after 14.3 do not run 12.3.

## 15. Remove the Vercel Git integration

Nothing to do: this is not part of the cutover (M1). Vercel's Git
integration stays connected and keeps deploying `develop` to staging, `main`
to production, and other branches as previews. Removing it belongs to the
CI deploy follow-up (section 16, Move deploys to CI and manage secrets in
GitHub), and comes last in that work.

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
new agent session (a new Claude Code session in any checkout of the
repository), when he is ready to publish. The agent then asks him to
confirm before it creates anything on GitHub.

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

### Narrow the staging tokens (after the cutover)

**Why.** Any branch's workflow can read the `staging` environment's secrets,
including a Vercel token that can deploy production's web app and a Supabase
token that may reach production's project (5.2). Pablo accepted this only for
the cutover (K1, 2026-11-24).

**When.** After the smoke test passes (section 13). It does not block the
release.

**The goal.** No branch other than `develop` can read staging's deploy secrets,
and staging's tokens cannot reach production.

**The work**, in order. Step b is a normal pull request into `develop`. Steps
a, c, and d change settings that only Pablo can change.

a. **Split the secrets (CHANGES GITHUB SETTINGS).** Create a GitHub environment
   named `ci` for the test jobs. Give it only the names those jobs read, and
   none of these deploy-only names: `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
   `VERCEL_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN`, `STAGING_DB_PASSWORD`,
   `STAGING_PROJECT_ID`. Take the test jobs' names from
   the workflows at that time, with
   `grep -oE "(secrets|vars)\.[A-Z0-9_]+"`, not from this document.
b. **Point the test jobs at it (code change).** In `pr-develop.yaml`,
   `production.yaml`, and `staging.yaml`, change `environment: staging` to
   `environment: ci` on the test jobs only. Only `staging.yaml`'s `migrate`
   job (or the deploy job that replaces it, if the CI deploy follow-up lands
   first) keeps `environment: staging`. Check the workflows with
   `actionlint`, land the change through a reviewed pull request into
   `develop`, and release it to `main`, since `production.yaml` runs from
   `main`.
c. **Protect `staging` (CHANGES GITHUB SETTINGS).** Do this only after step b is
   on both `develop` and `main`. Before that, the test jobs on `main` would be
   blocked. Add a deployment branch policy that allows only `develop`, using the
   click path in 5.1's "If not" with `develop` in place of `main`.
d. **Narrow or rotate the tokens (CHANGES VERCEL, CHANGES GITHUB SETTINGS).**
   Pablo only. Staging's environment holds a Vercel token and a Supabase
   access token today: narrow or rotate them.
   - Vercel: no workflow in `develop` reads staging's `VERCEL_TOKEN` today.
     If the CI deploy follow-up has not landed, remove it from the
     environment (`gh secret delete VERCEL_TOKEN --env staging`) and delete
     the token on your avatar > **Account Settings** > **Tokens**. If the
     follow-up needs it, create a new one there with the narrowest
     **Scope** Vercel offers (**verify** the choices), store it with
     `gh secret set VERCEL_TOKEN --env staging`, and then delete the old
     token on the same page.
   - Supabase: find the account that created staging's `SUPABASE_ACCESS_TOKEN`
     (**verify**). Personal access tokens are account-wide, so use a token from
     an account that can reach only the staging project (**verify** what the
     current plan offers). Generate it at your avatar > **Account preferences**
     > **Access Tokens** > **Generate new token**, and store it with
     `gh secret set SUPABASE_ACCESS_TOKEN --env staging`. Then revoke the old
     token, once no environment uses it (**verify** whether production's copy
     is the same token). Pablo revokes tokens in the Supabase account settings.
e. **Check (no deploy).** Pablo starts a run from a throwaway branch whose
   workflow names `environment: staging`. Expect GitHub to refuse the job before
   it starts, so none of its steps run. Then confirm that the next `staging.yaml`
   run on `develop` still migrates staging.

Track this as its own issue, for example a Linear issue next to AVA-611, so it
is not lost. It is not part of the release.

### Move deploys to CI and manage secrets in GitHub (after the cutover)

**The goals.** D2 (Pablo, 2026-11-23): deployments are handled by CI, with
no integration in a web portal, for `develop` and `main` alike. L1 (Pablo,
2026-11-24): GitHub becomes the only place where Avandar's secrets are
managed. Today they live in four places: GitHub (what the CI jobs need),
Vercel (the web app's build variables), Fly.io (the pipeline server), and
each Supabase project's edge function secrets. M1 set both aside so the
cutover could run on what `develop` and `main` already had.

**What was built, and where it is kept.** CI deploy jobs for
`production.yaml` and `staging.yaml` were written and reviewed, then set
aside before the release. They are on the local branch
`feat/ci-deploy-jobs`, at commit `7dccc6d92`. That branch exists only on
Pablo's laptop until he pushes it. They are also in the cutover branch's
history: the production job in `8dd9c2d70`, the staging job in
`50eff770a`, and the scoped-back version without GitHub-managed secrets in
`dcf372384` and `7b08e7fea`. `b9601f995` restored `develop`'s workflows and
`vercel.json` for the cutover.

**What that work also carries.** The Supabase CLI bump in CI from 2.98.2
to 2.114.0, which fixes the functions deploy flake (9.1);
`pnpm check:plugin-bundle` in CI; migrating before the app deploys, so the
new app never runs on the old schema; `vercel.json` turning Git-triggered
deployments off; and removing the Vercel Git integration last, once both
CI deploys are green (section 15).

**Lessons to carry.** A CI build cannot read a Vercel variable marked
Sensitive, so no `VITE_` variable may be Sensitive before CI builds the
app. The `staging` environment cannot get a branch policy until the test
jobs stop using it (Narrow the staging tokens, above).

**The work.** It should get its own spec and plan, starting from
`feat/ci-deploy-jobs`: move one secret at a time into GitHub, verify each
one by digest against the value the service holds today, and only then
make CI authoritative for it.

## 17. Cleanup (D6)

Seven days after the smoke test passes, and after the catalog dump is
archived (17.1).

**Where:** the cleanup terminal: a new terminal, `cd "$(wt go develop)"`,
then 2.4 setup parts 1 and 2. Browser steps say which site.

### 17.1 Settle the release

| # | Step | Note |
| --- | --- | --- |
| 1 | If 10.1 chose A: turn PITR off in Supabase dashboard > **Avandar** > **Project Settings** > **Add-ons** > **Point in time recovery** | **WRITES TO PRODUCTION** (configuration) |
| 2 | Archive the catalog dump (the newest `~/avandar-cutover/catalog/catalog-2*.sql`, which 9.5 named `$CATALOG_DUMP`) and its `.sha256` somewhere private and durable: an encrypted drive or private storage you control. Never a GitHub artifact, issue, or the repository | Check the archived copy: `shasum -a 256 <archived copy>` must print the hash in the `.sha256` file |

### 17.2 Retire the demo in Vercel (**CHANGES VERCEL**)

**Where:** the Vercel dashboard, project `avandar`, then the DNS provider
for `avandarlabs.com`.

| # | Step |
| --- | --- |
| 1 | **Settings** > **Domains** > `demo.avandarlabs.com` > **Remove**. Then, at the DNS provider for `avandarlabs.com`, delete the `demo` record |
| 2 | **Settings** > **Environments** > `demo` > delete it and confirm |

### 17.3 Delete the `demo-measles` Supabase branch (**CHANGES STAGING CONFIGURATION**)

Only after 12.2 passed and 17.1 archived the dump. **Irreversible.** In
the cleanup terminal:

```bash
supabase branches delete demo-measles --project-ref "$STAGING_REF"
```

**Expect:** a confirmation that the branch was deleted.
`supabase branches list --project-ref "$STAGING_REF"` no longer lists it.

### 17.4 Retarget feature branches, then delete the branches (**PUSHES**)

GitHub closes a pull request whose base branch is deleted, so retarget
first. In the cleanup terminal, this moves every open pull request based
on `demo/measles` to `develop`, lists any left (there should be none),
then deletes the `demo/measles` branch on GitHub, and the cutover branch
if it was ever pushed:

```bash
gh pr list --base demo/measles --state open --json number --jq '.[].number' \
  | while read -r number; do gh pr edit "$number" --base develop; done
gh pr list --base demo/measles --state open
git push origin --delete demo/measles
git ls-remote --exit-code origin refs/heads/chore/production-cutover && git push origin --delete chore/production-cutover
```

**Expect:** one `gh pr edit` line per pull request, an empty list, and
`- [deleted]` for each deleted branch. If 8.6 found `demo/measles` already
deleted, its delete fails harmlessly.

The cutover worktree has its own switched stack too
(`chore-production-cutover`). Undo it before removing the worktree. This
moves into the cutover worktree, deletes its own local stack, and prints
the status line:

```bash
cd "$(wt path chore/production-cutover)" && ava supabase restore &&
  ava supabase status | grep -E "switched local|develop local"
```

**Expect:** `This branch is back on the develop local Supabase. Its env
files are restored.`, then a status line that reads `This is the develop
local Supabase (avandar). Branch chore/production-cutover uses it.`
`ava supabase restore` deletes only this branch's own local project and its
data, never the shared `avandar` stack.
**If not:** an error from `ava supabase restore` names what it could not
clean up: follow it, and do not remove the worktree until the status line
reads as above. Then remove the cutover worktree. `wt rm` prints a safe
directory, and the `cd` moves the terminal there:

```bash
cd "$(wt rm chore/production-cutover)"
```

Each retargeted branch merges `develop` and passes `pr-develop.yaml` before
it merges. Then clean up locally, in the cleanup terminal:

| # | Step |
| --- | --- |
| 1 | `cd "$(wt path chore/production-rehearsal)"`, then `ava supabase restore`, then `cd "$(wt rm chore/production-rehearsal)"`. This deletes its local stack and the production copy in it |
| 2 | `cd "$(wt rm chore/production-rollback)"`, if 14.4 created it |
| 3 | Reset every local database built before the slot migrations were renamed (section 18) |
| 4 | Keep the local branch `feat/ci-deploy-jobs`: do not delete it. It holds the CI deploy work for the follow-up (section 16, Move deploys to CI and manage secrets in GitHub), and it exists only on this laptop. Push it when you want it backed up (`git push origin feat/ci-deploy-jobs`, **PUSHES**), or it lives on one machine until the follow-up starts |

### 17.5 Optional: delete the legacy WDI Parquet objects

The 4 WDI datasets the production import deleted read Parquet objects in
bucket `opendata` under `world-bank__wdi/datasets/` (6 objects on
2026-11-20). Nothing uses them now. Check and back them up first (reads
production). In the cleanup terminal, this confirms no listing uses the
legacy paths, lists the objects with their size, type, and cache setting
into `objects.txt`, and downloads each one into
`~/avandar-cutover/storage/wdi-legacy`:

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

**Expect:** `0`; the object list; no `FAILED` line; and, from `ls -l`, a
backup file for each object, of the listed size.
**If not:** a non-zero first count means a listing still uses the legacy
paths: stop, and keep the objects. A `FAILED` line or a missing file: run
the block again before deleting anything.

Then delete them, **WRITES TO PRODUCTION**. `supabase storage rm` may ask
you to confirm: read the names it lists before you answer. Never add
`--yes`. The last line counts what is left:

```bash
cut -d'|' -f1 "$WDI_BACKUP/objects.txt" | sed 's#^#ss:///opendata/world-bank__wdi/datasets/#' \
  | xargs -o "$REPO/node_modules/.bin/supabase" storage rm --project-ref "$PROD_REF" --experimental
read_db "$PROD_DB_URL" "select count(*) from storage.objects where bucket_id = 'opendata' and name like 'world-bank\_\_wdi/datasets/%'"
```

**Expect:** `0`. To restore them from the backup, if ever needed
(**WRITES TO PRODUCTION**), run this in a terminal with 2.4 setup part 1
and the `WDI_BACKUP=...` assignment from the first block:

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

Once 17.1 archived the catalog dump and Supabase's own backups cover the
post-cutover state, run `rm -rf "$CUTOVER_DIR"` in the cleanup terminal.
It deletes `~/avandar-cutover`: every production dump, the catalog
backups, the restore folders, and the logs. After it, 10.2's dumps and
12.3's catalog restore are gone for good.

## 18. Known gaps

Nothing to run here: what this cutover leaves open, and where each is
handled.

| Gap | State |
| --- | --- |
| Migration audit refresh | Deferred (Task 17): an agent session given read-only URLs runs it when Pablo chooses. The rehearsal is the primary check for production's files, but nothing rehearses staging's 11 pending files, 8 of them out of order. The refresh and the live read-only checks in 4.8 must be done before step 3 of section 1 (the promotion). A blocker found after 8.5 can only be fixed forward |
| Migration counts | `develop` gained `20261105212729_add_rpc_workspaces__is_slug_available.sql` after planning, and the integration branch merged it on 2026-11-24: the tree now holds 195 files, production applies 80, one more file for production and the tree than the plan counted on 2026-11-23. The runbook computes them (`$PROD_PENDING`, `$TREE_COUNT`, 4.1). Staging applies 11: the 10 files `develop` lacks, and that same file, which staging's red CI has not applied since 2026-11-20 (4.8 lists it) |
| Quick suite flake | `ReferenceError: window is not defined` from `plugins/epidemiology/src/RegressionModal/RegressionModal.test.tsx` fails the quick suite now and then: Mantine 9.2.0's `Button` loader timer fires after jsdom's teardown under full-suite load. Not a regression. Re-run the quick suite once |
| Crosswalk privacy gap (AVA-611) | Ships with the release (D4). Fixed forward (section 16) |
| `db:validate-migrations` check 3 | Fails by design on the 7 dictionary and crosswalk files, which sort before `develop`'s newest file. It runs in no CI job or hook, and clears once the promotion lands |
| Local databases and the `demo-measles` branch | Any built before the slot migrations were renamed already ran them under their old names, and cannot migrate forward. Reset local stacks (`pnpm db:reset` on a switched stack). The branch is deleted in 17.3 |
| Desktop app `metadata.sqlite` | Files created from `demo/measles` or `develop` before the regeneration stop with `migration history mismatch`. Delete them. The desktop app is private, at version 0.0.0 |
| Five French `.po` entries | Came from `develop` with corrupted control characters. Out of scope for the cutover |
| The `staging` GitHub environment | No branch policy, so any branch's workflow can read its tokens. A `develop`-only policy would break `production.yaml`'s test jobs (5.2). A3's protection covers only the database and the secrets of the `production` environment: with staging's `VERCEL_TOKEN`, any branch's workflow can run `vercel deploy --prod`, and if staging's `SUPABASE_ACCESS_TOKEN` belongs to an account that can reach `Avandar`, any branch's workflow can reach production too. Accepted for the cutover (K1, 5.2). Fixed after the cutover in section 16, Narrow the staging tokens |
| Environments restrict branches, not workflows | Any workflow on `main`, including one added through `develop`, can use `production` once it is on `main`. The required reviewer is the stop |
| Test jobs on `main` | `production.yaml`'s `test-quick` and `test-e2e` read the `staging` environment's secrets. Accepted for the cutover (K1). Fixed after it in section 16, Narrow the staging tokens |
| Catalog restore | Restores whole tables and leaves the gaps listed in 12.3. `session_replication_role` was verified on a local stack only: 9.6 C3 probes each project |
| Catalog script messages | `importCatalogData.sh` calls the `with_db_url` helper "the cutover runbook's ... (1.4)": in this runbook it is 2.4 |
| `[skip deploy]` | Not a GitHub keyword: each release commit on `develop` starts a `staging.yaml` run |
| Release notes | `--skip-changelog` for `0.15.0`: 2,673 non-merge commits since `v0.14.1` on 2026-11-24 |
| `test-e2e` | Never blocks `migrate`, but it does decide the run's verdict that `ava release` reads |
| Pull request previews | Continue as before: Vercel's Git integration stays connected in this cutover (section 15) |
| `demo.avandarlabs.com` | Frozen at its last build until 17.2 |
| Secrets live in four places (L1) | GitHub (what the CI jobs need), Vercel (the web app's build variables), Fly.io (the pipeline server), and each Supabase project's edge function secrets, set by hand. CI writes none of the edge function secrets. Making GitHub the only place is follow-up work (section 16, Move deploys to CI and manage secrets in GitHub) |
| Public Actions logs | A failed `supabase db push` can print row data (11.9) |
| New app on the old schema | Vercel deploys the new app at the push to `main`, and `production.yaml`'s `migrate` job runs only after `lint-typecheck`, `test-quick`, and your approval: at least about 16 minutes of the new app on the old schema and old edge functions (11.8). Accepted because production has no active users (D4). If `test-quick` fails, `migrate` never runs: fix forward or promote the previous Vercel deployment (14.5). The CI deploy follow-up migrates first (section 16) |
| Functions deploy flake | Supabase CLI 2.98.2, pinned in `develop`'s workflows, fails `supabase functions deploy` about one attempt in two with `Module not found ".../packages/shared/utils/src/sql/index.ts"`. The migrations are already applied by then. Fixed by re-running the failed job (9.1, 11.6). The CLI bump to 2.114.0 is part of the CI deploy follow-up (section 16) |
| `pnpm check:plugin-bundle` | Not run in CI: it was only in the deferred CI deploy work. The script still exists for local use. Follow-up (section 16) |
| `workflow_dispatch` on `staging.yaml` | Anyone who can push a branch can start `staging.yaml` by hand from that branch, and its `migrate` job then migrates staging and deploys that branch's edge functions, because the `staging` environment has no branch policy (5.2). An existing exposure, unchanged by this cutover. Section 16, Narrow the staging tokens, closes it |
| CI deploy work | Kept on the local branch `feat/ci-deploy-jobs` (`7dccc6d92`), on one laptop only until it is pushed (17.4). Section 16, Move deploys to CI and manage secrets in GitHub |
| `ava` | One global symlink: whoever last ran `pnpm build:ava-cli` decides which code `ava release` runs (11.1) |
| `ava` output | If `ava` prints `write EPIPE` after a status line, it only means the next command stopped reading early: the status was already printed and nothing failed. |
