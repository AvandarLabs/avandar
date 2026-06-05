# 016 — Chat context memo fix

- **Slug**: `chat-context-memo-fix`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-016/chat-context-memo-fix`
- **Depends on**: `none`
- **Estimated PR size**: tiny — 1 file, ~30 lines changed.

## Notes for future you

- This is a one-line-ish fix with outsized impact: memoize the value returned by `useChatPageContext` so the `assistant-ui` runtime doesn't thrash. Before the fix, the canvas would stop updating after multi-turn conversations (FEATURE_CHECKLIST #29 in `docs/ict4d-demo/`).
- The memoization key is the **content** (pathname, openDatasetId, rawSQL, lastQueryError), not the reference. A naive `useMemo` over the inputs is enough; the bug was the absence of any memo.
- Source: CHECKPOINT 2; FEATURE_CHECKLIST #29 in `docs/ict4d-demo/FEATURE_CHECKLIST.md`.

## What this feature is

`useChatPageContext` builds an object describing the chat's current page context (route, open dataset, current SQL, last query error). Without memoization, every render returns a new object reference; downstream consumers (especially `@assistant-ui/react`'s runtime) tear down and rebuild on every parent render. The fix wraps the returned object in `useMemo` keyed on its content.

## Steps to migrate

**Step 0** — `/deslop undrift chat-context-memo-fix`.

1. Create the refactor branch off `develop`.
2. Surgically edit `useChatPageContext` to wrap its return in `useMemo`, with deps on `pathname`, `openDatasetId`, `rawSQL`, `lastQueryError`.
3. Run verification.

### Files to copy verbatim

None.

### Files to surgically edit on `develop`

- `src/components/ChatPanel/useChatPageContext.ts` (or wherever the hook lives — match `feat/ict4d-demo`'s tree)
  - Wrap the returned object in `useMemo`; deps: `[pathname, openDatasetId, rawSQL, lastQueryError]`.

### Files to delete

None.

### Dependency changes

None.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run src/components/ChatPanel
```

### Manual

1. `pnpm dev`.
2. Open a workspace with chat enabled (e.g. Data Explorer with a dataset open).
3. Send a chat message that produces a viz (e.g. "Show me sales by region"). Wait for the canvas to update.
4. Send a second message that refines (e.g. "Now group by month"). Confirm the canvas updates this time too — **before this fix, the canvas would stop updating after the first message.**
5. Repeat for 3–5 turns. Canvas should keep updating cleanly.

## Risks + things to look out for

- **Stale memo keys.** If the context grows new fields without being added to the memo's deps, the same bug returns silently. Keep the deps array exhaustive.
- **Over-memoization.** Don't add unrelated fields to the deps — that defeats the purpose. Only fields the consumers actually read.

## How to mark this feature completed

Standard `/deslop complete` ritual: verify merge, branch cleanup, `rm docs/deslop/016-chat-context-memo-fix.md`, flip row #16 to `[x] ($MERGE_SHA)`, update `STATE.md`, commit + push.
