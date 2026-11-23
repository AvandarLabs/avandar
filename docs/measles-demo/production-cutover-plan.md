# Production cutover plan

How `demo/measles` is promoted into `develop` and then released to `main`,
which serves `app.avandarlabs.com`. Written 2026-11-23. It replaces
[alpha-launch-plan.md](alpha-launch-plan.md). The implementation plan is
[2026-11-23-production-cutover.md](../superpowers/plans/2026-11-23-production-cutover.md).

**Status:** approved by Pablo on 2026-11-23. Nothing in this document has
been executed yet. Pablo answered D1 to D7 and E1 the same day (section 2).
No decision is open.

## 1. The decision

The alpha line is abandoned (Pablo, 2026-11-23). There is no `alpha` or
`alpha-dev` branch, no parallel release line, no `-alpha` version, and no CI
that exists only for the demo or for alpha.

| Term | Branch | URL | Supabase project |
| --- | --- | --- | --- |
| Staging | `develop` | `staging.avandarlabs.com` | `Avandar Staging`, default database |
| Production | `main` | `app.avandarlabs.com` | `Avandar` |
| Demo (removed after cutover) | `demo/measles` | `demo.avandarlabs.com` | `demo-measles` branch of `Avandar Staging` |

`demo/measles` is brought up to date with `develop`, merged into `develop`,
and `develop` is released to `main` with `ava release` as version `0.15.0`.
Afterwards the demo branch, the demo domain, the Vercel `demo` environment,
and the `demo-measles` Supabase branch are removed. Work that landed without
review gets a public post-commit review.

## 2. Decisions already made

| ID | Decision | Answer |
| --- | --- | --- |
| C1 | How `demo/measles` catches up with `develop` | Merge `develop` into it. `develop` is authoritative for every lint change and for everything in `apps/ava-video-producer`. A rebase was rejected: it would replay 787 commits, change every commit ID the feature log cites, and force-push a shared branch. |
| C2 | Fate of the alpha-line work | Remove the line, keep the hardening: the catalog scripts and the release and deploy safety fixes that do not depend on a line. |
| C3 | Public retroactive reviews | Issues plus fix-forward PRs, tracked on a public project board. |
| D1 | Does the plugin system ship, which settles `plugin_installations` | **Keep plugins**, the `demo/measles` side. |
| D2 | How staging and production deploy | **CI deploys everything, for `develop` and `main` alike, and Vercel's Git integration is removed.** In Pablo's words: "Deployments should be handled purely through CI/CD now with no integration magic handled by web portals. We want to handle things via code as much as possible, without ever leaking private, sensitive, or secret data that the general public has no business knowing." |
| D3 | How the promotion lands on `develop` under the squash-only ruleset | **A PR for CI and the public record, then Pablo fast-forwards `develop`** to the PR head with the admin bypass. |
| D4 | The crosswalk privacy gap | **Release with it and fix forward.** Production has no active users, and the release is needed for marketing. Tracked as Linear AVA-611, High priority. |
| D5 | Does staging get the catalog through the same replace import as production | **Yes, staging first**, as the rehearsal of the production load. |
| D6 | When the demo domain, the Vercel `demo` environment, the `demo-measles` Supabase branch, and `demo/measles` are deleted | **Seven days after the production smoke test passes** and the catalog dump is archived. |
| D7 | Creating the public review labels, board, and issues | **All 139 issues are opened together, and only on Pablo's approval.** Nothing is created automatically. The runbook holds a prompt Pablo pastes into a new agent session when he is ready. |
| E1 | How CI addresses the staging site in Vercel | **The Vercel environment named `staging`.** It already exists, with staging's variables pointing at the staging Supabase project. |

Carried over from the alpha plan, still true:

| Topic | Decision |
| --- | --- |
| Demo user data | Not migrated. Only the open data catalog tables and their Parquet objects move. |
| Production users | All 333 accounts and their data are kept. Back up before migrating. |
| Who touches production | Pablo only. Agents write runbooks and never write to production. |
| Vercel | Pablo only. Agents never open the console or change Vercel state. |
| Rehearsal | Restore a production dump into a switched local stack. Approved: production holds no sensitive data yet. |
| Immutability | A migration applied to production is never edited, renamed, or deleted on any branch. |

## 3. What the investigation found

Verified on 2026-11-23 from a fresh `git fetch origin`. Rows marked
**changed** differ from the handoff document.

| Fact | Value |
| --- | --- |
| `origin/demo/measles` | `2e5a62c7e`. Nothing new since the handoff. |
| `origin/develop` | `ccab27208` |
| `origin/main` | `8bb5b44f3` (Release 0.14.1) |
| Merge bases | **Changed:** two, `a5a58b2f8` and `ec2f0ea2c`, both 2026-11-10. The histories criss-cross. |
| Commits only on `demo/measles` | 787, of which 33 are merges |
| Commits only on `origin/develop` | **Changed:** 401. The 402nd, `003e2964c`, is a docs commit that exists only on the first machine's local `develop`. |
| Files that conflict in one plain merge | 110: 83 modify/delete, 26 content, 2 rename/delete |
| Migrations | 192 on `demo/measles`, 184 on `develop`, 115 on `main`. Shared files are byte-identical. Nine only on `demo/measles`, one only on `develop`. |
| Edge functions | 17 on both branches, 13 on `main`. New for production: `connectors`, `file-url`, `geocode`, `_eval`. |
| Feature log | **Changed:** 139 features, numbered F1 to F141. The alpha line is F141, not F139. |
| `demo-measles` Supabase branch | `ACTIVE_HEALTHY`, not persistent |
| Supabase CLI on this machine | 2.114.0, logged in. `psql` and `pg_dump` are version 14, too old for the catalog scripts. |

### 3.1 `develop` deleted the plugin system, and a plain merge would too

On 2026-11-17, commit `d521a7c10` ("remove demo-stage plugins system from
develop", Linear AVA-609) deleted 309 files and edited 112 more on `develop`.
The plugin system had reached `develop` by accident, through a feature branch
that carried `demo/measles` in its history. `demo/measles` kept building on
plugins afterwards: data slots, uninstall content, and the epidemiology
plugin's charts.

Merging `develop` in one step applies that deletion:

- 83 plugin files conflict, because `demo/measles` changed them later.
- **226 plugin files are deleted with no conflict shown**, because
  `demo/measles` did not change them after the merge base. Git treats
  "deleted on one side, untouched on the other" as a clean deletion.
- The 112 edited files lose their plugin wiring wherever `demo/measles` did
  not touch the same lines.

This is the root of the handoff's `plugin_installations` question, and it is
decision D1. The plan avoids the problem with a three-step merge (section 6).

### 3.2 The merged migrations fail in both orders

`20261116192935_add_plugin_data_slots.sql` and
`20261116222442_harden_plugin_data_slot_bindings.sql` (only on
`demo/measles`) add foreign keys to `plugin_installations` and a function
that returns its row type. `20261117210525_drop_plugin_installations.sql`
(only on `develop`) drops the table without `cascade`.

| Database | Order it would run | Result |
| --- | --- | --- |
| Production, and any local reset | By timestamp: slots, then the drop | The drop fails. Other objects depend on the table. |
| Staging, which already ran the drop | The slot files, out of order | The first slot file fails. The table is gone. |

The repair is in section 7.

### 3.3 `develop` cannot take this merge through a normal PR

The repository allows squash merges only. The `Develop` ruleset requires a
pull request, one approval, squash as the only merge method, and linear
history. A squash would turn 787 commits into one and remove from `develop`
every commit ID the feature log cites, the same loss that ruled out a rebase.
Organization admins bypass the ruleset, which is how earlier merge commits
reached `develop`. This is decision D3.

### 3.4 Production deploys the app before it migrates

`develop`'s `production.yaml` gates, then runs `supabase link`,
`supabase db push`, and `supabase functions deploy` with CLI 2.98.2. It sets
no edge function secrets and deploys no web app. Vercel's Git integration
deploys the app the moment `main` is pushed, about 25 minutes before the
migrations run. For this release that means the new app would run against
the old schema for that long. The GitHub `production` environment holds only
`SUPABASE_ACCESS_TOKEN`, `PRODUCTION_DB_PASSWORD`, and
`PRODUCTION_PROJECT_ID`, so none of the alpha runbook's portal work was done.
This was decision D2, and section 8 holds the answer.

### 3.5 A known privacy gap is marked "fix before this reaches `develop`"

The top of [pr-feature-log.md](pr-feature-log.md) carries this warning:
crosswalk layouts and mappings are readable by every Data Sources viewer,
even when the member dataset is restricted to other people. A viewer can
read a restricted dataset's column names, source columns, and fill rules
when that dataset is alone in its layout. It was accepted for the demo only.
The promotion carries it to `develop` and then to production. Pablo accepted
that (D4), because production has no active users. The fix is Linear AVA-611,
High priority, with a spec and plan of its own right after the release. It is
not a task of the cutover plan.

### 3.6 Smaller findings

- **Lint.** `develop` replaced ESLint with Oxlint on 2026-11-20. None of the
  787 demo commits has ever been linted by Oxlint, so the merge will surface
  new findings. `develop` once had an Oxlint version of the plugin import
  rule (`28a1ac252`) and dropped it with the plugins.
- **Package releases.** A push to `develop` runs `release-packages.yaml`,
  which writes changesets for changed `packages/**` and opens a version PR.
  Publishing to npm happens only when that PR is merged.
- **Unpushed work.** This machine's local `demo/measles` has two docs commits
  that are not on origin (`1f02d0fd0`, `17b5ee580`, AI agent roadmap).
- **The demo site is frozen.** Nothing deploys `demo.avandarlabs.com` since
  `demo.yaml` was deleted. It keeps serving its last deploy.
- **The release wording is wrong today.** On `demo/measles`, `ava release`
  run on `develop` says that pushing `main` "does not touch production".

## 4. Decisions for Pablo

None open. D1 to D7 and E1 are answered and recorded in section 2.

## 5. Rules that hold

1. **Never write to the production Supabase project.** Agents may read it
   carefully. Pablo runs every write from the runbook.
2. **Never use the Vercel console or change Vercel state.** Pablo does, from
   the runbook's values and click paths.
3. **No push, merge, or PR without Pablo asking in that session.**
4. **A migration applied to production is immutable.** A migration applied
   only to staging stays in the tree unchanged, so staging's history matches.
5. **Never run a reset, seed, start, stop, or diff against the shared local
   stack.** Use `ava supabase switch` first.
6. **Supply the database password, or use `--db-url`.** In CLI 2.114.0 a
   `--linked` connection that finds no password creates a temporary
   write-capable login role.
7. **Nothing deploys without the gate:** lint, type-check, and the quick
   suite.
8. **`demo/measles` and `develop` are frozen for other work** from the start
   of stage B until the promotion lands. Feature branches cut from
   `demo/measles` retarget `develop` afterwards.
9. **Deployments happen in CI only**, for `develop` and for `main` (D2). No
   Git integration, deploy hook, or console action deploys the app.
10. **The repository and its Actions logs are public.** Secrets, private
    hostnames, and anything about a user stay in GitHub environment secrets
    or outside the repository. They never appear in a file, a GitHub
    variable, or log output. Public documents give aggregate counts only.

## 6. Merge policy

All of the work happens on one integration branch, `chore/production-cutover`,
cut from `docs/production-cutover` (which is `demo/measles` plus these
documents). When it is done, `demo/measles` fast-forwards to it.

`develop` is merged in three steps, so the plugin deletion never applies:

| Step | Command | What it does | Conflicts in the dry run |
| --- | --- | --- | --- |
| 1 | `git merge 9389435f0` | Everything on `develop` up to the commit before the plugin removal | 2 files |
| 2 | `git merge -s ours d521a7c10` | Records the plugin removal as merged and changes nothing. Its drop migration is then added back, because staging ran it. | None |
| 3 | `git merge origin/develop` | The 161 commits after the removal, the Oxlint migration among them | 10 files |

The dry run kept all 251 plugin files. Every file the three steps delete is
under `apps/ava-video-producer`, except three legacy ESLint rule files and
two `ChatThread` helper files that `develop` removed.

| Area | Policy |
| --- | --- |
| Lint: `.oxlintrc.json`, `eslint/`, `eslint.config.js`, lint scripts and dependencies in `package.json` | `develop` wins. The plugin import rule is restored in its Oxlint form from `28a1ac252`. |
| `apps/ava-video-producer/**` | `develop` wins, file for file. |
| Plugin system: `plugins/`, `packages/shared/plugin-manifest`, `packages/web/plugin-sdk`, `packages/web/plugin-ui`, `scripts/vite-plugin-ava-plugins`, `src/lib/plugins`, the Plugins tab | `demo/measles` wins (D1). |
| Feature code in `src/`, `shared/`, `packages/` | `demo/measles`'s logic, with `develop`'s lint-driven edits applied on top. Read both sides of every conflict. |
| `supabase/schemas/` | `demo/measles` wins. It is the declarative source of truth. |
| `supabase/migrations/` | The union of both, then the repair in section 7. |
| `shared/types/database.types.ts`, `apps/desktop/migrations/*.gen.sql`, `src/routeTree.gen.ts` | Regenerated, never merged by hand. |
| `src/i18n/locales/**` | `.po` files through `pnpm translations resolve`. `messages.ts` is recompiled. |
| `pnpm-lock.yaml` | `develop`'s copy, then `pnpm install` rewrites it for the merged manifests. |
| `.github/workflows/`, `vercel.json` | `develop`'s copies, restored on purpose and verified with a diff, before the deploy port in section 8. |
| `.changeset/config.json` | `demo/measles` wins. The three plugin packages stay unpublished. |
| `AGENTS.md`, `docs/` | Both sides. Lint and tooling wording from `develop`. |

## 7. Migrations

| Change | Why it is allowed |
| --- | --- |
| Keep `20261117210525_drop_plugin_installations.sql` unchanged | Staging ran it. |
| Add `20261123200000_restore_plugin_installations.sql`, a copy of what `20261109035052_add_plugin_installations.sql` creates | A new migration, the fix forward. |
| Rename the two slot migrations to `20261123200100_add_plugin_data_slots.sql` and `20261123200200_harden_plugin_data_slot_bindings.sql`, contents unchanged | Neither production nor staging has run them. Only the `demo-measles` branch and local stacks have, and both are rebuilt or deleted. |

What each database then applies:

| Database | Has today | Applies | Notes |
| --- | --- | --- | --- |
| Production (Postgres 15.8) | 115 | 79 files, in timestamp order | The table is created, dropped, and created again in one push, empty the whole time. |
| Staging (Postgres 17.4) | 184 | 10 files: the 7 dictionary and crosswalk files out of order, then the restore and the two slot files | `staging.yaml` already passes `--include-all`. |
| Local reset | 0 | 194 files | Verified on a switched stack, with an empty `supabase db diff` against `supabase/schemas/`. |

The `demo-measles` branch is never migrated again. The desktop app's
generated SQLite migrations are regenerated from the final set.

The audit ([alpha-migration-audit.md](alpha-migration-audit.md)) covered 76
files on 2026-11-19. It is refreshed, read-only, for production's 79 files
and staging's 10, and renamed `production-migration-audit.md`.

## 8. Deploys

Pablo's answer to D2: CI deploys staging and production, and Vercel's Git
integration is removed.

| Step | Demo (`demo.yaml`) | Staging and production today | After this plan, both |
| --- | --- | --- | --- |
| Supabase CLI | 2.114.0 | 2.98.2 | 2.114.0. 2.98.2 resolves import maps in random order and can break an edge function bundle. |
| Migrations | `db push --include-all` | Staging `--include-all`, production plain | `db push --include-all` |
| Edge function secrets | Written by CI | Set by hand | Written by CI from the GitHub environment, in a single-quoted file |
| Edge functions | Deployed by CI | Deployed by CI | Unchanged. Production gains 4 functions. |
| Web app | Vercel CLI from CI | Vercel's Git integration, at push | Vercel CLI from CI, after the migrations |
| Order | Migrate, secrets, functions, app | App at push, migrations about 25 minutes later | Check the configuration, build, migrate, secrets, functions, app |
| Plugin bundle check | None | None | `pnpm check:plugin-bundle` in the quick gate |

Both deploy jobs come from the job written and reviewed for `alpha.yaml`: the
refusal to deploy anything but the branch tip, the configuration check, the
build before any write, credentials scoped to the step that needs them, the
single-quoted secrets file, and a concurrency group that never cancels a
running deploy. `production.yaml` targets `main` and the `production`
environment. `staging.yaml` targets `develop` and the `staging` environment.
The job is written out twice. Folding the two into one reusable workflow is
a later cleanup, not something to do right before a release.

**Removing the Git integration**, in this order:

1. `vercel.json` turns Git-triggered deployments off for every branch. It
   arrives with the promotion, so from that commit on Vercel builds nothing
   by itself.
2. The first staging deploy and the first production deploy run from CI.
3. Pablo disconnects the repository in Vercel, from the runbook's click
   path. Doing it last keeps a way back while the CI path is new.

One consequence: Vercel stops building a preview for every pull request
branch. A CI preview job can be added later.

Staging deploys to the Vercel environment named `staging`, which already
exists with staging's variables (E1). Production deploys to Vercel's
production target. The three values the build takes from GitHub
(`VITE_SUPABASE_API_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`) are
dropped from what Vercel returns, on staging as on production, so one source
decides which database a build points at.

What Pablo adds, once:

| Where | Names |
| --- | --- |
| GitHub `production` environment | About 20: the Supabase keys and URL, the Vercel token and IDs, and every edge function secret. It holds 3 today. |
| GitHub `staging` environment | 3: `STAGING_SUPABASE_URL`, `STAGING_SB_PUBLISHABLE_KEY`, `STAGING_SB_SECRET_KEY`. It already holds the rest. |
| Both environments | `AVA_PIPELINE_SERVER_URL` moves from a variable to a secret. A private hostname does not belong in a public repository's variables. |
| Vercel build variables | `VITE_AVA_DATA_AGENT`. `on` enables the data agent for every user. |

Three edge function secrets are on neither staging nor production today
(names checked on 2026-11-23): `AVA_PIPELINE_SERVER_URL`,
`AVA_PIPELINE_SERVER_SECRET`, and `GEOAPIFY_API_KEY`. Only the demo deploy
ever set them. CI writes them from now on. The pipeline server must point at
production before the release.

CI will also overwrite the secrets staging has by hand. A read-only digest
comparison on 2026-11-23 showed that the GitHub `staging` environment matches
staging for every shared name except one: **`FEATUREBASE_JWT_SECRET`
differs.** Pablo decides which value is right before staging's first CI
deploy.

`alpha.yaml`, `alpha-dev.yaml`, and `scripts/alpha-dev/` are deleted.

## 9. `ava release` without the alpha line

| Removed | Kept |
| --- | --- |
| The `alpha-dev` to `alpha` line and the `ReleaseLine` lookup | Preflight resolves branches by full ref, so a tag named `main` cannot win |
| `-alpha` and `-alpha-dev` versions | The current branch is read with `git symbolic-ref` |
| The colored line banner | The re-check that HEAD is still where preflight found it, before the version commit |
| `ava release notes --alpha` | The version commit touches `package.json` only |
| "Refuse on any CI verdict but a pass", which was alpha-only | Pushes use full refspecs |
| The wording that `main` "does not touch production" | The end-to-end tests that drive real git in a temporary repository |

`ava release` runs on `develop` only. Its warning says again that pushing
`main` deploys production and migrates the production database. On a CI
verdict other than a pass it asks, as it did before the alpha work.
`package.json` goes from `0.15.0-alpha-dev` to `0.15.0-dev`.

## 10. The catalog

The catalog exists only on the `demo-measles` branch. The scripts in
`scripts/alpha/` are kept and renamed `scripts/catalog-move/`.

1. Export a data-only dump from `demo-measles`. This is also the archive
   that lets the branch be deleted (D6). The dry run of the export has never
   run. This machine's CLI is logged in, so it runs here in stage E.
2. Import into staging's default database with `--replace-existing`, then
   copy the Parquet objects (D5).
3. Import into production the same way, after the release.

Production holds 6 `world-bank__wdi` listings and 4 datasets linked to one of
them. All 4 belong to Pablo's own single-member test workspaces, so the
replace breaks no other user's data. The import backs the old rows up first.

## 11. Stages

| Stage | Owner | Content |
| --- | --- | --- |
| A | Agent | Undo the alpha line on `chore/production-cutover`: workflows, lock-out, `ava release`, version, script names, docs. |
| B | Agent | Merge `develop` in three steps, repair the migrations, restore the lint rule, regenerate catalogs and types, then type-check, lint, the quick suite, a reset on a switched stack, and targeted end-to-end tests. |
| C | Agent | CI deploys for staging and production: `production.yaml`, `staging.yaml`, `vercel.json`, `pr-develop.yaml`. |
| D | Agent | Refresh the migration audit, read-only, for production and staging. |
| E | Agent | The cutover runbook for Pablo, and the catalog export dry run. |
| F | Agent | Retroactive review scaffolding: policy document, issue template, the script that drafts the issues, the publishing prompt for the runbook, the promotion PR description. Nothing is published. |
| G | Pablo | The cutover, from the runbook. |

Stage G in order:

1. Announce the freeze. Rehearse: restore a production dump into a switched
   local stack, apply the 79 migrations, open old dashboards.
2. Set the GitHub `staging` and `production` environment values, and a
   required reviewer on `production`.
3. Push the integration result to `demo/measles`. Open the PR into `develop`.
4. Land it on `develop` (D3). `staging.yaml` gates, builds, migrates, sets
   secrets, deploys functions, and deploys the staging app.
5. Load the catalog into staging (D5). Check staging.
6. Back up production. Run `ava release` on `develop` for `0.15.0`.
   `production.yaml` gates, builds, waits for the reviewer, migrates, sets
   secrets, deploys functions, and deploys the app.
7. Load the catalog into production. Smoke test.
8. Disconnect the Git integration in Vercel.
9. Start the privacy fix (AVA-611). When Pablo is ready, he pastes the
   runbook's prompt into a new agent session, which publishes the review
   backlog (D7). Clean up seven days after the smoke test (D6).

**Rollback.** Before step 6 production is untouched: stop. After step 6,
restore the database backup, redeploy `main`'s previous functions, and
promote the previous Vercel deployment. There is no partial rollback,
because the old app does not match the migrated schema.

## 12. Retroactive review (C3)

The established name is post-commit review. Nobody reopens a PR for a change
that already landed, and history is never rewritten.

- **Backlog:** [pr-feature-log.md](pr-feature-log.md), features F1 to F141.
  It stops being a porting list and becomes the review backlog.
- **One public issue per feature**, from a `retro-review` template and label,
  on a public board: not reviewed, in review, findings open, reviewed.
- **All 139 issues are opened together, on Pablo's approval** (D7). No agent
  creates a label, a board, or an issue as part of the cutover. The runbook
  holds a prompt that Pablo pastes into a new agent session when he is ready.
  The issue template and the policy document are repository files, so they
  arrive with the promotion PR.
- **Findings cite permalinks** at a pinned commit.
- **Fixes are normal PRs into `develop`.** Database fixes are new migrations.
- **Order by risk:** RLS and the 33 functions `anon` can execute, then
  migrations and data sync, then UI.
- **The policy is stated in the open:** `docs/reviews/README.md` and the
  promotion PR's description say what landed unreviewed and where the
  reviews live.

## 13. Choices made without asking

Each can be overruled before execution.

| Choice | Reason |
| --- | --- |
| Integration branch `chore/production-cutover`, cut from `docs/production-cutover` | Keeps `demo/measles` untouched until the work is verified. |
| The one-entry `ReleaseLine` is folded back into constants | "No parallel release line" should be true of the code as well. It is its own task and can be dropped. |
| `ava release` asks on a non-passing CI verdict | That was `develop`'s behavior. `production.yaml` gates the deploy again on `main`. |
| `scripts/alpha/` becomes `scripts/catalog-move/` | The feature log already calls them the catalog move scripts. |
| The staging and production deploy jobs are written out twice | A reusable workflow is cleaner, and changing the reviewed job's shape right before a release is not worth it. |
| Pull request previews stop with the Git integration | D2 removes the integration. A CI preview job is a later choice. |
| The demo site stays frozen | Restoring `demo.yaml` would be CI that exists only for the demo. Staging is the first deployed check. |
| The two unpushed docs commits are cherry-picked onto the integration branch | They are docs only and would otherwise stay on one machine. |

## 14. Superseded documents

| Document | Status |
| --- | --- |
| [alpha-launch-plan.md](alpha-launch-plan.md) | Superseded by this document. |
| [alpha-cutover-runbook.md](alpha-cutover-runbook.md) | Superseded. Sections 1.3 to 1.5, 2, 3.3 to 3.5, 5.1 to 5.5, 5.7, 5.8, 6.6, 6.11, and 7 are reused by the new runbook. |
| [2026-11-19-alpha-line-stage-0.md](../superpowers/plans/2026-11-19-alpha-line-stage-0.md) | Executed, then superseded. |
| [alpha-migration-audit.md](alpha-migration-audit.md) | Valid as of 2026-11-19. Refreshed and renamed in stage D. |
