# 027 — Privacy: Spanish + French discovery stubs

- **Slug**: `privacy-discovery-spanish-french-stubs`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-027/privacy-discovery-spanish-french-stubs`
- **Depends on**: `022-privacy-pii-detector`, `023-privacy-bias-detector` (the stubs follow their interfaces).
- **Estimated PR size**: tiny — 2 stub files + i18n catalogs, ~150 lines.

## Notes for future you

- **UX copy is translated; the patterns themselves are stubs** awaiting advisor review. Don't treat the patterns as production-ready — they're placeholders so the rest of the privacy stack can compile against multi-locale code paths.
- The advisor review is an out-of-band task and not part of this migration. Once advisors return real patterns, a follow-up PR replaces the stubs.

## What this feature is

Locale stub files for Spanish (es) and French (fr) variants of the PII (#022) and bias (#023) detectors. The interfaces match the English baseline but the matchers are stubs. The i18n consent-modal copy is fully translated.

## Steps to migrate

**Step 0** — `/deslop undrift privacy-discovery-spanish-french-stubs`.

1. Confirm #022 and #023 have merged.
2. Create the refactor branch.
3. Copy the locale stub files + i18n catalog entries verbatim.
4. Run verification.

### Files to copy verbatim

```
src/lib/privacy/locales/es.ts
src/lib/privacy/locales/fr.ts
src/lib/privacy/locales/index.ts
src/locales/es/privacy.po (or however i18n catalogs are organized — match source branch)
src/locales/fr/privacy.po
```

### Files to surgically edit on `develop`

- `src/lib/privacy/piiDetector.ts` and `biasDetector.ts` — accept an optional `locale` parameter that picks the right stub set.

### Files to delete

None.

### Dependency changes

None.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run src/lib/privacy
```

### Manual

1. Switch workspace locale to Spanish (or French) once row #079 lands — until then, manually flip the language preference via DevTools.
2. Trigger the consent modal. Confirm the modal copy renders in the chosen locale.
3. Confirm the detection itself still works against the stubs (English patterns may also still match, by design).

## Risks + things to look out for

- **Stub patterns may false-positive in surprising ways.** Document this as a known limitation in the Privacy log UI (`#026`) once advisors return real patterns.
- **Locale loading.** If the stub file fails to load, the detector should fall back to English silently rather than crashing.

## How to mark this feature completed

Standard ritual.
