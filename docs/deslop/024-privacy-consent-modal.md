# 024 — Privacy: consent modal

- **Slug**: `privacy-consent-modal`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-024/privacy-consent-modal`
- **Depends on**: `022-privacy-pii-detector`, `023-privacy-bias-detector` (the modal consumes both).
- **Estimated PR size**: medium — ~5–8 files, ~500–700 lines.

## Notes for future you

- The consent modal has **five modes** (A/B/C/D/E):
  - **A: Clean** — no PII / no bias detected. Lightweight confirmation.
  - **B: PII** — flagged PII; lists kinds + columns; user accepts to proceed.
  - **C: Bias** — flagged bias; shows rules + suggestions; user can edit before sending.
  - **D: Composite** — both PII and bias.
  - **E: Medical-strict typed-phrase** — for PHI-like categories, require the user to type a specific phrase before proceeding.
- Modes can re-render on rapid input — render-perf matters. Memoize aggressively.
- Spec: `docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md`.

## What this feature is

A modal that intercepts outgoing chat messages when the PII (#022) or bias (#023) detectors flag content. The modal presents one of five mode-specific UIs and either lets the user proceed (with consent logged) or edit/cancel.

## Steps to migrate

**Step 0** — `/deslop undrift privacy-consent-modal`.

1. Confirm #022 and #023 have merged.
2. Create the refactor branch.
3. Copy the `ConsentModal` component tree verbatim.
4. Wire the modal into the chat composer's send pipeline (intercept on send → run detectors → open modal if needed).
5. Run verification.

### Files to copy verbatim

```
src/components/Privacy/ConsentModal/ConsentModal.tsx
src/components/Privacy/ConsentModal/ConsentModal.module.css
src/components/Privacy/ConsentModal/modes/ (whatever mode-A/B/C/D/E sub-components live here)
src/components/Privacy/ConsentModal/ConsentModal.test.tsx (if present)
```

### Files to surgically edit on `develop`

- The chat composer's send handler — intercept the message before transport, run detectors, conditionally open the consent modal.
- The chat-context provider — surface a `consentRequested` state for the runtime to await.

### Files to delete

None.

### Dependency changes

None.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run src/components/Privacy/ConsentModal
```

### Manual

1. `pnpm dev`.
2. Open a chat panel.
3. Send "What's john.doe@example.com's order history?" — confirm Mode B fires.
4. Send "Are women generally worse at math?" — confirm Mode C fires with suggestions.
5. Send both at once — confirm Mode D fires.
6. Trigger Mode E by configuring a workspace for medical-strict (per spec) — confirm the typed-phrase challenge.
7. Cancel from each mode — message not sent. Accept — message sent and consent recorded.

## Risks + things to look out for

- **`react-doctor` flags `key={index}` at line 449** in `ConsentModal.tsx` and "Component is too large" — both come from this file. The latter is OK if the diff is structurally faithful to the source branch; the former should be fixed inline (use detection-result identity as key).
- **Performance on rapid typing.** If detectors run on every keystroke, the modal can thrash. The composer should only invoke detectors on send, not on change.
- **Mode E typed-phrase.** Treat the phrase as case-sensitive; trim leading/trailing whitespace. Don't auto-uppercase.

## How to mark this feature completed

Standard ritual.
