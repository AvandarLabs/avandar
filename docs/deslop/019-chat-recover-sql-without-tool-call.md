# 019 — Recover SQL without tool call

- **Slug**: `chat-recover-sql-without-tool-call`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-019/chat-recover-sql-without-tool-call`
- **Depends on**: `none`
- **Estimated PR size**: tiny — 1–2 files, ~50 lines.

## Notes for future you

- Driver commit: `381b07d`.
- The fix lives on the **server** side (edge function) — scan the assistant's message body for a fenced SQL code block and inject a synthetic `generateSql` tool-call into the message stream when found.
- This is a robustness fix, not a permanent solution. The right long-term move is to make the model use the tool reliably — but in practice it sometimes returns SQL inline as text, and this layer recovers it.

## What this feature is

When the LLM responds with a SQL query in its message body (fenced code block) but skips the `generateSql` tool call (a known intermittent failure), the chat edge function parses the SQL out of the message body and applies it as if the tool had been invoked. The Data Explorer / dashboard canvas updates accordingly.

## Steps to migrate

**Step 0** — `/deslop undrift chat-recover-sql-without-tool-call`.

1. Create the refactor branch off `develop`.
2. Surgically edit the chat edge function to scan for `\`\`\`sql ... \`\`\`` blocks and synthesize a `generateSql` tool call.
3. Run verification.

### Files to copy verbatim

None.

### Files to surgically edit on `develop`

- `supabase/functions/chat/` — find the message-handling code that processes assistant turns. Add the SQL-recovery scan.

### Files to delete

None.

### Dependency changes

None.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run supabase/functions/chat
```

### Manual

1. `pnpm dev` + Supabase local stack.
2. Stub or mock the chat model to return a message body containing a fenced SQL block without a tool call.
3. Confirm the canvas applies the SQL anyway.
4. With a real model, ask a SQL-shaped question and confirm normal tool-call flow still works (recovery is fallback, not primary).

## Risks + things to look out for

- **False positives.** The scan must only fire when a SQL block is present **and** the tool call is missing. A naive regex can fire on educational content that quotes SQL — verify the scan is narrowly scoped.
- **Telemetry.** Log when recovery fires so we can see how often the model skips the tool call.

## How to mark this feature completed

Standard ritual.
