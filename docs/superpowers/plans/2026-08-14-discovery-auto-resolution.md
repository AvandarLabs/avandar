# Discovery Auto-Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve obvious text-filter discovery clarifications locally and
recover from failed discovery catalogs without trapping the user.

**Architecture:** The model includes prompt-derived candidate values in the
existing discovery tool call. A dedicated pure client module normalizes those
candidates and compares them with locally queried DuckDB values. One unique
match follows the existing consent-aware clarification submission path;
otherwise the existing option catalog remains visible. Discovery queries make
three total attempts, then expose retry, manual entry, and a new-model-lookup
recovery action.

**Tech Stack:** TypeScript, React, Mantine, Lingui, DuckDB-WASM, Supabase Edge
Functions, Vitest, Playwright.

## Global Constraints

- Candidate values come only from the user's prompt and the model's general
  knowledge. Dataset values never cross the LLM boundary before consent.
- Match only normalized exact values: Unicode NFKC, trim, and lowercase. Do not
  use fuzzy or substring matching.
- Automatically resolve only single-value discovery with exactly one stored
  match.
- Preserve the existing scrollable clarification-card UI.
- Make three total local query attempts before exposing terminal recovery.
- Keep all user-facing text behind Lingui macros.
- Do not commit, push, merge, or publish unless the user authorizes it.

---

### Task 1: Extend and validate the discovery tool contract

**Files:**
- Modify: `shared/types/chat.types.ts`
- Modify: `supabase/functions/chat/PostChatMessages/prompt/buildSystemPrompts.ts`
- Modify: `supabase/functions/chat/PostChatMessages/prompt/buildChatToolConfig.ts`
- Modify: `supabase/functions/chat/buildDataExplorerToolDefinitions/buildDataExplorerToolDefinitions.ts`
- Modify: `supabase/functions/chat/PostChatMessages/parsing/parseClarify.ts`
- Test: `supabase/functions/chat/PostChatMessages/parsing/parseClarify.test.ts`
- Test: `supabase/functions/chat/buildDataExplorerToolDefinitions/buildDataExplorerToolDefinitions.test.ts`

**Interfaces:**
- Produces: discovery response shape field `candidateValues: string[]`.
- Produces: `makeDiscoveryCandidateValuesFromModelOutput(values: unknown): string[]`.

- [ ] Add parser tests proving candidate values are trimmed, deduplicated,
      bounded, and retained for discovery requests.
- [ ] Run the focused parser tests and confirm they fail because the field is
      not parsed yet.
- [ ] Add the shared field, central parser function, both tool schemas, and
      prompt instructions that explicitly prohibit deriving candidates from
      dataset contents.
- [ ] Run the focused edge-function tests and confirm they pass.

### Task 2: Add local candidate matching

**Files:**
- Create: `src/components/ChatPanel/ClarificationCard/DiscoveryCandidateValues.ts`
- Create: `src/components/ChatPanel/ClarificationCard/DiscoveryCandidateValues.test.ts`

**Interfaces:**
- Consumes: prompt-derived `candidateValues` and local `discoveredValues`.
- Produces: `DiscoveryCandidateValues.getUniqueMatch(...)` returning one stored
  value or `undefined`.

- [ ] Add tests for `California` versus `california`, `CA`, Unicode/whitespace,
      no matches, duplicate candidates, and two stored values that normalize to
      the same candidate.
- [ ] Run the focused test and confirm it fails because the module is absent.
- [ ] Implement normalization and unique-match selection as pure functions.
- [ ] Run the focused test and confirm it passes.

### Task 3: Retry discovery and auto-submit unique matches

**Files:**
- Modify: `src/components/ChatPanel/ClarificationCard/useDiscoveryOptions.ts`
- Modify: `src/components/ChatPanel/ClarificationCard/DiscoveryBody.tsx`
- Modify: `src/components/ChatPanel/ClarificationCard/ClarificationCardBody.tsx`
- Modify: `src/components/ChatPanel/ClarificationCard/ClarificationCard.tsx`
- Test: `src/components/ChatPanel/ClarificationCard/useDiscoveryOptions.test.tsx`
- Test: `src/components/ChatPanel/ClarificationCard/DiscoveryBody.test.tsx`

**Interfaces:**
- Produces: loading state with attempt number, ready state, terminal error state,
  and a `retry` callback.
- Calls: existing `onSubmit({ kind: "preset", value })` for one unique match,
  preserving the existing privacy-consent path.

- [ ] Add hook tests for first-attempt success, third-attempt success, and a
      terminal error after exactly three attempts.
- [ ] Add component tests proving a unique candidate auto-submits once while
      zero or ambiguous matches render the catalog.
- [ ] Run the focused tests and confirm expected failures.
- [ ] Implement retry state and unique-match auto-submission with cancellation
      and duplicate-submission guards.
- [ ] Run the focused tests and confirm they pass.

### Task 4: Add terminal recovery actions

**Files:**
- Modify: `src/components/ChatPanel/ClarificationCard/DiscoveryUnavailableBody.tsx`
- Modify: `src/components/ChatPanel/PendingClarificationBlock/PendingClarificationBlock.tsx`
- Create: `src/components/ChatPanel/PendingClarificationBlock/useDiscoveryRecovery.ts`
- Test: `src/components/ChatPanel/PendingClarificationBlock/PendingClarificationBlock.test.tsx`

**Interfaces:**
- Produces: retry action for the same query and a different-lookup action.
- Different-lookup action clears pending clarification, records cancellation,
  and appends a non-clarification instruction asking the model for another
  column or query. It does not count toward the clarification cap.

- [ ] Add tests proving both recovery callbacks are wired and the
      different-lookup action unblocks the thread.
- [ ] Run the focused tests and confirm expected failures.
- [ ] Add translated Mantine actions while preserving manual exact-value entry.
- [ ] Run the focused tests and confirm they pass.

### Task 5: Verify the user-facing flows

**Files:**
- Modify: `tests/e2e/chat-interactive-workflows.spec.ts`

**Interfaces:**
- Verifies: local auto-resolution, terminal recovery, and the existing
  scrollable 50-option catalog.

- [ ] Strengthen the large-catalog test to scroll, select an option, submit,
      and observe the next turn.
- [ ] Add focused mocked-chat coverage for a unique California candidate and a
      failed catalog recovery action where the existing harness permits it.
- [ ] Run each affected Playwright test individually.
- [ ] Run focused Vitest suites, ESLint, Stylelint, Prettier check, TypeScript,
      and React Doctor.
- [ ] Review the final diff for privacy-boundary regressions and unrelated
      changes.
