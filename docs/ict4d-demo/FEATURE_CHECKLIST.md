# `feat/ict4d-demo` — Feature Checklist

Use this checklist to track progress on the 29 items from the demo brief.
For depth on what's done, what was deferred, and why, see
`docs/ict4d-demo/CHECKPOINTS.md`.

Legend: `[x]` done · `[~]` partial / in flight · `[ ]` not started

---

## Branch & merges

- [x] **0. Create `feat/ict4d-demo` and merge all open PRs**
  - [x] PR #234 / #235 / #236 (async dataset import stack)
  - [x] PR #224 (app-wide dropzone)
  - [x] PR #228 (floating query windows)
  - [x] PR #229 (dataset drawer)
  - [x] PR #232 (chat panel disabled state)
  - [x] `claude/add-series-support-734EZ` (multi-series viz — explicitly called out by user)
  - [x] `claude/fix-tablet-responsiveness-MqAFc`
  - [x] `claude/add-python-r-execution-hKxZd` (spec doc only — implementation is item #2 below)

## Feature work

- [ ] **2. Finish Desktop Phase 2** (4,298-line plan — needs native build env)
- [~] **3. Merge other `claude/` session branches** — all visible ones merged in step 0
- [~] **4. Pull and finish work from `claude/` branches that only have plans**
  - [x] Plan pulled from `claude/add-python-r-execution-hKxZd`
  - [~] Implementation of the chat-interactive-workflows plan
    - [x] Phase 0 — PII detector (16 tests green)
    - [x] Phase 0 — Bias detector (11 tests green)
    - [x] Phase 0 — Consent modal Modes A/B/C/D/E (composite + medical-strict shipped)
    - [x] Phase 0 — `crossBoundary` API with HMAC ack tokens
    - [x] Phase 0 — HMAC ack tokens + backend `UNAPPROVED_DATA_TRANSFER`
    - [x] Phase 0 — Dexie audit log + `/settings/privacy/log` page (Privacy log tab)
    - [x] Phase 0 — `isRowDataMessage` server helper for the Phase 2+ row-data path
    - [x] Phase 0 — Spanish + French pattern file stubs
    - [x] Phase 1 — `clarify` tool registered in chat backend with 3-turn cap
    - [x] Phase 1 — Inline ClarificationCard in the thread (free_text + fixed_options)
    - [x] Phase 1 — System-prompt clarification block
    - [x] Phase 1 — Bias check on outgoing user messages via `crossBoundary`
    - [x] Phase 1 — Bias check on LLM clarification questions (logs, doesn't block in v1)
    - [x] Phase 1 — Clarification audit table + telemetry (separate Dexie DB)
    - [ ] Phase 1 — Eval set (20 ambiguous questions, ≥80% resolution target)
    - [ ] Phase 2 — Discovery clarifications (`discovery` response shape)
    - [ ] Phase 3 — `proposePlan` + xyflow DAG view
    - [ ] Phase 4 — Schema-drift regen
    - [ ] Phase 5 — Branching
    - [ ] Phase 6 — Python + R sandboxed executor
    - [ ] Phase 7 — Context compression
- [x] **5. Install `node-sql-parser`; best-effort SQL → manual query form parsing** (Data Explorer only; see `docs/demo-features/sql-parser-filter-ui.md`. Dashboards still pending.)
- [~] **6. Bidirectional SQL ↔ manual-query-form sync** (Data Explorer: knex-based form → SQL regeneration + lossy-mapping warning + overwrite-confirmation flow. Dashboards still pending.)
- [ ] **7. Tokenize generated SQL / Python / R — column names + dataset IDs as clickable pills**
- [ ] **8. Multilingual voice dictation in chat panel (Whisper / transformers.js, 6 languages)**
- [x] **9. Redesigned dataset Summary view (visualizations, lazy-load, scroll-on-demand)**
  - Doc-style outline with sticky TOC on the left, plain-language headline per column, type-appropriate viz beneath (bar for text top values, range+stddev for numbers, timeline for dates), missing-rate ring when nonzero.
  - Lazy-loaded per column: `getColumnSummary` only fires when a section is within 200px of the viewport.
- [ ] **10. Dashboard polish: spacing, typography, color, editable design + semantic tokens, logo upload**
- [ ] **11. Dashboard media: video / image / media embed via Supabase Storage**
- [~] **12. Dashboard publish options: PDF export, QR code, vanity URL**
  - [x] Vanity URL (optional; auto kebab-cased; lands at `/d/<workspaceSlug>/<slug>`).
  - [x] Copy share link to clipboard.
  - [x] QR code (rendered client-side via `qrcode`, downloadable as PNG).
  - [x] Publish modal leads with the URL the dashboard will be published to.
  - [ ] PDF export.
- [ ] **13. Workspace-private dashboard sharing via Share modal (dashboards as shareable resources)**
- [ ] **14. Slice-aware public publishing (package only the data slices the dashboard reads)**
- [ ] **15. Viewer-editable global dashboard filters**
- [ ] **16. Viewer-editable per-viz dashboard filters**
- [ ] **17. Publish-time slice picker (default = dashboard creator's slices; opt in to more)**
- [x] **18. Make dashboard "View" button work before "Publish"**
  - New auth-gated preview route at `/<workspaceSlug>/dashboards/preview/<dashboardId>` shows the read-only render with a "Back to editor" banner. Public route at `/public/dashboards/...` still enforces `isPublic`.
- [~] **19. Everything still works in Desktop + offline mode** — requires items #2 and #8 first
- [~] **20. Manual querying works offline (LLM queries don't, but manual must)** — manual query form already works locally; needs verification once dashboard work lands
- [ ] **21. Manual query form available inside dashboards**
- [ ] **22. Chat panel works inside dashboards — produces Puck blocks (P-blocks)**
- [ ] **23. Optional local model fallback for offline use (only if 8 GB RAM-feasible)**
- [ ] **24. Lingui i18n: EN / FR / ES / AR (with RTL) / ZH / SW; workspace-level language setting**
- [ ] **25. React Joyride onboarding tour**
- [x] **26. Usage analytics — Supabase table + RLS** (`usage_analytics_events`). Client-side event logging still TODO.
- [x] **27. Hugging Face API token plumbing (`.env.development` only, never committed)** — token will be added when Whisper / HF features land in item #8. Reminder: do **not** commit it; do **not** add to docs.
- [ ] **28. New dataset types `datasets__pdf` and `datasets__image` with annotation → CSV extraction**
- [x] **29. BUGFIX: chat canvas stops updating after multi-turn**
  - Memoization fix applied to `useChatPageContext`. Needs browser verification with the four-turn repro.

## Quality / process gates

- [x] Typecheck passing on the merged branch
- [ ] Full test suite passing on the merged branch (not yet run — duckdb native build was blocked in the previous session; needs to be run locally)
- [ ] Smoke test in the browser (import a CSV, run a chat query, drop a CSV, save to dashboard) before showing to beta users
- [ ] Run `supabase db diff` locally against the hand-written analytics migration to catch any drift

---

## How to ask for more work

Reference an item by its number or short title — e.g. "do #21" or "wire
analytics event logging for #26". If you want me to skip ahead (e.g.
"start on dashboards first") that's fine; the checklist exists so you
don't have to re-paste the original brief every time.
