# 023 — Privacy: bias detector

- **Slug**: `privacy-bias-detector`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-023/privacy-bias-detector`
- **Depends on**: `none` (sibling of #022 — both feed into #024 / #030).
- **Estimated PR size**: small — 1 module + tests, ~250–350 lines.

## Notes for future you

- Sibling of #022 (`privacy-pii-detector`). Same shape: pure function, no React, no IO.
- Spec: `docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md` phase 0.
- The "curated suggestions" returned alongside detection are short, opinionated rewrites the user can accept. Keep them short — the consent modal (#024) renders them inline.

## What this feature is

`src/lib/privacy/biasDetector.ts` — a pure-function detector for bias patterns in user text, with five rule families:

- Gender bias (he/him assumptions, gendered occupations).
- Ethnic / cultural bias (loaded ethnic descriptors, cultural generalizations).
- Loaded framing (emotionally charged or leading phrasing).
- Statistical assumptions (anchoring on small samples, correlation-as-causation).
- Curated suggestion strings for each rule hit.

Returns `{ rules: BiasRule[]; suggestions: string[] }`. 11 unit tests.

## Steps to migrate

**Step 0** — `/deslop undrift privacy-bias-detector`.

1. Create the refactor branch off `develop`.
2. Copy the module + tests verbatim.
3. Run verification.

### Files to copy verbatim

```
src/lib/privacy/biasDetector.ts
src/lib/privacy/biasDetector.test.ts
```

### Files to surgically edit on `develop`

None.

### Files to delete

None.

### Dependency changes

None.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run src/lib/privacy/biasDetector
```

11 tests should pass.

### Manual

No UI yet; waits for #024 / #030.

## Risks + things to look out for

- **Localization.** Rules are English-only baseline. Locale stubs ship in #027.
- **Bias detection is high-judgment.** Over-flagging frustrates users; under-flagging undermines the feature. The test suite represents the calibrated balance — don't rebalance without operator review.

## How to mark this feature completed

Standard ritual.
