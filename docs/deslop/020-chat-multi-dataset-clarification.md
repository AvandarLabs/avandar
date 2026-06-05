# 020 — Multi-dataset clarification

- **Slug**: `chat-multi-dataset-clarification`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-020/chat-multi-dataset-clarification`
- **Depends on**: `none` (this row predates and is independent of the broader chat-interactive-workflows clarify tool in #029).
- **Estimated PR size**: small — ~2–4 files, ~150 lines.

## Notes for future you

- Driver commit: `2359378`.
- This is a **system-prompt + tool-orchestration** change — the LLM is instructed to ask for clarification when 2+ datasets are plausible answers, rather than guessing. The actual clarification card UI ships separately as row #029/#030 (the `clarify` tool).
- This row is the **pre-chat-workflows** version of the clarification gesture. Once row #029 lands, this row's behavior may need to coordinate with `clarify` tool to avoid asking twice. Document the overlap in the migration's notes.

## What this feature is

When a user asks a question that could be answered by multiple datasets in the workspace, the chat edge function prepends a clarification step before SQL generation: it asks "Which dataset?" and waits for the user's choice before proceeding. Implemented via system-prompt enrichment that lists candidate datasets and asks the model to disambiguate.

## Steps to migrate

**Step 0** — `/deslop undrift chat-multi-dataset-clarification`.

1. Create the refactor branch off `develop`.
2. Surgically edit the chat edge function's system-prompt builder to detect multi-dataset ambiguity and prepend the clarification gesture.
3. Run verification.

### Files to copy verbatim

None.

### Files to surgically edit on `develop`

- `supabase/functions/chat/systemPrompt.ts` (or wherever the system prompt is assembled) — add the multi-dataset clarification block.
- If the chat edge function has a "candidate datasets" resolver, extend it to surface the candidates to the prompt builder.

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

1. `pnpm dev` + Supabase stack.
2. Workspace with 2+ datasets whose columns could plausibly answer the same question (e.g. two "sales" datasets).
3. Ask a question that maps to both (e.g. "What were our total sales last quarter?").
4. Confirm the model responds with a clarification asking which dataset.
5. Pick one — the SQL is generated against that dataset.

## Risks + things to look out for

- **Overlap with row #029** (`chat-clarify-tool`). Once #029 lands, this prompt-level clarification may double up with the tool-driven one. Coordinate in the migration notes for whichever row lands later.
- **False positives** — datasets with unrelated schemas shouldn't trigger clarification. The detection logic must compare schema overlap, not just dataset count.

## How to mark this feature completed

Standard ritual.
