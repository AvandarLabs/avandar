# Chat Panel — Interactive Analytic Workflows Design

**Date:** 2026-05-19
**Status:** Privacy and clarification phases shipped on `feat/ict4d-demo`,
with the remaining gaps noted below.
**Author:** Pablo (with Claude)

## Implementation status (canonical: `docs/ict4d-demo/FEATURE_CHECKLIST.md`)

The checklist file is the granular source of truth. Quick snapshot:

| Phase | Status | Outstanding gaps |
|---|---|---|
| 0 — PII + Bias Foundation | ~95% | `containsHealthData` workspace UI; opt-in `shareAnonymousPrivacyMetrics` setting; server-issued ack-token nonce registry (in-memory today) |
| 1 — Basic Clarifications | ~95% | Silent bias re-prompt loop (currently warns only); 20-question ambiguous-question eval set |
| 2 — Discovery Clarifications | ~90% | Ack-token signing for `values` scope (text scope is signed end-to-end; `values` is accept-on-presence); "Edit selection" hook on the consent modal |

Cross-cutting gaps that aren't tied to a single phase:
- 50-question eval harness with correctness + clarification-count + token-spend scoring
- System prompt versioning with prompt-version label round-tripped to client
- Public privacy page copy on avandarlabs.com (sandboxing + PII + bias detection)
- Spanish + French bias patterns themselves (currently empty stubs; UX copy translated; pending social-sector advisor review)

## Summary

We are extending the existing Data Explorer chat panel from a single-purpose
"natural language → DuckDB SQL" generator into a privacy-conscious,
interactive question-and-answer surface. The chat will:

- Ask **clarifying questions** before generating code when the user's intent is ambiguous, including "discovery" clarifications that run a small query locally to populate dropdown choices
- Detect and gate **PII** and **biased phrasing** at every point where data or user text crosses from the browser to the LLM

Everything runs locally in the browser. The promise we make to users — *the LLM only ever sees metadata and what you explicitly approve* — is preserved across all new features.

## Goals

- Keep the data-locality promise intact. Row-level data never reaches the LLM unless the user explicitly consents through a single chokepoint API (`crossBoundary`).
- Help non-technical social-sector users formulate good questions through guided clarifications, without making the UX feel interrogative.
- Surface and soft-block biased phrasing (gender, cultural, loaded framing) before it reaches the LLM, while never blocking the user from continuing.
- Stay well under the $4-per-user-per-month ARPU envelope on LLM cost — target ≤$0.30 per user per month at typical usage.

## Non-Goals

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
Browser
  ChatPanel (assistant-ui)
  Data Explorer canvas and DuckDB-WASM
  privacy/crossBoundary (PII, bias, and acknowledgement tokens)
  Dexie consent and clarification logs
       |
       | HTTPS: metadata and explicitly approved payloads only
       v
Supabase chat edge function
  validates acknowledgement tokens
  exposes generateSql and clarify tools
  proxies approved requests to OpenRouter
```

Key design moves:

1. **Single chokepoint for data crossing the LLM boundary.** All paths route
   through `crossBoundary()`. A lint rule enforces this, and the backend rejects
   unsigned data payloads.
2. **Tool calls drive routing.** The chat backend exposes `generateSql` and
   `clarify`. The model selects the appropriate response based on ambiguity.
3. **Data stays local by default.** DuckDB-WASM executes queries in the browser.
   Only metadata, typed chat text, and explicitly approved values can reach the
   model.

## Model Strategy

The selected chat model handles SQL generation, clarification, and simple
follow-ups through the same API contract. Model selection remains a user-facing
chat setting rather than a feature-specific escalation path.

## Phase Index

| Phase | Title | Effort | Status |
|---|---|---|---|
| 0 | PII + Bias Consent Foundation | ~4 weeks | Shipped (hardening done) |
| 1 | Basic Clarifications | ~1 week | Shipped |
| 2 | Discovery Clarifications | ~1 week | Shipped |

**Total: ~6 engineer-weeks.**

Phases ship in order because Phase 0 is the privacy foundation for both
clarification phases.

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
  | 'generated_sql_assumptions'  // User approves model-assumed SQL literals
  | 'user_message_text'           // Phase 1+: free-text user message (bias + PII check)
  | 'clarification_answer'        // User answers a clarification

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
