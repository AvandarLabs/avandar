# GROUP 3 — AI chat panel (Core UX + Privacy guardrails + Interactive workflows)

- **Group**: 3 of 5 (the largest — 29 features)
- **Refactor branch**: `refactor-g3/ai-chat-panel`
- **Migration strategy:** one PR per group — the whole group lands as a single PR off `refactor-g3/ai-chat-panel`; the per-row order below is the in-branch build sequence.
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Base**: `origin/develop` — **Group 2 is now merged (`59cdb59c`)**, so cut
  `refactor-g3/...` off the current `origin/develop` HEAD (past `59cdb59c`) and
  re-run the drift checks. (The `6ec98d45` in earlier drafts is stale.)
- **Depends on**:
  - **Group 1** — `#094 chat-models-catalog` (chat edge function +
    `shared/types/chat.types` foundation the chat surface builds on). Merged.
  - **Group 2 — MERGED into `develop` (`59cdb59c`, 2026-07-26).** develop now
    HAS: the Data Explorer apply-SQL path and DataViz p-block generator (v3
    `series`-shape) that `#019`/`#021` lean on; the `src/components/sql/`
    home for `SqlEditor`/`AvaSqlBlock` + `sql-helpers`; `rawSql` field naming
    (not `rawSQL`) and `Url` (not `URL`) path casing; and `node-sql-parser`
    already installed. See "Post-G2-merge updates" in Notes for the concrete
    consequences for this group.
- **Estimated size**: **~16.7k insertions across ~91 files** (measured:
  `git diff --stat origin/develop..feat/ict4d-demo` over
  `src/components/ChatPanel`, `src/components/Privacy`, `src/lib/privacy`,
  `src/sandbox`, `supabase/functions/chat`,
  `supabase/functions/_shared/privacy`, `public/sandbox-executor.html`,
  `eslint.config.js`). This is by far the biggest of the five groups, but it
  still ships as a **single PR** off `refactor-g3/ai-chat-panel`. The numbered
  order below is the in-branch build sequence (the order to port the rows as
  commits on the branch), NOT a list of separate PRs. (Fallback the operator
  declined for now: if the single large PR proves intractable to review, the
  natural seam is C+D — Core UX + Privacy guardrails — vs. E — Plan/
  clarification workflows; see Notes.)

## Constituent rows (by sub-area)

**§C — Core UX (7):**

| # | Slug | One-liner |
|---|------|-----------|
| 15 | `chat-disabled-visual-feedback` | Composer dims/disabled on chat-unavailable pages + navbar-gradient transparency fix |
| 16 | `chat-context-memo-fix` | `useMemo` on `useChatPageContext` return so the runtime stops thrashing |
| 17 | `chat-empty-state-improvements` | Fixed-height suggested-prompts container + i18n + typography polish |
| 18 | `chat-try-again-and-retry-on-empty` | Per-turn "Try Again" + one auto-retry on empty assistant message |
| 19 | `chat-recover-sql-without-tool-call` | Edge function scans message body for fenced SQL and synthesizes a `generateSql` call |
| 20 | `chat-multi-dataset-clarification` | System-prompt-level "which dataset?" disambiguation |
| 21 | `chat-better-pblock-generation` | Smarter DataViz p-block generation (chart-type heuristics, sane defaults) |

**§D — Privacy guardrails (Phase 0) (7):**

| # | Slug | One-liner |
|---|------|-----------|
| 22 | `privacy-pii-detector` | `src/lib/privacy/piiDetector.ts` pure detector + tests |
| 23 | `privacy-bias-detector` | `src/lib/privacy/biasDetector.ts` pure detector + tests |
| 24 | `privacy-consent-modal` | 5-mode (A–E) consent modal intercepting outgoing turns |
| 25 | `privacy-crossboundary-hmac` | `crossBoundary` chokepoint + HMAC ack tokens + ESLint guard |
| 26 | `privacy-audit-log-page` | Dexie consent audit log + Privacy settings page |
| 27 | `privacy-discovery-spanish-french-stubs` | es/fr detector pattern stubs + translated modal copy |
| 28 | `privacy-isrowdatamessage-helper` | Server-side `isRowDataMessage` heuristic + tests |

**§E — Interactive workflows (Phases 1–9) (15):**

| # | Slug | One-liner |
|---|------|-----------|
| 29 | `chat-clarify-tool` | `clarify` tool + 3-round cap |
| 30 | `chat-clarification-card-and-bias-check` | `ClarificationCard` (3 variants) + bidirectional bias check |
| 31 | `chat-clarification-telemetry` | Separate Dexie clarification-audit DB + Clarifications sub-tab |
| 32 | `chat-discovery-clarifications` | Read-only `SELECT DISTINCT` discovery query → dropdown → `crossBoundary` |
| 33 | `chat-plan-propose` | `proposePlan` tool + `PlanStateManager` + `planExecutor` + DuckDB temp views (**plan foundation**) |
| 34 | `chat-plan-canvas` | xyflow DAG + RoughJS sketched edges + Auto/Step toggle |
| 35 | `chat-plan-step-materialization` | Dexie `planStepStorage` keyed by `(planId, stepId)` |
| 36 | `chat-plan-virtual-dataset-persistence` | `plan_steps` JSONB column + rehydrate + parquet reload |
| 37 | `chat-plan-schema-drift-regen` | `schemaDrift` detector + downstream BFS + regen loop (2 attempts/step) |
| 38 | `chat-plan-branching` | `PlanBranchStateManager` + `PlanBranchSidebar` + "Branch from here" CTA |
| 39 | `chat-plan-python-sandbox` | `/sandbox-executor.html` iframe + Pyodide + parquet bridge (CSP-locked) |
| 40 | `chat-plan-approval-gate` | `approvalStatus` + Approve/Reject banner + >7-step heuristic |
| 41 | `chat-plan-annotations` | xyflow annotation overlay (text/sticky/arrow/freehand) + 50-deep undo + Dexie |
| 42 | `chat-plan-png-pdf-export` | `html-to-image` PNG + `@react-pdf/renderer` multi-page PDF |
| 43 | `chat-multi-language-plans` | Widen step `type` enum to `sql\|python\|r\|clarification`; R deferred |

---

## Notes for future you

### ⚠️ Post-G2-merge updates (2026-07-26) — READ FIRST

Group 2 merged into `develop` (`59cdb59c`) and its cleanup was merged back into
`feat/ict4d-demo`. That changes several assumptions in the rest of this doc; the
corrections below override the older paths/notes wherever they conflict.

- **SQL components moved to `src/components/sql/` (no barrels).** develop now
  has `src/components/sql/AvaSqlBlock/AvaSqlBlock.tsx`,
  `src/components/sql/SqlEditor/SqlEditor.tsx` (+ `SqlQueryEditPanel.tsx`), and
  `src/components/sql/sql-helpers/*` (incl. `useSqlDisplayCatalog.ts`). The old
  top-level `src/components/AvaSqlBlock/` and `src/components/SqlEditor/` dirs
  and the `src/hooks/sql/useSqlDisplayCatalog.ts` hook are **gone**. Every G3
  chat file that renders SQL — `PlanFlowView/PlanStepSqlCode.tsx` (copy-verbatim
  below), `ChatThread/MarkdownTextPart/MarkdownTextPart.tsx` (surgical), and any
  test that mocks the catalog hook — must import from
  `@/components/sql/AvaSqlBlock/AvaSqlBlock` and mock
  `@/components/sql/sql-helpers/useSqlDisplayCatalog`. develop's `AvaSqlBlock`
  auto-derives its catalog via `useCurrentWorkspace()` when no `catalog` prop is
  passed, so render tests need a workspace/router context or a mocked hook.
- **`rawSql` naming (not `rawSQL`), `Url` casing (not `URL`).** G2 renamed the
  VirtualDataset field and DataExplorer state to `rawSql` and the URL-sync files
  to `Url`. `useChatPageContext`'s memo deps are `pathname, openDatasetId,
  rawSql, lastQueryError` (see #016). `planExecutor.ts` uses `rawSql`.
- **`#036` must ADD `planSteps` to develop's VirtualDataset — G2 did not.** The
  G2 mergeback kept feat's `planSteps: ChatPlan | null` on the model + the
  `plan_steps` JSONB round-trip in `VirtualDatasetParsers.ts`, but **develop's
  post-G2 VirtualDataset has `rawSql` and NO `planSteps`**. So `#036` owns
  adding the `planSteps` model field, the ChatPlan import, and the parser's
  `plan_steps` extract/reattach (insert/update) + `null`-tolerant read. Confirm
  the `plan_steps` DB column exists (Phase 1); if not, STOP and flag the
  operator. This supersedes the "confirm Phase 1 added it" note at #036.
- **`#033`/`#034` DataExplorer reconnection (G2's [E2] deferral).** G2 shipped
  develop's `DataExplorerApp.tsx` **without** the plan-flow panel. So this group
  owns wiring `PlanStateManager.useState()` + `<PlanFlowView />` (and the
  save-as-new-dataset `planSnapshot` built from `planState`) into develop's
  `DataExplorerApp.tsx`. (feat already carries this wiring from the G2 mergeback,
  so use feat as the reference for the exact edit.)
- **`node-sql-parser` is already on develop** (G2 `#044` added it). Drop it from
  the dependency-add list below — adding it again is a no-op/error.

**This group is huge (29 features, ~16.7k lines), but it ships as a single PR
off `refactor-g3/ai-chat-panel`.** Treat this file as the map for building the
group row-by-row on one branch (the migration order is the in-branch commit
sequence), then opening one PR. The split below is a fallback the operator
declined for now; keep it only as a reference seam if review proves intractable.

### The split seam (fallback only — operator declined splitting for now)

If review proves intractable and the single PR must be broken up, the natural
internal seam is:

- **Sub-group C+D** = **Core UX (§C, #015–021) + Privacy guardrails (§D,
  #022–028)**. This is the foundation: small UX fixes plus the entire privacy
  Phase-0 stack (detectors, consent modal, `crossBoundary` chokepoint, audit
  log, helpers). All of §E depends on §D being on `develop`.
- **Sub-group E** = **Plan/clarification workflows (§E, #029–043)**. This is
  where the heavy net-new code lives (xyflow canvas, Pyodide sandbox, plan
  state managers, exports). It cannot start until §D's `crossBoundary` and the
  detectors are merged.

If even C+D is too big under that fallback, the next cut is **C alone** (surgical
chat UX tweaks, no new infra) then **D alone** (the privacy stack). All of this
is fallback-only; the default is a single group PR. Inside §E the hard ordering
constraint is `#033 chat-plan-propose` before everything else plan-shaped — see
the migration order.

### Multi-feature hotspot files (edited by 2+ rows — coordinate carefully)

These files are touched by several rows; whoever ports later must merge, not
clobber. Real paths on `feat/ict4d-demo`:

- `src/components/ChatPanel/useAvandarChatRuntime.ts` — the chat runtime.
  Touched by #016 (memo), #018 (retry-on-empty), #024 (consent gate state),
  #029 (clarify cap counter), #033 (register `PlanStateManager`),
  #035/#040 (executor wiring). **Hottest file in the group.**
- `src/components/ChatPanel/ChatThread/Composer/Composer.tsx` — the composer.
  Touched by #015 (disabled state), #024 (intercept-on-send → run detectors),
  #030 (outgoing bias check), #030 (Enter-key focus arbitration vs cards).
- `supabase/functions/chat/utils/buildSqlSystemPrompt.ts` — the system prompt.
  Touched by #020 (multi-dataset clarification block), #021 (chart-type
  catalog), #029 (describe `clarify`), #033 (describe `proposePlan`). Has a
  colocated `buildSqlSystemPrompt.test.ts` net-new on feat.
- `supabase/functions/chat/chat.routes.ts` — the edge function router/tool
  registry. Touched by #019 (SQL recovery), #029 (`clarify`), #032
  (`discovery_clarification`), #033 (`proposePlan`), #037 (regen endpoint).
- `src/components/ChatPanel/PlanStateManager/PlanStateManager.tsx` — plan state.
  Touched by #033 (creates), #035 (cleanup hooks), #037 (drift→regen trigger),
  #040 (approval gate). **`PlanStep`/plan types are defined INLINE here**
  (`export type PlanStepStatus = ...`), NOT in `shared/types/plan.types.ts` as
  the per-feature plans claim — see drift note.
- `src/components/ChatPanel/PlanStateManager/planExecutor.ts` — touched by #033
  (creates), #035 (persist on success), #039 (dispatch python steps), #040
  (approval gate), #043 (type dispatch).
- `src/components/ChatPanel/PlanFlowView/PlanStepNode.tsx` — #034 (creates),
  #038 ("Branch from here" CTA).
- `src/components/ChatPanel/PlanFlowView/PlanCanvasToolbar.tsx` — #041 (tool
  selection), #042 (Export PNG/PDF buttons).
- `src/components/ChatPanel/ClarificationCard/ClarificationCard.tsx` — #030
  (creates), #032 (discovery dropdown variant).
- `eslint.config.js` — #025 adds the privacy chokepoint guard (see below).

### develop's chat runtime is the SLIM, post-#238 version

`develop` was cleaned up in PR #238 (`useAvandarChatRuntime` and friends). The
later merge of `develop` into `feat/ict4d-demo` kept `feat/ict4d-demo`'s FULLER
chat runtime (privacy bias-check, plan registration, etc.). **So the chat
runtime on `develop` is the slim version.** This group re-introduces the
privacy and plan layers ON TOP of that slim runtime. Concretely, on `develop`:

- `src/components/ChatPanel/` has **no** `Privacy/`, no `PlanFlowView/`, no
  `PlanStateManager/`, no `ClarificationCard/`, no `PendingClarificationBlock/`,
  no `src/sandbox/`. Verified via `git ls-tree origin/develop`.
- `src/lib/privacy/` and `src/components/Privacy/` **do not exist on develop**.
- The chat edge function on `develop` is missing
  `buildSqlSystemPrompt.test.ts` and `chat-models-catalog.gen.json` (the latter
  arrives with Group 1 / #094).

Implication: most of §D and §E is **copy-verbatim of net-new files** (cheap to
port), and the risk concentrates in the handful of surgical edits to the
hotspot files above.

### Shared infra introduced by this group (one-time cost, then reused)

- **Dexie DBs (4 distinct stores, do NOT merge schemas):**
  - `src/lib/privacy/consentAuditLog.ts` — consent decisions (#026).
  - `src/lib/privacy/clarificationAuditLog.ts` — clarification telemetry (#031).
  - `planStepStorage` (Dexie) — step results keyed `(planId, stepId)` (#035).
  - `AvandarPlanAnnotationDB` / `planAnnotationStorage.ts` — annotations (#041).
  Dexie itself is already installed on `develop` (no dep change). Watch DB
  version numbers so existing users don't crash on first load.
- **`crossBoundary` HMAC chokepoint (#025):** all data crossing the LLM
  boundary must flow through `src/lib/privacy/crossBoundary.tsx`. HMAC ack
  tokens carry a nonce + TTL; the server rejects replays with the exact string
  `UNAPPROVED_DATA_TRANSFER`. Server validator:
  `supabase/functions/_shared/privacy/ackToken.ts`. Client helpers
  `sessionSecret.ts` + `pendingAcks.ts`.
- **ESLint chokepoint guard (#025):** it is **NOT a separate ESLint plugin**
  (the per-feature plan's `eslint-plugin-avandar-privacy/` path is wrong). It
  is a `no-restricted-imports` block appended to `eslint.config.js` that
  forbids importing `issueAckToken` (from `@/lib/privacy/sessionSecret`) and
  `registerAck` (from `@/lib/privacy/pendingAcks`) anywhere except
  `crossBoundary.tsx`, `sessionSecret.ts`, `pendingAcks.ts`, and
  `src/lib/privacy/**/*.test.ts`. `develop` has **none** of this block today.
  `pnpm lint` MUST stay green with the guard in place.

### Sequencing constraints (the dependency graph the inventory doesn't show)

- Privacy detectors **#022 + #023 before #024** (consent modal consumes both)
  and before **#027** (locale stubs follow their interfaces).
- **#024 before #025** (modal mints the ack tokens crossBoundary validates),
  **#024 before #026** (modal writes the audit entries the page reads).
- **#025 before #028** (`isRowDataMessage` is called inside the crossBoundary
  server path) and before any §E row that crosses the boundary.
- **#029 (`clarify`) before #030 (`ClarificationCard`)**; #030 before #031
  (telemetry sources events) and before #032 (discovery variant extends it).
- **#033 (`proposePlan`) is the gate for the entire plan sub-series:** #034,
  #035, #036, #037, #038, #039, #040, #041, #042, #043 all require it.
- **#034 (canvas) before #038, #041, #042** (they layer on the canvas).
- **#039 (sandbox) before #043** (multi-language dispatches python to it).
- **#035 before #036** (virtual-dataset persistence rehydrates materialized
  step results).

### Operator decisions / deferred scope (do not "fix" these)

- **Python sandbox CSP (#039):** the iframe at `/sandbox-executor.html` has a
  strict CSP with pre-boot network stubs; Pyodide loads lazily; 30s/step
  timeout. Do NOT loosen the CSP for convenience. Pyodide is ~10MB — keep the
  lazy load.
- **WebR / R runtime is explicitly deferred (#039, #043):** `type: "r"` returns
  an explicit error; `availableRuntimes` registers only `python`. Do not add
  WebR.
- **No OPFS (#035):** step results persist in Dexie, not OPFS. Spec is explicit.
- **`react-doctor` intentional flags:** `key={index}` patterns and
  `no-inline-exhaustive-style` warnings in `ConsentModal.tsx`,
  `ChatEmptyState.tsx`, `PlanStepNode.tsx`, `RoughEdge.tsx`,
  `PlanAnnotationOverlay.tsx`. The inline RoughJS styles are intentional
  (config must sit next to styles — don't refactor to CSS modules). The
  array-index keys SHOULD be replaced with stable IDs during the port.
- **#020 vs #029 double-ask:** the system-prompt clarification (#020) and the
  tool-driven clarification (#029) can ask twice. Coordinate the system prompt
  for whichever lands later.

### Path drift: the per-feature plans use IDEALIZED paths

Many `NNN-*.md` files list aspirational paths that do **not** match the real
`feat/ict4d-demo` tree. Trust the real tree (this file's Consolidated changes),
not the per-feature path lists. Known mismatches:

- Plan types: plans say `shared/types/plan.types.ts`; reality = **inline in
  `src/components/ChatPanel/PlanStateManager/PlanStateManager.tsx`**.
- Sandbox: plans say `src/lib/sandbox/*` + `networkStubs.ts`; reality =
  **`src/sandbox/`** (`sandboxClient.ts`, `sandboxExecutor.ts`,
  `sandboxProtocol.ts`) — no separate `networkStubs.ts` file (stubs live in the
  HTML / executor).
- Privacy log page: plans say
  `src/routes/.../settings/privacy/log.tsx` + `src/views/PrivacyLogView/`;
  reality = **`src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivacyLogTab.tsx`**
  with audit DBs flat in `src/lib/privacy/` (`consentAuditLog.ts`,
  `clarificationAuditLog.ts`).
- Detector/helper paths: plans say `src/lib/privacy/audit/*` and
  `supabase/functions/_shared/privacy/isReadOnlyDiscoveryQuery.ts`; reality =
  flat `src/lib/privacy/*.ts` and `supabase/functions/_shared/privacy/`
  contains `ackToken.ts`, `discoveryQuery.ts`, `isRowDataMessage.ts`.
- ESLint guard: see above (config block, not a plugin).

### Base drift

`origin/develop` moved from the `6ec98d45` cited in the prompt to `6ec98d45`.
Re-fetch and re-base `refactor-g3/...` off the current `origin/develop` HEAD at
start. (`6ec98d45` is the merge SHA for `#061 web-offline-mode`, already in
`ALL_FEATURES.md`.)

---

## Migration order within this group

Strict dependency order, C → D → E. Within a tier, listed order is safe.

**Tier 0 — Core UX (independent, can land in any order; do first to warm up):**

1. `#016 chat-context-memo-fix` (1 file, lowest risk)
2. `#015 chat-disabled-visual-feedback`
3. `#017 chat-empty-state-improvements`
4. `#018 chat-try-again-and-retry-on-empty`
5. `#019 chat-recover-sql-without-tool-call` (needs Group 2 apply-SQL path)
6. `#020 chat-multi-dataset-clarification`
7. `#021 chat-better-pblock-generation` (needs `#009` + Group 2 p-block gen)

**Tier 1 — Privacy Phase 0 (detectors first, then consumers):**

8. `#022 privacy-pii-detector` (leaf)
9. `#023 privacy-bias-detector` (leaf)
10. `#024 privacy-consent-modal` (needs 22, 23)
11. `#025 privacy-crossboundary-hmac` (needs 24; adds ESLint guard)
12. `#026 privacy-audit-log-page` (needs 24)
13. `#027 privacy-discovery-spanish-french-stubs` (needs 22, 23)
14. `#028 privacy-isrowdatamessage-helper` (needs 25)

**Tier 2 — Clarifications (Phases 1–2):**

15. `#029 chat-clarify-tool` (needs 24, 25)
16. `#030 chat-clarification-card-and-bias-check` (needs 23, 29)
17. `#031 chat-clarification-telemetry` (needs 26, 30)
18. `#032 chat-discovery-clarifications` (needs 28, 30)

**Tier 3 — Plan foundation:**

19. `#033 chat-plan-propose` (needs 32) — **gate for everything below**

**Tier 4 — Plan layers (all need 33; canvas-dependents need 34):**

20. `#034 chat-plan-canvas` (needs 33)
21. `#035 chat-plan-step-materialization` (needs 33)
22. `#040 chat-plan-approval-gate` (needs 33)
23. `#037 chat-plan-schema-drift-regen` (needs 33)
24. `#039 chat-plan-python-sandbox` (needs 33)
25. `#036 chat-plan-virtual-dataset-persistence` (needs 33, 35)
26. `#038 chat-plan-branching` (needs 33, 34)
27. `#041 chat-plan-annotations` (needs 34)
28. `#043 chat-multi-language-plans` (needs 33, 39)
29. `#042 chat-plan-png-pdf-export` (needs 34, 41) — **last** (exports the
    fully-assembled canvas + annotations)

---

## Consolidated changes (deduped, real paths)

### Files to copy verbatim (net-new on `develop`)

**Privacy lib (§D):**

```
src/lib/privacy/piiDetector.ts                 (#022)
src/lib/privacy/piiDetector.test.ts            (#022)
src/lib/privacy/biasDetector.ts                (#023)
src/lib/privacy/biasDetector.test.ts           (#023)
src/lib/privacy/crossBoundary.tsx              (#025)
src/lib/privacy/sessionSecret.ts               (#025)
src/lib/privacy/pendingAcks.ts                 (#025)
src/lib/privacy/ackToken.test.ts               (#025)
src/lib/privacy/ackTokenRoundtrip.test.ts      (#025)
src/lib/privacy/consentAuditLog.ts             (#026, Dexie)
src/lib/privacy/clarificationAuditLog.ts       (#031, Dexie)
src/lib/privacy/discoveryQuery.ts              (#032)
src/lib/privacy/discoveryQuery.test.ts         (#032)
src/lib/privacy/generatedSqlAssumptions.ts     (#030/#032 support)
src/lib/privacy/generatedSqlAssumptions.test.ts
src/lib/privacy/isRowDataMessage.test.ts       (#028 client mirror/test)
src/lib/privacy/patterns/es/biasPatterns.ts    (#027)
src/lib/privacy/patterns/fr/biasPatterns.ts    (#027)
src/components/Privacy/ConsentModal/ConsentModal.tsx   (#024)
src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivacyLogTab.tsx  (#026, +Clarifications sub-tab #031)
supabase/functions/_shared/privacy/ackToken.ts          (#025 server validator)
supabase/functions/_shared/privacy/discoveryQuery.ts    (#032 server mirror)
supabase/functions/_shared/privacy/isRowDataMessage.ts  (#028)
```

**Clarification + plan (§E):**

```
src/components/ChatPanel/ClarificationCard/ClarificationCard.tsx            (#030, +#032 variant)
src/components/ChatPanel/ClarificationCard/clarificationAnswer.ts           (#030)
src/components/ChatPanel/ClarificationCard/clarificationAnswer.test.ts      (#030)
src/components/ChatPanel/PendingClarificationBlock/PendingClarificationBlock.tsx (#030)
src/components/ChatPanel/PlanStateManager/PlanStateManager.tsx              (#033, plan types inline)
src/components/ChatPanel/PlanStateManager/planExecutor.ts                   (#033)
src/components/ChatPanel/PlanStateManager/planStepStorage.ts               (#035, Dexie)
src/components/ChatPanel/PlanStateManager/planRehydrate.ts                  (#036)
src/components/ChatPanel/PlanStateManager/schemaDrift.ts                    (#037)
src/components/ChatPanel/PlanStateManager/schemaDrift.test.ts               (#037)
src/components/ChatPanel/PlanStateManager/PlanBranchStateManager.tsx        (#038)
src/components/ChatPanel/PlanStateManager/PlanBranchStateManager.test.ts    (#038)
src/components/ChatPanel/PlanFlowView/PlanFlowView.tsx                      (#034)
src/components/ChatPanel/PlanFlowView/PlanStepNode.tsx                      (#034, +#038 CTA)
src/components/ChatPanel/PlanFlowView/PlanStepSqlCode.tsx                   (#034)
src/components/ChatPanel/PlanFlowView/RoughEdge.tsx                         (#034)
src/components/ChatPanel/PlanFlowView/planLayout.ts                         (#034)
src/components/ChatPanel/PlanFlowView/planLayout.test.ts                    (#034)
src/components/ChatPanel/PlanFlowView/PlanBranchSidebar.tsx                 (#038)
src/components/ChatPanel/PlanFlowView/PlanCanvasToolbar.tsx                 (#041, +#042 export buttons)
src/components/ChatPanel/PlanFlowView/PlanAnnotationOverlay.tsx             (#041)
src/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager.tsx        (#041, 50-deep undo)
src/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager.test.ts    (#041)
src/components/ChatPanel/PlanFlowView/planAnnotationStorage.ts              (#041, Dexie)
src/components/ChatPanel/PlanFlowView/annotationColor.ts                    (#041)
src/components/ChatPanel/PlanFlowView/planCanvasExport.ts                   (#042)
src/sandbox/sandboxClient.ts                                               (#039)
src/sandbox/sandboxExecutor.ts                                             (#039)
src/sandbox/sandboxProtocol.ts                                            (#039)
public/sandbox-executor.html                                             (#039)
src/components/ChatPanel/applyChatTurnResponse.ts                          (#033/#019 turn application)
supabase/functions/chat/utils/buildSqlSystemPrompt.test.ts                (net-new test)
supabase/functions/chat/chat-models-catalog.gen.json                      (Group 1 / #094 — confirm present before start)
```

> The PNG/PDF export approval banner components are colocated in `PlanFlowView/`
> and `PlanStateManager/`; the exact `PlanApprovalBanner` file is part of #040 —
> resolve its real filename during that row's undrift (the per-feature plan's
> name is idealized).

### Files to surgically edit on `develop`

- `src/components/ChatPanel/useAvandarChatRuntime.ts` — #016 memo consumption,
  #018 retry-on-empty, #024 consent gate, #029 clarify cap, #033 register
  `PlanStateManager`, #035/#040 executor wiring. **Merge across rows.**
- `src/components/ChatPanel/useChatPageContext.ts` — #016 wrap return in
  `useMemo` (deps: pathname, openDatasetId, `rawSql`, lastQueryError). Note the
  `rawSql` casing — G2 renamed it from `rawSQL`.
- `src/components/ChatPanel/ChatThread/Composer/Composer.tsx` (+
  `Composer.module.css`) — #015 disabled state + transparency fix, #024
  intercept-on-send, #030 outgoing bias check + Enter-key arbitration.
- `src/components/ChatPanel/ChatEmptyState/ChatEmptyState.tsx` (+ `.module.css`,
  + net-new `pickChatSuggestionColumns.ts` / `getCachedDatasetColumnSummaries.ts`)
  — #017.
- `src/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage.tsx` —
  #018 Try Again affordance; #030/#033 render clarification cards / plan blocks.
- `src/components/ChatPanel/ChatPanelProvider/ChatPanelProvider.tsx` — wire
  `crossBoundary` context (#025) and plan/consent providers.
- `supabase/functions/chat/utils/buildSqlSystemPrompt.ts` — #020 multi-dataset
  block, #021 chart-type catalog, #029 `clarify`, #033 `proposePlan`.
- `supabase/functions/chat/chat.routes.ts` — #019 SQL recovery, #029 `clarify`,
  #032 `discovery_clarification` context, #033 `proposePlan`, #037 regen
  endpoint, #025 `verifyCrossBoundary`/ackToken validation at request top.
- `supabase/functions/chat/chat.types.ts` — tool/result type additions (#029,
  #032, #033, #037).
- The DataViz p-block generator (Group 2 territory; #021 edits it) — produce
  v3-shape (`series` arrays) configs.
- `eslint.config.js` — **append the privacy chokepoint `no-restricted-imports`
  block** (#025). Mirror the exact `paths`/`ignores` from `feat/ict4d-demo`.
- Vite config — #039 register `sandbox-executor.html` as a separate entry +
  document/apply CSP headers.
- `availableRuntimes` (resolve real path during #043 undrift) — register
  `python`, NOT `r`.
- Settings nav / `WorkspaceSettingsPage` tab registration — add Privacy tab
  (#026) and its Clarifications sub-tab (#031).
- Virtual-datasets client/model — #036 `updatePlan`/`getPlan` against the
  `plan_steps` JSONB column. **Confirm Phase 1 added that column; if not, STOP
  and flag the operator (Phase 1 gap).**
- `SavedDatasetsView` (Group 2 / #003) — #036 rehydrate when
  `dataset.config.plan_steps` present.

### Files to delete

None. This group is additive.

### Dependency changes

Add to `package.json` (all present on `feat/ict4d-demo`, absent on `develop`):

```
pnpm add @xyflow/react@^12.10.2          # #034 canvas
pnpm add roughjs@^4.6.6                    # #034 sketched edges (+ #041 arrows)
pnpm add perfect-freehand@^1.2.3           # #041 freehand pen
pnpm add @react-pdf/renderer@^4.5.1        # #042 PDF (dynamic import)
pnpm add html-to-image@^1.11.13            # #042 PNG
pnpm add pyodide@^0.29.4                    # #039 python sandbox
# node-sql-parser@^5.4.0 — ALREADY on develop (added by G2 #044); do NOT re-add
pnpm add @assistant-ui/react-markdown@^0.14.0          # markdown message parts
pnpm add @assistant-ui/react-syntax-highlighter@^0.14.0 # chat code highlighting
```

`dexie` is already on `develop` — no change (used by #026, #031, #035, #041).
Pin to the exact versions above to match the source branch.

---

## Per-feature breakdown

Each row's detailed steps live in its `NNN-<slug>.md`. Below is the concise
"what + where + watch-for", grouped C/D/E in migration order. **Trust the real
paths in Consolidated changes over the idealized paths in the NNN files.**

### §C — Core UX

- **#016 `chat-context-memo-fix`** → `016-chat-context-memo-fix.md`. One edit:
  `useMemo` the `useChatPageContext` return. Keep deps exhaustive. Lowest risk —
  do first.
- **#015 `chat-disabled-visual-feedback`** → `015-...md`. CSS/a11y only on
  `Composer.tsx` + module. WCAG AA on disabled placeholder copy.
- **#017 `chat-empty-state-improvements`** → `017-...md`. `ChatEmptyState` +
  net-new `pickChatSuggestionColumns.ts`. Fixed-height shim; fix `key={index}`.
- **#018 `chat-try-again-and-retry-on-empty`** → `018-...md`. Try Again on
  assistant card + ONE auto-retry. Bound the retry; roll back stale tool state.
- **#019 `chat-recover-sql-without-tool-call`** → `019-...md`. Server-side scan
  in `chat.routes.ts` for fenced SQL → synthetic `generateSql`. Narrow regex;
  log when it fires. Needs Group 2 apply-SQL path on develop.
- **#020 `chat-multi-dataset-clarification`** → `020-...md`. System-prompt block
  in `buildSqlSystemPrompt.ts`. Compare schema overlap, not just count.
  Coordinate with #029.
- **#021 `chat-better-pblock-generation`** → `021-...md`. Needs `#009` chart
  types + Group 2 p-block generator. Produce v3-shape (`series`) configs.

### §D — Privacy guardrails (Phase 0)

- **#022 `privacy-pii-detector`** → `022-...md`. Copy `piiDetector.ts` + test
  (16 tests). Pure fn. Preserve every test (false-positive calibration).
- **#023 `privacy-bias-detector`** → `023-...md`. Copy `biasDetector.ts` + test
  (11 tests). English baseline; don't rebalance without operator review.
- **#024 `privacy-consent-modal`** → `024-...md`. `ConsentModal.tsx` (5 modes
  A–E incl. Mode E typed-phrase). Run detectors on SEND only, not on change.
  Memoize. Wire into composer send pipeline.
- **#025 `privacy-crossboundary-hmac`** → `025-...md`. `crossBoundary.tsx` +
  `sessionSecret.ts` + `pendingAcks.ts` + server `ackToken.ts` + **ESLint
  `no-restricted-imports` block in `eslint.config.js`** (not a plugin). HMAC
  nonce+TTL, replay rejection = `UNAPPROVED_DATA_TRANSFER`. Local-dev HMAC key
  bootstrap from Supabase secrets. Lint MUST be green.
- **#026 `privacy-audit-log-page`** → `026-...md`. `consentAuditLog.ts` (Dexie,
  metadata-only) + `PrivacyLogTab.tsx`. Set Dexie version correctly. Don't build
  the Clarifications sub-tab here (that's #031).
- **#027 `privacy-discovery-spanish-french-stubs`** → `027-...md`.
  `patterns/es/biasPatterns.ts` + `patterns/fr/biasPatterns.ts` + locale param
  on detectors. Stubs only; fall back to English on load failure.
- **#028 `privacy-isrowdatamessage-helper`** → `028-...md`. Server
  `supabase/functions/_shared/privacy/isRowDataMessage.ts` + test. Pure fn;
  preserve edge-case tests.

### §E — Interactive workflows (Phases 1–9)

- **#029 `chat-clarify-tool`** → `029-...md`. Register `clarify` tool in
  `chat.routes.ts`; 3-round cap in runtime (resets per top-level question);
  tight Zod arg schema; system-prompt update.
- **#030 `chat-clarification-card-and-bias-check`** → `030-...md`.
  `ClarificationCard.tsx` (free-text / single / multi) + bidirectional bias
  check (reuse #023). Suppress global Enter-to-send when card focused.
- **#031 `chat-clarification-telemetry`** → `031-...md`. Separate
  `clarificationAuditLog.ts` Dexie DB (do NOT share with #026) + Clarifications
  sub-tab in `PrivacyLogTab`. Metadata-only.
- **#032 `chat-discovery-clarifications`** → `032-...md`. `discoveryQuery.ts`
  (client + server mirror) read-only `SELECT DISTINCT` validator; runs in local
  DuckDB; selection routes through `crossBoundary` with `discovery_clarification`
  context. Both sides reject non-`SELECT DISTINCT`.
- **#033 `chat-plan-propose`** → `033-...md`. **Foundation.** `proposePlan` tool
  + inline plan types in `PlanStateManager.tsx` + `planExecutor.ts` + DuckDB
  `step_<id>` temp-view lifecycle. ≤8 steps enforced server-side (Zod). Test
  view-cleanup failure paths (leak risk).
- **#034 `chat-plan-canvas`** → `034-...md`. xyflow DAG + `RoughEdge` (RoughJS) +
  Auto/Step toggle + `fitView`/`setCenter`. Keep sketched look; don't refactor
  inline RoughJS styles to CSS modules.
- **#035 `chat-plan-step-materialization`** → `035-...md`. `planStepStorage.ts`
  (Dexie, `(planId, stepId)`). No OPFS. Cleanup on Close/replace/new propose.
- **#040 `chat-plan-approval-gate`** → `040-...md`. `approvalStatus` on plan +
  Approve/Reject banner gating `planExecutor`. >7 SQL steps → suggest Python/R
  (soft, not a hard block).
- **#037 `chat-plan-schema-drift-regen`** → `037-...md`. `schemaDrift.ts`
  (strict) + downstream BFS + regen endpoint in `chat.routes.ts` + client regen
  loop (cap 2 attempts/step). QA by mutating a column between two propose
  cycles.
- **#039 `chat-plan-python-sandbox`** → `039-...md`. `src/sandbox/*` +
  `public/sandbox-executor.html` (strict CSP, network stubs) + Pyodide (lazy,
  30s timeout) + parquet bridge. `planExecutor` dispatches `type:"python"`.
  WebR deferred. Vite separate entry + CSP headers.
- **#036 `chat-plan-virtual-dataset-persistence`** → `036-...md`. `plan_steps`
  JSONB column (confirm Phase 1 added it) + `planRehydrate.ts` + parquet reload.
  Degrade gracefully on missing cached blob. Wire `SavedDatasetsView`.
- **#038 `chat-plan-branching`** → `038-...md`. `PlanBranchStateManager.tsx` +
  `PlanBranchSidebar.tsx` + "Branch from here" CTA on `PlanStepNode` (succeeded
  steps only). Per-branch thread/persistence deferred.
- **#041 `chat-plan-annotations`** → `041-...md`. `PlanAnnotationOverlay` +
  `PlanAnnotationStateManager` (50-deep undo) + `planAnnotationStorage.ts`
  (Dexie) + `PlanCanvasToolbar`. Replace array-index keys with annotation IDs.
- **#043 `chat-multi-language-plans`** → `043-...md`. Widen step `type` enum in
  `PlanStateManager.tsx` to `sql|python|r|clarification`; dispatch in
  `planExecutor`. R → explicit error. `clarification` step = pause for card.
- **#042 `chat-plan-png-pdf-export`** → `042-...md`. **Last.** `planCanvasExport.ts`
  (PNG via `html-to-image`, no toolbar/minimap) + PDF via dynamically-imported
  `@react-pdf/renderer` (page 1 overview, page-per-step). Export buttons on
  `PlanCanvasToolbar`.

---

## Verification

### Automated (run after each row's commit on the branch; a full green pass — type-check + vitest + eslint + relevant e2e — is required before opening the single group PR)

```sh
# Types — whole project
pnpm tsc -b --noEmit

# Lint — INCLUDING the privacy chokepoint guard once #025 lands
pnpm lint

# Privacy detector + crossBoundary unit tests (§D)
pnpm vitest run \
  src/lib/privacy/piiDetector \
  src/lib/privacy/biasDetector \
  src/lib/privacy/ackToken \
  src/lib/privacy/ackTokenRoundtrip \
  src/lib/privacy/discoveryQuery \
  src/lib/privacy/generatedSqlAssumptions \
  supabase/functions/_shared/privacy

# Chat edge function + system prompt (§C/§E)
pnpm vitest run \
  supabase/functions/chat/utils/buildSqlSystemPrompt

# Clarification + plan unit tests (§E)
pnpm vitest run \
  src/components/ChatPanel/ClarificationCard \
  src/components/ChatPanel/PlanStateManager \
  src/components/ChatPanel/PlanFlowView \
  src/components/ChatPanel
```

Notes:
- After #025, deliberately add a stray `import { issueAckToken }` outside the
  allowlist and confirm `pnpm lint` FAILS — that proves the chokepoint guard is
  wired. Remove the probe.
- Detector test counts: piiDetector = 16, biasDetector = 11. Preserve all.
- If a Playwright e2e spec exists for the plan/sandbox surface
  (`tests/e2e/helpers/polarSandbox.ts` exists on feat), run the matching spec
  for #039/#042.

### Manual (needs a browser / live services — flag to operator if unavailable)

1. **Live LLM (Supabase stack):** vague question → `clarify` card (#029/#030);
   stall → 3-round cap declines. Multi-dataset question → disambiguation
   (#020). PII/bias messages → consent modal modes B/C/D/E (#024). Tamper ack
   token in DevTools → `UNAPPROVED_DATA_TRANSFER` (#025).
2. **Plan canvas (#033/#034/#038):** multi-step question → plan proposed,
   `step_<id>` views exist, sketched edges render, Auto/Step toggle works,
   "Branch from here" on succeeded steps, close → views dropped.
3. **Python sandbox (#039):** python step → Pyodide lazy-loads, runs in iframe
   at `/sandbox-executor.html`, 30s timeout, CSP rejects outbound `fetch`
   (DevTools). R step → explicit error (#043).
4. **PDF/PNG export (#042):** multi-step plan + annotations → PNG excludes
   toolbar/minimap; PDF is multi-page (overview + per-step).
5. **Persistence:** run plan, refresh → step results rehydrate from Dexie
   (#035); save as virtual dataset, reload, reopen → plan rehydrates (#036);
   annotations survive refresh (#041); Privacy log + Clarifications sub-tab show
   metadata-only entries (#026/#031).

All of the above require a live LLM + Supabase local stack + a real browser.
If the migrating session cannot drive those, SAY SO and hand the checklist to
the operator rather than claiming it passed.

---

## How to mark this group completed

This group ships as a **single PR** off `refactor-g3/ai-chat-panel`. The operator
opens exactly one PR for the group against `develop`. On merge:

1. Verify the refactor branch merged into `develop`
   (`git merge-base --is-ancestor refactor-g3/ai-chat-panel origin/develop`).
2. `MERGE_SHA=$(git rev-parse --short origin/develop)`.
3. Flip ALL 29 constituent rows (#015–#043) to `[x] ($MERGE_SHA)` in
   `docs/deslop/ALL_FEATURES.md` (the same merge SHA for all; table rows live
   ~L128–L172; format is `| NN | \`[x] (sha)\` | **slug** — desc | source |`).
4. Log the group completion in `docs/deslop/STATE.md`: move the rows from
   `In-flight migrations` to the `Completed migrations log` with date + SHA;
   confirm the completed log records all 29 rows under the one group SHA.
5. Delete all of the group's per-feature plan files
   (`rm docs/deslop/015-*.md` through `docs/deslop/043-*.md`).
6. Delete this file: `rm docs/deslop/GROUP-3-ai-chat-panel.md`.
7. Delete the refactor branch `refactor-g3/ai-chat-panel` locally + remote, then
   commit + push the bookkeeping to `feat/ict4d-demo`.
