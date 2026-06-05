# 029 — Chat clarify tool

- **Slug**: `chat-clarify-tool`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-029/chat-clarify-tool`
- **Depends on**: `024-privacy-consent-modal`, `025-privacy-crossboundary-hmac` (phase 1 builds on phase 0).
- **Estimated PR size**: medium — ~5 files, +400 lines.

## Notes for future you

- First phase-1 row of the chat-interactive-workflows series. Spec: `docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md`.
- 3-turn clarification cap is critical — without it the model can stall the flow indefinitely.
- Overlap with row #020 (`chat-multi-dataset-clarification`): #020 is the system-prompt-only clarification; this row is the tool-driven one. Once both ship, coordinate the system prompt to avoid double-asking.

## What this feature is

Adds a `clarify` tool to the chat edge function alongside `generateSql`. The model can call `clarify` when it needs more info before generating SQL. Hard cap: 3 clarification rounds per question. The system prompt is updated to describe when to clarify.

## Steps to migrate

**Step 0** — `/deslop undrift chat-clarify-tool`.

1. Confirm #024 + #025 have merged.
2. Create the refactor branch.
3. Register the `clarify` tool in the chat edge function tool registry.
4. Add the 3-turn cap counter to the chat runtime state.
5. Surgically update the system prompt to describe `clarify`.

### Files to copy verbatim

```
supabase/functions/chat/tools/clarify.ts
src/components/ChatPanel/clarification/clarifyState.ts (or similar)
```

### Files to surgically edit on `develop`

- The tool registry in `supabase/functions/chat/`.
- The system prompt builder.
- The chat runtime — add the cap counter.

### Files to delete / Dependency changes

None.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run supabase/functions/chat src/components/ChatPanel/clarification
```

### Manual

1. `pnpm dev` + Supabase stack.
2. Ask a vague question. Confirm the model calls `clarify` and the chat panel shows a clarification.
3. Stall (don't answer) — confirm after 3 turns the chat declines further clarification.

## Risks + things to look out for

- **Cap-counter scope.** The counter resets per top-level user question, not per session.
- **Tool-arg schema.** The tool schema must be tight (Zod) so the model produces sane clarification text.

## How to mark this feature completed

Standard ritual.
