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
| Guardrails | `review/t6-guardrails` | 47 | 3,480 | n/a | **done** | F-1, F-2, F-3; net posture stronger |
| SQL + privileges | `review/t1-sql` | 156 | 21,054 | not started | not started | Highest risk |
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
a silent revert. Options: restore `needs: [test-quick, test-e2e]` for
production only; keep the split but make e2e a required check on `main`; or
accept it and document why.

**Owner:** Pablo (decision) · **Status:** open

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

**Owner:** Pablo (decision) · **Status:** open

### F-3 — `.gitignore` no longer ignores `.cursor/plans` (S4, open)

**Where:** `.gitignore`

The Cursor entry changed from `.cursor/plans` to `.cursor/.cursor/`, so agent
plan files written to `.cursor/plans` are no longer ignored. Nothing has
leaked yet (`git ls-files .cursor` shows only rules, settings, and skills),
so this is latent. Restore `.cursor/plans` alongside the new entry.

**Owner:** unassigned · **Status:** open

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
