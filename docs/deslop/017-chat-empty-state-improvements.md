# 017 — Chat empty state improvements

- **Slug**: `chat-empty-state-improvements`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-017/chat-empty-state-improvements`
- **Depends on**: `none` (i18n suggested-prompts integrate with the Lingui scaffold from #078 once it lands, but the row works in a single-language mode without it).
- **Estimated PR size**: small — ~3 files, ~150 lines.

## Notes for future you

- Driver commits: `8ca7ce9` (empty state visual rework), `661511a` (i18n suggestion prompts).
- The "no jumpy layout" claim is about the suggested prompts appearing in a fixed-height container rather than letting the layout reflow as prompts render asynchronously. Preserve the fixed-height shim.

## What this feature is

Refresh of the chat empty state (the panel content before any message is sent):

- Suggested prompts render in a fixed-height container so the layout doesn't jump when they finish loading.
- Suggested prompts are i18n-aware (English baseline; other locales populated when row #078 / #081 land).
- General typography + spacing polish.

## Steps to migrate

**Step 0** — `/deslop undrift chat-empty-state-improvements`.

1. Create the refactor branch off `develop`.
2. Copy or edit the `ChatEmptyState` component.
3. Wire suggested prompts through Lingui macros (`<Trans>` / `t``). If row #078 hasn't landed yet, those macros fall back to the English source string — that's fine.
4. Run verification.

### Files to copy verbatim

```
src/components/ChatPanel/ChatEmptyState/ (whatever new files live here)
```

### Files to surgically edit on `develop`

- `src/components/ChatPanel/ChatEmptyState/ChatEmptyState.tsx` — refreshed JSX, fixed-height container, i18n macros.
- `src/components/ChatPanel/ChatEmptyState/ChatEmptyState.module.css` — typography / spacing.

### Files to delete

None.

### Dependency changes

None — Lingui dependencies land with row #078.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run src/components/ChatPanel/ChatEmptyState
```

### Manual

1. `pnpm dev`.
2. Open a fresh chat panel (no messages yet).
3. Confirm the empty state shows the new layout: title, body copy, a fixed-height list of suggested prompts.
4. Click a suggested prompt — it should populate the composer (existing behavior).
5. Throttle the network in DevTools and reload — confirm the suggested prompts don't cause layout jump as they load.

## Risks + things to look out for

- **`react-doctor` flags `key={index}` at line 213** of `ChatEmptyState.tsx` per recent scans. If that pattern is in the diff you're porting, fix it inline (use the prompt's slug or text as the key).

## How to mark this feature completed

Standard ritual: verify merge, branch cleanup, `rm docs/deslop/017-chat-empty-state-improvements.md`, flip row #17 to `[x] ($MERGE_SHA)`, update `STATE.md`, commit + push.
