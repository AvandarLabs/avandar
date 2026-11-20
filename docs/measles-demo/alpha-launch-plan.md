# Alpha launch plan

How `demo/measles` becomes the alpha line, with `alpha` serving
`app.avandarlabs.com` and `alpha-dev` as its staging branch, and what
hardening follows. Written 2026-11-19.

## Nomenclature

| Term | Branch | URL | Supabase | Meaning |
|---|---|---|---|---|
| Production | `alpha` (for now) | `app.avandarlabs.com` | `Avandar` (production) | Whatever serves users. |
| Alpha | `alpha` | `app.avandarlabs.com` | `Avandar` (production) | The alpha release branch. Changes arrive only through `ava release` from `alpha-dev`. The parallel of `main`. |
| Alpha dev | `alpha-dev` (today `demo/measles`) | `alpha.avandarlabs.com` | Persistent `alpha-dev` branch of `Avandar Staging` | Where all alpha development happens. The parallel of `develop`. |
| Mainline | `develop` and `main` | | | The reviewed code line as a whole. |
| Staging | `develop` | `staging.avandarlabs.com` | `Avandar Staging` (default branch) | Mainline development. |
| Mainline release | `main` | Test URL only (Vercel) | `Avandar Staging` (shared with `develop`) | Cut from `develop` by `ava release`. Serves no users until parity with alpha. |

The two lines are parallel:

| | Development branch | Release branch | Release command run on |
|---|---|---|---|
| Alpha line | `alpha-dev` | `alpha` | `alpha-dev` |
| Mainline | `develop` | `main` | `develop` |

## Decisions already made

| Topic | Decision |
|---|---|
| Versions | Released alpha versions carry a constant `-alpha` suffix: `0.15.0-alpha`, tag `v0.15.0-alpha`. Between releases `alpha-dev` carries `-alpha-dev` (e.g. `0.15.1-alpha-dev`), the parallel of `develop`'s `-dev`. Mainline stays on `0.14.x`. |
| `ava release` | On `alpha-dev`: cut `alpha` from `alpha-dev`, tag `vX.Y.Z-alpha`, publish release notes, move `alpha-dev` to the next `-alpha-dev` version. On `develop`: today's mainline release. On any other branch, `alpha` and `main` included: fail. |
| Demo user data | Not migrated. Only the open data catalog tables and the prebuilt Parquet copies move to production. |
| Production users | All 333 accounts and their data are kept. Back up before migrating. |
| Who touches production | Pablo only. The agent writes runbooks and never writes to production. |
| Test gate | `alpha-dev` and `alpha` both deploy only after lint, type-check, and `test-quick` pass. Same gates as mainline today. |
| Merges with mainline | `alpha-dev` and `develop` merge into each other in both directions until parity. `alpha` and `main` never take direct merges. |
| Vercel | One `avandar` project. The alpha line deploys explicitly from CI, not through the Git integration. |
| Mainline test URL | `main`'s test URL uses the staging Supabase project, the same database as `develop`. `main` never runs migrations of its own. |
| Rehearsal | Restore a production dump into a local switched stack. Approved: production holds no sensitive data yet. |
| `alpha-dev` data | Seeded at cutover from the rehearsal's production data after the rehearsal migrated it, dumped before any use of the rehearsal app (production's raw dump has `main`'s schema and does not load into `alpha-dev`). The seed keeps users' emails and leaves out Google tokens and Auth sessions and tokens. Then refreshed by guardrail 2.2. |

## Rules that hold from cutover onward

1. **A migration applied to production is immutable.** Never edit, rename, or
   delete it, on any branch. A review fix is a new migration. Without this,
   `main` can never be pushed to production again.
2. **Only `alpha` may reach the production Supabase project.** The GitHub
   `production` environment is restricted to the `alpha` branch. That
   restricts the environment's credentials by branch only: what keeps other
   workflows away from production is their code, since the Staging
   environment's tokens, a Supabase access token among them, are usable by
   any branch (guardrail 2.8).
3. **`alpha` changes only through `ava release`.** Branch protection blocks
   direct pushes and PRs into `alpha`, as on `main`.
4. **Every migration reaches `alpha-dev` before `alpha`.** Pablo checks
   `alpha.avandarlabs.com`, including that migrations kept existing data,
   before running `ava release`.
5. **Nothing deploys without the gate.**

## Stage 0: preparation (no production impact)

| # | Owner | Work |
|---|---|---|
| 0.1 | Agent | Audit the 76 alpha-only migrations against production's current data, read-only. Focus on the 26 that drop, delete, change a type, or add `not null`. |
| 0.2 | Agent | `alpha-dev.yaml`, replacing `demo.yaml`: on push to `alpha-dev`, run `lint-typecheck` and `test-quick` (`test-e2e` reported, not blocking), then deploy to the `alpha-dev` Supabase branch and the Vercel `alpha-dev` environment at `alpha.avandarlabs.com`. Reuses `scripts/demo/ensureSupabaseBranch.sh`, renamed for `alpha-dev`. |
| 0.3 | Agent | `alpha.yaml`: on push to `alpha`, run the same gates, then deploy with the `production` environment: `supabase db push --include-all`, edge function secrets, `supabase functions deploy`, `vercel deploy --prod`. Supabase CLI 2.114.0. Concurrency queues and never cancels mid-migration. |
| 0.4 | Agent | Lock mainline out of production: in `production.yaml`, remove the production `migrate` job and deploy `main` to a `mainline` Vercel environment instead. In `vercel.json`, turn off Git-integration deploys for `main`, `alpha`, and `alpha-dev`. Goes to `develop` and, as a small PR, to `main`. |
| 0.5 | Agent | `ava release` (details below), with tests, on `alpha-dev`. Ported to `develop`. |
| 0.6 | Agent | Rename references from `demo/measles` to `alpha-dev`: docs, `CLAUDE.md`, agent memory, worktree. Set `package.json` to `0.15.0-alpha-dev`. |
| 0.7 | Agent | Catalog export from the `demo-measles` Supabase branch: data-only dump of `data_catalog_drives`, `data_catalog_listings`, `data_catalog_listings__relation_columns`, `pipeline_executions`, `pipeline_execution_scopes`, `pipeline_scope_checkpoints`. `data_catalog_facet_counts` is not copied: the import recounts it. The import replaces the target's existing catalog rows (`--replace-existing`) in one transaction. Copy script for the Parquet objects each target listing points at in the `opendata` bucket. Listing IDs are preserved, so Parquet paths stay valid. Loaded into both `alpha-dev` and production. |
| 0.8 | Agent | Write the cutover runbook (Stage 1) with exact commands, backup and restore steps, and Vercel click paths. |
| 0.9 | Pablo | Rehearsal: restore a production dump locally, apply the 76 migrations, run alpha against it, open existing dashboards. |
| 0.10 | Pablo | Portal work from the runbook: GitHub `production` environment secrets and branch restriction; branch protection on `alpha`; Vercel `alpha-dev` and `mainline` environments and the `alpha.avandarlabs.com` domain; production Polar, Google OAuth redirect URIs, pipeline server target. |

## Stage 1: cutover (Pablo runs it, from the runbook)

1. Confirm the rehearsal passed.
2. Rename `demo/measles` to `alpha-dev` on GitHub. Open PRs retarget
   automatically.
3. Push `alpha-dev`. Its workflow creates the `alpha-dev` Supabase branch
   and deploys `alpha.avandarlabs.com`. Seed the branch with the
   rehearsal's production dump (roles, then data; the branch already has
   the schema from the push), load the catalog into it, and check the site.
   From here on, `alpha.avandarlabs.com` holds a copy of real production
   data, so rule 4's data check means something from the first release.
4. Back up production: database dump plus a note of the latest Supabase
   backup. Verify the dump restores.
5. Merge the mainline lock-out (0.4) into `develop` first, then into `main`
   (a mainline release makes `main` a copy of `develop`, so the reverse
   order would bring the old `production.yaml` back). Confirm `main` no
   longer deploys to production.
6. Create `alpha` by hand at `main`'s commit (`ava release` refuses while
   `origin/alpha` is missing and prints the push). Then run `ava release` on
   `alpha-dev`. It tags `v0.15.0-alpha` and pushes. `alpha.yaml` gates,
   migrates production, deploys edge functions, and deploys
   `app.avandarlabs.com`.
7. Load the catalog dump and copy the Parquet files into production.
8. Smoke test: sign in with an existing account, open an old dashboard,
   browse the catalog, run a query, check Cmd+K shows `0.15.0-alpha`.
9. Remove `demo.avandarlabs.com` and the `demo` environment in Vercel.
   Delete the `demo-measles` Supabase branch.

**Rollback.** Before step 6: production is untouched, stop. After step 6:
restore the database backup and redeploy the last `main` build. There is no
partial rollback, because `main`'s code does not match the migrated schema.

## `ava release` behavior

| Run on | Banner (colored, first line) | What happens |
|---|---|---|
| `alpha-dev` | `ALPHA release: alpha-dev to alpha. Deploys PRODUCTION (app.avandarlabs.com).` | Preflight: clean and in sync with `origin/alpha-dev`, CI green on that commit. Prompt for the version, suggesting one. `-alpha` is appended automatically and rejected if typed. `alpha` becomes an exact copy of `alpha-dev`, tagged `vX.Y.Z-alpha`, and the push deploys production. `alpha-dev` moves to the next `-alpha-dev` version. Release notes published. |
| `develop` | `MAINLINE release: develop to main. Deploys the mainline test URL, not production.` | Today's flow, except that pushing `main` deploys the mainline test URL, not production, and the wording says so. |
| Anything else, `alpha` and `main` included | Error | Fails before any git command, naming `alpha-dev` and `develop`. |

## Stage 2: hardening (starts the week after cutover)

| # | Guardrail | Purpose |
|---|---|---|
| 2.1 | CI check that fails a PR which edits or deletes an existing migration | Enforces rule 1. |
| 2.2 | Refresh the `alpha-dev` database from a production dump on a schedule (the first seed happens at cutover) | Migrations are tested against real data on `alpha.avandarlabs.com` before release. |
| 2.3 | Migration rehearsal in CI against a production snapshot before `alpha` deploys | Catches data-dependent failures automatically, not only by manual check. |
| 2.4 | Automatic database backup as the first step of every `alpha` deploy | A restore point per release. |
| 2.5 | Fixture corpus of real persisted JSON (dashboards, queries, map snapshots) run through every migrator on every PR | No user loses a dashboard to a schema change. |
| 2.6 | Dexie upgrade tests from every shipped version | Covers browser-persisted data. |
| 2.7 | Post-deploy smoke test against `app.avandarlabs.com` and `alpha.avandarlabs.com` | Detects a broken deploy within minutes. |
| 2.8 | Security pass: RLS review and the 33 functions `anon` can execute | Alpha code was not reviewed. |
| 2.9 | Make `test-e2e` blocking once it is stable enough | Closes the gap the quick suite leaves. |
| 2.10 | Upgrade production Postgres 15 to 17 to match staging | Removes a version mismatch. |

## Open questions

1. **`--include-all` on `alpha`.** Two-way merging with `develop` brings in
   migrations with timestamps older than ones production already ran, so
   `alpha` needs `--include-all`, as staging uses today. The risk is an older
   migration that assumes a schema production has moved past. `alpha-dev`
   runs the same migrations first, and guardrail 2.3 covers the rest.
