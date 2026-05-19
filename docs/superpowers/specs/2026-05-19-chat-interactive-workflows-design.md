# Chat Panel — Interactive Analytic Workflows Design

**Date:** 2026-05-19
**Status:** Phases 0–4 shipped on `feat/ict4d-demo` (Phase 0–2 with small gaps noted below; Phases 3–4 complete). Phases 5–7 + Phase 9 at architecture level only.
**Author:** Pablo (with Claude)

## Implementation status (canonical: `docs/ict4d-demo/FEATURE_CHECKLIST.md`)

The checklist file is the granular source of truth. Quick snapshot:

| Phase | Status | Outstanding gaps |
|---|---|---|
| 0 — PII + Bias Foundation | ~95% | `containsHealthData` workspace UI; opt-in `shareAnonymousPrivacyMetrics` setting; server-issued ack-token nonce registry (in-memory today) |
| 1 — Basic Clarifications | ~95% | Silent bias re-prompt loop (currently warns only); 20-question ambiguous-question eval set |
| 2 — Discovery Clarifications | ~90% | Ack-token signing for `values` scope (text scope is signed end-to-end; `values` is accept-on-presence); "Edit selection" hook on the consent modal |
| 3 — Plans + DAG | done | Plan approval gate added (user must approve before any step runs). Viz **thumbnails** on each plan node (currently shows schema text, not mini-charts) |
| 4 — Schema-Drift Regen | done | — |
| 5 — Branching | partial | Branch state manager + sidebar + "Branch from here" CTA shipped. Missing: separate chat thread per branch (assistant-ui multi-thread orchestration), virtual-dataset persistence of the branch tree. |
| 6 — Python + R Executor | partial | Sandboxed iframe + CSP + Pyodide + Arrow IPC bridge shipped. Missing: WebR (R) runtime, external security review (REQUIRED before user exposure), stdout/stderr UI. |
| 7 — Context Compression | not started | All. Spec architecture below. |
| 9 — Annotation + Export | partial | Text/sticky/arrow/pen annotations + IndexedDB persistence + PNG (html-to-image) + multi-page PDF (@react-pdf) shipped. Missing: virtual-dataset persistence of annotations, drag-to-move handles, sticky resize. |

Cross-cutting gaps that aren't tied to a single phase:
- 50-question eval harness with correctness + clarification-count + token-spend scoring
- System prompt versioning with prompt-version label round-tripped to client
- Public privacy page copy on avandarlabs.com (sandboxing + PII + bias detection)
- Spanish + French bias patterns themselves (currently empty stubs; UX copy translated; pending social-sector advisor review)

**Live verification gap.** Phases 3 and 4 have NOT been exercised against a real LLM or DuckDB-WASM end-to-end — the remote dev container hosting the implementation work has `openrouter.ai` and Supabase image hosts off its network allowlist. Verification is gated on the Vercel preview build of `feat/ict4d-demo`. Three smoke checks before stacking new phase work on top:

1. A real `proposePlan` turn — canvas renders, steps run, auto-zoom feels right.
2. A real schema-drift case — force a wrong predicted schema and watch the regen endpoint fire.
3. Save → close → reopen a multi-step plan as a virtual dataset.

## Summary

We are extending the existing Data Explorer chat panel from a single-purpose "natural language → DuckDB SQL" generator into an interactive analytic workflow surface. The chat will:

- Generate SQL **and** Python (Pyodide) **and** R (WebR), all executing entirely in the browser
- Ask **clarifying questions** before generating code when the user's intent is ambiguous, including "discovery" clarifications that run a small query locally to populate dropdown choices
- Propose **multi-step plans** rendered as an xyflow DAG, with intermediate tables/visualisations on the canvas
- Support **branching** at any plan step into a new chat thread
- Detect and gate **PII** and **biased phrasing** at every point where data or user text crosses from the browser to the LLM
- Compress context aggressively as plans and threads grow

Everything runs locally in the browser. The promise we make to users — *the LLM only ever sees metadata and what you explicitly approve* — is preserved across all new features.

## Goals

- Keep the data-locality promise intact. Row-level data never reaches the LLM unless the user explicitly consents through a single chokepoint API (`crossBoundary`).
- Add execution capability (Python, R) for the ~5–15% of analytic questions that SQL alone cannot answer cleanly, while keeping the architecture cheap and consistent with the existing DuckDB-WASM pattern.
- Help non-technical social-sector users formulate good questions through guided clarifications, without making the UX feel interrogative.
- Surface and soft-block biased phrasing (gender, cultural, loaded framing) before it reaches the LLM, while never blocking the user from continuing.
- Stay well under the $4-per-user-per-month ARPU envelope on LLM cost — target ≤$0.30 per user per month at typical usage.

## Non-Goals

- **A separate executor service.** The "sandboxed executor" referred to throughout this doc is a same-origin sandboxed iframe with strict CSP, not a backend deployment. The app remains fully offline-capable.
- **Server-side data processing.** All data work happens in the browser. The only server is the existing Supabase edge function for LLM proxying.
- **A bespoke agent framework.** We use multi-turn tool-calling against OpenRouter; the chat thread is the agent state. No LangChain, no agent SDK.
- **LLM-based PII or bias detection.** Detection is heuristic-only (keyword/regex), to avoid the contradiction of sending user data to an LLM in order to decide whether to send it to an LLM.
- **Linux / mobile native shells.** Web first; desktop integration is a separate workstream (see `2026-05-13-electrobun-desktop-design.md`).

## Constraints and Promises (Privacy Bedrock)

Five invariants that hold across every phase:

1. **The LLM only ever receives metadata** (dataset names, column names, types) plus user-typed text and user-explicitly-approved values. Row-level data does not cross the boundary by default.
2. **Every data crossing is explicit.** A modal appears, the user previews what is being sent, the user clicks Send. No "don't ask again" toggle. Ever.
3. **PII detection elevates the modal**, never bypasses it. Medical-grade data requires a typed confirmation phrase.
4. **Bias detection nudges, never blocks.** Suggested rewrites are hand-written and shipped in the bundle; no LLM consultation.
5. **Everything is auditable locally.** A Dexie-backed consent + clarification log is visible to the user in their workspace settings. No silent telemetry — analytics sync is explicit opt-in and ships zero detectable PII.

These are operationalised in Phase 0 and are load-bearing for every subsequent phase.

## Architecture Overview

```
┌──────────────────────────── Browser (single origin) ─────────────────────────────┐
│                                                                                   │
│  ┌─────────── App ───────────┐         ┌───── Sandboxed Iframe (null origin) ─┐  │
│  │                            │         │ sandbox="allow-scripts" + strict CSP │  │
│  │  ChatPanel (assistant-ui)  │         │ connect-src 'none'                   │  │
│  │  Data Explorer canvas      │         │                                      │  │
│  │  PlanFlow (xyflow DAG)     │         │   ┌──── Web Worker ──────┐          │  │
│  │                            │         │   │   Pyodide / WebR     │          │  │
│  │  ┌────────────────────┐    │ Arrow   │   │                      │          │  │
│  │  │  DuckDb-WASM       │◄───┼─IPC────►│   │   pandas / tidyverse │          │  │
│  │  │  (Worker)          │    │ buffers │   │                      │          │  │
│  │  └────────────────────┘    │         │   └──────────────────────┘          │  │
│  │                            │         │                                      │  │
│  │  privacy/crossBoundary ────┼─┐       └──────────────────────────────────────┘  │
│  │  (PII + Bias + ack token)  │ │                                                 │
│  └────────────────────────────┘ │                                                 │
│                                 │                                                 │
│  ┌──── Dexie ────┐               │                                                 │
│  │ consent log   │               │                                                 │
│  │ clarification │               │                                                 │
│  │ log           │               │                                                 │
│  └───────────────┘               │                                                 │
└─────────────────────────────────┼────────────────────────────────────────────────┘
                                  │ HTTPS (only metadata + ack-token-signed payloads)
                                  ▼
                        ┌─── Supabase edge fn ───┐
                        │  chat.routes.ts        │
                        │  Validates ack tokens  │
                        │  Proxies to OpenRouter │
                        └────────────────────────┘
                                  │
                                  ▼
                             OpenRouter
                       (Haiku 4.5 default,
                        Sonnet 4.6 escalation)
```

Key design moves:

1. **Same origin, sandboxed iframe for Python/R.** Setting `sandbox="allow-scripts"` (no `allow-same-origin`) on the iframe forces a null opaque origin at runtime even though the HTML ships from our bundle. This gives null-origin isolation from app storage (cookies, IndexedDB, OPFS) without needing a separate deployment. Fully offline-capable.
2. **Arrow IPC buffers for all data transfer.** DuckDB-WASM already emits Arrow; the executor iframe reconstructs to pandas/tidyverse zero-copy. No JSON, no double-serialisation.
3. **Single chokepoint for data crossing the LLM boundary.** All paths route through `crossBoundary()`. Lint rule enforces this. Backend rejects unsigned data payloads.
4. **Tool calls drive routing.** The chat backend exposes multiple tools (`generateSql`, `clarify`, `proposePlan`, `generatePython`, `generateR`). The LLM picks. No pre-classifier.
5. **Cheap model first, escalate on tool intent.** Haiku 4.5 handles SQL and clarifications; calling `proposePlan` or code-generation tools triggers the frontend to re-issue against Sonnet 4.6.

## Model Strategy

**Dual-tier with escalate-on-tool-call.**

- **Default model:** Claude Haiku 4.5. Handles `generateSql`, `clarify` (both shapes), simple follow-ups. ~75% of turns.
- **Escalation model:** Claude Sonnet 4.6. Used for `proposePlan`, `generatePython`, `generateR`, and any regen after >1 failed attempt.

**Trigger mechanism:** the cheap model's tool schema includes the escalation tools, with descriptions that say *"Calling this tool indicates the question needs deeper reasoning. The system will route to a stronger model."* When the cheap model emits one of these tool calls, the frontend intercepts, discards the cheap model's tool-call args, and re-issues the request to the escalation model with the same chat history. One extra call only on complex questions. No upfront classifier needed — the cheap model's tool choice *is* the classifier.

**Expected per-user cost at 100 chat turns/month:**

| Turn type | Frequency | Avg cost | Subtotal |
|---|---|---|---|
| Simple SQL (Haiku) | 70% | $0.0002 | $0.014 |
| Clarification (Haiku) | 15% | $0.0003 | $0.0045 |
| Plan/code (Haiku → Sonnet escalate) | 12% | $0.004 | $0.048 |
| Regen on Sonnet | 3% | $0.005 | $0.015 |

**Total: ~$0.08/user/month** — 2% of ARPU. Prompt caching pushes this to ~$0.06 with even modest cache hit rates.

Pinning: use specific provider IDs (`anthropic/claude-haiku-4-5-20251001`) rather than aliases so cost is predictable.

## Phase Index

| Phase | Title | Effort | Status |
|---|---|---|---|
| 0 | PII + Bias Consent Foundation | ~4 weeks | Shipped (hardening done) |
| 1 | Basic Clarifications | ~1 week | Shipped |
| 2 | Discovery Clarifications | ~1 week | Shipped |
| 3 | Plans + DAG View | ~3 weeks | Shipped (xyflow canvas, IndexedDB materialisation, plan persistence on virtual datasets) |
| 4 | Schema-Drift Regen | ~1 week | Shipped |
| 5 | Branching | ~1.5 weeks | Architecture only |
| 6 | Python + R Sandboxed Executor | ~5 weeks | Architecture only |
| 7 | Context Compression | ~1 week | Architecture only |
| 9 | Canvas Annotation + Export | ~1.5 weeks | Architecture only — see end of doc |

**Total: ~16.5 engineer-weeks (Phases 0–7) + ~1.5 weeks (Phase 9).**

Phases must ship in order; each unlocks the next. Phase 0 is the foundation everything depends on.

---

# Phase 0 — PII + Bias Consent Foundation

**Status:** Design locked.

## Why first

Every later phase that crosses the data→LLM boundary needs this. Building it now means later phases just plug in.

## Detector specs

### PII Detector

Two layers, both run client-side, never call an LLM.

**Layer A — Column-name heuristic** (case-insensitive substring match against column name). Categorised so the modal can show specifics.

```
direct_identifier   name, first_name, last_name, fname, lname, full_name,
                    email, phone, mobile, cell, telephone, contact,
                    address, street, addr, zip, postal, postcode

government_id       ssn, social_security, national_id, nin, passport,
                    drivers_license, tax_id, ein, sin

demographic_sensitive  dob, birth_date, date_of_birth, age,
                       gender, sex, ethnicity, race, religion, orientation

financial           account, iban, swift, card, cc, cvv, bank, routing

medical             patient, mrn, diagnosis, medication, condition,
                    health_status, hiv, prescription

precise_location    lat, latitude, lng, longitude, lon, gps, coords,
                    geolocation, point

free_text_risky     notes, comments, description, bio, feedback, remarks,
                    narrative, story
```

Severity: `direct_identifier`, `government_id`, `medical`, `financial`, `precise_location` → **critical**. `demographic_sensitive`, `free_text_risky` → **warning**.

**Layer B — Content regex** (run per value in selection).

```
email          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/
us_phone       /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
intl_phone     /\+\d{1,3}[-.\s]?\d{6,14}/     (loose, after us_phone)
ssn            /\b\d{3}-\d{2}-\d{4}\b/
cc             /\b\d{13,19}\b/  + Luhn check before flagging
iban           /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/
ipv4           /\b(?:\d{1,3}\.){3}\d{1,3}\b/
dob_like       /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/
street_addr    /^\d+\s+\w+\s+(St|Ave|Rd|Blvd|Dr|Ln|Way|Ct)\b/i  (en only)
```

**Aggregation rules:**

- Column-name severity = warning or critical → flag the whole selection
- Content regex matches ≥1 value → flag the whole selection, list matched pattern types
- Both layers fire → severity = critical regardless of column severity
- Neither fires → "clean send"

**Policy:** prefer false positives. The nudge is one click to dismiss; a false negative (PII slips through) is a broken promise.

### Bias Detector

Runs on user messages going to the LLM and on LLM clarification questions before they are rendered.

```
gender_generalization
  /(women|men|girls|boys|females?|males?)\s+(are|aren['']?t|always|never|typically|usually|tend to|generally)\s+(?!equal|diverse|varied)/i
  /(female|male)\s+(engineers?|nurses?|doctors?|teachers?|leaders?)\s+(are|tend|usually)/i

ethnic_cultural_generalization
  /(african|asian|latino|hispanic|indigenous|tribal|muslim|christian|jewish|hindu)\s+(people|community|cultures?)\s+(are|tend|always|usually)/i
  /\b(primitive|backward|underdeveloped|third[-\s]?world|uncivilized)\b/i

loaded_framing
  /\bwhy\s+(are|do)\s+\w+\s+(poor|lazy|violent|illiterate|uneducated)/i
  /\bwhat['']?s\s+wrong\s+with\b/i
  /\bnormal\s+(person|family|household)\b/i

statistical_assumption
  /\baverage\s+(woman|man|african|asian|latino|indigenous|poor person|disabled person)\b/i
  /\btypical\s+(woman|man|family from)\b/i
```

All bias matches = soft nudge, never blocking. List curated internally for v1, with social-sector advisor review scheduled before Phase 2 ships.

### Medical-Strict Tier

A fourth severity above `critical`:

```typescript
type Severity = 'clean' | 'warning' | 'critical' | 'medical_critical'
```

**Triggers (any one fires it):**

- Column name matches the `medical` PII category
- Content matches a medical-term pattern (curated list: ICD-10-like codes, RxNorm-ish drug names, common diagnosis keywords)
- Workspace metadata flag `containsHealthData: true` (set per-workspace by an admin; elevates all PII detections in that workspace)

**Modal requirement:** user must type the exact phrase `SEND HEALTH DATA` (localised per locale). Whitespace-strict, case-insensitive. The friction is intentional.

## Consent Modal UX

One reusable Mantine modal, five modes.

### Mode A: Clean send

One-click confirmation. Default focus on Send.

```
┌─────────────────────────────────────────────────┐
│  Send 6 values to AI?                           │
│                                                  │
│  From column: indicator                         │
│  ▸ Show values                                  │
│                                                  │
│           [ Cancel ]     [ Send ]               │
│                            ^^^^                  │
│                            primary, focused      │
└─────────────────────────────────────────────────┘
```

### Mode B: PII warning

Cancel default-focused. Send requires a checked acknowledgement.

```
┌─────────────────────────────────────────────────┐
│  Personal data detected                         │
│                                                  │
│  The values you selected may contain personal   │
│  information. AI providers may log requests.   │
│                                                  │
│  From column: patient_email                     │
│  Detected: [ Email ]                            │
│                                                  │
│  Preview:                                        │
│    jane.doe@example.com   <- email pattern      │
│    j.smith@hospital.org   <- email pattern      │
│                                                  │
│  [ ] I understand this data will be sent to     │
│      the AI provider                            │
│                                                  │
│  [ Cancel ]   [ Edit selection ]   [ Send ]    │
└─────────────────────────────────────────────────┘
```

### Mode C: Bias nudge

Soft, non-blocking. "Continue as-is" always available.

```
┌─────────────────────────────────────────────────┐
│  Consider rephrasing                            │
│                                                  │
│  Your question contains language that may       │
│  lead to biased results.                        │
│                                                  │
│  Detected: [ Gender generalization ]            │
│                                                  │
│  You wrote:                                     │
│    "why are women in rural areas poor"          │
│                                                  │
│  Suggested:                                     │
│    "what factors correlate with low income      │
│     among women in rural areas"                 │
│                                                  │
│  [ Edit myself ]  [ Continue as-is ]  [ Use ]  │
└─────────────────────────────────────────────────┘
```

### Mode D: Composite

Bias + PII fired together. Both decisions required before submit.

### Mode E: Medical-strict

```
┌─────────────────────────────────────────────────┐
│  Health information detected                    │
│                                                  │
│  This data appears to contain health or         │
│  patient information. Sending it to an AI       │
│  provider may have legal and ethical            │
│  implications (HIPAA, GDPR, etc.).              │
│                                                  │
│  Detected: [ Patient identifier ] [ Diagnosis ] │
│                                                  │
│  To confirm, type:                              │
│    ┌─────────────────────────────────────┐     │
│    │  SEND HEALTH DATA                    │     │
│    └─────────────────────────────────────┘     │
│                                                  │
│  [ Cancel ]                  [ Send ]          │
│   ^^^^^^^^                    (disabled until  │
│   focused                      phrase typed)   │
└─────────────────────────────────────────────────┘
```

## `crossBoundary` API

Single chokepoint. Every code path that sends data to the LLM routes through it.

```typescript
// src/lib/privacy/crossBoundary.ts

export type CrossBoundaryContext =
  | 'discovery_clarification'    // Phase 2: user picks from dropdown of query results
  | 'plan_step_input'             // Phase 3+: sample rows feeding a downstream plan step
  | 'user_message_text'           // Phase 1+: free-text user message (bias + PII check)

export type CrossBoundaryRequest = {
  values: unknown[]
  sourceColumn?: string
  sourceQuery?: string
  context: CrossBoundaryContext
  workspaceId: string
  threadId: string
}

export type ApprovedPayload = {
  ackToken: string
  values: unknown[]                 // post-edit
  context: CrossBoundaryContext
  detected: { pii: string[]; bias: string[] }
  acknowledgedAt: number
}

export type CrossBoundaryResult =
  | { approved: true; payload: ApprovedPayload }
  | { approved: false; reason: 'cancelled' | 'edited_to_empty' }

export async function crossBoundary(
  req: CrossBoundaryRequest
): Promise<CrossBoundaryResult>
```

Internally: run detectors → open appropriate modal mode → on approval generate `ackToken`, write audit log, resolve.

## Backend Invariant

**v1: HMAC + session secret.** `sessionSecret` delivered to client at auth time, scoped to session.

```
ackToken = base64url(JSON.stringify({
  nonce: randomUUID(),
  threadId,
  workspaceId,
  issuedAt,
  expiresAt: issuedAt + 5*60*1000,
  payloadHash: sha256(canonical(values))
})) + '.' + hmacSha256(payload, sessionSecret)
```

Backend validates: HMAC valid, not expired, workspaceId matches, payloadHash matches actual data in the tool message, token not previously consumed.

**Row-data classification** in `chat.routes.ts`:

```typescript
function isRowDataMessage(msg: ToolMessage): boolean {
  // Known-safe shapes: schema descriptions, error strings, status flags
  // Anything else with array/object payloads counts as row data
}
```

Row-data messages without a matching ack token → `400 UNAPPROVED_DATA_TRANSFER`.

## Audit Log Schema

Dexie table, extends existing `AvaDexie.ts`:

```typescript
export interface ConsentAuditEntry {
  id: string
  workspaceId: string
  threadId: string
  timestamp: number

  decision: 'approved' | 'edited' | 'cancelled' | 'used_suggestion'
  context: CrossBoundaryContext

  detectedPii: string[]                // e.g., ['email', 'patient']
  detectedBias: string[]               // e.g., ['gender_generalization']

  sourceColumn: string | null
  valueCount: number                   // NEVER store values themselves
  contentLengthChars: number | null

  warningShown: ('pii' | 'bias' | 'medical')[]
  warningDismissed: ('pii' | 'bias' | 'medical')[]
  suggestionUsed: boolean | null

  patternLocale: string
  detectorVersion: string

  medicalTierTriggeredBy: 'column' | 'content' | 'workspace_flag' | null
  typedConfirmationCorrect: boolean | null

  ackTokenNonce: string | null
}
```

**Critical rule: never store the values themselves.** Audit log records consent metadata, not content. Otherwise the audit log becomes a PII honeypot.

**User-facing view:** new page at `/settings/privacy/log` showing last 90 days. Filterable. CSV export. **Own-workspace only**, no admin/org views.

**Telemetry sync:** explicit opt-in workspace setting `shareAnonymousPrivacyMetrics: boolean`, off by default. Syncs only aggregate counters, no values, no message text, no detected-pattern content.

## i18n

```
src/lib/privacy/patterns/
  en/
    piiKeywords.ts
    biasPatterns.ts
    biasSuggestions.ts
  es/
    biasPatterns.ts
    biasSuggestions.ts
  fr/
    biasPatterns.ts
    biasSuggestions.ts
  piiRegexes.ts              # mostly format-based, language-neutral
  index.ts                   # loads based on locale, falls back to en
```

**v1 ships:** English locked. Spanish + French stubbed with empty pattern files but full UX copy translated (Mantine i18n). v1.1 fills in non-English bias patterns after advisor review.

## File Layout

```
src/
  components/
    Privacy/
      ConsentModal/
        ConsentModal.tsx               # all 5 modes
        ConsentModalProvider.tsx       # root mount
        SuggestionRenderer.tsx
        index.ts
      PrivacyLogPage/
        PrivacyLogPage.tsx
  lib/
    privacy/
      crossBoundary.ts
      piiDetector.ts
      biasDetector.ts
      ackToken.ts                      # client-side HMAC signing
      patterns/
        ...
      index.ts
  db/
    dexie/
      tables/
        consentAuditTable.ts

supabase/
  functions/
    chat/
      chat.routes.ts                   # ack token validation
    _shared/
      privacy/
        verifyAckToken.ts
        isRowDataMessage.ts
```

## Definition of Done

- [ ] `piiDetector` + `biasDetector` unit-tested against ≥100 fixtures, English locked
- [ ] All five modal modes render correctly, keyboard + screen-reader pass
- [ ] `crossBoundary` is the only path data crosses to the LLM, enforced by custom ESLint rule
- [ ] Backend rejects unsigned row-data with `UNAPPROVED_DATA_TRANSFER`; tested for valid, expired, replayed, tampered tokens
- [ ] Privacy log page lists last 90 days, filter + CSV export
- [ ] First real caller wired (user-message text path)
- [ ] Workspace setting `containsHealthData` exposed in settings UI
- [ ] Opt-in analytics sync defaults off; payload manually reviewed for PII leakage
- [ ] Spanish + French i18n stubs render correctly with English fallback

---

# Phase 1 — Basic Clarifications

**Status:** Design locked, open questions noted at end.

## Why now

Highest accuracy lift per token. Reduces wrong-SQL frustration immediately. Builds on Phase 0's `crossBoundary` (free-text user answers route through it).

## Tool spec

```typescript
export const clarifyToolSchema = {
  name: 'clarify',
  description:
    'Ask the user a clarifying question when the answer materially changes ' +
    'the SQL. Prefer fixed_options when ≤8 reasonable choices exist.',
  parameters: {
    type: 'object',
    required: ['question', 'responseShape'],
    properties: {
      question: { type: 'string', maxLength: 200 },
      rationale: { type: 'string', maxLength: 200 },
      responseShape: {
        oneOf: [
          { type: 'object', required: ['kind'], properties: {
              kind: { const: 'free_text' },
              placeholder: { type: 'string', maxLength: 80 },
          }},
          { type: 'object', required: ['kind', 'options', 'multi'], properties: {
              kind: { const: 'fixed_options' },
              options: { type: 'array', items: { type: 'string', maxLength: 80 }, minItems: 2, maxItems: 12 },
              multi: { type: 'boolean' },
          }},
        ],
      },
    },
  },
}
```

Tool result back to LLM:

```typescript
type ClarifyToolResult = {
  answer: string | string[] | null  // null = user let AI decide
  skipped: boolean
  turnNumber: number                 // 1, 2, or 3
}
```

## System prompt additions

Appended to existing `dataExplorerSystemPrefix` in `buildSQLSystemPrompt.ts`:

```
CLARIFYING QUESTIONS

When to call `clarify`:
- Subjective terms without a metric: "good", "best", "poor", "important"
- Multi-meaning columns (e.g., "client" could mean customer or beneficiary)
- Subjective categorizations: "poverty indicators", "at-risk groups"
- Ambiguous scopes: "this year" when data spans multiple years

When NOT to call `clarify`:
- The metadata already disambiguates the question
- The ambiguity is minor and a reasonable default exists — make the choice,
  explain it briefly in your reply, and proceed with SQL
- The question is straightforward ("monthly revenue by region")

How to clarify:
- Ask ONE question at a time. Keep it under 25 words.
- Prefer `fixed_options` (≤8 choices) when you can enumerate from metadata.
- Use `free_text` for open-ended or numeric answers.
- State neutrally. Do not assume the answer.
- NEVER use gendered, ethnic, religious, or culturally loaded framing.
- Include a brief `rationale` so the user understands why you're asking.

You may ask at most 3 clarifications before answering. After the 3rd,
make a reasonable assumption and proceed.
```

## Frontend dispatch

`useAvandarChatRuntime.ts` becomes a tool dispatcher:

```typescript
function handleToolCall(call: ToolCall, ctx: RuntimeContext) {
  switch (call.name) {
    case 'generateSql': return handleGenerateSql(call, ctx)
    case 'clarify':     return handleClarify(call, ctx)
    default:            return handleUnknownTool(call, ctx)
  }
}
```

Clarification handler:

1. zod-validate args
2. Run bias detector on `question`, `rationale`, and each option (Phase 0 detector)
3. If bias detected → silently re-prompt LLM with system note "rephrase neutrally"; cap 2 retries
4. If cap reached (3 clarifications) → inject system note forcing `generateSql`
5. Otherwise → open inline clarification UI in chat thread
6. On user answer: if `free_text`, route through `crossBoundary` (PII + bias on user input); on approval, append tool message, call backend again

## UI components

Inline in the chat thread (not modal), via `@assistant-ui/react`'s tool-UI override mechanism. Three variants:

- **Free-text**: text input + "Let AI decide" / "Send answer" buttons
- **Fixed-options single**: radio group + "Let AI decide" / "Confirm"
- **Fixed-options multi**: checkbox group + "Select all" / "Let AI decide" / "Confirm"

**"Let AI decide"** wording (not "Skip") — frames the action as instructing the AI, not dismissing it. The submitted result is `{answer: null, skipped: true}` and the LLM proceeds with defaults.

**Behaviour:**
- Auto-focus input/first option on render
- Enter submits
- Escape triggers "Let AI decide"
- ARIA fieldset/legend for option groups
- Replaces the composer for the duration; sending a new top-level message cancels the clarification with `outcome: 'cancelled'`

## Caps

| Limit | Cap | Behavior |
|---|---|---|
| Clarifications per analytic question | 3 | Inject system note forcing `generateSql` |
| Bias re-prompts per clarification | 2 | Surface neutral-failure card to user |
| Schema validation failure | 1 | Re-prompt with schema error |

## Telemetry

```typescript
export interface ClarificationAuditEntry {
  id: string
  workspaceId: string
  threadId: string
  timestamp: number
  turnNumber: 1 | 2 | 3
  responseShape: 'free_text' | 'fixed_options_single' | 'fixed_options_multi'
  questionLengthChars: number          // never the content
  rationaleProvided: boolean
  optionsCount: number | null
  outcome: 'answered' | 'let_ai_decide' | 'cancelled' | 'cap_reached' | 'neutral_failure'
  biasReprompts: number
  timeToAnswerMs: number | null
  ledToSuccessfulSql: boolean | null    // back-filled when downstream SQL succeeds
  patternLocale: string
}
```

Surface in `/settings/privacy/log` under a "Clarifications" tab.

## Definition of Done

- [ ] `clarify` tool registered in chat route; zod-validated args
- [ ] System prompt updated; clarification block reviewed
- [ ] Both response shapes render with keyboard + ARIA pass
- [ ] Bias detector runs on LLM clarification output; re-prompt loop capped at 2
- [ ] Free-text answers route through `crossBoundary`
- [ ] 3-clarification cap enforced
- [ ] Clarification audit table populated
- [ ] i18n: English locked, Spanish + French stubs render
- [ ] Eval set: 20 ambiguous questions, ≥80% resolve in ≤2 clarification turns

## Open questions

1. **"Let AI decide" wording** — confirm or push back
2. **Rationale display default** — shown by default vs on click
3. **4th-call behaviour** — invisible system note vs user-visible "best effort"
4. **Pre-fill on retry** — recommend no
5. **"Select all" on multi-option** — keep for usability
6. **Eval set ownership** — internal for v1?
7. **Model strategy confirmation** — Haiku 4.5 for clarifications

---

# Phase 2 — Discovery Clarifications

**Status:** Architecture level.

## Goal

The LLM cannot see data. When it needs to know what values exist in a column to ask a meaningful clarification (e.g., "which of these indicators are poverty-related?"), it emits a query whose result populates a dropdown in the follow-up question, *not* the canvas.

## Tool surface

Extends Phase 1's `clarify` tool with a third response shape:

```typescript
responseShape: { kind: 'discovery', query: string, column: string, multi: boolean }
```

The frontend recognises this shape and routes differently:

1. Run `query` via DuckDB-WASM (existing path)
2. Result is **not** rendered on the canvas — it populates a dropdown
3. User picks
4. Selection routes through `crossBoundary` with context `discovery_clarification`
5. PII detector fires on column name + content; modal escalates if PII detected
6. On approval, ack-token-signed payload sent to LLM as tool result

## Architecture additions

- Frontend dispatcher branches `clarify` tool: if `responseShape.kind === 'discovery'`, treat the query as a discovery query (run + populate dropdown), not a canvas query.
- New component: `DiscoveryDropdown` extends `ClarificationFixedOptions` from Phase 1 with a loading state and an "Edit selection" hook into the consent modal.
- Backend invariant from Phase 0 enforces that discovery-sourced values can only reach the LLM with a valid ack token.

## Effort

~1 week. Almost all infrastructure exists by end of Phase 1; this is wiring + UI polish.

## Definition of Done

- [ ] `discovery` response shape supported in tool schema
- [ ] DuckDB-WASM dispatch routes discovery queries to dropdown, not canvas
- [ ] PII detector fires on discovery results; medical-strict mode triggers correctly
- [ ] `discovery_clarification` context tagged in audit log
- [ ] Eval: "show me top poverty indicators" reliably resolves via DISTINCT-driven discovery

---

# Phase 3 — Plans + DAG View

**Status:** Shipped.

## Goal

Replace the implicit "one query → one canvas viz" assumption with an explicit DAG of analytic steps, rendered as an xyflow flow view with Excalidraw-style hand-drawn arrows (RoughJS). Each node is a step; each edge is a data dependency. The Data Explorer canvas becomes a true zoomable canvas with overview + per-step focus modes.

## Tool surface

New tool `proposePlan`:

```typescript
{
  steps: [
    {
      id: string,
      description: string,
      type: 'sql' | 'python' | 'r' | 'clarification',
      code: string,
      inputs: string[],                  // node ids this depends on
      predictedSchema: { name, type }[],
      defaultViz: 'table' | 'bar' | 'line' | ...
    },
    ...
  ],
  rootMessage: string
}
```

System prompt: *"Use `proposePlan` when the analysis is clearer broken into steps, especially when an intermediate result feeds the next."*

## Architecture

- **DAG state**: `PlanStateManager` holds `PlanNode[]` with `{ id, type, code, predictedSchema, actualSchema, viewName, status, error, rowCount, regenAttempts }` plus `planId` (uuid) so every plan has a stable identity for materialisation.
- **Intermediate persistence — IndexedDB, NOT OPFS**: each executed step writes to a DuckDB temp view `step_<id>` so downstream SQL can reference it. We ALSO export the result to parquet and store it in a dedicated Dexie database (`AvandarPlanStepDB`) keyed by `(planId, stepId)`. This:
   1. Survives a page reload — DuckDB-WASM views are in-memory only.
   2. Enables save-to-virtual-dataset.
   - **Storage hygiene**: blobs are cleared explicitly via `clearPlanStepBlobs(planId)` when a plan is closed, replaced by another plan, or wiped via the IndexedDB nuke option. Never accumulated by TTL — explicit cleanup avoids storage bloat.
- **Canvas mode** using `@xyflow/react`:
   - **Overview**: zoomed-out DAG, pannable + zoomable, MiniMap, layered left-to-right layout.
   - **Focused**: animated `fitView` / `setCenter` zooms into a single step; the Data Explorer's existing visualization container renders that step's result.
   - **RoughJS edges**: custom `RoughEdge` component re-traces xyflow's Bézier path through `rough.svg().path(...)` so the arrows look hand-drawn instead of CAD-precise. Per-edge seed derived from the edge id keeps the wobble stable across renders.
   - **Custom node**: `PlanStepNode` renders index, status icon, status badge, description, schema hint, and inline error. Handles for source/target on left/right.
- **Execution model**: auto-run sequentially by default (`runMode: 'auto'`); `runMode: 'step'` exposes a SegmentedControl in the toolbar that pauses between steps. The executor lives in `planExecutor.ts` and writes both the temp view and the parquet blob on every success.
- **Save-to-virtual-dataset**: when the user saves the final query as a virtual dataset, the plan structure (`{ steps, rootMessage }`) is serialised into a new `plan_steps` JSONB column on `datasets__virtual`. Opening a virtual dataset that has `planSteps` rehydrates the canvas via `rehydratePlan()`: each step's parquet blob (if cached locally) is re-registered as a DuckDB view; missing blobs are recomputed by re-running the step's SQL.
- **Cap**: ≤8 steps per plan, enforced server-side in the `proposePlan` tool schema.

## Effort

~3 weeks — the visual canvas + hand-drawn edges + IndexedDB materialisation + plan persistence on virtual datasets landed in this checkpoint.

## Definition of Done

- [x] `proposePlan` tool registered, schema validated
- [x] xyflow DAG view ships as a canvas mode with RoughJS hand-drawn edges
- [x] Animated zoom-out (overview) ↔ zoom-in (focused) transitions
- [x] DuckDB temp view lifecycle (create per step, cleanup on close) tested
- [x] IndexedDB parquet materialisation per step + explicit cleanup
- [x] Auto-run vs step-through toggle works
- [x] Step-level retry banner (click a failed node to re-run)
- [x] Virtual dataset save persists the full plan as JSONB
- [x] Reopening a virtual dataset rehydrates the plan + every cached intermediate

---

# Phase 4 — Schema-Drift Regen

**Status:** Shipped.

## Goal

When a plan step's actual output schema differs from the LLM's prediction (a GROUP BY produces unexpected columns, etc.), regenerate only the affected downstream steps automatically.

## Architecture

- After each step executes, `isSchemaDrift(predicted, actual)` does a strict comparison (same column count, names in the same order, types case-insensitive). Order matters: downstream SQL that does positional projection breaks if column order shifts.
- On mismatch, `findAffectedDownstream({ plan, driftedStepId })` walks the DAG and collects every transitive dependent. The full plan plus the drifted step's actual schema are sent to a new endpoint:
   ```
   POST /chat/:workspaceId/regenerate-plan
   ```
   The endpoint hits the LLM with a regen-only system prompt that has access to one tool, `regenerateSteps`, with a forced `tool_choice`. The model returns `{ steps: Array<{ stepId, code, predictedSchema }>, explanation }`.
- Frontend dispatches `replaceStepCode({ stepId, code })` on the `PlanStateManager` for each rewrite, which:
   1. Resets the step's status to `pending`.
   2. Increments `regenAttempts` so the cap is honoured.
- Affected steps are re-run in plan order via the same `executePlanStep` path so each step's view is registered before the next references it.
- **Cap: ≤2 regen attempts per step.** A counter inside `executePlan` (`regenCountByStep`) holds the count per run. On the 3rd drift the runtime logs a warning and leaves the step alone for manual intervention (the failed-step banner is the existing escape hatch).

## Effort

~1 week — shipped as part of the same checkpoint as the Phase 3 canvas.

## Definition of Done

- [x] Drift detection (`isSchemaDrift`) — 7 unit tests
- [x] Downstream-dependent walker (`findAffectedDownstream`) — 4 unit tests
- [x] `/chat/:workspaceId/regenerate-plan` endpoint with `regenerateSteps` tool
- [x] `replaceStepCode` state action + `regenAttempts` cap
- [x] End-to-end loop: `executePlan` drift-check → backend regen → step re-run

---

# Phase 5 — Branching

**Status:** Partial. Branch state + sidebar + "Branch from here" CTA shipped. Separate chat thread per branch + virtual-dataset persistence still pending.

## Goal

User can branch from any executed plan node into a new chat thread, anchored at that node's output schema. Branches coexist visually in the DAG; conversations stay separate.

## Architecture

- New action on any node: "Branch from this step." **Shipped** — exposed in the focused-step detail panel (only when the step has succeeded), wired to `PlanBranchStateManager.openBranch`.
- Creates a new assistant-ui thread. Initial system context = parent node's `actualSchema` + one-line summary of upstream steps. **Not yet** — the branch is created in state but the chat thread is still shared; clicking a branch in the sidebar switches the canvas focus but the chat composer still feeds the root plan. Needs assistant-ui multi-thread orchestration to finish.
- Local state: `branch.parentNodeId`, `branch.rootSchema`. **Shipped** — `PlanBranchStateManager` (`src/components/ChatPanel/PlanStateManager/PlanBranchStateManager.tsx`) holds `Record<branchPlanId, BranchRecord>` + `activeBranchId`. Each `BranchRecord` carries `parentPlanId`, `parentStepId`, `anchorSchema`, `anchorViewName`, `title`, `plan`, `statuses`, `createdAt`. `PlanState.parentBranch` carries the anchor when a plan IS a branch.
- Sidebar lists branches as named threads (auto-named from the first user message in each). **Shipped** — `PlanBranchSidebar` shows Root + every branch; X to close.
- Persistence: extend Dexie schema with branch records. **Not yet** — branches live in memory only. When the root plan is saved as a virtual dataset, branches are dropped from the JSONB blob. Follow-up work.

## Effort

~1.5 weeks. Mostly state model + thread switcher UI; no new LLM surface. State + UI shipped in Checkpoint 15 (~3 days); per-branch chat thread orchestration is the remaining ~1 week.

## Definition of Done

- [x] `PlanBranchStateManager` with open/update/setActive/close/clearAll actions
- [x] "Branch from here" CTA on succeeded steps
- [x] Branch sidebar showing Root + branches, click to switch, X to close
- [x] 4 unit tests on the state manager
- [ ] Separate assistant-ui chat thread per branch
- [ ] Branches persisted into the virtual-dataset JSONB column

---

# Phase 6 — Python + R Sandboxed Executor

**Status:** Architecture level. Security-critical.

**Status:** Partial. Sandbox iframe + CSP + Pyodide + parquet bridge shipped. R (WebR), external security review, and stdout/stderr UI deferred. **NOT YET externally security-reviewed — gate user exposure on that review.**

## Goal

Add Python (Pyodide) and R (WebR) as execution engines for plan steps. Everything runs in the browser. Data never leaves.

## What landed in Checkpoint 15

| Item | Status | Notes |
|---|---|---|
| Sandboxed iframe (`public/sandbox-executor.html`) with `sandbox="allow-scripts"` (null opaque origin) | ✅ | |
| Strict CSP (`default-src 'none'`, `connect-src https://cdn.jsdelivr.net`, `worker-src 'self' blob:`) | ✅ | jsdelivr is the only network the runtime can reach — needed for Pyodide bootstrap |
| Pre-boot stubs: `fetch` allowlist, `XMLHttpRequest`/`WebSocket`/`EventSource`/`RTCPeerConnection` throw, `sendBeacon` neutered | ✅ | |
| Pyodide lazy load (~10 MB) with `pyarrow`/`pyarrow.parquet`/`pandas` preimports | ✅ | `src/sandbox/sandboxExecutor.ts` |
| Parent-side client (`src/sandbox/sandboxClient.ts`) — mount iframe, await ready+boot, single-threaded queue | ✅ | |
| `postMessage` protocol with `sandboxKey` discriminator on every request | ✅ | `src/sandbox/sandboxProtocol.ts` — single source of truth between sides |
| Parquet round-trip (DuckDB → parent → sandbox → parquet bytes → `loadParquet` → DuckDB view) | ✅ | Uses parquet, not Arrow IPC, to reuse DuckDB-WASM's existing roundtrip |
| 30-second default timeout per run, caller-overridable | ✅ | |
| Web Worker inside the iframe with `terminate()` for runaway loops | ❌ | Currently the iframe runs Pyodide directly. Adding a worker is a follow-up. |
| WebR (R runtime) | ❌ | `availableRuntimes: ["python"]`; R steps return `[sandbox] runtime 'r' not enabled in this build` |
| stdout/stderr UI panel | ❌ | Streams to parent `console.log` / `console.warn` only |
| External security review | ❌ | **REQUIRED before user-facing exposure** |

## Sandbox architecture

**Same origin, sandboxed iframe + worker.**

```
┌──── App (avandar.com) ────────────────────────────────────┐
│                                                            │
│  ChatPanel ──────────► postMessage (Arrow ArrayBuffer) ──► │
│                                                          │ │
│  ┌── Sandboxed iframe (sandbox="allow-scripts") ────────┐ │
│  │  CSP: default-src 'none';                             │ │
│  │       script-src 'self' 'wasm-unsafe-eval';           │ │
│  │       connect-src 'none';                             │ │
│  │       worker-src 'self';                              │ │
│  │       frame-ancestors https://app.avandar.com         │ │
│  │                                                       │ │
│  │  ┌── Web Worker (Pyodide) ──┐ ┌── Web Worker (WebR) ─┐│ │
│  │  │  pandas / numpy / scipy   │ │  tidyverse / arrow   ││ │
│  │  └───────────────────────────┘ └──────────────────────┘│ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

The `sandbox="allow-scripts"` (no `allow-same-origin`) forces a null opaque origin at runtime. The iframe cannot access app IndexedDB, OPFS, cookies, or DOM.

## Defence in depth

1. **Null-origin iframe** (above)
2. **Strict CSP** (`connect-src 'none'` blocks fetch, XHR, WebSocket, EventSource, sendBeacon)
3. **Web Worker** inside the iframe for the actual runtime — enables `terminate()` for timeouts/runaway loops
4. **JS pre-boot stubs** — null out `fetch`, `XMLHttpRequest`, `WebSocket`, `RTCPeerConnection`, `EventSource`, `sendBeacon`, `importScripts` before `loadPyodide()`/webR init
5. **`postMessage` bridge** with strict `event.origin` checks; only Arrow `ArrayBuffer`s cross
6. **Worker resource bounds** — default 30s timeout, configurable; memory monitored

Residual risk model (after sandbox stack):

- **WASM escape into JS** — realistic; the iframe + CSP is what saves us, not WASM memory safety. Pin Pyodide/WebR versions; watch security advisories.
- **IndexedDB / localStorage / cookies** — partitioned per origin; null-origin iframe has nothing to access
- **Side-channels (Spectre)** — Chrome site isolation gives partial protection (same-origin iframe shares process; cross-origin would isolate further; not v1 priority)
- **CSP bypasses** — `default-src 'none'` + `connect-src 'none'` blocks standard exfil tricks

## Data transport

DuckDB-WASM → main thread → executor iframe → Pyodide/WebR via Arrow IPC bytes (`ArrayBuffer` transferable). Reconstruct with `pyarrow.ipc.open_stream(buf).read_all()` (Python) or `arrow::read_ipc_stream()` (R). Zero-copy where possible. On the way back: pandas/data.frame → Arrow IPC → DuckDB temp view registered.

## Tool surface

```typescript
generatePython({ code, inputViews, outputViewName })
generateR({ code, inputViews, outputViewName })
```

Both are plan-step types (Phase 3). System prompt: *"Use SQL by default. Python for pandas-friendly transforms (fuzzy matching, custom dedup, regression). R for statistics-heavy work and tidyverse idioms."*

## Lazy loading

Pyodide bundle (~10–11 MB Brotli with pandas+numpy) and WebR (~10 MB Brotli) load only on first invocation. Show progress UI for the 5–10s cold start. Subsequent calls cached.

## Effort

~5 weeks. Security stack is the hard part; **needs independent security review before shipping**. Pyodide and WebR ship together to amortise the sandbox infrastructure.

## Definition of Done

- [x] Iframe + CSP deployed (hostile-payload red-team pending review)
- [~] Pyodide loads lazily; WebR not yet wired
- [x] Parquet round-trip (DuckDB → Python → DuckDB) — parquet substituted for Arrow IPC to reuse DuckDB-WASM's existing path; types preserved
- [ ] Worker timeout terminates a runaway loop within 1s of cap — currently 30s iframe-level timeout, no in-worker termination yet
- [x] `python` registered as a plan step type the executor dispatches to the sandbox; `r` registered in the type system but rejected at runtime
- [ ] External security review signed off

---

# Phase 7 — Context Compression

**Status:** Architecture level.

## Goal

As plans grow and branches accumulate, chat history grows. Compress aggressively without measurable accuracy regression.

## Architecture

- **Summariser pass** on chat history: at >N turns or >K tokens, replace older nodes' full code with `"step s7: produced columns [foo:int, bar:string], filtered by X"`.
- Plan-node summaries cached per node id, recomputed only on mutation.
- **Routing-decision cache** keyed on `(workspace_id, schema_hash, normalized_question_hash)`. Skip the LLM entirely on repeat questions within a session.
- **Prompt caching** at the OpenRouter/provider layer — schemas and system prompt are stable across a session and benefit hugely.

## Telemetry

Log per-turn input/output tokens to `chat_token_usage`; dashboard for cost-per-user-per-month tracking against the $4 ARPU envelope.

## Effort

~1 week.

## Definition of Done

- [ ] 30-turn session uses <50% of input tokens vs no compression, on a fixed eval set
- [ ] No measurable accuracy regression on the eval set
- [ ] Token dashboard live, per-workspace and per-user breakdown

---

# Cross-Cutting Workstreams

Run alongside all phases:

- **Eval harness**: fixed set of analytic questions per phase, scored on correctness + clarification count + token spend. Target ≥85% correct without clarification on a 50-question benchmark.
- **System prompt versioning**: prompts in version-controlled files with explicit prompt-version label sent back to client for debugging.
- **Documentation update**: privacy page on avandarlabs.com gains a section on sandboxing, PII consent, and bias detection — coordinate with marketing.
- **Performance budgets**: cold-start of Pyodide/WebR; xyflow render with N=50 nodes; consent modal time-to-interactive.

# Token Economics Summary

At 100 chat turns/user/month, including plans and code:

| Component | Cost/user/month |
|---|---|
| Simple SQL (Haiku) | $0.014 |
| Clarifications (Haiku) | $0.005 |
| Plan/code (Sonnet escalate) | $0.048 |
| Regen (Sonnet) | $0.015 |
| **Total uncached** | **~$0.08** |
| With 30% prompt-cache hit rate | **~$0.06** |

2% of $4 ARPU. Plenty of headroom.

# Phase 9 — Canvas Annotation + Export

**Status:** Partial. Annotations + PNG export + multi-page PDF export shipped. Virtual-dataset persistence of annotations, drag-to-move handles, and sticky resize deferred.

## Why now

Phase 3 makes the Data Explorer feel like a real canvas — a pannable, zoomable space with hand-drawn arrows between nodes. Beta users have asked for two things on top of that: a way to scribble notes on the canvas (arrows, callouts, free-text labels) so they can communicate findings, and a way to share the final canvas as a PDF or image so non-Avandar collaborators can read it without an account. Phase 9 lands both.

We're skipping the phase numbers between Phase 7 and Phase 9 deliberately to reserve Phase 8 for an as-yet-undecided workstream.

## Goal

1. Let the user add free-form annotations on top of the plan canvas — text labels, sticky notes, drawn arrows pointing between steps, freehand strokes — without touching the underlying plan data.
2. Export the full canvas (plan DAG + annotations + viz thumbnails) as either a multi-page PDF (one page per focused step + one overview page) or a single PNG/SVG image.

## Architecture

### Annotations — what shipped in Checkpoint 15

- **State**: `PlanAnnotationStateManager` (`src/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager.tsx`) — discriminated union of annotation kinds keyed by id, plus active tool + selected id + undo/redo stacks.
- **Annotation kinds**: all four shipped.
  - `text`: `{ x, y, fontSize, rotation?, text, color }`
  - `sticky`: `{ x, y, width, height, text, color }`
  - `arrow`: `{ fromX, fromY, toX, toY, color }` — drawn via RoughJS so it matches the auto-laid-out plan edges.
  - `stroke`: `{ points: Array<[x, y, pressure?]>, strokeWidth, color }` — rendered via `perfect-freehand`.
- **Rendering**: `PlanAnnotationOverlay` (`src/components/ChatPanel/PlanFlowView/PlanAnnotationOverlay.tsx`) is an absolutely-positioned overlay sitting on top of the xyflow viewport. It applies the same `translate` + `scale` transform as the DAG, so annotations pan/zoom together. Pointer events are gated by the active tool — `pan` → overlay is `pointer-events: none` (xyflow takes the drag); any drawing tool → overlay captures.
- **Toolbar**: `PlanCanvasToolbar` (`src/components/ChatPanel/PlanFlowView/PlanCanvasToolbar.tsx`) — Pan / Text / Sticky / Arrow / Pen / Erase tools, colour swatch row, Undo / Redo buttons, Export menu.
- **Undo / redo**: snapshot-stack on `PlanAnnotationStateManager`, capped at 50 entries. Ctrl-Z / Ctrl-Shift-Z bound in the overlay's `keydown` listener; Delete / Backspace removes the selected annotation.
- **Persistence**: dedicated Dexie database `AvandarPlanAnnotationDB` (`src/components/ChatPanel/PlanFlowView/planAnnotationStorage.ts`) keyed by `(planId, annotationId)`. Loaded on plan mount, written on every state change. Cleared on plan close.
- **Hand-drawn aesthetic stays**: arrow annotations re-use `RoughJS` so user-drawn arrows visually match the auto-laid-out plan arrows.
- **Not yet**: virtual-dataset persistence (annotations stay in IndexedDB only — saving a virtual dataset doesn't snapshot annotations); per-annotation drag-to-move handles (the overlay supports create + delete, not move); sticky-note resize handles.

### Export — what shipped in Checkpoint 15

- **PDF**: dynamic-imported `@react-pdf/renderer` (so the ~1.5 MB dependency doesn't bloat the main bundle until the user first exports). Page 1 captures the canvas via `html-to-image` and embeds it as the overview image; subsequent pages render one per plan step with `{ description, status badge, type, row count, code, schema, error? }`.
- **Image**: `html-to-image`'s `toPng` against the canvas container. Toolbar / MiniMap / Controls are filtered out via the `filter` callback so they don't bleed into the export. Default `pixelRatio: 2`; caller can override.
- **Filename**: `avandar-plan-{YYYY-MM-DD}.pdf` / `.png`.
- **Not yet**: SVG export; 1× / 4× resolution pickers; background picker (currently always white); inclusion picker (currently always DAG + annotations).

## Tool surface

No LLM tool is added in Phase 9 — annotations and exports are client-side only. The LLM does not learn about annotation content; it stays inside the data-locality promise. (The Phase 0 lint rule that pins data flow to `crossBoundary` already enforces this — annotation content never reaches `crossBoundary`'s `text` or `values` parameters.)

## Effort

~1.5 weeks per the spec; landed in Checkpoint 15 alongside Phase 5 + Phase 6.

## Definition of Done

- [x] Annotation toolbar exposed on the plan canvas (Pan / Text / Arrow / Sticky / Pen + Erase)
- [x] Annotations persist across reloads (IndexedDB)
- [ ] Annotations persist across virtual dataset saves (JSONB column)
- [x] Undo/redo per (planId, annotation) edit, capped at 50 entries
- [x] PDF export: multi-page layout with overview + per-step pages
- [x] Image export: PNG (SVG + multiple resolutions deferred)
- [x] Annotations excluded from the LLM payload — by construction, the overlay never feeds `crossBoundary`

# Decision Log

Decisions locked with the product owner during design:

| # | Decision |
|---|---|
| 1 | Bias keywords curated internally for v1; advisor review before Phase 2 |
| 2 | Audit log: own-workspace only, user-visible, no admin/org views |
| 3 | Ack tokens: HMAC + session secret (v1); server-issued nonces deferred |
| 4 | No "don't ask again" toggle, ever |
| 5 | PII scanning also runs on free-text user messages |
| 6 | i18n included from v1 (English locked, Spanish/French stubbed) |
| 7 | Pattern lists bundled with app; live-fetch deferred to v2 |
| 8 | Bias suggestions hand-written per category; no LLM involvement |
| 9 | Dismissal-rate tracking instrumented in audit table |
| 10 | Medical-data tier with typed confirmation |
| 11 | Executor: same-origin sandboxed iframe (not separate deployment) |
| 12 | Use `@xyflow/react` for DAG view |
| 13 | R ships with Python in Phase 6 (not deferred) |
| 14 | Model strategy: Haiku 4.5 default + Sonnet 4.6 escalate-on-tool-call |
| 15 | "Let AI decide" wording (not "Skip") for clarification dismissal |

# Open Questions for Reviewer

**Across the whole plan:**

- Phasing — is this the right order, or should anything move earlier/later?
- Effort estimates — does the 16.5 eng-week total feel realistic for our team's velocity?
- Should Phase 6 (Python+R) move earlier to de-risk the sandbox work?

**Phase 1 (the only locked-design phase with remaining questions):**

- Confirm "Let AI decide" wording
- Confirm rationale displayed by default
- Confirm 4th-clarification behaviour (invisible system note vs user-visible)
- Confirm eval set ownership (internal v1)
- Confirm model strategy: Haiku 4.5 for clarifications

**Security:**

- Phase 6 sandbox — do we want cross-origin (subdomain) deployment from day one for Chrome process isolation, or accept same-origin null-iframe as v1?
- External security review provider — who? Budget?

**Privacy / legal:**

- Privacy page copy on avandarlabs.com — who owns drafting?
- Audit log retention — indefinite local is the current proposal; need legal sign-off?

**Pricing:**

- $4/user/month ARPU envelope — confirm this is the target for the next 12 months. If we move upmarket the model strategy can shift accordingly.
