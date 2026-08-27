# Analytics Chat Samples Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retain a redacted, privacy-reviewed corpus of free-plan chat turns in
a new `chat_samples` table, behind an off-by-default capture switch, and record
on every chat turn whether it was sampled.

**Architecture:** PII detection moves to `shared/` so the edge runtime can use
it, and gains the matched spans that substitution needs. One surrogate map is
built per turn from a discarded random seed and applied across every field, so
a name in the prompt and the same name in the generated SQL become the same
fake name. Turns carrying government id, financial, or medical data are
discarded whole rather than redacted, and the stored severity enum has no
`critical` value, so the database itself enforces that a critical sample cannot
land. Capture is awaited inside the chat request, wrapped so it can never fail
the turn.

**Tech Stack:** Postgres 15 with declarative schemas under `supabase/schemas/`,
pgTAP for database tests, TypeScript with Vitest, Supabase Edge Functions on
Deno, pg_cron for retention where available.

---

## Global Constraints

- Work only in the `feat/analytics-p3` worktree, on top of the completed
  Phase 3 work from
  `docs/superpowers/plans/2026-08-15-analytics-product-events.md`.
- **Create the isolated Supabase stack before any database work.** Per
  `AGENTS.md`, run `ava supabase switch feat-analytics-p3` before the first
  migration, reset, or database test, even when no local instance is running.
  Keep it active for the whole plan. Never commit a branch-scoped
  `config.toml`.
- Never write to the Avandar Supabase production database. This overrides every
  other instruction in this plan.
- Author schema changes in numbered `supabase/schemas/*.sql` files and generate
  migrations with `pnpm db:new-migration <name>`. Never hand-write a migration
  for a `public` schema change. The one exception in this plan is the pg_cron
  schedule, which is an extension operation that `db diff` cannot express.
- Follow red/green TDD for every behavioral change.
- **Capture is off unless `CHAT_SAMPLE_CAPTURE_ENABLED` is exactly `"true"`.**
  No code path may capture a sample without that switch, and the switch must
  not be enabled anywhere until Task 1's terms-of-service confirmation is
  recorded.
- A sample that trips the discard rules must never reach the database, not even
  partially. Discard is a whole-turn decision.
- The surrogate map is never stored, never logged, and never returned to the
  caller. Retaining it would make the result pseudonymised rather than
  anonymised, which under GDPR is still personal data.
- Capture failures are swallowed. A chat turn the user already paid for must
  never fail because a sample could not be written.
- Keep new functions at 45 lines or fewer.
- Do not use em dashes in code comments or in this document's output.
- Do not commit, push, merge, or publish. Leave the worktree dirty for user
  review. Each task ends at a review checkpoint instead of a commit.

---

## Scope

This is Phase 4, the final phase, of the four-phase plan in
`docs/superpowers/specs/2026-08-13-usage-analytics-events-design.md`. Phases 1
through 3 are complete. This phase carries all of the privacy risk in the spec
and nothing else depends on it, which is why it goes last and is reviewable on
its own.

**In scope:**

- Moving `detectPii` from `src/components/privacy/privacy-helpers/detectPii/`
  to `shared/utils/privacy/detectPii/`, with its seven import sites updated.
- Extending `detectPii` to return every matched span per hit, with existing
  consent-modal behaviour unchanged.
- A new `shared/utils/privacy/surrogates/` module: a seeded generator,
  `buildSurrogateMap`, and `applySurrogates`.
- `redactChatTurn`, the pure decision function that separates discard from
  redact and applies one map across every field of a turn.
- The `chat_samples` table, its enum, its indexes, its RLS posture, and its
  retention function, plus pgTAP coverage including the negative RLS cases.
- The capture pipeline in `PostChatMessages`, behind
  `CHAT_SAMPLE_CAPTURE_ENABLED`.
- Filling in `wasSampled` and `piiSeverity` on `chat.turn_completed`, which
  Phase 3 shipped as a constant `false` and an absent field.
- A pg_cron retention schedule that degrades to a no-op where the extension is
  unavailable, plus the exact steps for enabling it on a hosted project.

**Out of scope**, and untouched by this plan:

- Local-runtime chat. When `resolveChatRuntimeMode` returns
  `mode.kind === "local"` the turn never reaches the server and cannot be
  captured. This is a permanent gap, not a deferral.
- Paid-plan turns. The plan gate reads
  `subscriptions.feature_plan_type = 'free'` at request time.
- `dashboard.public_viewed` and the public-dashboard `query.failed` gap, still
  deferred with the anonymous edge route.
- Any in-app reader for `chat_samples`. Reads are service-role SQL only.
- Deduplicating `schema_snapshot` by content hash. See "What This Phase
  Deliberately Leaves Undone".

---

## Background The Engineer Needs

### The two spec conflicts this plan resolves

**Conflict 1: the discard gate contradicts the redaction table.**

The spec's capture pipeline says at step 4: "If severity is `critical` or
`isMedical` is true, skip capture." Its redaction strategy table says
`direct_identifier` and `precise_location` are "replaced with same-type
surrogates", and only `government_id`, `financial`, and `medical` cause the
sample to be discarded.

These cannot both hold, because `detectPii` classifies `direct_identifier` and
`precise_location` as **critical** today
(`CATEGORY_CRITICAL` in `detectPii.ts:202`). Gating on severity would discard
every turn containing an email address or a phone number, which is nearly all
of them, and the surrogate machinery for those categories would be dead code
the day it shipped.

**Resolution:** the gate is **by category, not by severity**. A turn is
discarded when any hit's category is in
`{government_id, financial, medical}`. Everything else is redacted with
surrogates and kept.

**Conflict 2: `pii_severity` is documented as "`clean` or `warning`;
`critical` never lands", but a redacted sample's detected severity is
critical.**

**Resolution:** the stored column records **residual** risk, not detected risk.
After the discard gate and substitution, what remains is either nothing
(`clean`) or surrogate-substituted values plus non-substitutable column-name
signals (`warning`). The column is therefore `clean` when the turn had no hits
at all and `warning` when redaction did work. The new enum
`public.chat_samples__pii_severity` has only those two values, so the database
enforces the guarantee rather than trusting the writer.

The `chat.turn_completed` event keeps carrying the **detected** severity, which
can be `critical`, because that event exists for observability and needs to
show how often turns are being thrown away. The two fields answer different
questions and both are correct.

### The third open item: retention had no mechanism

The spec sets 180 days and then notes that `pg_cron` is used nowhere in this
project and offers a scheduled edge function as an alternative, deciding
neither.

**Resolution:** the deletion is a SQL function in the table's own schema file,
which is testable and callable by `service_role` regardless of scheduling. The
schedule is a hand-written migration that creates the extension and registers
the job **inside an exception handler**, so a database where `pg_cron` cannot
be created logs a notice and continues rather than failing the deploy. Task 10
also produces the exact steps for enabling the extension on the hosted project,
which is a console action for the user, not for the implementer.

### The fourth open item: the terms of service

The spec's line 542 makes this binding: "The current terms of service already
grant the right to train on free-plan chat inputs and outputs. Capture begins
the moment this deploys, so this must be verified before the code ships rather
than after."

**Resolution:** capture is gated on `CHAT_SAMPLE_CAPTURE_ENABLED`, an
environment variable that must be exactly the string `"true"`. The code can
therefore land, be reviewed, and be deployed with capture inert. Turning it on
is a separate, deliberate act after Task 1's confirmation is recorded. Task 1
runs first and does not block the rest of the plan.

### What `detectPii` does today, and what it must also do

`src/components/privacy/privacy-helpers/detectPii/detectPii.ts` runs two
layers:

- **Column-name layer**: keyword matching over a column name. Produces hits
  with a category and a label and **no matched text**, because the input is a
  schema identifier rather than data.
- **Content layer**: eight regexes over row values. Produces hits with a
  `sampleValue` capped at 80 characters.

Its content layer is lossy in two ways that block substitution. Each regex runs
without the global flag, so only the first match in a value is seen. And hits
are deduped by label across all values, so the second email in a conversation
never appears at all.

Substitution needs every span. Task 3 adds a `matches` array carrying every
matched substring across every value for that label, in first-seen order,
deduped. `severity`, `hits` order, `sampleValue`, and `isMedical` stay exactly
as they are, because the consent modal renders them.

Only five labels are ever substitutable, which is worth knowing before
designing the generator table. The content patterns produce: Email, Phone
number, US SSN, Credit card, IBAN, IP address, Date of birth, and Street
address. Of those, SSN, Credit card, and IBAN belong to discard categories and
their samples never survive to substitution. So the generator table covers
exactly Email, Phone number, IP address, Street address, and Date of birth.
Every other category reaches the pipeline only through column names, which
carry no span to replace.

### Why surrogates instead of tags

Two reasons specific to a regex-based detector, both from the spec. A detector
miss surrounded by `[REDACTED]` tags is trivially identifiable as the only real
identifier left in the text, while a miss surrounded by plausible fakes is not.
And text full of bracket tokens has a different surface distribution from real
user prompts, so a model trained on it learns to emit the tokens.

The map must be built **once per turn and applied to every field**. If a prompt
contains a name and the generated SQL contains the same name in a `WHERE`
clause, both must receive the same surrogate or the sample is incoherent and
worse than no sample.

### Where capture runs

`supabase/functions/chat/PostChatMessages/PostChatMessages.ts`, after the
response is parsed and before it returns. Phase 3 already put an
`emitChatTurnAnalytics` call there; capture runs immediately before it and
feeds it two fields.

Capture is awaited rather than deferred with `EdgeRuntime.waitUntil`. It adds
roughly one database roundtrip to a call that already takes seconds, and
`waitUntil` work can be killed on worker shutdown, producing silent partial
capture.

`supabaseAdminClient` is on the action context already
(`MiniServer.types.ts:113`).

### Database conventions

Read `supabase/schemas/30.usage_analytics_events.sql` before writing the table
file. It is the closest analogue: same broad layer, same privacy posture, same
comment density. Note in particular that it documents *why* each column exists,
not just what it holds.

`supabase/tests/database/analytics/analytics_event_insert_policy.test.sql` is
the template for the RLS tests: seed `auth.users` and `public.workspaces`
inside the transaction, `set local role authenticated`, `set_config` the JWT
claims, then assert with `lives_ok` and `throws_ok`.

Per `docs/rules/sql.md`, RLS policies must always be tested with their negative
cases. `chat_samples` has **no policies at all**, which makes the negative
cases the entire test: an authenticated user must read zero rows and must fail
to insert.

### Import aliases and extensions

`$` is `/shared`, `@` is `/src`, `@sbfn` is `/supabase/functions`. Files under
`shared/` are imported by both Vite and Deno, so **imports inside `shared/`
must carry a `.ts` extension**. Files under `src/` omit it. Files under
`supabase/functions/` include it.

---

## File Structure

**Created:**

| Path | Responsibility |
| --- | --- |
| `shared/utils/privacy/detectPii/detectPii.ts` | The detector, moved from `src/` so Deno can import it, plus the matched-span field |
| `shared/utils/privacy/detectPii/detectPii.test.ts` | The existing suite, moved, plus span coverage |
| `shared/utils/privacy/surrogates/createSeededRandom.ts` | Deterministic PRNG so one turn is internally consistent |
| `shared/utils/privacy/surrogates/createSeededRandom.test.ts` | Vitest: same seed gives the same stream, different seeds diverge |
| `shared/utils/privacy/surrogates/buildSurrogateMap.ts` | Maps every matched span to a same-type fake |
| `shared/utils/privacy/surrogates/buildSurrogateMap.test.ts` | Vitest: per-label shapes, determinism, discard-category skip |
| `shared/utils/privacy/surrogates/applySurrogates.ts` | Replaces every mapped span in a string |
| `shared/utils/privacy/surrogates/applySurrogates.test.ts` | Vitest: overlapping keys, repeated spans, no-op cases |
| `shared/utils/privacy/redactChatTurn/redactChatTurn.ts` | The whole-turn decision: discard or redact, with one map across all fields |
| `shared/utils/privacy/redactChatTurn/redactChatTurn.test.ts` | Vitest: discard categories, cross-field consistency, residual severity |
| `supabase/schemas/00.enum.chat_samples__pii_severity.sql` | The two-value enum that makes `critical` unstorable |
| `supabase/schemas/30.chat_samples.sql` | The table, indexes, RLS, grants, and the retention function |
| `supabase/migrations/<timestamp>_schedule_chat_sample_retention.sql` | Hand-written: the guarded pg_cron schedule |
| `supabase/tests/database/analytics/chat_samples_rls.test.sql` | pgTAP: the negative RLS cases and the severity enum guarantee |
| `supabase/tests/database/analytics/chat_samples_retention.test.sql` | pgTAP: the deletion function's window and its privileges |
| `supabase/functions/chat/PostChatMessages/samples/captureChatSample.ts` | The edge side: switch, plan gate, redaction, insert |
| `supabase/functions/chat/PostChatMessages/samples/captureChatSample.test.ts` | Vitest: every skip path and the happy path |
| `docs/chat-sample-retention.md` | What is retained, for how long, and how to enable the schedule |

**Modified:**

| Path | Change |
| --- | --- |
| `src/components/privacy/ConsentModal/CompositePanel.tsx` | Import path only |
| `src/components/privacy/ConsentModal/MedicalStrictPanel.tsx` | Import path only |
| `src/components/privacy/ConsentModal/PiiHitBadges.tsx` | Import path only |
| `src/components/privacy/ConsentModal/ConsentModal.tsx` | Import path only |
| `src/components/privacy/ConsentModal/PiiWarningPanel.tsx` | Import path only |
| `src/components/privacy/privacy-helpers/generatedSqlAssumptions/generatedSqlAssumptions.ts` | Import path only |
| `src/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary.tsx` | Import path only |
| `supabase/functions/chat/PostChatMessages/analytics/ChatTurnAnalyticsPayloads.ts` | Accepts the capture result instead of hardcoding `wasSampled: false` |
| `supabase/functions/chat/PostChatMessages/analytics/emitChatTurnAnalytics.ts` | Threads the capture result through |
| `supabase/functions/chat/PostChatMessages/PostChatMessages.ts` | Calls capture before emitting |
| `docs/superpowers/specs/2026-08-13-usage-analytics-events-design.md` | Phase status, the three resolved conflicts, the capture switch |

**Deleted:**

| Path | Reason |
| --- | --- |
| `src/components/privacy/privacy-helpers/detectPii/detectPii.ts` | Moved to `shared/` |
| `src/components/privacy/privacy-helpers/detectPii/detectPii.test.ts` | Moved to `shared/` |

---

## Task 1: Confirm the retention right before anything captures

This task produces a recorded answer, not code. It does not block the rest of
the plan, because capture ships disabled. It **does** block enabling the
switch.

**Files:**

- Create: `docs/chat-sample-retention.md`

- [ ] **Step 1: Ask the user the three questions**

Put these to the user directly and wait for answers. Do not infer them from
the codebase, and do not proceed to Task 12 without them.

1. Do the current terms of service grant Avandar the right to retain and train
   on free-plan chat inputs and outputs? Quote the clause, or say no.
2. Is 180 days the retention window the terms state? If the terms state a
   different window, that number wins over the spec's.
3. Should capture be enabled in staging, in production, or in neither, once
   this lands?

- [ ] **Step 2: Record the answers**

Create `docs/chat-sample-retention.md`:

```markdown
# Chat sample retention

Free-plan chat turns are retained in `public.chat_samples` as a redacted
training corpus. This document is the operational record of what that means.

## What is retained

One row per captured turn: the conversation messages, the assistant's reply,
the generated SQL, and the workspace schema snapshot the model was given. Every
one of those fields is redacted before it is written.

## What is never retained

- Any turn from a workspace whose `feature_plan_type` is not `free`.
- Any turn where the detector found government id, financial, or medical data.
  Those are discarded whole, never redacted and kept.
- Any local-runtime turn. Those never reach the server.
- The surrogate map. It is built per turn from a random seed and both are
  discarded after the write, which is what makes the result anonymised rather
  than pseudonymised.

## Retention window

180 days. Enforced by `public.chat_samples__delete_expired`, scheduled with
pg_cron where the extension is available.

## Capture switch

Capture is off unless the `CHAT_SAMPLE_CAPTURE_ENABLED` environment variable is
exactly `"true"` on the `chat` edge function. It is off by default in every
environment.

## Terms of service confirmation

- Confirmed by: <name>
- Date: <date>
- Clause: <quote or reference>
- Environments approved for capture: <staging | production | neither>

## Enabling the pg_cron schedule on a hosted project

<filled in by Task 10>
```

Fill in the confirmation block from the user's answers. If the answer to
question 1 is no, write "NOT GRANTED" in the clause field and stop at
Task 12's gate: the switch stays off and the plan still completes.

- [ ] **Step 3: Review checkpoint**

Do not commit. Report the recorded answers to the user before continuing.

---

## Task 2: Move `detectPii` into `shared/`

A pure move with no behaviour change, done on its own so the diff of Task 3 is
readable.

**Files:**

- Create: `shared/utils/privacy/detectPii/detectPii.ts`
- Create: `shared/utils/privacy/detectPii/detectPii.test.ts`
- Delete: `src/components/privacy/privacy-helpers/detectPii/detectPii.ts`
- Delete: `src/components/privacy/privacy-helpers/detectPii/detectPii.test.ts`
- Modify: the seven import sites listed in File Structure

- [ ] **Step 1: Move both files with git so history follows**

```bash
mkdir -p shared/utils/privacy/detectPii
git mv src/components/privacy/privacy-helpers/detectPii/detectPii.ts \
  shared/utils/privacy/detectPii/detectPii.ts
git mv src/components/privacy/privacy-helpers/detectPii/detectPii.test.ts \
  shared/utils/privacy/detectPii/detectPii.test.ts
```

- [ ] **Step 2: Fix the test's own import**

In `shared/utils/privacy/detectPii/detectPii.test.ts`, change line 2:

```ts
import { detectPii } from "$/utils/privacy/detectPii/detectPii.ts";
```

The `.ts` extension is required: this file now lives under `shared/`, which
Deno also compiles.

- [ ] **Step 3: Run the moved test to prove nothing changed**

```bash
pnpm vitest run shared/utils/privacy/detectPii/detectPii.test.ts
```

Expected: PASS, the same assertions that passed before the move.

- [ ] **Step 4: Update the seven import sites**

Replace `@/components/privacy/privacy-helpers/detectPii/detectPii` with
`$/utils/privacy/detectPii/detectPii` in all of:

- `src/components/privacy/ConsentModal/CompositePanel.tsx:9`
- `src/components/privacy/ConsentModal/MedicalStrictPanel.tsx:7`
- `src/components/privacy/ConsentModal/PiiHitBadges.tsx:2`
- `src/components/privacy/ConsentModal/ConsentModal.tsx:11`
- `src/components/privacy/ConsentModal/PiiWarningPanel.tsx:7`
- `src/components/privacy/privacy-helpers/generatedSqlAssumptions/generatedSqlAssumptions.ts:1`
- `src/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary.tsx:7` and `:15`

Files under `src/` omit the `.ts` extension. For example, in
`decideIfDataCanCrossBoundary.tsx`:

```ts
import { detectPii } from "$/utils/privacy/detectPii/detectPii";
```

```ts
import type { PiiDetectionResult } from "$/utils/privacy/detectPii/detectPii";
```

- [ ] **Step 5: Verify no import site was missed**

```bash
rg -n "privacy-helpers/detectPii" src shared supabase
```

Expected: no output.

- [ ] **Step 5b: Unify the duplicated severity union**

`shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts` spells
`"clean" | "warning" | "critical"` inline on `chat.turn_completed.piiSeverity`,
duplicating the `PiiSeverity` union that `detectPii` already exports. They are
one domain enum, and `detectPii` is the producer of the value that field
carries, so two spellings will drift the first time a tier is added.

This could not be fixed when that payload type was written, because `shared/`
cannot import from `src/`. Step 1 of this task removes that obstacle.

In `AnalyticsEvents.types.ts`, add the import:

```ts
import type { PiiSeverity } from "$/utils/privacy/detectPii/detectPii.ts";
```

and change the field on `ChatTurnCompletedPayload`:

```ts
  piiSeverity?: PiiSeverity;
```

Update the mirrored `ProductEventPayloads["chat.turn_completed"]` in
`shared/analytics/AnalyticsEvents/AnalyticsEvents.test.ts` the same way, so the
`toEqualTypeOf` guard still describes the same shape:

```ts
    piiSeverity?: PiiSeverity;
```

Verify the union really is identical before relying on this:

```bash
rg -n "export type PiiSeverity" shared/utils/privacy/detectPii/detectPii.ts
pnpm vitest run shared/analytics/AnalyticsEvents/AnalyticsEvents.test.ts
```

Expected: `PiiSeverity` is `"clean" | "warning" | "critical"`, and the registry
test still passes. If the union has gained a value, stop: the analytics payload
and the detector have genuinely diverged and that needs a decision, not an
import.

- [ ] **Step 6: Run the affected suites**

```bash
pnpm vitest run src/components/privacy shared/utils/privacy
pnpm type-check
```

Expected: PASS and zero type errors.

- [ ] **Step 7: Review checkpoint**

Do not commit. Record both outputs.

---

## Task 3: Make the detector return every matched span

**Files:**

- Modify: `shared/utils/privacy/detectPii/detectPii.ts:12-20` and `:269-305`
- Modify: `shared/utils/privacy/detectPii/detectPii.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `shared/utils/privacy/detectPii/detectPii.test.ts`:

```ts
describe("detectPii matched spans", () => {
  it("returns every email in a value, not only the first", () => {
    const result = detectPii({
      values: ["contact jane@acme.com or bob@acme.com about it"],
    });
    const emailHit = result.hits.find((hit) => {
      return hit.label === "Email";
    });

    expect(emailHit?.matches).toEqual(["jane@acme.com", "bob@acme.com"]);
  });

  it("returns matches from every value, not only the first value that hits", () => {
    const result = detectPii({
      values: ["jane@acme.com", "unrelated", "bob@acme.com"],
    });
    const emailHit = result.hits.find((hit) => {
      return hit.label === "Email";
    });

    expect(emailHit?.matches).toEqual(["jane@acme.com", "bob@acme.com"]);
  });

  it("does not repeat the same span twice", () => {
    const result = detectPii({
      values: ["jane@acme.com", "jane@acme.com"],
    });
    const emailHit = result.hits.find((hit) => {
      return hit.label === "Email";
    });

    expect(emailHit?.matches).toEqual(["jane@acme.com"]);
  });

  it("returns an empty span list for a column-name hit, which has no text to replace", () => {
    const result = detectPii({ columnName: "patient_email" });

    expect(result.hits.length).toBeGreaterThan(0);
    result.hits.forEach((hit) => {
      expect(hit.matches).toEqual([]);
    });
  });

  it("still reports one hit per label, which is what the consent modal renders", () => {
    const result = detectPii({
      values: ["jane@acme.com or bob@acme.com"],
    });
    const emailHits = result.hits.filter((hit) => {
      return hit.label === "Email";
    });

    expect(emailHits).toHaveLength(1);
  });

  it("still caps sampleValue at the first match, unchanged for existing callers", () => {
    const result = detectPii({
      values: ["jane@acme.com or bob@acme.com"],
    });
    const emailHit = result.hits.find((hit) => {
      return hit.label === "Email";
    });

    expect(emailHit?.sampleValue).toBe("jane@acme.com");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run shared/utils/privacy/detectPii/detectPii.test.ts
```

Expected: FAIL. `matches` does not exist on `PiiPatternHit`.

- [ ] **Step 3: Add the field to the hit type**

In `shared/utils/privacy/detectPii/detectPii.ts`, extend `PiiPatternHit`:

```ts
export type PiiPatternHit = {
  /** Where the hit came from: column-name layer or content layer. */
  layer: "column_name" | "content";
  category: PiiCategory;
  /** Stable, user-presentable label (e.g. "Email", "Phone number"). */
  label: string;
  /** Optional sample value the regex matched. Capped at 80 chars. */
  sampleValue?: string;
  /**
   * Every distinct substring this pattern matched, across every inspected
   * value, in first-seen order. Empty for column-name hits, which match an
   * identifier rather than data and so have nothing to substitute.
   *
   * Redaction replaces these spans with same-type surrogates, so a miss here
   * is a value that survives into a retained sample.
   */
  matches: readonly string[];
};
```

- [ ] **Step 4: Collect every span in the content layer**

Replace `_detectFromContent` in the same file:

```ts
function _detectFromContent(values: readonly unknown[]): PiiPatternHit[] {
  // Keyed by label so the hit list keeps one entry per pattern, which is what
  // the consent modal renders, while the spans accumulate across every value.
  const hitsByLabel = new Map<string, PiiPatternHit>();
  const matchesByLabel = new Map<string, string[]>();

  for (const value of values) {
    if (value == null) {
      continue;
    }
    const text = String(value);
    if (text.length === 0) {
      continue;
    }

    for (const pattern of CONTENT_PATTERNS) {
      // A fresh global regex per pass: the source patterns are shared module
      // state and `lastIndex` on a global regex is not.
      const globalPattern = new RegExp(pattern.regex.source, "g");
      for (const match of text.matchAll(globalPattern)) {
        const matchedText = match[0];
        if (pattern.validate && !pattern.validate(matchedText)) {
          continue;
        }
        const existingMatches = matchesByLabel.get(pattern.label) ?? [];
        if (!existingMatches.includes(matchedText)) {
          existingMatches.push(matchedText);
        }
        matchesByLabel.set(pattern.label, existingMatches);
        if (!hitsByLabel.has(pattern.label)) {
          hitsByLabel.set(pattern.label, {
            layer: "content",
            category: pattern.category,
            label: pattern.label,
            sampleValue: matchedText.slice(0, 80),
            matches: existingMatches,
          });
        }
      }
    }
  }

  return [...hitsByLabel.values()].map((hit) => {
    return { ...hit, matches: matchesByLabel.get(hit.label) ?? [] };
  });
}
```

The `Street address` pattern is anchored with `^` and no `m` flag, so adding
`g` still yields at most one match per value. That is intentional and matches
the previous behaviour.

- [ ] **Step 5: Give column-name hits an empty span list**

In `_detectFromColumnName`, add `matches: []` to both hit constructions:

```ts
  const hits: PiiPatternHit[] = COLUMN_NAME_KEYWORDS.filter((entry) => {
    return entry.keywords.some((kw) => {
      return normalized.includes(kw);
    });
  }).map((entry) => {
    return {
      layer: "column_name" as const,
      category: entry.category,
      label: entry.label,
      matches: [],
    };
  });

  if (STANDALONE_NAME_PATTERN.test(normalized)) {
    const alreadyHasName = hits.some((h) => {
      return h.label === "Name";
    });
    if (!alreadyHasName) {
      hits.push({
        layer: "column_name",
        category: "direct_identifier",
        label: "Name",
        matches: [],
      });
    }
  }
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
pnpm vitest run shared/utils/privacy/detectPii/detectPii.test.ts
```

Expected: PASS. Every pre-existing assertion still passes, which is the point:
the consent modal's inputs are unchanged.

- [ ] **Step 7: Verify the consent modal is unaffected**

```bash
pnpm vitest run src/components/privacy
pnpm type-check
```

Expected: PASS and zero type errors.

- [ ] **Step 8: Review checkpoint**

Do not commit. Record all three outputs.

---

## Task 4: Build the seeded random source

**Files:**

- Create: `shared/utils/privacy/surrogates/createSeededRandom.ts`
- Create: `shared/utils/privacy/surrogates/createSeededRandom.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/utils/privacy/surrogates/createSeededRandom.test.ts`:

```ts
/**
 * Determinism is what makes one turn internally consistent: the same real
 * value has to produce the same fake in the prompt, the SQL, and the schema.
 */
import { createSeededRandom } from "$/utils/privacy/surrogates/createSeededRandom.ts";
import { describe, expect, it } from "vitest";

describe("createSeededRandom", () => {
  it("produces the same stream for the same seed", () => {
    const first = createSeededRandom(12345);
    const second = createSeededRandom(12345);

    expect([first(), first(), first()]).toEqual([
      second(),
      second(),
      second(),
    ]);
  });

  it("produces a different stream for a different seed", () => {
    const first = createSeededRandom(1);
    const second = createSeededRandom(2);

    expect(first()).not.toBe(second());
  });

  it("stays inside the unit interval", () => {
    const random = createSeededRandom(99);

    for (let index = 0; index < 500; index += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("does not immediately repeat itself", () => {
    const random = createSeededRandom(7);
    const drawn = new Set(
      Array.from({ length: 200 }, () => {
        return random();
      }),
    );

    expect(drawn.size).toBe(200);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run shared/utils/privacy/surrogates/createSeededRandom.test.ts
```

Expected: FAIL. The module does not exist.

- [ ] **Step 3: Implement the generator**

Create `shared/utils/privacy/surrogates/createSeededRandom.ts`:

```ts
/**
 * Builds a deterministic pseudo-random source from a numeric seed.
 *
 * Redaction needs determinism within one chat turn and unpredictability
 * across turns. The seed is drawn from `crypto.getRandomValues` per turn and
 * discarded with the surrogate map: keeping either would make the retained
 * sample reversible, and a reversible sample is pseudonymised rather than
 * anonymised, which under GDPR is still personal data.
 *
 * This is mulberry32. It is not a cryptographic generator and must never be
 * used where one is required; its job is to spread surrogate choices evenly,
 * not to resist attack.
 *
 * @param seed: any 32-bit integer
 * @returns a function yielding values in [0, 1)
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let drawn = Math.imul(state ^ (state >>> 15), 1 | state);
    drawn = (drawn + Math.imul(drawn ^ (drawn >>> 7), 61 | drawn)) ^ drawn;
    return ((drawn ^ (drawn >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm vitest run shared/utils/privacy/surrogates/createSeededRandom.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Review checkpoint**

Do not commit. Record the Vitest output.

---

## Task 5: Map every matched span to a same-type fake

**Files:**

- Create: `shared/utils/privacy/surrogates/buildSurrogateMap.ts`
- Create: `shared/utils/privacy/surrogates/buildSurrogateMap.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/utils/privacy/surrogates/buildSurrogateMap.test.ts`:

```ts
/**
 * A surrogate has to be the same *type* as what it replaces. An email that
 * becomes `[REDACTED]` changes the surface distribution of the text, and the
 * detector's own misses then stand out as the only real identifiers left.
 */
import { buildSurrogateMap } from "$/utils/privacy/surrogates/buildSurrogateMap.ts";
import { describe, expect, it } from "vitest";
import type { PiiPatternHit } from "$/utils/privacy/detectPii/detectPii.ts";

function _contentHit(
  options: Readonly<{
    label: string;
    category: PiiPatternHit["category"];
    matches: string[];
  }>,
): PiiPatternHit {
  return {
    layer: "content",
    category: options.category,
    label: options.label,
    matches: options.matches,
  };
}

describe("buildSurrogateMap", () => {
  it("replaces an email with something that still looks like an email", () => {
    const map = buildSurrogateMap({
      hits: [
        _contentHit({
          label: "Email",
          category: "direct_identifier",
          matches: ["jane.doe@acme.com"],
        }),
      ],
      seed: 42,
    });

    const surrogate = map.get("jane.doe@acme.com");
    expect(surrogate).toMatch(/^[a-z.]+@[a-z]+\.(com|org|net)$/);
    expect(surrogate).not.toContain("jane");
    expect(surrogate).not.toContain("acme");
  });

  it("replaces a phone number with something that still looks like one", () => {
    const map = buildSurrogateMap({
      hits: [
        _contentHit({
          label: "Phone number",
          category: "direct_identifier",
          matches: ["(415) 555-2671"],
        }),
      ],
      seed: 42,
    });

    expect(map.get("(415) 555-2671")).toMatch(/^\(\d{3}\) \d{3}-\d{4}$/);
  });

  it("replaces an IP with a documentation-range address", () => {
    const map = buildSurrogateMap({
      hits: [
        _contentHit({
          label: "IP address",
          category: "direct_identifier",
          matches: ["192.168.4.19"],
        }),
      ],
      seed: 42,
    });

    expect(map.get("192.168.4.19")).toMatch(/^203\.0\.113\.\d{1,3}$/);
  });

  it("replaces a street address with a plausible street address", () => {
    const map = buildSurrogateMap({
      hits: [
        _contentHit({
          label: "Street address",
          category: "direct_identifier",
          matches: ["1600 Pennsylvania Ave"],
        }),
      ],
      seed: 42,
    });

    expect(map.get("1600 Pennsylvania Ave")).toMatch(
      /^\d{1,4} [A-Z][a-z]+ (St|Ave|Rd|Blvd|Dr|Ln|Way|Ct)$/,
    );
  });

  it("replaces a date of birth with a plausible date", () => {
    const map = buildSurrogateMap({
      hits: [
        _contentHit({
          label: "Date of birth",
          category: "demographic_sensitive",
          matches: ["01/15/1992"],
        }),
      ],
      seed: 42,
    });

    expect(map.get("01/15/1992")).toMatch(/^\d{2}\/\d{2}\/(19|20)\d{2}$/);
    expect(map.get("01/15/1992")).not.toBe("01/15/1992");
  });

  it("gives the same real value the same fake, so a turn stays coherent", () => {
    const map = buildSurrogateMap({
      hits: [
        _contentHit({
          label: "Email",
          category: "direct_identifier",
          matches: ["jane@acme.com", "bob@acme.com", "jane@acme.com"],
        }),
      ],
      seed: 42,
    });

    expect(map.size).toBe(2);
    expect(map.get("jane@acme.com")).not.toBe(map.get("bob@acme.com"));
  });

  it("gives different real values different fakes", () => {
    const map = buildSurrogateMap({
      hits: [
        _contentHit({
          label: "Email",
          category: "direct_identifier",
          matches: ["a@x.com", "b@x.com", "c@x.com"],
        }),
      ],
      seed: 42,
    });

    expect(new Set(map.values()).size).toBe(3);
  });

  it("is deterministic for one seed and different across seeds", () => {
    const hits = [
      _contentHit({
        label: "Email",
        category: "direct_identifier",
        matches: ["jane@acme.com"],
      }),
    ];

    expect(buildSurrogateMap({ hits, seed: 7 }).get("jane@acme.com")).toBe(
      buildSurrogateMap({ hits, seed: 7 }).get("jane@acme.com"),
    );
    expect(
      buildSurrogateMap({ hits, seed: 7 }).get("jane@acme.com"),
    ).not.toBe(buildSurrogateMap({ hits, seed: 8 }).get("jane@acme.com"));
  });

  it("never invents a fake for a discard category", () => {
    // Unreachable in the pipeline, which throws the whole sample away before
    // this point. Pinned anyway, because generating a plausible fake
    // government id inside otherwise real context is exactly the pattern
    // auditors treat as inadequate de-identification.
    const map = buildSurrogateMap({
      hits: [
        _contentHit({
          label: "US SSN",
          category: "government_id",
          matches: ["123-45-6789"],
        }),
        _contentHit({
          label: "Credit card",
          category: "financial",
          matches: ["4111111111111111"],
        }),
      ],
      seed: 42,
    });

    expect(map.size).toBe(0);
  });

  it("ignores column-name hits, which have no span to replace", () => {
    const map = buildSurrogateMap({
      hits: [
        {
          layer: "column_name",
          category: "direct_identifier",
          label: "Contact",
          matches: [],
        },
      ],
      seed: 42,
    });

    expect(map.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run shared/utils/privacy/surrogates/buildSurrogateMap.test.ts
```

Expected: FAIL. The module does not exist.

- [ ] **Step 3: Implement the map builder**

Create `shared/utils/privacy/surrogates/buildSurrogateMap.ts`:

```ts
import { createSeededRandom } from "$/utils/privacy/surrogates/createSeededRandom.ts";
import type {
  PiiCategory,
  PiiPatternHit,
} from "$/utils/privacy/detectPii/detectPii.ts";

/**
 * Categories whose samples are thrown away rather than redacted, so no
 * surrogate is ever generated for them.
 *
 * Generating a plausible fake government id or account number inside otherwise
 * real context is the pattern auditors treat as inadequate de-identification,
 * and a same-type fake for a financial figure changes what the record means.
 */
const DISCARD_CATEGORIES: ReadonlySet<PiiCategory> = new Set([
  "government_id",
  "financial",
  "medical",
]);

const FIRST_NAMES = [
  "avery", "casey", "devon", "harper", "jordan", "logan", "morgan", "quinn",
  "reese", "sydney",
] as const;

const LAST_NAMES = [
  "alvarez", "bennett", "cortez", "delgado", "ellis", "foster", "grant",
  "hayes", "iverson", "jenkins",
] as const;

const DOMAIN_WORDS = [
  "brightlane", "castlepoint", "duneside", "elmgrove", "fernhill", "goldbay",
  "harborline", "ivyfield",
] as const;

const TLDS = ["com", "org", "net"] as const;

const STREET_WORDS = [
  "Alder", "Birch", "Cedar", "Dogwood", "Elm", "Fir", "Grove", "Hawthorn",
] as const;

const STREET_SUFFIXES = ["St", "Ave", "Rd", "Blvd", "Dr", "Ln", "Way", "Ct"] as const;

function _pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

function _digits(count: number, random: () => number): string {
  return Array.from({ length: count }, () => {
    return String(Math.floor(random() * 10));
  }).join("");
}

function _padded(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function _fakeEmail(random: () => number): string {
  return `${_pick(FIRST_NAMES, random)}.${_pick(LAST_NAMES, random)}@${_pick(
    DOMAIN_WORDS,
    random,
  )}.${_pick(TLDS, random)}`;
}

function _fakePhone(random: () => number): string {
  // 555 exchange codes are the reserved fictional range, so a surrogate can
  // never collide with a real subscriber line.
  return `(${_digits(3, random)}) 555-${_digits(4, random)}`;
}

function _fakeIpAddress(random: () => number): string {
  // 203.0.113.0/24 is TEST-NET-3, reserved for documentation.
  return `203.0.113.${Math.floor(random() * 256)}`;
}

function _fakeStreetAddress(random: () => number): string {
  return `${Math.floor(random() * 9000) + 100} ${_pick(
    STREET_WORDS,
    random,
  )} ${_pick(STREET_SUFFIXES, random)}`;
}

function _fakeDateOfBirth(random: () => number): string {
  const month = Math.floor(random() * 12) + 1;
  const day = Math.floor(random() * 28) + 1;
  const year = 1950 + Math.floor(random() * 55);
  return `${_padded(month, 2)}/${_padded(day, 2)}/${year}`;
}

/**
 * One generator per substitutable detector label.
 *
 * Only these five labels can ever be substituted. The other content patterns
 * belong to discard categories, and every remaining category reaches the
 * pipeline through column names, which carry no span to replace.
 */
const SURROGATE_GENERATORS: Readonly<
  Record<string, (random: () => number) => string>
> = {
  Email: _fakeEmail,
  "Phone number": _fakePhone,
  "IP address": _fakeIpAddress,
  "Street address": _fakeStreetAddress,
  "Date of birth": _fakeDateOfBirth,
};

/**
 * Maps every substitutable value detected in one chat turn to a same-type
 * fake.
 *
 * Built once per turn and applied to every field, because if a prompt contains
 * a name and the generated SQL contains the same name in a `WHERE` clause,
 * both must receive the same surrogate or the sample is incoherent and worse
 * than no sample.
 *
 * The returned map must be discarded after it is applied. Retaining it makes
 * the result reversible.
 *
 * @param options.hits: every hit the detector produced for the whole turn
 * @param options.seed: a per-turn random seed, never stored
 * @returns real value to surrogate, for every substitutable span
 */
export function buildSurrogateMap(
  options: Readonly<{ hits: readonly PiiPatternHit[]; seed: number }>,
): Map<string, string> {
  const random = createSeededRandom(options.seed);
  const surrogates = new Map<string, string>();

  options.hits.forEach((hit) => {
    if (DISCARD_CATEGORIES.has(hit.category)) {
      return;
    }
    const generate = SURROGATE_GENERATORS[hit.label];
    if (generate === undefined) {
      return;
    }
    hit.matches.forEach((matchedText) => {
      if (surrogates.has(matchedText)) {
        return;
      }
      surrogates.set(matchedText, generate(random));
    });
  });

  return surrogates;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm vitest run shared/utils/privacy/surrogates/buildSurrogateMap.test.ts
```

Expected: PASS, 10 tests.

If "gives different real values different fakes" is flaky, the generator pool
is too small for the seed. Widen `FIRST_NAMES`, `LAST_NAMES`, and
`DOMAIN_WORDS` rather than weakening the assertion: a surrogate collision means
two different people become one person in the corpus.

- [ ] **Step 5: Review checkpoint**

Do not commit. Record the Vitest output.

---

## Task 6: Apply the map to text

**Files:**

- Create: `shared/utils/privacy/surrogates/applySurrogates.ts`
- Create: `shared/utils/privacy/surrogates/applySurrogates.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/utils/privacy/surrogates/applySurrogates.test.ts`:

```ts
/**
 * Substitution order matters. A shorter span that is a substring of a longer
 * one must not be replaced first, or the longer span is corrupted and its real
 * remainder survives into the retained sample.
 */
import { applySurrogates } from "$/utils/privacy/surrogates/applySurrogates.ts";
import { describe, expect, it } from "vitest";

describe("applySurrogates", () => {
  it("replaces a mapped value", () => {
    const map = new Map([["jane@acme.com", "avery.grant@elmgrove.com"]]);

    expect(applySurrogates("email jane@acme.com now", map)).toBe(
      "email avery.grant@elmgrove.com now",
    );
  });

  it("replaces every occurrence, not only the first", () => {
    const map = new Map([["jane@acme.com", "avery.grant@elmgrove.com"]]);

    expect(applySurrogates("jane@acme.com and jane@acme.com", map)).toBe(
      "avery.grant@elmgrove.com and avery.grant@elmgrove.com",
    );
  });

  it("replaces the longest span first so a substring cannot corrupt it", () => {
    const map = new Map([
      ["4155552671", "9995550000"],
      ["(415) 555-2671 x4155552671", "(200) 555-1111 x2005551111"],
    ]);

    expect(applySurrogates("call (415) 555-2671 x4155552671", map)).toBe(
      "call (200) 555-1111 x2005551111",
    );
  });

  it("treats the search text literally, so regex characters cannot break it", () => {
    const map = new Map([["a+b(c)", "x"]]);

    expect(applySurrogates("value a+b(c) here", map)).toBe("value x here");
  });

  it("returns the text unchanged when nothing is mapped", () => {
    expect(applySurrogates("nothing to do", new Map())).toBe("nothing to do");
  });

  it("returns an empty string unchanged", () => {
    const map = new Map([["a", "b"]]);

    expect(applySurrogates("", map)).toBe("");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run shared/utils/privacy/surrogates/applySurrogates.test.ts
```

Expected: FAIL. The module does not exist.

- [ ] **Step 3: Implement the substitution**

Create `shared/utils/privacy/surrogates/applySurrogates.ts`:

```ts
/**
 * Replaces every mapped real value in `text` with its surrogate.
 *
 * Substitution runs longest key first. A phone number can appear both on its
 * own and inside a longer matched span, and replacing the short one first
 * would leave the long span's real remainder in the text.
 *
 * `split`/`join` rather than a regex, so a matched value containing regex
 * metacharacters (which real addresses and free text do contain) needs no
 * escaping and cannot change the pattern's meaning.
 *
 * @param text: the string to redact
 * @param surrogates: real value to surrogate, from `buildSurrogateMap`
 * @returns the redacted string
 */
export function applySurrogates(
  text: string,
  surrogates: ReadonlyMap<string, string>,
): string {
  const orderedRealValues = [...surrogates.keys()].sort((left, right) => {
    return right.length - left.length;
  });

  return orderedRealValues.reduce((redacted, realValue) => {
    return redacted.split(realValue).join(surrogates.get(realValue) ?? "");
  }, text);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm vitest run shared/utils/privacy/surrogates/applySurrogates.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Review checkpoint**

Do not commit. Record the Vitest output.

---

## Task 7: Decide and redact a whole turn

This is the module that resolves the spec's discard-versus-redact conflict.
Read "The two spec conflicts this plan resolves" in Background before starting.

**Files:**

- Create: `shared/utils/privacy/redactChatTurn/redactChatTurn.ts`
- Create: `shared/utils/privacy/redactChatTurn/redactChatTurn.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/utils/privacy/redactChatTurn/redactChatTurn.test.ts`:

```ts
/**
 * The single most important property here is cross-field consistency: one map
 * per turn, applied everywhere. A name redacted in the prompt but left intact
 * in the generated SQL is a leak *and* an incoherent training example.
 */
import { redactChatTurn } from "$/utils/privacy/redactChatTurn/redactChatTurn.ts";
import { describe, expect, it } from "vitest";

const CLEAN_TURN = {
  messages: [
    { role: "user" as const, content: "how many orders last month?" },
    { role: "assistant" as const, content: "Here is the SQL I ran." },
  ],
  assistantText: "Here is the SQL I ran.",
  generatedSql: "select count(*) from orders",
  schemaSnapshot: {
    datasets: [{ id: "d1", name: "orders" }],
    columns: [{ dataset_id: "d1", name: "order_total", data_type: "double" }],
  },
  seed: 42,
};

describe("redactChatTurn", () => {
  it("keeps a clean turn untouched and reports clean", () => {
    const outcome = redactChatTurn(CLEAN_TURN);

    expect(outcome.kind).toBe("redacted");
    if (outcome.kind !== "redacted") {
      return;
    }
    expect(outcome.piiSeverity).toBe("clean");
    expect(outcome.redactedCategories).toEqual([]);
    expect(outcome.generatedSql).toBe("select count(*) from orders");
    expect(outcome.messages[0]?.content).toBe("how many orders last month?");
  });

  it("gives the same real value the same fake in every field", () => {
    const outcome = redactChatTurn({
      ...CLEAN_TURN,
      messages: [
        { role: "user", content: "what did jane@acme.com order?" },
      ],
      assistantText: "Filtering on jane@acme.com.",
      generatedSql: "select * from orders where email = 'jane@acme.com'",
    });

    expect(outcome.kind).toBe("redacted");
    if (outcome.kind !== "redacted") {
      return;
    }
    const promptEmail = outcome.messages[0]?.content.match(/\S+@\S+\.\w+/)?.[0];
    const sqlEmail = outcome.generatedSql?.match(/[\w.]+@[\w.]+\.\w+/)?.[0];
    const assistantEmail = outcome.assistantText.match(/\S+@\S+\.\w+/)?.[0];

    expect(promptEmail).toBeDefined();
    expect(promptEmail).not.toContain("jane");
    expect(sqlEmail).toBe(promptEmail);
    expect(assistantEmail?.replace(/\.$/, "")).toBe(promptEmail);
  });

  it("reports warning and the redacted categories once redaction did work", () => {
    const outcome = redactChatTurn({
      ...CLEAN_TURN,
      messages: [{ role: "user", content: "email jane@acme.com" }],
    });

    expect(outcome.kind).toBe("redacted");
    if (outcome.kind !== "redacted") {
      return;
    }
    expect(outcome.piiSeverity).toBe("warning");
    expect(outcome.redactedCategories).toContain("direct_identifier");
  });

  it("discards a turn containing a government id", () => {
    const outcome = redactChatTurn({
      ...CLEAN_TURN,
      messages: [{ role: "user", content: "look up ssn 123-45-6789" }],
    });

    expect(outcome).toEqual({ kind: "discarded", detectedSeverity: "critical" });
  });

  it("discards a turn containing a card number", () => {
    const outcome = redactChatTurn({
      ...CLEAN_TURN,
      messages: [{ role: "user", content: "card 4111111111111111" }],
    });

    expect(outcome.kind).toBe("discarded");
  });

  it("discards a turn whose schema exposes medical columns", () => {
    const outcome = redactChatTurn({
      ...CLEAN_TURN,
      schemaSnapshot: {
        datasets: [{ id: "d1", name: "visits" }],
        columns: [
          { dataset_id: "d1", name: "diagnosis", data_type: "varchar" },
        ],
      },
    });

    expect(outcome.kind).toBe("discarded");
  });

  it("redacts the generated SQL even when the prompt is clean", () => {
    const outcome = redactChatTurn({
      ...CLEAN_TURN,
      generatedSql: "select * from users where phone = '(415) 555-2671'",
    });

    expect(outcome.kind).toBe("redacted");
    if (outcome.kind !== "redacted") {
      return;
    }
    expect(outcome.generatedSql).not.toContain("2671");
  });

  it("handles a turn with no generated SQL", () => {
    const outcome = redactChatTurn({ ...CLEAN_TURN, generatedSql: undefined });

    expect(outcome.kind).toBe("redacted");
    if (outcome.kind !== "redacted") {
      return;
    }
    expect(outcome.generatedSql).toBeUndefined();
  });

  it("never returns the surrogate map", () => {
    const outcome = redactChatTurn({
      ...CLEAN_TURN,
      messages: [{ role: "user", content: "email jane@acme.com" }],
    });

    expect(JSON.stringify(outcome)).not.toContain("jane@acme.com");
    expect(outcome).not.toHaveProperty("surrogates");
  });

  it("is deterministic for one seed", () => {
    const turn = {
      ...CLEAN_TURN,
      messages: [{ role: "user" as const, content: "email jane@acme.com" }],
    };

    expect(redactChatTurn(turn)).toEqual(redactChatTurn(turn));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run shared/utils/privacy/redactChatTurn/redactChatTurn.test.ts
```

Expected: FAIL. The module does not exist.

- [ ] **Step 3: Implement the pipeline**

Create `shared/utils/privacy/redactChatTurn/redactChatTurn.ts`:

```ts
import { detectPii } from "$/utils/privacy/detectPii/detectPii.ts";
import { applySurrogates } from "$/utils/privacy/surrogates/applySurrogates.ts";
import { buildSurrogateMap } from "$/utils/privacy/surrogates/buildSurrogateMap.ts";
import type {
  PiiCategory,
  PiiPatternHit,
  PiiSeverity,
} from "$/utils/privacy/detectPii/detectPii.ts";

/** One message as it is sent to, and retained from, the model. */
export type ChatTurnMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

/** The workspace schema the model was given for this turn. */
export type ChatTurnSchemaSnapshot = {
  datasets: ReadonlyArray<{ id: string; name: string }>;
  columns: ReadonlyArray<{
    dataset_id: string;
    name: string;
    data_type: string;
  }>;
};

/**
 * What redaction decided about one turn.
 *
 * `discarded` carries the *detected* severity, which is what the chat turn
 * event reports. `redacted` carries the *residual* severity, which is what the
 * stored sample records: `critical` is unreachable there by construction,
 * because every category that could produce it is either discarded outright or
 * fully substituted.
 */
export type ChatTurnRedactionOutcome =
  | { kind: "discarded"; detectedSeverity: PiiSeverity }
  | {
      kind: "redacted";
      messages: readonly ChatTurnMessage[];
      assistantText: string;
      generatedSql: string | undefined;
      schemaSnapshot: ChatTurnSchemaSnapshot;
      piiSeverity: "clean" | "warning";
      redactedCategories: readonly PiiCategory[];
    };

/**
 * Categories that cause the whole turn to be thrown away rather than redacted.
 *
 * Surrogates are never appropriate for identifiers and financial figures, and
 * generating a plausible fake government id inside otherwise real context is
 * the pattern auditors treat as inadequate de-identification. Medical data is
 * excluded outright regardless of how it was detected.
 */
const DISCARD_CATEGORIES: ReadonlySet<PiiCategory> = new Set([
  "government_id",
  "financial",
  "medical",
]);

/**
 * Runs both detector layers over a whole turn and merges the results.
 *
 * Content and column names are detected in separate calls, so `detectPii`'s
 * internal "both layers fired, therefore critical" escalation does not apply
 * across them; the severity here is the plain maximum of the parts. That
 * divergence is immaterial to what is retained, because the discard decision
 * is made per category rather than per severity, and every discard category
 * is critical on its own.
 */
function _detectAcrossTurn(
  options: Readonly<{
    texts: readonly string[];
    columnNames: readonly string[];
  }>,
): { hits: PiiPatternHit[]; severity: PiiSeverity; isMedical: boolean } {
  const contentResult = detectPii({ values: options.texts });
  const columnResults = options.columnNames.map((columnName) => {
    return detectPii({ columnName });
  });

  const hits = [
    ...contentResult.hits,
    ...columnResults.flatMap((result) => {
      return result.hits;
    }),
  ];
  const isMedical =
    contentResult.isMedical ||
    columnResults.some((result) => {
      return result.isMedical;
    });
  const severity =
    (
      columnResults.some((result) => {
        return result.severity === "critical";
      }) || contentResult.severity === "critical"
    ) ?
      "critical"
    : (
      columnResults.some((result) => {
        return result.severity === "warning";
      }) || contentResult.severity === "warning"
    ) ?
      "warning"
    : "clean";

  return { hits, severity, isMedical };
}

function _uniqueCategories(
  hits: readonly PiiPatternHit[],
): readonly PiiCategory[] {
  return [
    ...new Set(
      hits.map((hit) => {
        return hit.category;
      }),
    ),
  ];
}

/**
 * Decides whether one chat turn may be retained, and redacts it if so.
 *
 * The surrogate map is built once for the whole turn and applied to every
 * field, because if a prompt contains a value and the generated SQL contains
 * the same value in a `WHERE` clause, both must receive the same surrogate or
 * the sample is incoherent and worse than no sample. The map is local to this
 * call and is never returned: retaining it would make the result reversible.
 *
 * @param options.seed: a per-turn random seed the caller must not store
 * @returns a discard decision, or the redacted turn plus its residual severity
 */
export function redactChatTurn(
  options: Readonly<{
    messages: readonly ChatTurnMessage[];
    assistantText: string;
    generatedSql: string | undefined;
    schemaSnapshot: ChatTurnSchemaSnapshot;
    seed: number;
  }>,
): ChatTurnRedactionOutcome {
  const { messages, assistantText, generatedSql, schemaSnapshot, seed } =
    options;

  const texts = [
    ...messages.map((message) => {
      return message.content;
    }),
    assistantText,
    ...(generatedSql === undefined ? [] : [generatedSql]),
  ];
  const columnNames = schemaSnapshot.columns.map((column) => {
    return column.name;
  });

  const detected = _detectAcrossTurn({ texts, columnNames });
  const mustDiscard =
    detected.isMedical ||
    detected.hits.some((hit) => {
      return DISCARD_CATEGORIES.has(hit.category);
    });

  if (mustDiscard) {
    return { kind: "discarded", detectedSeverity: detected.severity };
  }

  const surrogates = buildSurrogateMap({ hits: detected.hits, seed });

  return {
    kind: "redacted",
    messages: messages.map((message) => {
      return {
        role: message.role,
        content: applySurrogates(message.content, surrogates),
      };
    }),
    assistantText: applySurrogates(assistantText, surrogates),
    generatedSql:
      generatedSql === undefined ?
        undefined
      : applySurrogates(generatedSql, surrogates),
    schemaSnapshot,
    // Residual rather than detected. Everything that could make this critical
    // has either sent the turn down the discard branch above or been replaced
    // with a surrogate.
    piiSeverity: detected.hits.length === 0 ? "clean" : "warning",
    redactedCategories: _uniqueCategories(detected.hits),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm vitest run shared/utils/privacy/redactChatTurn/redactChatTurn.test.ts
```

Expected: PASS, 10 tests.

- [ ] **Step 5: Review checkpoint**

Do not commit. Record the Vitest output.

---

## Task 8: Create the `chat_samples` table

Run `ava supabase switch feat-analytics-p3` before this task if it is not
already active.

**Files:**

- Create: `supabase/schemas/00.enum.chat_samples__pii_severity.sql`
- Create: `supabase/schemas/30.chat_samples.sql`
- Create: `supabase/tests/database/analytics/chat_samples_rls.test.sql`

- [ ] **Step 1: Write the failing pgTAP test**

Create `supabase/tests/database/analytics/chat_samples_rls.test.sql`:

```sql
-- `chat_samples` holds redacted conversation text, which is the most sensitive
-- data in this database. It has RLS enabled and no policies at all: service
-- role writes bypass RLS and nothing else may reach the table. A policy-less
-- table is only safe if that is actually true, so every access path an
-- authenticated caller has is asserted closed here.

\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values (
  'c1000001-0000-4000-8000-000000000001'::uuid,
  'sample_member@test.dev',
  'authenticated',
  'authenticated'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'c1001001-0000-4000-8000-000000000001'::uuid,
  'c1000001-0000-4000-8000-000000000001'::uuid,
  'chat sample workspace',
  'chat-sample-workspace'
);

insert into public.workspace_memberships (id, workspace_id, user_id)
values (
  'c1002001-0000-4000-8000-000000000001'::uuid,
  'c1001001-0000-4000-8000-000000000001'::uuid,
  'c1000001-0000-4000-8000-000000000001'::uuid
);

insert into public.chat_samples (
  workspace_id,
  user_id,
  feature_plan_type,
  model_id,
  page_app,
  outcome,
  attempt_count,
  had_consent_ack,
  messages,
  assistant_text,
  generated_sql,
  schema_snapshot,
  pii_severity,
  redacted_categories,
  redaction_version
) values (
  'c1001001-0000-4000-8000-000000000001'::uuid,
  'c1000001-0000-4000-8000-000000000001'::uuid,
  'free',
  'openai/gpt-4o-mini',
  'data_explorer',
  'sql',
  1,
  false,
  '[{"role":"user","content":"how many orders"}]'::jsonb,
  'Here is the SQL I ran.',
  'select count(*) from orders',
  '{"datasets":[],"columns":[]}'::jsonb,
  'clean',
  array[]::text[],
  1
);

select plan(7);

select has_table(
  'public',
  'chat_samples',
  'chat_samples exists'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public' and tablename = 'chat_samples'
  ),
  0::bigint,
  'chat_samples has no policies, so no API caller can reach it'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.chat_samples'::regclass
  ),
  'row level security is enabled, so the absent policies deny by default'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"c1000001-0000-4000-8000-000000000001"}',
  true
);

select is(
  (select count(*) from public.chat_samples),
  0::bigint,
  'a workspace member reads zero samples from their own workspace'
);

select throws_ok(
  $$
    insert into public.chat_samples (
      workspace_id,
      user_id,
      feature_plan_type,
      model_id,
      outcome,
      attempt_count,
      had_consent_ack,
      messages,
      assistant_text,
      schema_snapshot,
      pii_severity,
      redaction_version
    ) values (
      'c1001001-0000-4000-8000-000000000001'::uuid,
      'c1000001-0000-4000-8000-000000000001'::uuid,
      'free',
      'model',
      'text',
      1,
      false,
      '[]'::jsonb,
      'x',
      '{}'::jsonb,
      'clean',
      1
    )
  $$,
  '42501',
  null,
  'a workspace member cannot insert a sample'
);

select throws_ok(
  $$ delete from public.chat_samples $$,
  '42501',
  null,
  'a workspace member cannot delete samples'
);

set local role postgres;

select throws_ok(
  $$ select 'critical'::public.chat_samples__pii_severity $$,
  '22P02',
  null,
  'the severity enum has no critical value, so a critical sample cannot be stored at all'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm db:reset && pnpm test:db
```

Expected: FAIL. `chat_samples` does not exist, so the seeding insert aborts the
file.

- [ ] **Step 3: Create the severity enum**

Create `supabase/schemas/00.enum.chat_samples__pii_severity.sql`:

```sql
-- Residual privacy risk of a retained chat sample.
--
-- Deliberately narrower than the detector's own severity scale, which also has
-- `critical`. A turn whose detection reaches critical is either discarded
-- whole (government id, financial, medical) or has had every matched span
-- replaced with a same-type surrogate before it is written, so a stored sample
-- can never be critical. Leaving the value out of the type means the database
-- enforces that rather than trusting the writer.
create type public.chat_samples__pii_severity as enum(
  'clean',
  'warning'
);
```

- [ ] **Step 4: Create the table**

Create `supabase/schemas/30.chat_samples.sql`:

```sql
-- Redacted samples of free-plan chat turns, retained as a training corpus.
--
-- This is the most sensitive table in the database: it holds conversation
-- text, generated SQL, and a workspace schema snapshot. Three things keep that
-- acceptable, and all three are load-bearing.
--
-- First, capture is gated on the plan at request time, so no paid workspace's
-- conversations are ever retained. Second, a turn whose detector found
-- government id, financial, or medical data is discarded whole rather than
-- redacted and kept. Third, every value that survives has been replaced with a
-- same-type surrogate drawn from a per-turn seed that is discarded with the
-- map, which is what makes the result anonymised rather than pseudonymised.
--
-- RLS is enabled with no policies. Service-role writes bypass RLS and nothing
-- else can reach the table, so the absence of policies is the access control
-- rather than an oversight. See
-- `supabase/tests/database/analytics/chat_samples_rls.test.sql`.
create table public.chat_samples (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- The workspace whose conversation this was.
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Cascading on delete is the privacy-correct default: deleting a user
  -- removes their samples. It costs training data when users churn, which is
  -- the right trade.
  user_id uuid not null references auth.users (id) on update cascade on delete cascade,
  -- The plan at capture time, recorded rather than joined. If a workspace
  -- upgrades later, this record must still show that the sample was collected
  -- under the plan whose terms permitted it. A join to `subscriptions` would
  -- silently rewrite that history.
  feature_plan_type public.subscriptions__feature_plan_type not null,
  model_id text not null,
  -- Null on the generic chat surface, which has no `app_type` value.
  page_app public.app_type,
  outcome text not null,
  -- How many attempts the empty-response escalation in `PostChatMessages`
  -- took to produce this turn.
  attempt_count integer not null,
  had_consent_ack boolean not null,
  -- The redacted conversation, as `[{"role": ..., "content": ...}]`.
  messages jsonb not null,
  assistant_text text not null,
  generated_sql text,
  -- The datasets and columns the model was given. Without the schema a
  -- prompt-to-SQL pair is close to useless for training. The value duplicates
  -- across samples from one workspace; TOAST compression makes that acceptable
  -- at current volume.
  schema_snapshot jsonb not null,
  pii_severity public.chat_samples__pii_severity not null,
  redacted_categories text[] not null default '{}',
  -- Lets the detector improve without poisoning the corpus. When a pattern is
  -- tightened or a category added, samples captured under an older version can
  -- be re-filtered or discarded rather than guessed about.
  redaction_version integer not null,
  constraint chat_samples__outcome_check check (
    outcome in (
      'sql',
      'clarification',
      'dashboard_block',
      'text',
      'empty'
    )
  ),
  constraint chat_samples__attempt_count_check check (attempt_count > 0),
  constraint chat_samples__redaction_version_check check (redaction_version > 0)
);

create index chat_samples__workspace_id__created_at_idx on public.chat_samples (
  workspace_id,
  created_at desc
);

create index chat_samples__created_at_idx on public.chat_samples (
  created_at desc
);

alter table public.chat_samples enable row level security;

-- No policies are declared on purpose. Revoking explicitly means an accidental
-- future `grant ... to authenticated` cannot quietly open the table, because
-- there is still no policy to allow any row through.
revoke all on table public.chat_samples
from
  anon,
  authenticated;

-- Deletes samples past the retention window.
--
-- The window is a policy commitment that must match what the terms of service
-- state, not an implementation detail: see `docs/chat-sample-retention.md`.
-- The default is the 180 days that document records.
--
-- Runs as a plain function rather than `security definer`: only `service_role`
-- can execute it, and that role can already delete from the table, so there is
-- nothing to elevate.
--
-- @param p_retention_days: how many days of samples to keep
-- @returns: how many rows were deleted
create or replace function public.chat_samples__delete_expired (
  p_retention_days integer default 180
) returns integer as $$
declare
  deleted_count integer;
begin
  delete from public.chat_samples
  where created_at < (now() - (p_retention_days || ' days')::interval);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$ language plpgsql;

revoke execute on function public.chat_samples__delete_expired (integer)
from
  public,
  anon,
  authenticated;

grant
execute on function public.chat_samples__delete_expired (integer) to service_role;
```

- [ ] **Step 5: Generate the migration**

```bash
pnpm db:new-migration add_chat_samples
grep -c "chat_samples" supabase/migrations/*add_chat_samples.sql
```

Expected: a count of at least 10. If the generated file is empty, stop and
diagnose the declarative diff. Do not copy the table into the migration by
hand. Fix the schema input, remove the bad generated file, and regenerate.

- [ ] **Step 6: Apply and run the test**

```bash
pnpm db:reset && pnpm test:db
```

Expected: PASS. 7 assertions in `chat_samples_rls`, all ok.

- [ ] **Step 7: Regenerate the database types**

```bash
pnpm db:gen-types
git diff --stat shared/types/database.types.ts
```

Expected: `database.types.ts` gains the `chat_samples` row types and the
`chat_samples__pii_severity` enum.

- [ ] **Step 8: Review checkpoint**

Do not commit. Record the migration filename, the pgTAP output, and the types
diff.

---

## Task 9: Enforce the retention window

**Files:**

- Create: `supabase/tests/database/analytics/chat_samples_retention.test.sql`
- Create: `supabase/migrations/<timestamp>_schedule_chat_sample_retention.sql`

- [ ] **Step 1: Write the failing pgTAP test**

Create `supabase/tests/database/analytics/chat_samples_retention.test.sql`:

```sql
-- Retention is a policy commitment, so the window it enforces is asserted
-- rather than assumed. The boundary cases matter: a sample one day inside the
-- window must survive, and one day outside must not.

\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values (
  'c2000001-0000-4000-8000-000000000001'::uuid,
  'retention_user@test.dev',
  'authenticated',
  'authenticated'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'c2001001-0000-4000-8000-000000000001'::uuid,
  'c2000001-0000-4000-8000-000000000001'::uuid,
  'retention workspace',
  'retention-workspace'
);

insert into public.chat_samples (
  created_at,
  workspace_id,
  user_id,
  feature_plan_type,
  model_id,
  outcome,
  attempt_count,
  had_consent_ack,
  messages,
  assistant_text,
  schema_snapshot,
  pii_severity,
  redaction_version
)
select
  sample.created_at,
  'c2001001-0000-4000-8000-000000000001'::uuid,
  'c2000001-0000-4000-8000-000000000001'::uuid,
  'free',
  'openai/gpt-4o-mini',
  'text',
  1,
  false,
  '[]'::jsonb,
  'x',
  '{}'::jsonb,
  'clean',
  1
from (
  values
    (now() - interval '1 day'),
    (now() - interval '179 days'),
    (now() - interval '181 days'),
    (now() - interval '400 days')
) as sample(created_at);

select plan(4);

select has_function(
  'public',
  'chat_samples__delete_expired',
  array['integer'],
  'the retention function exists and takes a window in days'
);

select is(
  public.chat_samples__delete_expired(),
  2,
  'the default window deletes the two samples older than 180 days'
);

select is(
  (select count(*) from public.chat_samples),
  2::bigint,
  'the two samples inside the window survive'
);

select is(
  public.chat_samples__delete_expired(1),
  1,
  'a caller-supplied window is honoured'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it passes**

```bash
pnpm test:db
```

Expected: PASS. The function was created in Task 8, so this test goes green
immediately. That is intentional: the test exists to pin the window, and
writing it in Task 8 would have made that task's red step ambiguous.

If it fails, the function's interval arithmetic is wrong. Check that
`p_retention_days` is cast through a text interval and not compared directly.

- [ ] **Step 3: Write the guarded schedule migration**

The pg_cron schedule cannot be expressed declaratively: `db diff` does not
author extension operations, and an extension is not a `public` schema object.
This is a hand-written migration.

Create
`supabase/migrations/<timestamp>_schedule_chat_sample_retention.sql`, using the
current UTC timestamp in `YYYYMMDDHHMMSS` form for `<timestamp>`:

```sql
-- Schedules the chat-sample retention sweep.
--
-- Wrapped in exception handlers on purpose. `pg_cron` is not available on
-- every Postgres this migration runs against, and on a hosted Supabase project
-- the extension may need enabling from the dashboard before a migration can
-- create it. A retention schedule is not worth failing a deploy over: where
-- the extension is missing this logs a notice and moves on, and
-- `public.chat_samples__delete_expired` stays callable by `service_role` so
-- the sweep can be run by hand or by an external scheduler.
--
-- See `docs/chat-sample-retention.md` for how to enable the extension.
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception
    when others then
      raise notice 'pg_cron unavailable: schedule chat sample retention manually';
      return;
  end;

  begin
    perform cron.schedule(
      'chat-samples-retention',
      '17 3 * * *',
      $job$select public.chat_samples__delete_expired();$job$
    );
  exception
    when others then
      raise notice 'could not register the chat sample retention job: %', sqlerrm;
  end;
end
$$;
```

- [ ] **Step 4: Apply it and check what happened locally**

```bash
pnpm db:reset
pnpm db:sql-cmd "select extname from pg_extension where extname = 'pg_cron';"
```

Expected: either one row (the extension was created) or zero rows (it was not
available). **Both are passing outcomes.** Record which one occurred.

If one row came back, also check the job:

```bash
pnpm db:sql-cmd "select jobname, schedule from cron.job where jobname = 'chat-samples-retention';"
```

- [ ] **Step 5: Confirm the reset still succeeds either way**

```bash
pnpm db:reset && pnpm test:db
```

Expected: PASS. The whole point of the guards is that this command cannot fail
because of a missing extension.

- [ ] **Step 6: Document the hosted enablement path**

Fill in the placeholder section of `docs/chat-sample-retention.md`:

```markdown
## Enabling the pg_cron schedule on a hosted project

The retention migration creates the extension only if it can. On a hosted
Supabase project it may need enabling first, which is a dashboard action:

1. Open the Supabase dashboard for the project.
2. Go to Database, then Extensions.
3. Search for `pg_cron` and enable it.
4. Re-run the retention migration, or register the job directly:

   ```sql
   select cron.schedule(
     'chat-samples-retention',
     '17 3 * * *',
     $$select public.chat_samples__delete_expired();$$
   );
   ```

5. Verify it registered:

   ```sql
   select jobname, schedule, active from cron.job
   where jobname = 'chat-samples-retention';
   ```

Until that job exists, nothing deletes expired samples. Check for it whenever a
new environment is provisioned.
```

- [ ] **Step 7: Review checkpoint**

Do not commit. Record the pgTAP output and which pg_cron outcome occurred
locally.

---

## Task 10: Capture a sample in the chat function

**Files:**

- Create: `supabase/functions/chat/PostChatMessages/samples/captureChatSample.ts`
- Create: `supabase/functions/chat/PostChatMessages/samples/captureChatSample.test.ts`

- [ ] **Step 1: Write the failing test**

Create
`supabase/functions/chat/PostChatMessages/samples/captureChatSample.test.ts`:

```ts
/**
 * Every skip path matters as much as the happy path: a sample written when the
 * switch is off, the plan is paid, or the detector said discard is a privacy
 * incident, not a bug.
 */
import { captureChatSample } from "@sbfn/chat/PostChatMessages/samples/captureChatSample.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

type FakeClient = {
  client: AvaSupabaseClient;
  insert: ReturnType<typeof vi.fn>;
};

function _createFakeClient(
  options: Readonly<{ plan?: string | null; insertRejects?: boolean }> = {},
): FakeClient {
  const insert = vi.fn(() => {
    return {
      throwOnError: vi.fn(async () => {
        if (options.insertRejects) {
          throw new Error("insert exploded");
        }
        return { error: null };
      }),
    };
  });

  const maybeSingle = vi.fn(async () => {
    return {
      data:
        options.plan === null ? null : (
          { feature_plan_type: options.plan ?? "free" }
        ),
      error: null,
    };
  });

  const client = {
    from: vi.fn((table: string) => {
      if (table === "subscriptions") {
        return {
          select: () => {
            return {
              eq: () => {
                return { maybeSingle };
              },
            };
          },
        };
      }
      return { insert };
    }),
  } as unknown as AvaSupabaseClient;

  return { client, insert };
}

const BASE_TURN = {
  workspaceId: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000002",
  modelId: "openai/gpt-4o-mini",
  pageApp: "data-explorer" as const,
  outcome: "sql" as const,
  attemptCount: 1,
  hadConsentAck: false,
  messages: [{ role: "user" as const, content: "how many orders?" }],
  assistantText: "Here is the SQL I ran.",
  generatedSql: "select count(*) from orders",
  schemaSnapshot: { datasets: [], columns: [] },
};

beforeEach(() => {
  vi.stubEnv("CHAT_SAMPLE_CAPTURE_ENABLED", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("captureChatSample", () => {
  it("writes a sample for a free-plan turn with nothing sensitive in it", async () => {
    const fake = _createFakeClient({ plan: "free" });

    const result = await captureChatSample({
      supabaseAdminClient: fake.client,
      ...BASE_TURN,
    });

    expect(result).toEqual({ wasSampled: true, piiSeverity: "clean" });
    expect(fake.insert).toHaveBeenCalledTimes(1);
    expect(fake.insert.mock.calls[0]?.[0]).toMatchObject({
      workspace_id: BASE_TURN.workspaceId,
      user_id: BASE_TURN.userId,
      feature_plan_type: "free",
      model_id: "openai/gpt-4o-mini",
      page_app: "data_explorer",
      outcome: "sql",
      attempt_count: 1,
      had_consent_ack: false,
      pii_severity: "clean",
      redaction_version: 1,
    });
  });

  it("writes nothing when the capture switch is off", async () => {
    vi.stubEnv("CHAT_SAMPLE_CAPTURE_ENABLED", "false");
    const fake = _createFakeClient({ plan: "free" });

    const result = await captureChatSample({
      supabaseAdminClient: fake.client,
      ...BASE_TURN,
    });

    expect(result).toEqual({ wasSampled: false });
    expect(fake.insert).not.toHaveBeenCalled();
  });

  it("writes nothing when the switch is unset", async () => {
    vi.stubEnv("CHAT_SAMPLE_CAPTURE_ENABLED", "");
    const fake = _createFakeClient({ plan: "free" });

    await captureChatSample({
      supabaseAdminClient: fake.client,
      ...BASE_TURN,
    });

    expect(fake.insert).not.toHaveBeenCalled();
  });

  it("writes nothing for a paid workspace", async () => {
    const fake = _createFakeClient({ plan: "premium" });

    const result = await captureChatSample({
      supabaseAdminClient: fake.client,
      ...BASE_TURN,
    });

    expect(result).toEqual({ wasSampled: false });
    expect(fake.insert).not.toHaveBeenCalled();
  });

  it("writes nothing when the workspace has no subscription row", async () => {
    const fake = _createFakeClient({ plan: null });

    const result = await captureChatSample({
      supabaseAdminClient: fake.client,
      ...BASE_TURN,
    });

    expect(result).toEqual({ wasSampled: false });
    expect(fake.insert).not.toHaveBeenCalled();
  });

  it("discards a turn carrying a government id and reports the detected severity", async () => {
    const fake = _createFakeClient({ plan: "free" });

    const result = await captureChatSample({
      supabaseAdminClient: fake.client,
      ...BASE_TURN,
      messages: [{ role: "user", content: "look up ssn 123-45-6789" }],
    });

    expect(result).toEqual({ wasSampled: false, piiSeverity: "critical" });
    expect(fake.insert).not.toHaveBeenCalled();
  });

  it("stores the redacted text, never the original", async () => {
    const fake = _createFakeClient({ plan: "free" });

    await captureChatSample({
      supabaseAdminClient: fake.client,
      ...BASE_TURN,
      messages: [{ role: "user", content: "orders for jane@acme.com" }],
      generatedSql: "select * from orders where email = 'jane@acme.com'",
    });

    const written = JSON.stringify(fake.insert.mock.calls[0]?.[0]);
    expect(written).not.toContain("jane@acme.com");
    expect(fake.insert.mock.calls[0]?.[0]?.pii_severity).toBe("warning");
  });

  it("leaves page_app null on the generic surface", async () => {
    const fake = _createFakeClient({ plan: "free" });

    await captureChatSample({
      supabaseAdminClient: fake.client,
      ...BASE_TURN,
      pageApp: "other",
    });

    expect(fake.insert.mock.calls[0]?.[0]?.page_app).toBeNull();
  });

  it("never throws when the insert fails", async () => {
    const fake = _createFakeClient({ plan: "free", insertRejects: true });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await captureChatSample({
      supabaseAdminClient: fake.client,
      ...BASE_TURN,
    });

    expect(result).toEqual({ wasSampled: false });
    expect(console.error).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run supabase/functions/chat/PostChatMessages/samples/captureChatSample.test.ts
```

Expected: FAIL. The module does not exist.

- [ ] **Step 3: Implement capture**

Create
`supabase/functions/chat/PostChatMessages/samples/captureChatSample.ts`:

```ts
import { redactChatTurn } from "$/utils/privacy/redactChatTurn/redactChatTurn.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";
import type {
  AnalyticsApp,
  ChatTurnOutcome,
} from "$/analytics/AnalyticsEvents/AnalyticsEvents.types.ts";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";
import type {
  ChatTurnMessage,
  ChatTurnSchemaSnapshot,
} from "$/utils/privacy/redactChatTurn/redactChatTurn.ts";

/**
 * Bumped whenever the detector or the surrogate generators change, so samples
 * captured under an older version can be re-filtered or discarded rather than
 * guessed about.
 */
const REDACTION_VERSION = 1;

/** What capture decided, reported on the turn's analytics event. */
export type ChatSampleCaptureResult = {
  wasSampled: boolean;
  piiSeverity?: "clean" | "warning" | "critical";
};

const NOT_SAMPLED: ChatSampleCaptureResult = { wasSampled: false };

/**
 * The chat page context uses hyphenated surface names while the database enum
 * uses underscores, and the generic surface has no enum value at all.
 */
function _pageAppToAppType(
  pageApp: ChatPageContext.ChatApp,
): AnalyticsApp | null {
  switch (pageApp) {
    case "data-explorer":
      return "data_explorer";
    case "data-sources":
      return "data_sources";
    case "dashboards":
      return "dashboards";
    case "other":
      return null;
  }
}

/** True only for the exact string `"true"`, so an unset variable stays off. */
function _isCaptureEnabled(): boolean {
  return Deno.env.get("CHAT_SAMPLE_CAPTURE_ENABLED") === "true";
}

async function _readFeaturePlanType(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseClient;
    workspaceId: string;
  }>,
): Promise<string | undefined> {
  const { data } = await options.supabaseAdminClient
    .from("subscriptions")
    .select("feature_plan_type")
    .eq("workspace_id", options.workspaceId)
    .maybeSingle();
  return data?.feature_plan_type ?? undefined;
}

/**
 * Retains one redacted chat turn, when every gate allows it.
 *
 * The gates, in order: the capture switch must be on, the workspace must be on
 * the free plan at request time, and the turn must not carry government id,
 * financial, or medical data. A turn failing any of them is not written at all.
 *
 * Awaited by the caller rather than deferred with `EdgeRuntime.waitUntil`. It
 * adds roughly one database roundtrip to a call that already takes seconds,
 * and `waitUntil` work can be killed on worker shutdown, which would produce
 * silent partial capture.
 *
 * Never throws. A chat turn the user already paid for must not fail because a
 * sample could not be retained.
 */
export async function captureChatSample(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseClient;
    workspaceId: string;
    userId: string;
    modelId: string;
    pageApp: ChatPageContext.ChatApp;
    outcome: ChatTurnOutcome;
    attemptCount: number;
    hadConsentAck: boolean;
    messages: readonly ChatTurnMessage[];
    assistantText: string;
    generatedSql: string | undefined;
    schemaSnapshot: ChatTurnSchemaSnapshot;
  }>,
): Promise<ChatSampleCaptureResult> {
  if (!_isCaptureEnabled()) {
    return NOT_SAMPLED;
  }

  try {
    const featurePlanType = await _readFeaturePlanType({
      supabaseAdminClient: options.supabaseAdminClient,
      workspaceId: options.workspaceId,
    });
    // A workspace with no subscription row is not known to be free, so it is
    // not sampled.
    if (featurePlanType !== "free") {
      return NOT_SAMPLED;
    }

    // The seed is drawn per turn and never leaves this function. Storing it,
    // or the map it produces, would make the retained sample reversible.
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
    const redaction = redactChatTurn({
      messages: options.messages,
      assistantText: options.assistantText,
      generatedSql: options.generatedSql,
      schemaSnapshot: options.schemaSnapshot,
      seed,
    });

    if (redaction.kind === "discarded") {
      return {
        wasSampled: false,
        piiSeverity: redaction.detectedSeverity,
      };
    }

    await options.supabaseAdminClient
      .from("chat_samples")
      .insert({
        workspace_id: options.workspaceId,
        user_id: options.userId,
        feature_plan_type: featurePlanType,
        model_id: options.modelId,
        page_app: _pageAppToAppType(options.pageApp),
        outcome: options.outcome,
        attempt_count: options.attemptCount,
        had_consent_ack: options.hadConsentAck,
        messages: redaction.messages as never,
        assistant_text: redaction.assistantText,
        generated_sql: redaction.generatedSql ?? null,
        schema_snapshot: redaction.schemaSnapshot as never,
        pii_severity: redaction.piiSeverity,
        redacted_categories: [...redaction.redactedCategories],
        redaction_version: REDACTION_VERSION,
      })
      .throwOnError();

    return { wasSampled: true, piiSeverity: redaction.piiSeverity };
  } catch (error) {
    console.error("[chat-samples] failed to capture sample", error);
    return NOT_SAMPLED;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm vitest run supabase/functions/chat/PostChatMessages/samples/captureChatSample.test.ts
```

Expected: PASS, 9 tests.

If `Deno.env` is undefined under Vitest, add a narrow shim at the top of the
module rather than changing the test:

```ts
function _readCaptureFlag(): string | undefined {
  return typeof Deno === "undefined" ?
      (globalThis as { process?: { env?: Record<string, string> } }).process
        ?.env?.CHAT_SAMPLE_CAPTURE_ENABLED
    : Deno.env.get("CHAT_SAMPLE_CAPTURE_ENABLED");
}
```

and call it from `_isCaptureEnabled`. `vi.stubEnv` writes to `process.env`, so
this is what makes the switch testable in both runtimes.

- [ ] **Step 5: Review checkpoint**

Do not commit. Record the Vitest output.

---

## Task 11: Report sampling on the chat turn event

Phase 3 shipped `chat.turn_completed` with `wasSampled: false` hardcoded and no
`piiSeverity`. Both now come from capture.

**Files:**

- Modify: `supabase/functions/chat/PostChatMessages/analytics/ChatTurnAnalyticsPayloads.ts`
- Modify: `supabase/functions/chat/PostChatMessages/analytics/ChatTurnAnalyticsPayloads.test.ts`
- Modify: `supabase/functions/chat/PostChatMessages/analytics/emitChatTurnAnalytics.ts`
- Modify: `supabase/functions/chat/PostChatMessages/PostChatMessages.ts`

- [ ] **Step 1: Write the failing test**

In
`supabase/functions/chat/PostChatMessages/analytics/ChatTurnAnalyticsPayloads.test.ts`,
add `capture: { wasSampled: false }` to every existing `fromCompletedTurn`
call, so the suite compiles against the new required option. The existing
assertions in "classifies a turn that generated SQL" stay exactly as they are:
with that capture result they still describe correct behaviour, and keeping
them green through this change is the point.

Then add a new describe block:

```ts
describe("ChatTurnAnalyticsPayloads sampling fields", () => {
  it("reports a retained sample and its residual severity", () => {
    const payload = ChatTurnAnalyticsPayloads.fromCompletedTurn({
      ...BASE_COMPLETED,
      assistantText: "ok",
      parsed: { generatedSql: { sql: "SELECT 1" } },
      capture: { wasSampled: true, piiSeverity: "warning" },
    });

    expect(payload.wasSampled).toBe(true);
    expect(payload.piiSeverity).toBe("warning");
  });

  it("reports why a turn was thrown away", () => {
    const payload = ChatTurnAnalyticsPayloads.fromCompletedTurn({
      ...BASE_COMPLETED,
      assistantText: "ok",
      parsed: { text: "ok" },
      capture: { wasSampled: false, piiSeverity: "critical" },
    });

    expect(payload.wasSampled).toBe(false);
    expect(payload.piiSeverity).toBe("critical");
  });

  it("omits the severity when nothing assessed it", () => {
    const payload = ChatTurnAnalyticsPayloads.fromCompletedTurn({
      ...BASE_COMPLETED,
      assistantText: "ok",
      parsed: { text: "ok" },
      capture: { wasSampled: false },
    });

    expect(payload.wasSampled).toBe(false);
    expect(payload).not.toHaveProperty("piiSeverity");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run supabase/functions/chat/PostChatMessages/analytics/ChatTurnAnalyticsPayloads.test.ts
```

Expected: FAIL. `capture` is not an accepted option.

- [ ] **Step 3: Take the capture result in the payload builder**

In `ChatTurnAnalyticsPayloads.ts`, add the import and change
`_fromCompletedTurn`:

```ts
import type { ChatSampleCaptureResult } from "@sbfn/chat/PostChatMessages/samples/captureChatSample.ts";
```

```ts
function _fromCompletedTurn(
  options: Readonly<{
    modelId: string;
    latencyMs: number;
    attemptCount: number;
    promptChars: number;
    schemaDatasetCount: number;
    assistantText: string;
    parsed: ParsedTurn;
    capture: ChatSampleCaptureResult;
  }>,
): AnalyticsEventPayloads["chat.turn_completed"] {
  return {
    modelId: options.modelId,
    latencyMs: Math.round(options.latencyMs),
    attemptCount: options.attemptCount,
    outcome: _classifyOutcome(options.parsed),
    promptChars: options.promptChars,
    responseChars: options.assistantText.length,
    schemaDatasetCount: options.schemaDatasetCount,
    wasSampled: options.capture.wasSampled,
    // The *detected* severity, which can be critical, unlike the residual
    // severity stored on a retained sample. This is what makes "how many turns
    // are we throwing away, and why" answerable.
    ...(options.capture.piiSeverity === undefined ?
      {}
    : { piiSeverity: options.capture.piiSeverity }),
  };
}
```

- [ ] **Step 4: Thread it through the emitter**

In `emitChatTurnAnalytics.ts`, add `capture` to the `completed` variant of
`ChatTurnOutcomeRecord` and pass it on:

```ts
  | {
      kind: "completed";
      modelId: string;
      latencyMs: number;
      attemptCount: number;
      promptChars: number;
      schemaDatasetCount: number;
      assistantText: string;
      capture: ChatSampleCaptureResult;
      parsed: {
        text?: string;
        generatedSql?: unknown;
        clarification?: unknown;
        dashboardBlock?: unknown;
      };
    }
```

```ts
      payload: ChatTurnAnalyticsPayloads.fromCompletedTurn({
        modelId: outcome.modelId,
        latencyMs: outcome.latencyMs,
        attemptCount: outcome.attemptCount,
        promptChars: outcome.promptChars,
        schemaDatasetCount: outcome.schemaDatasetCount,
        assistantText: outcome.assistantText,
        parsed: outcome.parsed,
        capture: outcome.capture,
      }),
```

Add the import:

```ts
import type { ChatSampleCaptureResult } from "@sbfn/chat/PostChatMessages/samples/captureChatSample.ts";
```

- [ ] **Step 5: Capture before emitting**

In `supabase/functions/chat/PostChatMessages/PostChatMessages.ts`, add the
import:

```ts
import { captureChatSample } from "@sbfn/chat/PostChatMessages/samples/captureChatSample.ts";
```

Then, between the `result` construction and the existing
`emitChatTurnAnalytics` call added in Phase 3, insert the capture and pass its
result through:

```ts
    const capture = await captureChatSample({
      supabaseAdminClient,
      workspaceId,
      userId: user.id,
      modelId: model,
      pageApp: context.app,
      outcome:
        generatedSql ? "sql"
        : clarification ? "clarification"
        : dashboardBlock ? "dashboard_block"
        : text ? "text"
        : "empty",
      attemptCount,
      hadConsentAck: (consentAcks ?? []).length > 0,
      messages,
      assistantText,
      generatedSql: generatedSql?.sql,
      schemaSnapshot: schema,
    });

    await emitChatTurnAnalytics({
      supabaseAdminClient,
      workspaceId,
      userId: user.id,
      pageApp: context.app,
      outcome: {
        kind: "completed",
        modelId: model,
        latencyMs: performance.now() - turnStartedAt,
        attemptCount,
        promptChars: lastUserPrompt.length,
        schemaDatasetCount: schema.datasets.length,
        assistantText,
        capture,
        parsed: { text, generatedSql, clarification, dashboardBlock },
      },
    });

    return result;
```

The outcome expression duplicates `_classifyOutcome`'s ordering. That is
deliberate: the sample's `outcome` column is constrained by the database and
must agree with the event, and a shared import from the analytics module into
the capture path would couple two things that are allowed to diverge later.
If it drifts, the pgTAP check constraint in Task 8 fails loudly rather than
silently storing a bad value.

- [ ] **Step 6: Run the whole chat suite**

```bash
pnpm vitest run supabase/functions/chat
pnpm type-check
```

Expected: PASS and zero type errors.

- [ ] **Step 7: Review checkpoint**

Do not commit. Record both outputs.

---

## Task 12: Full verification and spec status update

**Files:**

- Modify: `docs/superpowers/specs/2026-08-13-usage-analytics-events-design.md`

- [ ] **Step 1: Run every relevant suite**

```bash
pnpm test:frontend
pnpm db:reset && pnpm test:db
pnpm type-check && pnpm lint
```

Expected: all clean.

- [ ] **Step 2: Prove the switch is off by default**

```bash
rg -n "CHAT_SAMPLE_CAPTURE_ENABLED" supabase src .env.development 2>/dev/null
```

Expected: hits only in
`supabase/functions/chat/PostChatMessages/samples/captureChatSample.ts`, its
test, and `docs/chat-sample-retention.md`. **The variable must not be set in
any environment file in this repository.** If it appears in one, remove it:
enabling capture is a deployment action taken after the terms-of-service
confirmation, not a repository default.

- [ ] **Step 3: Prove no raw text can reach the table**

```bash
rg -n "insert" supabase/functions/chat/PostChatMessages/samples/captureChatSample.ts
```

Expected: exactly one insert, and every text field on it sourced from
`redaction.*` rather than from `options.*`. Read the call and confirm this by
eye. `options.messages`, `options.assistantText`, and `options.generatedSql`
must not appear in the inserted row.

- [ ] **Step 4: Confirm the isolated Supabase config is not staged**

```bash
git status --short supabase/config.toml
```

Expected: no output, or a change the user is told about explicitly. Per
`AGENTS.md`, `ava supabase restore` must run before any merge to `develop`, and
a branch-scoped `config.toml` must never be committed. Tell the user they are
responsible for running `ava supabase restore` when they finish validating this
branch.

- [ ] **Step 5: Update the spec's phase status**

In `docs/superpowers/specs/2026-08-13-usage-analytics-events-design.md`,
replace the Phase 4 paragraph in the "Phase status" section:

```markdown
**Phase 4, chat samples: complete (2026-08-15).** `detectPii` now lives in
`shared/utils/privacy/detectPii/` and returns every matched span. The
surrogates module, `redactChatTurn`, the `chat_samples` table, the capture
pipeline, and the retention function are implemented. Implemented by
`docs/superpowers/plans/2026-08-15-analytics-chat-samples.md`.

**Capture is off by default.** It runs only when
`CHAT_SAMPLE_CAPTURE_ENABLED` is exactly `"true"` on the `chat` edge function,
which is set nowhere in this repository. That gate exists so the code could
land before the terms-of-service question below was answered; enabling it is a
deliberate deployment action.

Three conflicts in the sections below were resolved during implementation.

1. **The discard gate is by category, not by severity.** Step 4 of Chat Sample
   Capture said to skip when severity is critical, while the Redaction Strategy
   table said `direct_identifier` and `precise_location` are surrogate-replaced.
   Those cannot both hold, because `detectPii` classifies both as critical, so
   the severity gate would have discarded nearly every turn and left the
   surrogate machinery dead. A turn is discarded when a hit's category is
   `government_id`, `financial`, or `medical`, exactly as the table says.
2. **`chat_samples.pii_severity` records residual, not detected, risk.** It is
   `clean` when the turn had no hits and `warning` when redaction did work.
   `critical` is absent from the enum entirely, so the database enforces that a
   critical sample cannot land. `chat.turn_completed.piiSeverity` still carries
   the detected severity, which can be critical, because that event exists to
   show how many turns are being thrown away.
3. **Retention has a mechanism.** `public.chat_samples__delete_expired` is in
   the table's schema file and is scheduled with pg_cron by a hand-written
   migration whose extension creation and job registration are both wrapped in
   exception handlers. Where pg_cron is unavailable the migration logs a notice
   and the function stays callable by `service_role`. See
   `docs/chat-sample-retention.md`.
```

- [ ] **Step 6: Update the Implementation Phases section**

Replace the Phase 4 entry:

```markdown
**Phase 4, chat samples: complete.** Moving `detectPii` to `shared/`, extending
it to return all matched spans, the surrogates module, the `chat_samples`
table, the capture pipeline, and retention. Implemented by
`docs/superpowers/plans/2026-08-15-analytics-chat-samples.md`, behind an
off-by-default capture switch.
```

- [ ] **Step 7: Correct the Assumptions Requiring Confirmation section**

Replace that section's first paragraph:

```markdown
The current terms of service must grant the right to train on free-plan chat
inputs and outputs before capture is enabled. This is no longer a
ship-blocking assumption: capture is gated on `CHAT_SAMPLE_CAPTURE_ENABLED`,
which is unset everywhere, so the code ships inert and the switch is thrown
only after the confirmation recorded in `docs/chat-sample-retention.md`.
```

- [ ] **Step 8: Final review checkpoint**

Do not commit. Report to the user:

1. The results of `pnpm test:frontend`, `pnpm test:db`, `pnpm type-check`, and
   `pnpm lint`.
2. Whether pg_cron was available locally, and that the hosted project needs the
   dashboard step in `docs/chat-sample-retention.md` before retention runs
   anywhere.
3. That `CHAT_SAMPLE_CAPTURE_ENABLED` is set nowhere, so no sample can be
   captured until they set it, and that Task 1's terms-of-service confirmation
   gates that action.
4. That `ava supabase restore` is theirs to run before merging.
5. The full list of what Phase 4 deliberately leaves undone, below.

---

## What This Phase Deliberately Leaves Undone

- **Local-runtime chat is never sampled.** A turn resolved to
  `mode.kind === "local"` never reaches the server. This is permanent, not a
  deferral: there is no server-side observation point to add.
- **`schema_snapshot` is not deduplicated.** Every sample from one workspace
  carries a near-identical copy of that workspace's datasets and columns. TOAST
  compression makes this acceptable at current volume. If it grows, dedupe by
  content hash into a side table; the column can be replaced with a reference
  without touching the capture path.
- **The detector is regex-based and will miss things.** That is precisely why
  surrogates are used instead of tags: a miss surrounded by plausible fakes is
  far harder to pick out than a miss surrounded by `[REDACTED]` markers. When
  the detector improves, bump `REDACTION_VERSION` so older samples can be
  re-filtered rather than guessed about.
- **Nothing reads `chat_samples` in the app.** Reads are service-role SQL only.
  No reporting view was added, because the corpus is training data rather than
  product analytics.
- **`dashboard.public_viewed` and the public-dashboard `query.failed` gap
  remain deferred.** They were deferred in Phase 3 for the same reason: both
  need an anonymous edge route with JWT verification disabled, and
  `dashboard.public_viewed` is the lowest-value event in the catalog.
