# 015 — Chat disabled visual feedback

- **Slug**: `chat-disabled-visual-feedback`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-015/chat-disabled-visual-feedback`
- **Depends on**: `none`
- **Estimated PR size**: tiny — ~2–4 files, ~50–100 lines.

## Notes for future you

- Two things shipped together in this row: (a) the disabled/dim state of the chat composer when chat isn't applicable to the current page, and (b) the transparency fix on top of the dark navbar gradient (so the composer reads as disabled visually rather than as "broken").
- Sources: CHECKPOINT 1 (PR #232) + CHECKPOINT 8 (publish-modal polish notes).
- This is purely a CSS / a11y change. No new logic, no new tools, no API surface change.

## What this feature is

When chat is not available on the current page (e.g. settings pages, profile, billing), the chat composer at the bottom of the workspace shell dims visibly and shows placeholder copy explaining why it's disabled. The composer also gets a transparency fix so it reads as disabled against the dark navbar gradient, rather than as a broken element.

Sources: CHECKPOINT 1 (PR #232) and the publish-modal polish in CHECKPOINT 8.

## Steps to migrate

**Step 0** — `/deslop undrift chat-disabled-visual-feedback`.

1. Create the refactor branch off `develop`.
2. Surgically edit the chat composer to read its `disabled` state from the existing chat-context availability check and dim accordingly. Add placeholder copy via i18n.
3. Apply the transparency / gradient fix to the composer's CSS module.
4. Run verification.

### Files to copy verbatim

None typically — this is surgical.

### Files to surgically edit on `develop`

- `src/components/ChatPanel/ChatComposer/` (or similar — match `feat/ict4d-demo`'s exact name)
  - Add `disabled` styling (lower opacity, non-interactive, placeholder copy).
- The composer's CSS module — adjust opacity / background / `pointer-events` for the disabled state.

### Files to delete

None.

### Dependency changes

None.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
```

### Manual

1. `pnpm dev`.
2. Navigate to the Data Explorer (chat available). Confirm the composer is bright and interactive.
3. Navigate to Settings → Profile or any chat-unavailable page. Confirm the composer dims, becomes non-interactive, and shows placeholder text.
4. Confirm the composer reads as clearly disabled against the dark navbar gradient (no jagged background blend).

## Risks + things to look out for

- **`react-doctor` may flag low-contrast text** on the disabled state. Verify the placeholder copy passes WCAG AA against the dimmed background.
- **Don't disable the composer for offline mode** unless that's explicitly part of #061 `web-offline-mode`. This row is about *chat-not-applicable-on-this-page*, not connectivity.

## How to mark this feature completed

When the operator runs `/deslop complete chat-disabled-visual-feedback`:

1. Verify the merge.
2. Branch cleanup, `rm docs/deslop/015-chat-disabled-visual-feedback.md`, flip row #15 to `[x] ($MERGE_SHA)`, update `STATE.md`, commit + push.
