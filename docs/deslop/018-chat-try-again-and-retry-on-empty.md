# 018 — Chat try-again + retry-on-empty

- **Slug**: `chat-try-again-and-retry-on-empty`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-018/chat-try-again-and-retry-on-empty`
- **Depends on**: `none`
- **Estimated PR size**: small — ~3–5 files, ~150 lines.

## Notes for future you

- Driver commit: `1e7d335` — scope to the chat-try-again portion only.
- "Retry-on-empty" means: when the LLM completes a turn with an empty assistant message (backend hiccup), the runtime retries automatically once. The per-turn "Try Again" button is a manual fallback after the auto-retry fails.

## What this feature is

Two related UX additions:

- **Try Again button** — every assistant reply card gets a "Try Again" button in its overflow menu (or footer). Clicking it re-runs that turn against the model, replacing the assistant message.
- **Retry-on-empty** — if the model returns an empty assistant message (e.g. provider transient error), the runtime automatically retries the turn once. Only one auto-retry per turn; subsequent failures show the Try Again button to the user.

## Steps to migrate

**Step 0** — `/deslop undrift chat-try-again-and-retry-on-empty`.

1. Create the refactor branch off `develop`.
2. Add the Try Again button to the assistant message renderer.
3. Add the auto-retry-on-empty logic to the chat runtime / message handler.
4. Run verification.

### Files to copy verbatim

```
(any new helper files introduced by commit 1e7d335 — scope to the chat-try-again portion)
```

### Files to surgically edit on `develop`

- The chat message renderer where assistant messages are displayed — add the Try Again affordance.
- The chat runtime / hook that wraps `@assistant-ui/react` — add retry-on-empty logic.

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
2. Open a chat panel.
3. Send a message. Wait for the reply. Confirm the assistant message card now has a "Try Again" button.
4. Click "Try Again". Confirm the reply is replaced with a fresh attempt.
5. Simulate an empty response (e.g. mock the chat edge function to return `""`). Confirm the runtime auto-retries once.
6. After auto-retry also fails (or returns empty), confirm the Try Again button shows.

## Risks + things to look out for

- **Auto-retry loops.** Bound the auto-retry to exactly one attempt per turn. A misconfigured retry can DoS the chat backend.
- **State after Try Again.** When the user clicks Try Again, the old assistant message is gone from history — any tool calls inside it (SQL generation, chart updates) should be rolled back too. Verify the canvas doesn't end up in a stale state.

## How to mark this feature completed

Standard ritual.
