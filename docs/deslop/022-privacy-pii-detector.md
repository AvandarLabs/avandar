# 022 — Privacy: PII detector

- **Slug**: `privacy-pii-detector`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-022/privacy-pii-detector`
- **Depends on**: `none` (foundational for the rest of phase 0).
- **Estimated PR size**: small — 1 module + tests, ~300–400 lines.

## Notes for future you

- This is **the first row of the chat-interactive-workflows phase-0 privacy guardrails**. The spec is `docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md` (read it for the broader context — phases 0–9 are rows #022–#043 in inventory order).
- Pure-function module — no React, no Supabase, no IO. 16 unit tests cover it. The fix-cost of a bug here is low because all callers (rows #024 / #025 / #030) detect via this module.

## What this feature is

`src/lib/privacy/piiDetector.ts` — a pure-function detector that classifies a payload as PII or not, with two layers:

- **Column-name keyword layer** — matches against a list of canonical PII keywords (`email`, `ssn`, `phone`, etc.).
- **Content regex layer** — matches values against regexes for email, SSN, Luhn-valid credit cards, IBAN, IP addresses, dates of birth, postal addresses.

Returns a structured `{ kinds: PIIKind[]; columns: string[] }` so callers can show targeted UI.

## Steps to migrate

**Step 0** — `/deslop undrift privacy-pii-detector`.

1. Create the refactor branch off `develop`.
2. Copy the module + tests verbatim.
3. Run verification.

### Files to copy verbatim

```
src/lib/privacy/piiDetector.ts
src/lib/privacy/piiDetector.test.ts
```

### Files to surgically edit on `develop`

None — this is a leaf module with no upstream consumers until rows #024 / #025 / #030 land.

### Files to delete

None.

### Dependency changes

None.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run src/lib/privacy/piiDetector
```

All 16 tests should pass.

### Manual

No UI surface yet — this row is leaf code. Manual QA waits for #024 (consent modal) and #025 (crossBoundary).

## Risks + things to look out for

- **False positives** are user-facing later — over-aggressive regexes flag innocuous text as PII. The test suite covers the known false-positive cases; preserve every test.
- **Regex performance.** Some regexes (e.g. address matching) are non-trivial. The module avoids backtracking pathologies; don't "simplify" without re-running tests.

## How to mark this feature completed

Standard ritual.
