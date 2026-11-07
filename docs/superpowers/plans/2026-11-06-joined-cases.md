# Joined Cases: Plan Overview

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each plan below task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a case type a complete join over many datasets: one value implementation read everywhere, typed rules, list and bucketed list fields, fields drawn from several sources, record names computed on demand, and keys that match across datasets after normalization or translation. No field value is ever stored.

**Architecture:** The concept view (`concept_<id>`, built by `buildConceptViewSql` inside each query's lease) becomes the only path from mappings to values. Fields describe the shape of their value (type, single or list or bucketed list, rule, grain). Mappings describe where rows come from (dataset, column, bucket date column, position, key normalization, crosswalk). Sync only maintains record membership.

**Tech Stack:** Postgres (Supabase declarative schema, pgTAP, migration upgrade tests), TypeScript, React, Mantine, TanStack Router and Query, Lingui, DuckDB (QETL), Deno edge functions, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-06-joined-cases-design.md` (the umbrella). Each plan below also has its own child spec, listed in the table. Section numbers (§) in a plan refer to its child spec unless they say "umbrella".

---

## The seven plans, in order

Each plan leaves working software behind it. Run them in this order. A later plan assumes every earlier plan has landed on `feat/joined-cases`.

| Order | Plan | Child spec | Depends on |
| --- | --- | --- | --- |
| 1 | `2026-11-06-joined-cases-1-record-page-concept-view.md` | `2026-11-06-joined-cases-1-record-page-concept-view-design.md` | nothing |
| 2 | `2026-11-06-joined-cases-2-typed-value-rules.md` | `2026-11-06-joined-cases-2-typed-value-rules-design.md` | plan 1 |
| 3 | `2026-11-06-joined-cases-3-list-fields.md` | `2026-11-06-joined-cases-3-list-fields-design.md` | plans 1 and 2 |
| 4 | `2026-11-06-joined-cases-4-bucketed-list-fields.md` | `2026-11-06-joined-cases-4-bucketed-list-fields-design.md` | plans 1 to 3 |
| 5 | `2026-11-06-joined-cases-5-multi-source-fields.md` | `2026-11-06-joined-cases-5-multi-source-fields-design.md` | plans 1 to 4 |
| 6 | `2026-11-06-joined-cases-6-on-demand-record-names.md` | `2026-11-06-joined-cases-6-on-demand-record-names-design.md` | plans 1 to 5 (needs only plan 1; see umbrella §4) |
| 7 | `2026-11-06-joined-cases-7-key-matching.md` | `2026-11-06-joined-cases-7-key-matching-design.md` | plans 1 to 6 |

## Where the work happens

- Case management on `demo/measles` (statuses, comments, incremental sync) is not in `develop`, so this work branches from `demo/measles`, not `develop`.
- Create one worktree on branch `feat/joined-cases` from `demo/measles`, using the `using-wt` skill. All seven plans run on that branch in order. Merging into `demo/measles` after any plan is Kristi's call.
- The branch's Supabase project is `feat-joined-cases` (`ava supabase switch` on the new branch).

## Ground rules for every plan

These come from `CLAUDE.md` and `docs/rules/`. Every task in every plan obeys them.

1. **Check the Supabase switch before any database command.** Run `ava supabase status` and confirm the first line names the `feat-joined-cases` project. Only then run `pnpm db:reset`, `pnpm db:new-migration`, `pnpm test:db`, `supabase start`, `supabase stop`, or `supabase db diff`. If `ava` is missing, run `pnpm build:ava-cli`.
2. **Never touch production.** No migration, query, or write against the production Supabase project.
3. **Schema changes follow `supabase-declarative-schema`.** Load that skill before editing SQL. Edit `supabase/schemas/`, then `pnpm db:reset` immediately followed by `pnpm db:new-migration <name>`. Never hand-edit a generated migration. Data moves (backfills, moving `value_picker_rule_type` in plan 5, correcting `data_type` in plan 2) and `alter type ... add value` are the only hand-written migrations, created with `supabase migration new <name>`. A generated migration that drops anything the plan did not touch is the shared-stack bug in `CLAUDE.md`: reset, regenerate, compare.
4. **Commit by path, never `git add -A`.** `supabase/config.toml` is switched to the branch project and must never be staged. Commit after every task with a Conventional Commits message (`feat(joined-cases): ...`, `fix(joined-cases): ...`, `test(joined-cases): ...`) ending with the `Co-Authored-By` trailer the session asks for. Do not push.
5. **Red/green TDD.** Write the failing test, watch it fail for the stated reason, implement, watch it pass. Tests follow `docs/rules/testing.md`. Value-rule tests construct ties and NULLs, because a rule that is deterministic only without them is not deterministic (`ontology-architecture.md` §15).
6. **All user-facing copy goes through Lingui.** Never pass `t` into a helper (`docs/rules/i18n.md`). After adding strings run `pnpm i18n:extract` and `pnpm i18n:compile`, and commit the catalogs.
7. **Comments:** no em dashes, no references to these plans, gaps (`G1`), phases, or specs. Describe the code as it is. SQL docstrings use `/** */`, everything else `--` (`docs/rules/sql.md`).
8. **E2E tests run one spec at a time** (`pnpm test:e2e <spec>.spec.ts`), drive the UI only, restore state in `finally`, and keep local timeouts at 45 seconds or less (`docs/rules/e2e-testing.md`).
9. **UI follows `docs/design/app-view-layout.md` and the Named Rules in `DESIGN.md`.** Load the `impeccable` skill only for a new surface (the bucketed list display in plan 4, the multi-source editor in plan 5).
10. **Copy names what the user does:** "case type", "record", "field", "source", "every value", "per month". Never "concept", "individual", "attribute", "mapping", "spine", or "crosswalk" in the UI. The child spec picks the user-facing word for a crosswalk.
11. **Keep `docs/ontology-architecture.md` true.** Each plan's last task updates the sections its gap changes, including section 16.
12. **Use the umbrella's shared names exactly** (umbrella §6). If a name proves impossible against the code, stop and record the deviation in the child spec before continuing.

## Commands

| Purpose | Command |
| --- | --- |
| Switch check | `ava supabase status` |
| Reset local DB from migrations | `pnpm db:reset` |
| Generate a migration from `supabase/schemas/` | `pnpm db:new-migration <name>` |
| Hand-written migration (data move or enum label only) | `supabase migration new <name>` |
| Regenerate DB types | `pnpm db:gen-types` |
| pgTAP, privilege reconcile, and migration upgrade tests | `pnpm test:db` |
| Unit tests (one file or pattern) | `pnpm test:frontend <pattern>` |
| Executed DuckDB tests | `pnpm test:executed <pattern>` |
| Type check (web, video producer, Deno) | `pnpm type-check` |
| Lint | `pnpm lint` |
| Desktop SQLite migrations | `pnpm desktop:sqlite:gen-migrations` then `pnpm desktop:sqlite:check-migrations` |
| One E2E spec | `pnpm test:e2e <spec>.spec.ts` |
| Lingui catalogs | `pnpm i18n:extract && pnpm i18n:compile` |

## Shared names

Umbrella §6 is the single list. It is not repeated here so the two cannot drift.

## Done when

The umbrella's §9 exit criteria hold on `feat/joined-cases`, and `pnpm type-check`, `pnpm lint`, `pnpm test:frontend`, `pnpm test:executed`, and `pnpm test:db` pass.
