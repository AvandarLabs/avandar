# Production cutover handoff

Written 2026-11-23 by the session that executed the alpha-line Stage 0 plan,
for the session that continues on another machine. It is self-contained: read
it top to bottom before touching anything.

**Your first job:** write the replacement spec and implementation plan
described in section 6, then stop for Pablo's approval. Do not change
`demo/measles` before that approval.

## 1. The decision (Pablo, 2026-11-23)

The alpha line is abandoned. There is no `alpha` or `alpha-dev` branch, no
parallel release line, no `-alpha` versions, and no CI that exists only for
the demo or alpha.

- `demo/measles` is brought up to date with `develop`, merged into `develop`,
  and `develop` is then released to `main`. This is a traditional cutover to
  production: the demo branch is promoted to `develop` and then to `main`.
- Only `develop` (staging) and `main` (production, `app.avandarlabs.com`)
  remain. The demo branch, the `demo.avandarlabs.com` domain, and the extra
  Supabase branch on the staging project (`demo-measles`) are removed
  afterwards.
- Work that was approved too fast gets a public retroactive review after the
  promotion. The repository is open source, so the reviews must be visible.

## 2. Decisions Pablo already answered

| ID | Decision | Answer |
| --- | --- | --- |
| C1 | How to bring `demo/measles` up to date with `develop` | **Merge `develop` into it.** In Pablo's words: "all lint improvements and anything from the Ava-video-producer is authoritative on develop. So accept develop." |
| C2 | Fate of the alpha-line work already on the branch | **Remove the line, keep the hardening**: keep the catalog scripts and the release and deploy safety fixes that do not depend on a line. |
| C3 | Mechanism for the public retroactive reviews | **Issues plus fix-forward PRs** with a public project board. |

A literal rebase was rejected: it would replay 787 commits, change every
commit ID the feature log cites, and need a force-push of a shared branch.

## 3. State of the branches (verified 2026-11-23)

| Fact | Value |
| --- | --- |
| `demo/measles` tip, equal to `origin/demo/measles` | `2e5a62c7e` |
| `develop` tip | `003e2964c` locally, 1 docs commit ahead of `origin/develop` (`ccab27208`) |
| `origin/main` tip | `8bb5b44f3` (Release 0.14.1) |
| Common ancestor of `demo/measles` and `develop` | `a5a58b2f8`, 2026-11-10 |
| Commits only on `demo/measles` | 787, of which 33 are merges |
| Commits only on `develop` | 402 |
| Files that conflict when `develop` is merged in | 110 |
| Open PRs that target `demo/measles` | None |
| `package.json` version | `0.15.0-alpha-dev` on `demo/measles`, `0.14.2-dev` on `develop` |

Conflicts by area: `src/views` 22, `src/lib` 16, `src/i18n` 16,
`packages/web` 11, `packages/shared` 10, `scripts/vite-plugin-ava-plugins` 8,
`src/components` 5, `plugins/epidemiology` 4, `tests/e2e` 3, `shared/models`
2, `docs/superpowers` 2, `apps/ava-cli` 2, `supabase/schemas` 1,
`src/clients` 1. Recompute with
`git merge-tree --write-tree --name-only develop demo/measles`.

Migrations: 192 on `demo/measles`, 184 on `develop`, 115 on `main`. The 183
files both branches share are byte-identical. Nine exist only on
`demo/measles` (`20261112000050` through `20261116222442`: data dictionaries,
dictionary bindings and conversions, crosswalks, plugin data slots; the two
slot files are now `20261123200100` and `20261123200200`). One
exists only on `develop`: `20261117210525_drop_plugin_installations.sql`.

The alpha line is already on `origin/demo/measles`: `feat/alpha-line` was
merged in `d53bde191` and another session's `feat/fix/alpha-review` in
`2e5a62c7e`, both on 2026-11-23.

## 4. Dangers and conflicts the plan must handle

1. **The lock-out files must not reach `develop`.** On `demo/measles`,
   `.github/workflows/production.yaml` has no `migrate` job (it has
   `deploy-mainline`), and `vercel.json` sets `git.deploymentEnabled` to
   false for `main`, `alpha`, and `alpha-dev`. If these reach `develop` and
   then `main`, production stops migrating and deploying. A plain merge of
   `develop` keeps the branch's versions silently, so restore `develop`'s
   versions on purpose and verify with a diff.
2. **One migration conflict is semantic, not textual.** `develop` drops
   `plugin_installations` (2026-11-17). `demo/measles` still declares that
   table in `supabase/schemas/` and its plugin data slot migrations
   (2026-11-16) use it. Staging has already applied the drop. Decide which
   side is right from the code, and fix forward with a new migration.
3. **The demo site stopped deploying.** The alpha-line merge deleted
   `.github/workflows/demo.yaml`, and `alpha-dev.yaml` only runs on a branch
   named `alpha-dev`. Pushes to `demo/measles` no longer update
   `demo.avandarlabs.com` or migrate the `demo-measles` Supabase branch.
4. **Other sessions were still building the alpha line today.** That work
   must stop. Check `git log origin/demo/measles` again before planning.
5. **Compiled i18n catalogs.** `messages.ts` files next to `messages.po` are
   generated. Regenerate them after the merge, never hand-merge them.
6. **Merge policy.** `develop` wins for every lint change (the Oxlint
   migration and its follow-ups) and for everything in
   `apps/ava-video-producer`. For the rest, write a per-area policy in the
   plan after reading the conflicts. Do not default to one side.
7. **The migration audit is out of date.** `alpha-migration-audit.md` covers
   the 76 files that were on `demo/measles` and not on `main` on 2026-11-19.
   The merged set adds later files and the `develop`-only drop. Re-run it,
   read-only, against production for the merged order. Also check what
   staging will apply: staging has `develop`'s migrations, and the nine
   demo-only files are older than `develop`'s newest, so staging needs
   `--include-all` (verify in `staging.yaml`).
8. **Production deploys differ from the demo deploy.** Earlier reviews
   reported that `develop`'s `production.yaml` uses Supabase CLI 2.98.2 with a
   plain `supabase db push`, that production edge function secrets are set
   by hand, and that the app is deployed by Vercel's Git integration.
   Verify each, then list what the demo deploy did that staging and
   production do not (edge function secrets, the three extra edge
   functions, pipeline server settings, Vercel variables).
9. **The catalog exists only on the `demo-measles` Supabase branch.** That
   branch is not persistent and can pause when idle. Export the catalog
   before the branch is deleted. The export dry run never ran because the
   Supabase CLI was not logged in on the first machine.
10. **Production already holds catalog rows.** It has 6 `world-bank__wdi`
    listings and 4 datasets linked to one of them. A read-only check on
    2026-11-23 showed all 4 belong to Pablo's own single-member test
    workspaces, so replacing the catalog breaks no other user's data.
11. **`supabase link` is safe, a passwordless linked connection is not.** In
    CLI 2.114.0, a `--linked` database connection that finds no password
    creates a temporary write-capable login role and can delete network
    bans after failed retries. Always give the password, or use `--db-url`.

## 5. What to keep and what to remove (C2)

| Work on `demo/measles` | Fate |
| --- | --- |
| `.github/workflows/alpha.yaml`, `alpha-dev.yaml`, `scripts/alpha-dev/` | Remove. Port `alpha.yaml`'s deploy safety into `production.yaml`: the configuration check, build before migrate, step-scoped credentials, and the quoted secrets file. |
| Lock-out `production.yaml`, `vercel.json` `git.deploymentEnabled` | Remove first. Restore `develop`'s versions. |
| Two-line `ava release` in `apps/ava-cli/src/ReleaseCli` (`getReleaseLineFromBranch`, `-alpha` suffixes, banner, `release notes --alpha`) | Remove the alpha line. Keep what does not depend on a line: full-ref lookups in preflight, `git symbolic-ref` for the current branch, the re-check before the version commit, the `package.json`-only version commit, full-refspec pushes, and the real-git end-to-end tests. |
| `package.json` version `0.15.0-alpha-dev` | Becomes a `-dev` version on `develop`. The production release is `0.15.0`. |
| `scripts/alpha/` (catalog export, import, Parquet copy) | Keep and rename. Targets are now the staging project's default database and production. |
| `docs/measles-demo/alpha-launch-plan.md`, `alpha-cutover-runbook.md`, `docs/superpowers/plans/2026-11-19-alpha-line-stage-0.md` | Superseded. Mark them so, and reuse the runbook's rehearsal, production environment values, backup, catalog, and rollback sections. |
| `docs/measles-demo/alpha-migration-audit.md` | Keep and refresh (item 7 above). |
| Feature log entry F139 (the alpha line) | Rewrite to describe what survives. |

## 6. Next step: the replacement spec and plan

Follow the repository's `CLAUDE.md` and the personal workflow rules: load the
`super-wrapper` skill before any design, planning, delegation, or review
work, and route models as it says.

Deliverables, committed locally on this branch (`docs/production-cutover`):

1. **Spec:** `docs/measles-demo/production-cutover-plan.md`. It replaces
   `alpha-launch-plan.md`.
2. **Implementation plan:**
   `docs/superpowers/plans/2026-11-23-production-cutover.md`, in the same
   task format as the Stage 0 plan, with each task's risk class.
3. A one-line "superseded by" note at the top of the three superseded
   documents.

Suggested stages, to adjust after investigation:

| Stage | Content |
| --- | --- |
| A | On a branch off `demo/measles`: undo the alpha line as in section 5. |
| B | Merge `develop` in: conflict policy, the `plugin_installations` decision, regenerated catalogs, then type-check, lint, tests, a database reset on a switched local stack, and targeted end-to-end tests. |
| C | Deploy parity for staging and production: what `staging.yaml` and `production.yaml` need so the promoted code runs. |
| D | Refresh the migration audit for production and for staging. |
| E | A shorter cutover runbook for Pablo: rehearsal, production configuration, backup, the PR from `demo/measles` into `develop`, staging checks and catalog load, the release to `main` with `ava release`, the production catalog load, smoke test, rollback, cleanup. |
| F | Retroactive review setup (section 7). |

Questions to bring to Pablo with a recommendation, as a new decision batch:

- Which side is right about `plugin_installations`.
- Whether staging's default database gets the catalog through the same
  replace import as production.
- Whether production edge function secrets move into CI or stay manual.
- When the demo domain, the Vercel `demo` environment, and the
  `demo-measles` Supabase branch are deleted.
- Creating the public review issues. It is outward-facing, so it needs his
  explicit approval.

## 7. Retroactive review scheme (C3)

The established name is post-commit review. Nobody re-opens a PR for a change
that already landed, and history is never rewritten. Fixes land as new PRs.

- **Backlog:** `docs/measles-demo/pr-feature-log.md` maps features F1 to F139
  to commits and files. It stops being a porting list and becomes the review
  backlog.
- **One public issue per feature**, from a `retro-review` issue template and
  label, tracked on a public GitHub Project board: not reviewed, in review,
  findings open, reviewed.
- **Findings cite permalinks** to the code at a pinned commit, so GitHub
  shows the lines inside the issue.
- **Fixes are normal PRs into `develop`** that close a finding. Database
  fixes are new migrations.
- **Order by risk:** RLS and the 33 functions `anon` can execute, then
  migrations and data sync, then UI.
- **State the policy in the open:** a short `docs/reviews/README.md`, and the
  promotion PR's description, say what landed unreviewed and where the
  reviews live.
- A never-merged review-only PR is an option only when a human wants the
  review UI for one feature. Demo features are interleaved across commits,
  so it fits poorly as the default.

## 8. Rules that bind every session

- **Never write to the production Supabase project** (records or
  configuration). Careful read-only queries are allowed. Give Pablo exact
  commands with backup and restore steps instead.
- **Never use the Vercel console or change any Vercel state.** Give Pablo
  the exact values and click paths.
- **Do not push, merge, or open PRs** unless Pablo asks in that session. For
  this handoff he authorized pushing `docs/production-cutover` only.
- **Never run** `pnpm db:reset`, `pnpm db:seed`, `supabase start`,
  `supabase stop`, `supabase db diff`, or `pnpm db:new-migration` against
  the shared local stack. Use `ava supabase switch` first when a branch
  changes what the stack is built from.
- **A migration applied to production is immutable** on every branch.
- **Build features and fixes in their own worktree** created with `wt`. Other
  sessions edit the shared `demo/measles` tree.
- **Keep `pr-feature-log.md` and `bug-log.md` current** while the branch
  exists.

Practical notes learned during Stage 0:

- Verify types with `pnpm exec tsc -b --force --noEmit`. A plain build can
  report clean from a stale cache.
- Format with `oxfmt --ignore-path .oxfmtignore <files>`. Without that flag
  it reports every file as excluded.
- Run ava-cli tests with `pnpm --filter @avandar/ava-cli test <path>`, with
  no `--` before the path.
- Lint workflows with actionlint 1.7.12 or newer. Version 1.7.7 rejects the
  valid `environment.deployment` key.
- The pre-push hook translates new strings and formats files, and can leave
  uncommitted changes. Commit them and push again.
- `ava` is one global symlink to whichever worktree last ran
  `pnpm build:ava-cli`. Do not rebuild it casually.
- The default Homebrew `psql` and `pg_dump` may be version 14. The catalog
  import needs psql 15.14, 16.10, 17.6, or 18 and newer.

## 9. Documents

| Path | Status |
| --- | --- |
| `docs/measles-demo/alpha-launch-plan.md` | Superseded spec. |
| `docs/measles-demo/alpha-cutover-runbook.md` | Superseded runbook. Sections 2, 3.3 to 3.5, 6.6, 6.11, and 7 are reusable. |
| `docs/measles-demo/alpha-migration-audit.md` | Valid as of 2026-11-19. Refresh. |
| `docs/superpowers/plans/2026-11-19-alpha-line-stage-0.md` | Executed, then superseded. |
| `docs/measles-demo/pr-feature-log.md` | Features F1 to F139. The review backlog. |
| `docs/measles-demo/bug-log.md` | Bug fixes and their PRs. |
| `scripts/alpha/` | Catalog export, import, and Parquet copy scripts with tests. |
| `apps/ava-cli/src/ReleaseCli/` | The release CLI. |

## 10. What existed only on the first machine

- **`chore/mainline-lockout`:** a local, never pushed branch. It is obsolete
  and was deleted. Its `production.yaml` and `vercel.json` are the copies
  that section 4 item 1 tells you to undo on `demo/measles`.
- **Downloads copies** of the old runbook and its PDF. They are obsolete.
- **No background work** was left running.
