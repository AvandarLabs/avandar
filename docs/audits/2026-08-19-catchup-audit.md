# Catch-up audit: 2026-08-15 → present

Rigorous review of everything that landed on `develop` from Sat 2026-08-15
00:00 through the demo on 08-19 and the fixes since. During that window code
was merged under deadline pressure without a human review pass.

- **Base:** `0ed6fb5ad` (2026-08-14 18:22, last commit before the cutoff)
- **Tip:** `origin/develop`, re-pinned as the audit proceeds
- **Scope:** ~111k added lines of production code, ~93k of test code

## Ground rules

1. **The tests are part of the audit, not evidence for it.** ~93k lines of
   tests were written by the same agents that wrote the code. A green suite
   shows the code matches the agent's belief about the code. It retires no
   risk on its own.
2. **An agent adversarial pass is a preprocessing step, never a substitute.**
   Each unit gets an agent pass first so the human pass reviews something
   more robust. Only a human pass sets `Status: reviewed`.
3. **Find and fix are separate acts.** Reviewing produces findings in this
   file. Fixes land in batches on branches cut from current `develop`, so
   "I read this" never gets confused with "I changed this".
4. **Nothing is committed to `develop` directly.** Pushing there deploys to
   staging, and `develop` has no branch protection to catch a slip.

## Getting a diff

`scripts/review/build-audit-refs.sh` builds every ref. Idempotent; never
touches HEAD, the index, or the working tree. `AUDIT_BASE` / `AUDIT_TIP`
override the window.

```sh
bash scripts/review/build-audit-refs.sh

git diff review/base review/t1-sql          # plain git
node_modules/.bin/difit review/t1-sql review/base   # difit, no checkout
git checkout review/t1-sql && dif review/base       # diff-review skill
```

Two axes:

- **Tier slices** (`review/t<N>-<area>`) answer *what is live right now in
  this risk area*. Cumulative from base to tip, and a provable partition:
  the script asserts that applying every tier reproduces the tip's tree
  exactly, and fails if any path escapes. Read-only; a tier tree is a real
  git tree but a mixed-version snapshot, so it will not typecheck or boot.
- **Branch slices** (`review/b/<slug>`, `review/b/<slug>-base`) answer *what
  did this agent actually write*. Real runnable historical states, pinned to
  history. They overlap: `qetl-registry`, `qetl-column-projection`, and
  `chat-concept-aliases` are all fully contained in `qetl-impl`.

## Where work happens

**Read on `review/*`. Change on `fix/audit-*`. Only `fix/audit-*` merges back
to `develop`.**

For every tier t1 through t6, and for every branch slice, the loop is the same:

| Step | Where | What |
| --- | --- | --- |
| 1. Agent adversarial pass | `fix/audit-<tier>` worktree | Agent reads the scoped diff, records findings, applies fixes it is confident in |
| 2. Human pass | `review/<tier>` worktree | You read the same scoped diff in difit and comment |
| 3. Fixes | `fix/audit-<tier>` worktree | All edits, tests, and ledger updates |
| 4. Merge | `fix/audit-<tier>` → `develop` | The only thing that ever merges |

Set both worktrees up once per tier:

```sh
cd "$(wt go review/t1-sql)"       # read-only lens; run `pnpm diff-review review/base`
cd "$(wt new fix audit-t1-sql)"   # cut from develop; builds, runs tests, gets merged
```

### Why the split

A `review/t<N>` ref is a synthetic mixed-version tree: real git objects, but
BASE with only one tier's paths advanced. It gives a perfectly scoped diff and
it will not typecheck, boot, or run a test. So it can host a review but never a
fix.

A `fix/audit-<tier>` branch is cut from current `develop`, so it builds and
tests normally.

The two stay in sync because a tier ref takes its paths verbatim from the tip.
`git diff review/t1-sql origin/develop -- supabase/…` is empty: the SQL files
you read on `review/t1-sql` are byte-identical to the ones you edit on
`fix/audit-t1-sql`. Read in one place, edit in the other, no drift.

### Briefing an agent for the adversarial pass

Start the agent session **in the `fix/audit-<tier>` worktree**, not the review
one. Git refs are repository-wide, so from there the agent still reads the
scoped diff:

```sh
git diff review/base review/t1-sql            # the tier's complete change
git diff review/base review/t1-sql -- <path>  # one file
```

Tell it: findings go in this ledger, fixes go in the working tree, and it must
never check out, commit to, or merge a `review/*` ref. Those are regenerated
lenses, not branches.

## Fix lanes

| Lane | Branch | For | Ships |
| --- | --- | --- | --- |
| Hotfix | `fix/<specific>` | Cross-tenant exposure, data loss | Immediately, own PR |
| Tier | `fix/audit-<tier>` | Substantive defects | When the tier closes |
| Nit | `chore/audit-nits` | Typos, dead code, naming | Whenever; blocks nothing |

Watch out: `.githooks/pre-push` runs the Lingui pipeline and exits 2 when
catalogs change, so any fix branch touching user-facing strings gets blocked
once and needs a follow-up commit with regenerated catalogs.

## Tier status

Ordered by blast radius per line, not by size.

| Tier | Ref | Files | +Lines | Agent pass | Human pass | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Guardrails | `review/t6-guardrails` | 47 | 3,480 | n/a | **done** | F-1/F-2 accepted, F-3 open |
| SQL + privileges | `review/t1-sql` | 156 | 21,054 | **done** | not started | F-5/F-6 fixed, F-7 open |
| Edge functions | `review/t2-edge` | 73 | 4,697 | not started | not started | Untrusted input reaches SQL |
| Core / clients | `review/t2-core` | 816 | 82,768 | not started | not started | |
| UI | `review/t3-ui` | 1,329 | 95,084 | not started | not started | Spot-check, demo-driven |
| E2E tests | `review/t4-e2e` | 69 | 7,311 | not started | not started | |
| i18n | `review/t5-i18n` | 25 | 29,593 | not started | not started | Skim |
| Docs / plans | `review/t5-docs` | 157 | 102,719 | not started | not started | Read as spec, not code |

## Branch status

| Branch | Ref | Files | +Lines | Agent pass | Human pass |
| --- | --- | --- | --- | --- | --- |
| qetl-impl | `review/b/qetl-impl` | 472 | 53,116 | not started | not started |
| pdf-import | `review/b/pdf-import` | 201 | 38,806 | not started | not started |
| nux | `review/b/nux` | 262 | 25,901 | not started | not started |
| filters | `review/b/filters` | 104 | 15,317 | not started | not started |
| gis-pdf-export | `review/b/gis-pdf-export` | 150 | 14,190 | not started | not started |
| qetl-registry | `review/b/qetl-registry` | 86 | 8,781 | not started | not started |
| newchat | `review/b/newchat` | 84 | 4,896 | not started | not started |
| gis-ux | `review/b/gis-ux` | 60 | 3,841 | not started | not started |
| pdf-geometry | `review/b/pdf-geometry` | 36 | 2,752 | not started | not started |
| qetl-column-projection | `review/b/qetl-column-projection` | 22 | 2,390 | not started | not started |
| chat-concept-aliases | `review/b/chat-concept-aliases` | 30 | 1,516 | not started | not started |
| demo-blockers | `review/b/demo-blockers` | 27 | 1,334 | not started | not started |
| supabase-switch | `review/b/supabase-switch` | 31 | 1,047 | not started | not started |
| gis-geo-binding | `review/b/gis-geo-binding` | 23 | 184 | not started | not started |
| xlsx-skip-rows | `review/b/xlsx-skip-rows` | 3 | 201 | not started | not started |
| pdf-output-mode | `review/b/pdf-output-mode` | 5 | 6 | not started | not started |

Note: `qetl-impl` had agent adversarial review during development (commits
"Close adversarial review findings", "Address review:", and
`docs/superpowers/plans/2026-08-19-qetl-registry-review-findings.md`). Per
ground rule 2 that does not count as reviewed.

## Findings

Severity: **S1** data loss or cross-tenant exposure · **S2** incorrect
behaviour users hit · **S3** latent defect or weakened guardrail · **S4** nit.

### F-1 — `migrate` no longer gated on the e2e suite (S3, open)

**Where:** `.github/workflows/staging.yaml`, `.github/workflows/production.yaml`
**From:** `chore/split-ci-tests`, merged `53b942067` on 08-19 12:44, the last
merge before the 10:00 demo deadline.

The `migrate` job changed from `needs: test` to `needs: test-quick`, and
`test-e2e` is commented "Intentionally NOT a dependency of `migrate`". Both
workflows changed, so a failing e2e suite no longer blocks a database
migration in **staging or production**. Production migrations run on push to
`main` gated only on lint, typecheck, and the non-e2e suite.

Bounded: `--quick` skips only `test:e2e`. `test:db` (`supabase test db`,
`db:validate-privileges`, and the dashboard-publishing migration test) still
runs in `test-quick`, so the pgTAP and privilege net still gates `migrate`.
That is what keeps this S3 rather than S1.

This is a deliberate tradeoff, correctly commented, made under deadline
pressure. It needs an explicit re-decision now the deadline has passed, not
a silent revert.

**Resolution (2026-08-23):** accepted as-is. Keep the current `develop`
behaviour: `migrate` stays gated on `test-quick` only, in both staging and
production. `test:db` continues to gate migrations, which is the part that
matters for schema safety. No change.

**Status:** accepted, closed

### F-2 — COOP/COEP dropped from `vercel.json`, COOP possibly over-removed (S3, open)

**Where:** `vercel.json`, `index.html`
**From:** `3e37a1b61` "Let chat design case types…", 08-19 08:59, about an hour
before the demo, on the `qetl-impl` branch.

`Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: credentialless` were removed from the
all-routes header block, so the app is no longer cross-origin isolated in
production.

This is **documented and deliberate**, not a silent regression: the comment in
`index.html` explains that the Google Picker cannot run inside an isolated
document (credentialless it has no cookie jar and asks for cookie access;
unmarked, COEP refuses the frame outright), and that Sheets import matters
more than `SharedArrayBuffer` for the WebLLM offline-chat runtime. The
credentialless iframe installer correctly gained a `window.crossOriginIsolated`
guard so it goes dormant. The only process problem is that an unrelated
commit carried the change and its message does not mention it.

The substantive question is narrower: **COEP had to go for the Picker, but
COOP may not have.** The two headers do different jobs. COEP governs
subresource and iframe embedding, which is what blocks the Picker. COOP
governs the window/opener relationship, and dropping it is what costs the
cross-window and XS-Leaks protection on every route. `same-origin-allow-popups`
would keep that protection for the general case while still letting the
Picker's popup postMessage back to its opener.

Proposed: try `Cross-Origin-Opener-Policy: same-origin-allow-popups` with COEP
left off, and verify the Picker and Sheets import still work. If they do, the
app gets most of the COOP protection back at no functional cost. Note that
`vite.config.ts` sets no COOP/COEP either, so dev matches prod.

**Resolution (2026-08-23):** accepted as-is. Keep the current `develop`
headers; Sheets import is worth more than the COOP hardening right now. The
`same-origin-allow-popups` idea is recorded above if the tradeoff is ever
revisited. No change.

**Status:** accepted, closed

### F-3 — `.gitignore` no longer ignores `.cursor/plans` (S4, open)

**Where:** `.gitignore`

The Cursor entry changed from `.cursor/plans` to `.cursor/.cursor/`, so agent
plan files written to `.cursor/plans` are no longer ignored. Nothing has
leaked yet (`git ls-files .cursor` shows only rules, settings, and skills),
so this is latent.

**Resolution (2026-08-23):** accepted as-is. Keep whatever `.gitignore` is
current on `develop`. No change.

**Status:** accepted, closed

## Tier t6-guardrails: closing note

Worth recording because it is the opposite of what the audit assumed. Apart
from F-1 and F-2, every guardrail in this tier got **stronger** during the
crunch window:

- `test:db` gained `db:validate-privileges` and the dashboard-publishing
  migration test on top of `supabase test db`.
- `type-check` gained `type-check:deno`, covering `shared`, `supabase/functions`,
  and `packages/shared`.
- Three git hooks were added (`pre-commit`, `pre-merge-commit`, and a new
  Supabase-config stage in `pre-push`).
- Every new eslint ignore is a gitignored build artifact (`playwright-report`,
  `.temp`, `supabase/.temp`) with a written justification. No lint rule was
  disabled, and `.prettierrc`'s `expressionWidth` 8 to 40 is formatting only.
- Dependency additions are all explained by shipped features (`pdfjs-dist`,
  `@dnd-kit/*`, `react-joyride`, `@duckdb/node-api`) plus a Supabase CLI bump.

### F-4 — six new RLS-protected tables have no pgTAP coverage at all (S3, open)

**Where:** `supabase/schemas/10.concepts.sql`, `20.concept_attributes.sql`,
`20.datasets__pdf_file.sql`, and the individuals/attribute-mapping schemas
**Tier:** t1-sql

39 `create policy` statements landed in the window across 10 tables. Coverage
of them is uneven:

| Table | Multi-workspace test | Any test at all |
| --- | --- | --- |
| `public.maps` | `rls_maps.test.sql` | yes |
| `storage.objects` | 3 files, incl. `storage_private_dataset_guard` | yes |
| `public.user_group_memberships` | none | 4 files |
| `public.user_nux_progress` | none | 1 file |
| `public.concepts` | none | **none** |
| `public.concept_attributes` | none | **none** |
| `public.individuals` | none | **none** |
| `public.datasets__pdf_file` | none | **none** |
| `public.attribute_mappings__dataset_column` | none | **none** |
| `public.attribute_mappings__manual_entry` | none | **none** |

The six tables with no tests are the description-logic/ontology surface plus
PDF-file datasets, all introduced during the crunch.

This is a missing regression lock, not a known leak. Read directly, the
policies use the correct pattern:

```sql
create policy "User can SELECT concepts" on public.concepts for select
  to authenticated using (
    public.concepts.workspace_id = any (
      array(select public.util__get_auth_user_workspaces ())
```

So they look right today. The problem is that nothing holds them there. The
header of `may_select_private_resource.test.sql` makes the same argument about
its own subject: without the test, "nothing else in the suite would notice" if
the predicate were narrowed or dropped. These six tables are in that state now,
and `test:db` gates `migrate`, so a test added here actually blocks a bad
migration rather than just reporting one.

**Remedy (part of this finding, not a separate one).** Six new cross-tenant
pgTAP files, one per uncovered table, landing on `fix/audit-t1-sql` with the
rest of the t1 work. Follow the `rls_maps`
shape: two workspaces, an outsider member of the second, then assert the
outsider sees zero rows of the first workspace's data and that an insider
still does.

**Resolved (2026-08-23).** Six files added under
`supabase/tests/database/permissions/`:

| File | Table |
| --- | --- |
| `rls_concepts.test.sql` | `public.concepts` |
| `rls_concept_attributes.test.sql` | `public.concept_attributes` |
| `rls_individuals.test.sql` | `public.individuals` |
| `rls_datasets__pdf_file.test.sql` | `public.datasets__pdf_file` |
| `rls_attribute_mappings__dataset_column.test.sql` | `public.attribute_mappings__dataset_column` |
| `rls_attribute_mappings__manual_entry.test.sql` | `public.attribute_mappings__manual_entry` |

Each asserts six things: an insider reads the row; an outsider reads zero rows
of that workspace; an outsider's INSERT naming the other workspace raises
42501; an outsider's UPDATE and DELETE are filtered by RLS and leave the row
intact; and `anon` cannot reach the table at all. 36 assertions.

Verified, not just written:

- `supabase test db`: 60 files, 663 tests, all pass.
- `pnpm test:db` end to end (pgTAP + `db:validate-privileges` + the
  dashboard-publishing migration script): exit 0.
- **Mutation-tested.** Weakening the `concepts` SELECT policy to `using (true)`
  makes assertion 2 fail, which is what proves the assertion is sensitive to
  the regression rather than vacuously true. A passing test written by the same
  kind of process that wrote the code is not evidence on its own; this is.

One hypothesis was investigated and **disproved** along the way, so it is not a
finding. The `concepts` UPDATE policy has a `with check` but no `using` clause,
which looked like it might let an outsider re-parent a row into their own
workspace. Probed directly against the local database: the row does not move.
Postgres applies the SELECT policy when resolving the UPDATE's `WHERE`, so an
outsider's statement matches zero rows. `individuals` has the mirror-image
asymmetry (`using` but no `with check`) and is safe for the documented reason
that `with check` defaults to the `using` expression.

**Status:** resolved

### F-5 — `anon` could enumerate any workspace's member list (S2, fixed)

**Where:** `supabase/schemas/05.utils.workspace-auth.sql`
**Tier:** t1-sql

`public.util__get_workspace_members (workspace_id uuid) returns uuid[]` was
`security definer`, checked nothing about its caller, and returned every
`auth.users.id` in the named workspace. Postgres grants EXECUTE on a new
function to `PUBLIC` and no schema file revoked it, so PostgREST served it to
`anon`.

**Failure scenario, run against the local stack rather than reasoned about.**
With only the publishable key that ships in the browser bundle:

```sh
curl -s -X POST http://127.0.0.1:54321/rest/v1/rpc/util__get_workspace_members \
  -H "apikey: sb_publishable_..." -H "Content-Type: application/json" \
  -d '{"workspace_id": "8d4102ec-4bf9-4625-bffc-9d458e4ec18d"}'
# ["2d6c6a3a-61f4-4860-8efb-f3d8dccc9e2e"]
```

The workspace id is not a secret an attacker has to guess. `dashboards` is the
one table `anon` may read, the anon policy admits every `is_public` row, and
the grant is table-level, so `workspace_id` comes back with any public
dashboard. A public dashboard link is therefore enough to read the size and the
stable identifiers of that tenant's roster, and to confirm whether a user id
already known from one workspace also belongs to another.

Not S1: what leaks is opaque identifiers and a count, never user content, a
name, or an address. It is still an unauthenticated read of one tenant's data
by another, which is what puts it above S3.

Pre-existing rather than introduced in this window (the window changed only
whitespace on those lines), but it is the concrete case behind the "roughly 33
functions executable by `anon`" open item, and this tier is where it lives. The
sibling `util__get_user_id_by_email` had exactly this hole closed on 08-15 by
`20260815213000_revoke_public_execute_on_get_user_id_by_email.sql`, so the
standard was already set; this function was missed.

**Fixed.** The enumerator is deleted, not re-granted. All four callers are
`with check` clauses asking one narrow question about a user id they already
hold, so it is replaced by
`public.util__is_workspace_member (p_workspace_id uuid, p_user_id uuid)
returns boolean` — `security definer`, `search_path` pinned, EXECUTE revoked
from `public`, `anon` and `service_role`, granted to `authenticated` only,
which is required because a policy expression is evaluated as the calling role.
Removing the array-returning shape means there is nothing left to grant around.

Behaviour is unchanged: `x = any(array(select f(ws)))` and
`exists(... where workspace_id = ws and user_id = x)` agree on every input,
including a null `owner_id`, which fails a `with check` either way.

Verified: the four UPDATE policies still reject handing a resource to a
non-member and still accept handing it to a member
(`workspace_member_lookup.test.sql`), the `anon` call above now returns
`PGRST202` (no such function) and the replacement returns `42501` to `anon`.

**Mutation-tested**, because a passing test written in the same pass as the fix
is not evidence on its own. Three separate regressions were injected into the
live database and each was caught by the assertion meant to catch it:

| Mutation | Assertion that failed |
| --- | --- |
| `util__is_workspace_member` body replaced with `select true` | 7, 8, 9 |
| EXECUTE granted back to `anon` | 4 |
| `util__get_workspace_members` recreated | 2 |

The database was restored after each and `db:validate-privileges` re-checked
back to `surplus: 0 · missing: 0`.

**Status:** fixed on `fix/audit-t1-sql`

### F-6 — "make private" was broken for every map (S2, fixed)

**Where:** `supabase/schemas/70.rpc_resources__make_private.sql`
**Tier:** t1-sql

`rpc_resources__make_private` branches on `p_resource_type` and handles
`dashboard` and `dataset`; everything else falls into
`raise exception 'unsupported resource type: %'`. `map` was added to
`public.resource_type` on 08-17 and wired into `resource_shares`,
`util__resource_effective_role`, `util__is_resource_private_to_owner`,
`rpc_resources__transfer_ownership` and
`rpc_workspaces__transfer_all_owned_resources` — every polymorphic site except
this one.

**Failure scenario.** `MapOutputActions.tsx` renders the same
`ShareResourceButton` datasets use, with `resourceType="map"`. In the share
modal, choosing General Access → Private calls
`_requestMakePrivate` → `ResourceShareClient.makeResourcePrivate` →
`rpc_resources__make_private('map', ...)`, which raises `P0001: unsupported
resource type: map`. The map keeps every share it had; nothing is restricted;
the owner sees a failed mutation. There is no other client path that clears
non-owner shares atomically, so a map that has been shared cannot be made
private at all.

Its own pgTAP file was complicit rather than protective: it exercises
`dashboard` and `dataset` and never names `map`, so a green suite said nothing
about the case that was broken.

**Fixed.** Added the `map` arm to both branches (the `for update` lookup and
the `is_restricted` write). No new privilege surface: the function stays
`security invoker`, and maps already carry the UPDATE policy and the owner
short-circuit the other two types rely on.

Verified: three assertions added to
`rpc_resources__make_private.test.sql` fail before the change with
`died: P0001: unsupported resource type: map` and pass after.

**Status:** fixed on `fix/audit-t1-sql`

### F-7 — the window widened the `anon`-executable function surface, and the check that reports it cannot fail (S3, open)

**Where:** `scripts/db/reconcile-privileges/reconcile-privileges.main.ts`
**Tier:** t1-sql

The open item recorded as "roughly 33 functions executable by `anon` without a
declared grant" now reads **46** (45 after F-5). Six of those are new in this
window: `concept_attributes__validate_label_and_identifiers`,
`maps__prevent_workspace_id_change`, `util__email_domain`,
`util__storage_object_dashboard_id`, `util__storage_object_snapshot_revision`,
and `util__subscription_plan_rank`.

Each of the six was called as `anon` through PostgREST before this was
written. **None is exploitable**, and that is stated as a measurement rather
than an assumption: the two trigger functions return `trigger` and are not
served as RPC at all, and the other four are `security invoker` pure
functions over arguments the caller already supplies. Two of them,
`util__storage_object_dashboard_id` and `util__storage_object_snapshot_revision`,
are called by the anon storage policy for public dashboards and genuinely need
the grant. So this finding is about the guardrail, not about six new holes.

The guardrail is what needs the decision. `reconcile-privileges` prints these
as a `WARNING` and returns them as a count that `main` never reads, so
`pnpm db:validate-privileges` exits 0 with 46 undeclared functions listed. Every
other class of privilege drift in that script fails the run. F-5 is what a
warning-only check costs: a `security definer` roster dump sat in the
`anon` surface across the whole window and `test:db` stayed green over it.

Turning the warning into a failure today would fail CI on 45 pre-existing
functions, so the remedy is a decision about sequencing, not a one-line change,
and it is left for the human pass:

1. Audit the 45 and give each an explicit `revoke`/`grant`, in batches. Most
   are caller-scoped (`auth.uid()`-based) or pure, and were probed as `anon`
   during this pass: `util__is_settings_admin`,
   `util__can_manage_workspace_settings`, `util__get_auth_user_workspaces`,
   `util__get_auth_user_owned_workspaces`, `util__get_auth_user_user_group_ids`
   and `util__get_auth_user_app_role` all return `false`/`[]`/`null` to `anon`,
   and `rpc_workspaces__create_with_owner` fails on the table grant.
2. Then flip the warning to a non-zero exit, so the next
   `util__get_workspace_members` cannot land.

**Status:** open, needs a decision in the human pass

### F-4 addendum — five of the six tables were renames, not new tables

F-4 describes its six uncovered tables as "all introduced during the crunch".
That is right about `datasets__pdf_file` and wrong about the other five.
`20260817020322_Renamed entity domain to Description Logic nomenclature.sql` is
a metadata-only rename: `entity_configs → concepts`,
`entity_field_configs → concept_attributes`, `entities → individuals`,
`value_extractors__dataset_column_value → attribute_mappings__dataset_column`,
`value_extractors__manual_entry → attribute_mappings__manual_entry`. Their
policies were carried across by `alter policy ... rename to` with the
predicates untouched, and the diff against `review/base` confirms the
predicates are byte-identical to the ones the old tables had.

This does not change F-4's remedy — the coverage gap was real either way — but
it changes the risk story. Those five predicates are old code that had never
been tested, not new code written under deadline. The rename migration itself
is careful: `db diff` cannot detect a rename and generated a drop-and-recreate
that would have emptied every workspace's ontology; the hand-written
replacement is metadata-only and touches no row.

### F-8 — `durable_snapshot_transitions.test.sql` borrowed its fixture from the seed (S3, fixed)

**Where:** `supabase/tests/database/dashboards/durable_snapshot_transitions.test.sql`
**Tier:** t1-sql

The file's only fixture, and eight of its `throws_ok` bodies, read

```sql
select user_profiles.workspace_id, user_profiles.user_id, user_profiles.id, ...
from public.user_profiles
limit 1
```

with no predicate. Forty-three of the sixty-one files in this suite insert
their own `auth.users` / `workspaces` / `workspace_memberships` /
`user_profiles`; this one took whatever row happened to be there.

**Failure scenario.** On a database with no `user_profiles` row, the fixture
insert matches zero rows, so the dashboard under test never exists. Every
later `update ... where id = 'f7004001-…'` then updates nothing and every later
`insert ... select ... limit 1` inserts nothing, so no constraint can fire and
eleven `throws_ok` assertions report `caught: no exception / wanted: 23514`.
That is not a hypothetical database: a plain `supabase db reset` produces it
(the repo's `[db.seed] sql_paths` replays only the two storage migrations), and
so does the reset inside `pnpm db:new-migration`. It was hit for real while
regenerating the F-5/F-6 migration through the sanctioned pipeline.

CI is green today only because `pr-develop.yaml` runs `pnpm db:reset`, which
calls `seedDatabaseScript.ts` after the reset. So the eleven assertions that
cover both CHECK constraints on `dashboards` are currently coupled to the seed
script rather than to the schema, in both directions: they fail loudly on an
unseeded database for reasons unrelated to the schema, and `limit 1` with no
`order by` means the arbitrary profile the seed leaves is what decides which
workspace the fixture lands in.

**Fixed.** The file now inserts its own user, workspace, membership and profile
(`f7000001` / `f7001001` / `f7002001` / `f7003001`), and every source select is
pinned to that profile id instead of `limit 1`.

Verified on a freshly reset, unseeded database: the file failed 11/30 before
and passes 30/30 after, and the whole suite is 61 files / 675 tests / exit 0
with no seed present. **Mutation-tested**: dropping
`dashboards__snapshot_transition_consistent` fails assertions 23-27, so the
restored assertions test the constraint rather than passing vacuously.

**Status:** fixed on `fix/audit-t1-sql`
