# QETL Phase 1 handoff

**Written:** 2026-08-19 by the phase-1 session.
**Branch:** `feat/qetl-impl`. **Committed through:** `77c0ead3`. Tree clean.
**Base:** `develop`. **Merge base with `feat/qetl-registry`:** `cf851570`.

Read this top to bottom before touching code. Section 1 needs answers from
Pablo before you start work.

---

## 1. START HERE: ask Pablo these three questions first

Do not begin implementation until these are answered. Each one changes what you
should do, and two of them are decisions that are his to make rather than yours.

### Q1. Do you want the two branches merged, and do you want me to do it?

There is a **real reversion hazard**, and it is measured rather than
theoretical. Details and the recommended procedure are in section 5. The short
version: the same work exists on both branches by two different routes, and a
merge that resolves hunk by hunk can silently reinstate a fixed security bug
without producing a conflict. Nothing is broken today. Nothing needs merging
today.

Options worth offering him:

- **(a) Leave both branches as they are.** Costs nothing now. The divergence
  grows.
- **(b) Merge, with `feat/qetl-impl` authoritative** for the cache, relations
  and GIS paths (procedure in section 5).
- **(c) Something else he has in mind**, for example rebuilding the registry
  work on top of this branch instead of merging.

### Q2. What is the next Phase 1 item?

The phase-1 session recommends the **cross-tab lock**, because it is fully
scoped (section 4.1), sits entirely in files this branch owns, and needs no
coordination with another session. The alternatives, all still unstarted:

| Item                         | Note                                                       |
| ---------------------------- | ---------------------------------------------------------- |
| **Cross-tab lock**           | Recommended. Scoped and unblocked. See 4.1                 |
| HDX / open data APIs         | New connector surface, larger                              |
| Google Sheets connector      | Depends on the `drive.file` scope decision already made    |
| Virtual-dataset invalidation | Touches the definition token path                          |
| Relation cache **wiring**    | **Belongs to the registry session, not this one.** See 3.1 |

### Q3. Is the demo still tomorrow, and does it need anything from Phase 1?

The parallel work was originally framed around a demo. If it is still live, say
what it must show, because that reorders everything above. As far as this
session knows, the demo path depends on the **registry** session's spec 3
(concept relations), not on any remaining Phase 1 item.

---

## 2. What this session actually built

All of it reviewed (implementer, then spec-compliance, then code-quality),
mutation-tested, and committed. Verified at `77c0ead3`: **434 test files /
2,636 tests**, executed suite 2/2, `pnpm type-check` exit 0, `pnpm lint` clean.

### 2.1 Relation cache storage layer

`src/clients/qetl/RelationCache/`, plus `shared/models/relations/`.

- `RelationCacheKey`, `RelationCachePort`, `RelationSchema`, `RelationRef`.
- `DexieRelationCache` (workspace tier) and `LocalPublicDatasetRelationCache`
  (public tier). Public isolation is **structural**: every Dexie access targets
  `LocalPublicDataset`, so a public read cannot reach a workspace-cached entry
  by construction rather than by a predicate someone could forget.
- Port shape is `probe(keys[])` returning hits and misses, where a miss may
  carry a `growFrom` candidate, plus `evictToBudget(budget, exclude)`.

**The cache is built but WIRED TO NOTHING.** It has no caller outside its own
directory. That is deliberate: see 3.1.

### 2.2 `authorize()` (`77c0ead3`)

`assertWorkspaceMembership` runs in `WorkspaceQetlClient.runQuery` before any
query work. `runQuery` previously checked that you were signed in and never
that you belonged to the workspace it was handed.

Three design notes that are easy to get wrong on a second pass:

1. It reads membership through **`fetchQuery`, not `getQueryData`**. An earlier
   draft read the query cache directly to keep a round trip off a hot path.
   That was a mistake: `getQueryData` returns cached data unconditionally,
   ignoring invalidation and staleness, so a sign-in invalidation went
   unhonoured, a server-side revocation never landed in a long-lived tab, and a
   poisoned `[]` (`WorkspaceClient` returns `[]` when the session read fails,
   which caches as a **success**) persisted for 14 days. `AvaQueryClient`
   already sets `staleTime` to 6 minutes online and infinity offline with
   `networkMode: "offlineFirst"`, so `fetchQuery` gives the same warm-path cost
   with none of that. **Do not reintroduce the `getQueryData` shortcut.**
2. The assertion **owns the session read and returns the verified principal**,
   so `runQuery` makes one session read rather than two. This matters: on
   desktop `getCurrentSession` is a keychain IPC, and `getColumnSummary` issues
   roughly five `runQuery` calls per column.
3. It requires an authenticated id to exist **before** comparing it, rather
   than comparing directly. `UserId` is a **compile-time-only brand**, so with
   no session both sides can be `undefined` and an unauthenticated caller would
   pass. Unreachable from today's caller; reachable from the cache probe, which
   will pass principals parsed out of cache keys.

Denials throw `WorkspaceMembershipDenied` with a `code`
(`not-authenticated` / `principal-mismatch` / `not-a-member`). A failure to
_read_ membership propagates as the underlying fetch error instead, so "you may
not" stays distinguishable from "we could not find out". `AvaQueryClient` no
longer retries a denial.

**Deliberate interim behaviour:** an _invalidated_ membership entry while
_offline_ forces a fetch that fails, so queries deny until reconnect. This is
consistent with the accepted-but-unimplemented 14-day offline authorization
window, is fail-closed, and self-heals on the next query after reconnect.

### 2.3 GIS: hidden row cap removed, clustering added

A plain lat/lng layer over a dataset above 50,000 rows was rendering **100
arbitrary rows** with nothing telling the user, because
`compileLatLngOverlaySql` returned `undefined` whenever there was no AOI and no
time filter, routing the query into the auto-limit branch. Not an edge case:
the triggering fixture is the same default combination the file's first
pre-existing test already used.

Fixed at the source. Point layers now auto-cluster above **10,000** features
with abbreviated count bubbles; clicking a cluster opens a **paginated feature
table**; clicking a row drills into the existing single-feature view.

Two decisions worth preserving:

- Auto-clustering is restricted to `symbology.type === "circle"`. Clustering a
  `proportionalSymbol` layer would silently change what size _means_ (value
  becomes count), which is the same class of defect as the hidden cap.
- The Data Explorer keeps its limit, because there it is visible in the UI.
  Pablo decided both of these.

---

## 3. Rules that must survive this handoff

### 3.1 READ THIS BEFORE WIRING THE RELATION CACHE PROBE

**`authorize()` is not enough.** It is a **principal-level** check: it asserts
the caller may act in the named workspace. It does **not** assert that every
relation named by the query belongs to that workspace.

That per-relation work is done by a **different** mechanism:
`getDiceFromSql` intersects the SQL's table references with the dataset ids of
the named workspace, so a dataset owned by another workspace is never loaded.

**A probe wired ahead of source dispatch bypasses `getDiceFromSql`.** So the
probe must carry its **own per-relation workspace check**, derived from the
dataset record rather than from ambient state or from the `workspaceId`
argument.

The failure mode is the dangerous kind: a future session sees `authorize()` on
the path, concludes the seam is safe, and wires a probe that skips the only
per-relation check in the system. That is **worse than an obviously unguarded
path, because it looks guarded.**

This rule is also in the `assertWorkspaceMembership` module doc comment. If you
change one, change both.

**Wiring the probe belongs to the registry session** (it is a continuation of
their Task 12). Do not take it without agreeing that first.

### 3.2 Naming

- **`probe` is reserved for `RelationCachePort`. Nothing else may be a probe.**
  The registry session's in-memory-tier function is `getRelationsNotInMemory`,
  not `probeRelationCache`. The rename tables in
  `docs/superpowers/specs/2026-08-18-qetl-relation-registry-design.md` and
  `docs/superpowers/plans/2026-08-18-qetl-relation-registry.md` are now
  reconciled and both carry this.
- `docs/rules/typescript.md:272` and `:310` **ban naming a conversion or lookup
  `resolve...` or `_resolve...`**. This has been violated three times already.

### 3.3 Verification set

Run **all four** before reporting anything done:

```
pnpm test:frontend      # 434 files / 2,636 tests at 77c0ead3
pnpm test:executed      # 2 tests
pnpm type-check         # exit 0
pnpm lint               # eslint + stylelint + React Doctor
```

`pnpm lint` is in this list because the phase-1 session reported work green
having run only the first three, and had in fact shipped a stylelint failure.

**Editor diagnostics in this repo fire spuriously and have been wrong roughly
ten times this session**, including as confident type errors on files that
compile cleanly. Always confirm against `pnpm type-check` before believing one.

### 3.4 Test standards

The code-quality stage found a real defect in **every** task this session.
The recurring one: implementers write spy or structural tests and _reason_ that
they would fail rather than proving it.

**Mutation-test every behavioural claim.** Break the implementation, watch the
specific test go red, restore, and confirm byte-identical. Report which mutation
each test caught. Keep positive controls beside every negative assertion, or a
`not.toHaveBeenCalled()` will pass for the wrong reason.

Put mutants **outside the repo** (use the session scratch directory). A previous
agent left mutant files where the type-checker found them.

---

## 4. Ready-to-start work

### 4.1 Cross-tab lock (recommended next)

**The proposal is explicit that this is not a new mechanism.** It is: _back the
existing `DatasetDuckDbLease` with `navigator.locks`_, and **do not introduce a
second parallel locking mechanism beside it.** An earlier instinct to build a
lock inside `RelationCache/` would have been exactly that mistake.

- Single acquisition point: the fresh-lease branch of
  `_runCoordinatedDatasetDuckDbOperation`,
  `src/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator.ts:211-218`.
- **Callers do not change.** The branded `DatasetDuckDbLease` means every site
  needing coordination already asks for it by type, which is what makes this
  cheap and what the compiler will confirm.
- The `datasetIds` sort at line 196 becomes **load-bearing for cross-tab
  deadlock avoidance** once the locks are real, rather than merely tidy. Say so
  in a comment.
- `navigator.locks` takes one name per request, so acquiring several requires
  folding over the sorted names.
- **Needs a fallback**: `navigator.locks` is absent in non-secure contexts and
  in the Node test environment. Degrade to the existing intra-tab queue rather
  than throwing.
- Note `duckDbRawQuery.ts` and the query sessions are **callers** of this
  function. You are not editing them, and the signature must not change.

### 4.2 Also unstarted

HDX / open data APIs, Google Sheets connector, virtual-dataset invalidation,
column projection.

---

## 5. The merge hazard (context for Q1)

Pablo committed the registry worktree on the evening of 2026-08-18. That commit
(`6943e1d8`, "Began work on qetl registry", 84 files, 8,778 insertions)
**swallowed a squashed copy of this branch's work along with the registry
session's**, because that session had cherry-picked these commits uncommitted
(`git cherry-pick -n` then `git reset`) to keep its compile set honest.

So the same work exists on both branches by two routes: as proper reviewed
commits here, and as older squashed content there.

| File                         | Copy inside `6943e1d8` | Current on `feat/qetl-impl` |
| ---------------------------- | ---------------------- | --------------------------- |
| `DexieRelationCache.ts`      | 232 lines              | **396**                     |
| `RelationCachePort.types.ts` | 72 lines               | **113**                     |

The older copy predates the `probe()` reshape, the **cross-principal key
collision fix**, the eviction atomicity fix, and the error-path privacy
redaction. A hunk-level resolution that picks the wrong side **does not fail
loudly**: it silently reinstates a key-collision bug across principals.

**Recommended procedure if Pablo chooses to merge:**

1. Treat **`feat/qetl-impl` as authoritative** for every path it owns: the
   relation cache, `shared/models/relations/`, GIS, dexie versions, analytics.
   Resolve those **per path**, not hunk by hunk.
2. Take from `feat/qetl-registry` only its own paths: registry, wrappers,
   `QueryMediator`, concept relation, `DuckDbSqlAnalyzer`, ontology, docs.
3. **Acceptance bar: `git diff` against `feat/qetl-impl` for every path in step
   1 must be empty.** Not "it compiles". A lost review fix shows up as a missing
   test, not as a conflict.
4. Then run the full section 3.3 verification set and confirm the cache suite
   count did not drop.

---

## 6. Coordination

- The registry session's own handoff is
  `docs/superpowers/plans/2026-08-18-qetl-registry-handoff.md`, **on
  `feat/qetl-registry`** (not readable from this branch). Its section 7 lists
  nine landmines. The one that most affects Phase 1: **`WrapperContext.workspaceId`
  comes from the dataset record, not session state**, which is what forced the
  correction in section 3.1.
- Contract rules that applied to the two-session split, still worth keeping:
  no destructive git in a worktree you do not own (no `rm -rf`, `git clean`,
  `git checkout --`, `git stash`, `git reset --hard`); ask before deleting
  unexpected files; no `git rebase`, force-push or history rewriting on either
  branch.
- **`.temp/qetl-impl/PHASE1_STATUS.md`** carries the same status in the format
  the other session reads. **`.temp/qetl/final_proposal.md`** (revision 7) is
  the architecture decision document and is gitignored.

---

## 7. Where things stand in one paragraph

Phase 1 has delivered the relation cache storage layer, the relation model
types, the source-dispatch characterization tests, `authorize()`, and the GIS
row-cap fix with clustering. The cache is built but wired to nothing, which is
deliberate, because wiring it is the registry session's continuation and doing
it without a per-relation authorization check would open a hole that looks
closed. Nothing is blocked, nothing is broken, and the tree is clean and green.
