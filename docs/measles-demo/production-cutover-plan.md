# Production cutover plan

How `demo/measles` is promoted into `develop` and then released to `main`,
which serves `app.avandarlabs.com`. Written 2026-11-23. It replaces
[alpha-launch-plan.md](alpha-launch-plan.md). The implementation plan is
[2026-11-23-production-cutover.md](../superpowers/plans/2026-11-23-production-cutover.md).

**Status:** waiting for Pablo's approval. Nothing in this document has been
executed. Decisions D1 to D7 in section 4 are open, and the plan is written
for the recommended option of each.

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
| Feature log | **Changed:** F1 to F141. The alpha line is F141, not F139. |
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
This is decision D2.

### 3.5 A known privacy gap is marked "fix before this reaches `develop`"

The top of [pr-feature-log.md](pr-feature-log.md) carries this warning:
crosswalk layouts and mappings are readable by every Data Sources viewer,
even when the member dataset is restricted to other people. A viewer can
read a restricted dataset's column names, source columns, and fill rules
when that dataset is alone in its layout. It was accepted for the demo only.
The promotion would carry it to `develop` and then to production. This is
decision D4. The fix needs a design of its own, so it gets a separate spec
and plan once D4 is answered. It is not a task of the cutover plan.

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

| ID | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| D1 | Which side is right about `plugin_installations`, which means: does the plugin system ship | (a) Keep plugins, the `demo/measles` side. (b) Remove plugins, the `develop` side. (c) Keep the code and hide the Plugins tab in production behind a new feature flag. | **(a).** The promotion ships the demo, and the epidemiology charts are part of it. Plugins reach a workspace only when a settings admin installs one. Option (b) means deleting about 300 files and the features built on them right before a production release. |
| D2 | How production deploys, including edge function secrets | (a) CI deploys everything: checks the configuration, builds, migrates, sets secrets, deploys functions, then deploys the prebuilt app. Git-integration deploys are turned off for `main`. (b) Today's path: Vercel deploys on push, CI migrates later, Pablo sets secrets by hand. | **(a).** It is what C2 kept from `alpha.yaml`, and it shrinks the window where app and schema disagree from about 25 minutes to a few. It costs Pablo about 20 new values in the GitHub `production` environment. |
| D3 | How the promotion lands on `develop` under the squash-only ruleset | (a) Open the PR for CI and the public record, then Pablo fast-forwards `develop` to the PR head from a terminal, using the admin bypass. GitHub marks the PR merged. (b) Temporarily allow merge commits and lift linear history, merge with a merge commit, restore the settings. (c) Squash. | **(a).** Every commit ID survives and no setting changes. Option (c) loses the IDs, the reason a rebase was rejected. |
| D4 | The crosswalk privacy gap | (a) Promote to `develop`, fix it there, and release to `main` only after the fix. (b) Release with the gap and fix forward. (c) Fix it before the merge into `develop`. | **(a).** Staging has no real users, so the gap may reach `develop`. Production should not get a known gap that the repository already documents in public. |
| D5 | Does staging's default database get the catalog through the same replace import as production | (a) Yes, first, as the rehearsal of the production load. (b) No, staging keeps the catalog rows it has. | **(a).** It is the only full test of the import and the Parquet copy before production, and staging then shows the catalog users will see. |
| D6 | When the demo domain, the Vercel `demo` environment, and the `demo-measles` Supabase branch are deleted | (a) Seven days after the production smoke test passes and the catalog dump is archived. (b) Right after the production catalog load. (c) After the retroactive reviews finish. | **(a).** A week keeps a working reference for comparison while the release settles, without paying for the branch for months. |
| D7 | Creating the public review issues, label, and board | (a) Create the label, template, and board with the promotion PR, then open issues in risk-ordered batches, security first. (b) Open all 141 at once. (c) Hold everything until after the release. | **(a).** The policy is public from day one, and the tracker is not flooded with 141 issues before anyone can work them. It is outward-facing, so nothing is created without this approval. |

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

## 8. Deploy parity

What the demo deploy did, and what staging and production do:

| Step | Demo (`demo.yaml`) | Staging today | Production today | After this plan |
| --- | --- | --- | --- | --- |
| Supabase CLI | 2.114.0 | 2.98.2 | 2.98.2 | 2.114.0 everywhere. 2.98.2 resolves import maps in random order and can break an edge function bundle. |
| Migrations | `db push --include-all` | `db push --include-all` | `db push` | Unchanged for staging. Production adds `--include-all`, harmless for this release and needed for later out-of-order merges. |
| Edge function secrets | Written by CI | Set by hand | Set by hand | Staging stays by hand and gets the three names it lacks, from the runbook. Production is written by CI (D2). |
| Edge functions | Deployed by CI | Deployed by CI | Deployed by CI | Unchanged. Production gains 4 functions. |
| Web app | Vercel CLI from CI | Git integration | Git integration | Staging unchanged. Production by Vercel CLI from CI, after the migrations (D2). |
| Order | Migrate, secrets, functions, app | App at push, migrate later | App at push, migrate later | Production: check, build, migrate, secrets, functions, app. |
| Plugin bundle check | None | None | None | `pnpm check:plugin-bundle` joins the quick gate in all three workflows. |

Missing today, whatever D2 decides. The three secrets are absent from both
staging and production (names checked on 2026-11-23). Only the demo deploy
ever set them, on the `demo-measles` branch:

| Name | Kind | Used by |
| --- | --- | --- |
| `AVA_PIPELINE_SERVER_URL`, `AVA_PIPELINE_SERVER_SECRET` | Edge function secrets | Catalog pipelines. The pipeline server must point at production. |
| `GEOAPIFY_API_KEY` | Edge function secret | `geocode` |
| `VITE_AVA_DATA_AGENT` | Vercel build variable | The data agent. `on` enables it for every user. |

`production.yaml` takes these from `alpha.yaml`, retargeted at `main`: the
refusal to deploy anything but the branch tip, the configuration check, the
build before any production write, credentials scoped to the step that needs
them, the single-quoted secrets file, and a concurrency group that never
cancels a running deploy. `vercel.json` turns Git-integration deploys off for
`main` only. `alpha.yaml`, `alpha-dev.yaml`, and
`scripts/alpha-dev/` are deleted.

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
| C | Agent | Deploy parity: `production.yaml`, `vercel.json`, `staging.yaml`, `pr-develop.yaml`. |
| D | Agent | Refresh the migration audit, read-only, for production and staging. |
| E | Agent | The cutover runbook for Pablo, and the catalog export dry run. |
| F | Agent | Retroactive review scaffolding: policy document, issue template, generated issue drafts, the promotion PR description. Nothing is published. |
| G | Pablo | The cutover, from the runbook. |

Stage G in order:

1. Announce the freeze. Rehearse: restore a production dump into a switched
   local stack, apply the 79 migrations, open old dashboards.
2. Set the GitHub `production` environment values and a required reviewer.
3. Push the integration result to `demo/measles`. Open the PR into `develop`.
4. Land it on `develop` (D3). `staging.yaml` migrates staging.
5. Load the catalog into staging (D5). Check staging.
6. Land the privacy fix on `develop` (D4).
7. Back up production. Run `ava release` on `develop` for `0.15.0`.
   `production.yaml` gates, builds, waits for the reviewer, migrates, sets
   secrets, deploys functions, and deploys the app.
8. Load the catalog into production. Smoke test.
9. Publish the review scaffolding (D7). Clean up (D6).

**Rollback.** Before step 7 production is untouched: stop. After step 7,
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
| The demo site stays frozen | Restoring `demo.yaml` would be CI that exists only for the demo. Staging is the first deployed check. |
| The two unpushed docs commits are cherry-picked onto the integration branch | They are docs only and would otherwise stay on one machine. |

## 14. Superseded documents

| Document | Status |
| --- | --- |
| [alpha-launch-plan.md](alpha-launch-plan.md) | Superseded by this document. |
| [alpha-cutover-runbook.md](alpha-cutover-runbook.md) | Superseded. Sections 1.3 to 1.5, 2, 3.3 to 3.5, 5.1 to 5.5, 5.7, 5.8, 6.6, 6.11, and 7 are reused by the new runbook. |
| [2026-11-19-alpha-line-stage-0.md](../superpowers/plans/2026-11-19-alpha-line-stage-0.md) | Executed, then superseded. |
| [alpha-migration-audit.md](alpha-migration-audit.md) | Valid as of 2026-11-19. Refreshed and renamed in stage D. |
