# 030 — Clarification card + bias check on outgoing turns

- **Slug**: `chat-clarification-card-and-bias-check`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-030/chat-clarification-card-and-bias-check`
- **Depends on**: `023-privacy-bias-detector`, `029-chat-clarify-tool`.
- **Estimated PR size**: medium — ~5 files, +400 lines.

## Notes for future you

- The ClarificationCard has three variants: free-text, fixed-options-single, fixed-options-multi. The model decides which to use via tool args.
- Bias check runs **on both directions**: outgoing user messages **and** the LLM's clarification questions. The detector (#023) is reused — no new bias logic here.

## What this feature is

Inline `ClarificationCard` UI rendering for the `clarify` tool from #029, with three answer shapes (free-text, fixed-options-single, fixed-options-multi). Keyboard support (Enter to submit free-text, arrow + Enter for fixed options). Plus a bias check on outgoing user messages *and* on the model's clarification questions — both use the detector from #023.

## Steps to migrate

**Step 0** — `/deslop undrift chat-clarification-card-and-bias-check`.

1. Confirm #023 + #029 have merged.
2. Create the refactor branch.
3. Copy the `ClarificationCard` component verbatim.
4. Wire bias-check into the outgoing-message pipeline and the model-clarification render path.
5. Run verification.

### Files to copy verbatim

```
src/components/ChatPanel/clarification/ClarificationCard.tsx
src/components/ChatPanel/clarification/ClarificationCard.module.css
```

### Files to surgically edit on `develop`

- The chat message renderer — render `ClarificationCard` when a clarify-tool result is in the message stream.
- Outgoing-message pipeline — run `biasDetector` before sending.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run src/components/ChatPanel/clarification
```

### Manual

1. `pnpm dev` + Supabase stack.
2. Ask a vague question. Confirm a `ClarificationCard` renders in the chat stream with the appropriate variant.
3. Answer via keyboard (Enter / arrow + Enter). Confirm submission.
4. Send a bias-flagged outgoing message. Confirm the bias UI fires.
5. Force the model to produce a biased clarification question (e.g. via a prompt that tilts framing). Confirm the bias UI fires on the LLM side too.

## Risks + things to look out for

- **Keyboard fight with the message composer.** When the ClarificationCard is focused, the global Enter-to-send shortcut should be suppressed. Verify focus management.

## How to mark this feature completed

Standard ritual.
