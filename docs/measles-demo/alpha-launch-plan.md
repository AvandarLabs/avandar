# Alpha launch plan

How `demo/measles` becomes the `alpha` branch and takes over
`app.avandarlabs.com`, and what hardening follows. Written 2026-11-19.

## Nomenclature

| Term | Meaning |
|---|---|
| Production | Whatever serves users at `app.avandarlabs.com`. Today that is alpha. |
| Alpha | The `alpha` branch (today `demo/measles`). Temporarily production, on the production Supabase project `Avandar`. |
| Mainline | The reviewed code line as a whole: `develop` and `main` together. The counterpart to alpha. |
| Staging | `develop`, at `staging.avandarlabs.com`. |
| Mainline release | `main`, cut from `develop` by `ava release`. It keeps a test URL but serves no users until it reaches parity with alpha. |

## Decisions already made

| Topic | Decision |
|---|---|
| Versions | Alpha versions carry a constant `-alpha` suffix: `0.15.0-alpha`, tag `v0.15.0-alpha`. Mainline stays on `0.14.x`. |
| `ava release` | On `alpha`: version bump, tag, and GitHub release only. No merge. On `develop`: today's mainline release (`develop` into `main`). On any other branch, `main` included: fail. |
| Demo user data | Not migrated. Only the open data catalog tables and the prebuilt Parquet copies move to production. |
| Production users | All 333 accounts and their data are kept. Back up before migrating. |
| Mainline test URL | `main`'s test URL uses the staging Supabase project, the same database as `develop`. `main` never runs migrations of its own: `develop`'s CI applies them, and `main` is always an exact copy of a `develop` commit. |
| Rehearsal | Restore a production dump into a local switched stack. Approved: production holds no sensitive data yet. |
| Who touches production | Pablo only. The agent writes runbooks and never writes to production. |
| Test gate | Alpha deploys only after lint, type-check, and `test-quick` pass. Same gates as production today. |
| Alpha and `develop` | Merges flow both ways until parity. |
| Vercel | `demo` is an environment and a domain inside the one `avandar` project. Alpha deploys explicitly from CI, not through the Git integration. |

## Rules that hold from cutover onward

1. **A migration applied to production is immutable.** Never edit, rename, or
   delete it, on any branch. A review fix is a new migration. Without this,
   `main` can never be pushed to production again.
2. **Only `alpha` may reach the production Supabase project.** The GitHub
   `production` environment is restricted to the `alpha` branch, so a
   mainline release cannot overwrite alpha's schema or edge functions.
3. **Nothing deploys to production without the gate.**

## Stage 0: preparation (no production impact)

| # | Owner | Work |
|---|---|---|
| 0.1 | Agent | Audit the 76 alpha-only migrations against production's current data, read-only. Focus on the 26 that drop, delete, change a type, or add `not null`. Output: a list of migrations that could fail or lose data, with the rows involved. |
| 0.2 | Agent | Write `.github/workflows/alpha.yaml`. Jobs: `lint-typecheck`, `test-quick`, `test-e2e` (reported, not blocking, as in production today), then `deploy`. `deploy` uses the `production` environment and Supabase CLI 2.114.0, and runs in this order: `supabase db push --include-all`, set edge function secrets from GitHub secrets, `supabase functions deploy`, `vercel build --prod`, `vercel deploy --prebuilt --prod`. Concurrency queues and never cancels mid-migration. |
| 0.3 | Agent | Stop mainline from reaching production. In `production.yaml`: remove the production `migrate` job and add an explicit Vercel deploy of `main` to a `mainline` environment. In `vercel.json`: turn off Git-integration deploys for `main` and `alpha`. These changes go to `develop` and, as a small direct PR, to `main`. |
| 0.4 | Agent | Update `ava release` (details below), with tests, on alpha. Port the same code to `develop`. |
| 0.5 | Agent | Rename references: `demo.yaml` and `scripts/demo/` are removed, since the demo domain is going away. Docs, `CLAUDE.md`, and agent memory move from `demo/measles` to `alpha`. Set `package.json` to `0.15.0-alpha`. |
| 0.6 | Agent | Export from the `demo-measles` Supabase branch: a data-only dump of `data_catalog_drives`, `data_catalog_listings`, `data_catalog_listings__relation_columns`, `data_catalog_facet_counts`, `pipeline_executions`, `pipeline_execution_scopes`, and `pipeline_scope_checkpoints`. Write a copy script for the `opendata` bucket's `catalog-cache/` folder. Listing IDs are preserved, so the Parquet paths stay valid. `datasets__open_data` is workspace data and is not moved. |
| 0.7 | Agent | Write the cutover runbook (Stage 1) with exact commands, backup, and restore steps. |
| 0.8 | Pablo | Rehearsal: dump production, restore it into a throwaway database, apply the 76 migrations, run alpha against it, and open existing dashboards. The runbook from 0.7 covers this. Nothing proceeds until it passes. |
| 0.9 | Pablo | Portal work, with exact values and click paths supplied in the runbook: GitHub `production` environment secrets and its branch restriction; Vercel `mainline` environment and domain; production Polar, Google OAuth redirect URIs, and pipeline server target. |

## Stage 1: cutover (Pablo runs it, from the runbook)

1. Confirm the Stage 0 rehearsal passed and `alpha.yaml` is green on a dry
   run.
2. Back up production: database dump plus a note of the latest Supabase
   backup. Verify the dump restores.
3. Merge the mainline lock-out (0.3) into `main`. Confirm `main` no longer
   deploys to production.
4. Rename `demo/measles` to `alpha` on GitHub. Open PRs retarget
   automatically.
5. Push to `alpha`. The workflow gates, migrates production, deploys the
   edge functions, and deploys the app to `app.avandarlabs.com`.
6. Load the catalog dump and copy the Parquet files into production.
7. Smoke test: sign in with an existing account, open an old dashboard,
   browse the catalog, run a query, check Cmd+K shows `0.15.0-alpha`.
8. Run `ava release` on `alpha` to tag `v0.15.0-alpha`.
9. Remove `demo.avandarlabs.com` and the `demo` environment in Vercel.
   Delete the `demo-measles` Supabase branch.

**Rollback.** Before step 5: nothing has changed, stop. After step 5:
restore the database backup and redeploy the last `main` build. There is no
partial rollback, because `main`'s code does not match the migrated schema.

## `ava release` behavior

| Run on | Banner (colored, first line) | What happens |
|---|---|---|
| `alpha` | `ALPHA release: app.avandarlabs.com` | Preflight: clean and in sync with `origin/alpha`, CI green on that commit. Prompt for the version, suggesting the next one. The `-alpha` suffix is appended automatically and rejected if typed twice. Commit the bump on `alpha`, tag `vX.Y.Z-alpha`, push, publish GitHub release notes. The push redeploys, so Cmd+K shows the new version. No merge and no `-dev` bump. |
| `develop` | `MAINLINE release: develop to main` | Today's flow, unchanged: `main` becomes a copy of `develop`, tagged `vX.Y.Z`, and `develop` moves to the next `-dev`. |
| Anything else, `main` included | Error | Fails before any git command, naming `alpha` and `develop`. |

## Stage 2: hardening (starts the week after cutover)

| # | Guardrail | Purpose |
|---|---|---|
| 2.1 | CI check that fails a PR which edits or deletes an existing migration | Enforces rule 1. |
| 2.2 | Migration rehearsal in CI: apply new migrations to a scrubbed snapshot of production before the real push | Catches data-dependent failures before production. |
| 2.3 | Automatic database backup as the first step of every alpha deploy | A restore point per deploy. |
| 2.4 | Fixture corpus of real persisted JSON (dashboards, queries, map snapshots) run through every migrator on every PR | No user loses a dashboard to a schema change. |
| 2.5 | Dexie upgrade tests from every shipped version | Covers browser-persisted data. |
| 2.6 | Post-deploy smoke test against `app.avandarlabs.com` | Detects a broken deploy within minutes. |
| 2.7 | Security pass: RLS review and the 33 functions `anon` can execute | Alpha code was not reviewed. |
| 2.8 | Make `test-e2e` blocking once it is stable enough | Closes the gap the quick suite leaves. |
| 2.9 | Upgrade production Postgres 15 to 17 to match staging | Removes a version mismatch. |

## Open questions

1. **`--include-all` on alpha.** Two-way merging brings in migrations with
   timestamps older than ones production already ran, so alpha needs
   `--include-all`, as staging uses today. The risk is an older migration
   that assumes a schema production has moved past. Guardrail 2.2 covers it.
