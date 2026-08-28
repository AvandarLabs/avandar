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

- **Tier slices** (`review/t<N>-<area>`) answer _what is live right now in
  this risk area_. Cumulative from base to tip, and a provable partition:
  the script asserts that applying every tier reproduces the tip's tree
  exactly, and fails if any path escapes. Read-only; a tier tree is a real
  git tree but a mixed-version snapshot, so it will not typecheck or boot.
- **Branch slices** (`review/b/<slug>`, `review/b/<slug>-base`) answer _what
  did this agent actually write_. Real runnable historical states, pinned to
  history. They overlap: `qetl-registry`, `qetl-column-projection`, and
  `chat-concept-aliases` are all fully contained in `qetl-impl`.

## Where work happens

**Read on `review/*`. Change on `fix/audit-*`. Only `fix/audit-*` merges back
to `develop`.**

For every tier t1 through t6, and for every branch slice, the loop is the same:

| Step                      | Where                          | What                                                                            |
| ------------------------- | ------------------------------ | ------------------------------------------------------------------------------- |
| 1. Agent adversarial pass | `fix/audit-<tier>` worktree    | Agent reads the scoped diff, records findings, applies fixes it is confident in |
| 2. Human pass             | `review/<tier>` worktree       | You read the same scoped diff in difit and comment                              |
| 3. Fixes                  | `fix/audit-<tier>` worktree    | All edits, tests, and ledger updates                                            |
| 4. Merge                  | `fix/audit-<tier>` → `develop` | The only thing that ever merges                                                 |

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

### Refreshing a tier after the adversarial pass

Once the adversarial pass has committed fixes to `fix/audit-<tier>`, the
`review/<tier>` ref is stale: it still shows the code as it landed. Refresh it
so the human pass reads the hardened version.

**Run it from the main checkout, `~/src/avandar`, on `develop`.**

```sh
cd ~/src/avandar
bash scripts/review/build-audit-refs.sh --tier t1-sql --tip fix/audit-t1-sql
```

The script operates on refs and works from any worktree, but the main checkout
is the one place the current version is always present. A `fix/audit-*` branch
only has whatever version of the script it was cut with, and a `review/*`
worktree is a synthetic tree that will drift from `develop` by design. Running
it from `~/src/avandar` avoids having to think about which copy you are
invoking.

You do not need to check anything out, and you do not need to touch the read
worktree. The script rewrites the ref and resets that worktree for you, so the
files are updated on disk when the command returns.

Then go back to the read worktree and relaunch difit. There are two reviews
worth running, and they are separate difit sessions:

```sh
cd "$(wt go review/t1-sql)"

pnpm diff-review review/base            # the whole tier, fixes included
pnpm diff-review review/t1-sql-prev     # ONLY what the adversarial pass changed
```

| Command                               | Shows                                                                                           | Equivalent                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `pnpm diff-review review/base`        | The whole tier as it now stands, fixes included. Your main review.                              | `git diff review/base review/<tier>`        |
| `pnpm diff-review review/<tier>-prev` | Only what the adversarial pass changed. Review this too: those fixes are unreviewed agent code. | `git diff review/<tier>-prev review/<tier>` |

The two produce different difit transcripts, because `dif` names its artifacts
`<branch-slug>-difit-<scope-slug>` from the branch _and_ the comparison. So
`review/base` writes `review-t1-sql-difit-at-review-base-*` and
`review/t1-sql-prev` writes `review-t1-sql-difit-at-review-t1-sql-prev-*`. They
do not clobber each other, and each keeps its own comments and reviewed state.

Two constraints:

- **Refresh between review rounds, never mid-round.** The refresh moves the
  branch, so difit's `-reviewed.json` for the `review/base` comparison no
  longer lines up with the commits it recorded. Finish a round, refresh, then
  start the next.
- If the read worktree has uncommitted edits the script refuses to move it
  rather than clobbering them. Tier worktrees are read-only lenses, so if that
  happens, something was edited in the wrong place.

To point a tier back at `develop` after the fixes have merged, re-run the full
build with no arguments.

## Fix lanes

| Lane   | Branch             | For                              | Ships                    |
| ------ | ------------------ | -------------------------------- | ------------------------ |
| Hotfix | `fix/<specific>`   | Cross-tenant exposure, data loss | Immediately, own PR      |
| Tier   | `fix/audit-<tier>` | Substantive defects              | When the tier closes     |
| Nit    | `chore/audit-nits` | Typos, dead code, naming         | Whenever; blocks nothing |

Watch out: `.githooks/pre-push` runs the Lingui pipeline and exits 2 when
catalogs change, so any fix branch touching user-facing strings gets blocked
once and needs a follow-up commit with regenerated catalogs.

## Tier status

Ordered by blast radius per line, not by size.

| Tier | Ref | Files | +Lines | Agent pass | Human pass | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Guardrails | `review/t6-guardrails` | 47 | 3,480 | n/a | **done** | F-1/F-2 accepted, F-3 open |
| SQL + privileges | `review/t1-sql` | 156 | 21,054 | **done** | not started | F-5 to F-9 all fixed |
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

**Resolved (2026-08-24).** Both halves done, in that order.

*The 45 declarations.* Every one now has an explicit
`revoke execute ... from public, anon, authenticated, service_role` in its
schema file, followed by a `grant` for each role that genuinely needs it. What
"needs" means was computed from the live catalogs rather than guessed, because
three separate things confer a requirement and two of them are easy to miss:

| Reason a role needs EXECUTE | How it was found | Count |
| --- | --- | --- |
| A policy names the function; a policy expression is evaluated as the CALLING role, not the policy owner | `pg_policy` expressions joined against `pg_proc` names, carrying each policy's `polroles` | 18 |
| The client calls it as an rpc | every `.rpc(...)` call site in `src`, `shared`, `supabase/functions`, `apps`, `scripts` | 3 |
| A SECURITY INVOKER function or trigger calls it, and runs as whoever ran the statement | `prosrc` edges from every `prosecdef = false` function in `public` and `private` | 2 |

The last row is the one that would have broken production if it had been
guessed. `usage_analytics_events__set_category` is a SECURITY INVOKER trigger,
so `util__analytics_event_category` needs EXECUTE for `authenticated` (browser
events) and `service_role` (the edge helper's `client = 'server'` events); and
`private.dashboards__enforce_publish_publicly` is SECURITY INVOKER, so
`util__auth_user_meets_min_app_role` needs it for `authenticated` or every
dashboard visibility update fails. Both were verified by running the real
statements, not by reading.

The other 22 need nothing: 13 are trigger functions (the trigger machinery
does not consult EXECUTE at all) and 7 are reached only from inside SECURITY
DEFINER bodies, which run as the owner. `util__get_auth_user_user_group_ids`
has no caller anywhere and was revoked rather than dropped, since whether the
helper is still wanted is a product question.

Two functions keep `anon`, and that is deliberate:
`util__storage_object_dashboard_id` and
`util__storage_object_snapshot_revision` are called by the anon SELECT policy
on the `published` bucket to parse a public dashboard's snapshot path.

**Measured before and after, on the `anon` role specifically:**

| | Functions in `public` + `private` that `anon` may execute |
| --- | --- |
| Before | 46 |
| After | 2 |

*The guardrail.* `reconcile-privileges` printed the list as a `WARNING` and
returned a count `main` never read, so the run exited 0. It now exits 1 in gate
mode, which means `pnpm test:db` fails, which means `migrate` is blocked. It
stays non-blocking under `--append`, because appending cannot fix it (a
function with no declaration produces no statement to append) and
`pnpm db:new-migration` ends with a gate run that catches it anyway. The
message now also states the rule for deciding which roles need a grant.

**Mutation-tested.** Creating `public.util__leaky_probe(uuid)` — a
`security definer` function returning `uuid[]` of a workspace's members, i.e. a
rebuild of F-5 — makes both `pnpm db:validate-privileges` and `pnpm test:db`
exit 1 and name it. Dropping it returns both to exit 0.

One test had to change with it. `publish_publicly_permission.test.sql` called
`util__get_auth_user_app_role` directly while `set local role authenticated`,
as an assertion about the fixture rather than about access. It now reads that
value as `postgres`; `auth.uid()` comes from `request.jwt.claims`, a
transaction-local GUC a `set role` does not disturb, so the assertion is
unchanged.

**Status:** resolved

### F-9 — the SQL splitter both `db` tools parse with mis-scans quoted identifiers (S3, fixed)

**Where:** `scripts/db/lib/splitSqlStatements.ts`
**Tier:** t1-sql

`splitSqlStatements` is the single parse behind both database tools: the
privilege reconciler reads all of `supabase/schemas/` through it, and the view
stripper decides which byte ranges to delete from a generated migration with
it. It tracked strings, dollar-quoted bodies and comments, but not
double-quoted identifiers.

**Failure scenario.** Name a policy in English with an apostrophe in it, which
is the natural way to write one:

```sql
create policy "Owner's rows" on public.t for select using (true);
grant select on table public.t to authenticated;
```

The `'` in `Owner's` opens a string that runs to the next `'` in the file, or
to end of file. Measured: the splitter returns **0** statements for that input
instead of 2, and `getDeclarationsFromSchemaFiles` therefore finds 0 privilege
statements and 0 revoked function signatures.

That is silent, and both callers act on the result. The reconciler would treat
every swallowed `grant` as undeclared, count the live privileges as surplus,
and generate a migration that REVOKES them with nothing granting them back —
`pnpm db:new-migration` would quietly write a migration that breaks the app's
access to those tables. The stripper would report "No view recreations found"
and leave the churn in place.

A second, narrower gap: inside an `E'...'` escape string a backslash escapes
the next character, so `E'it's'` did not close where the scanner thought it
did.

Latent rather than live. Every `.sql` file in `supabase/schemas/` and
`supabase/migrations/` was run through the splitter and all of them parse to
end of file with nothing left over; a test now asserts that over the whole
directory on every run.

**Fixed.** The scanner tracks double-quoted identifiers (including the doubled
`""` escape) and `E'...'` escape strings, with the `E` prefix recognised only
when it is not the tail of a longer identifier.

Verified: `scripts/db/lib/splitSqlStatements.test.ts`, nine cases. Two of them
fail against the old scanner and pass against the new one; the other seven pass
against both, so they lock the existing behaviour rather than only the fix.

**Status:** fixed on `fix/audit-t1-sql`

### t1-sql: `scripts/db/` closing note

The rest of the directory was read for defects and none were found that meet
the bar. Recorded so the human pass does not repeat the search:

- `NoopViewRecreations` is the one thing here that edits a migration in place,
  and every path it can take fails closed. It removes a `create view` only when
  Postgres itself confirms the proposed body renders identically to the live
  one, in a single rolled-back transaction so both renderings share a
  `search_path`; a parse failure, a connection failure, a view that does not
  exist yet, and a definition that differs all keep the statement. A
  `drop view` is removed only when its paired create was proven a no-op, and
  the drop regex requires the statement to end at the view name, so
  `drop view a.b cascade` and a multi-view drop are both kept. It refuses to
  run at all against an already-applied migration, which is the case where the
  comparison would call a real change a no-op.
- `PrivilegeReconciliation` never interprets a `grant`; it replays the
  declarations in a rolled-back transaction and reads the catalogs, so
  `public.resource_type` and `resource_type` compare equal because Postgres
  resolved both. It expands a NULL `proacl` through `acldefault`, which is what
  makes the F-7 exposure visible at all, and leaves NULL `relacl` unexpanded,
  which is correct for the opposite reason.
- `PsqlUtils` reads the port out of `config.toml` per section, so it follows an
  `ava supabase switch` rather than assuming 54322; that was exercised for real
  throughout this pass on port 55342.

One thing worth knowing but not worth a finding: with `--db-url`, the
connection string is passed to `psql` as an argv element, so a staging or
production password would be visible in `ps` for the length of the run. It is a
developer tool run by hand and the URL is not committed, so this is a note
rather than a defect.

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
