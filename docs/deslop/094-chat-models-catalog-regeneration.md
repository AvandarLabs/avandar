# 094 — Chat models catalog regeneration

- **Slug**: `chat-models-catalog-regeneration`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-094/chat-models-catalog-regeneration`
- **Depends on**: `none` directly (but interacts with billing rows #083–089 because `Subscription*` files are touched by the same commits — see Notes).
- **Estimated PR size**: medium — generated JSON + script + helper types + ModelModule directory reorg, ~400–600 lines.

## Notes for future you

- Driver commits: `09e1a97e`, `32ea53b6`.
- The `Subscription*` portions of these commits refactor files already covered by billing rows #083–089. **They ride along when those rows migrate, not here.** This row is strictly the chat-models catalog regeneration + ModelModule reorg.
- The catalog JSON is generated; don't hand-edit it. If a model needs to be added, run the regen script.

## What this feature is

A regeneration of the chat-models catalog used by the chat edge function to know which models are available, their capabilities, and pricing. Specifically:

- `supabase/functions/chat/chat-models-catalog.gen.json` — the generated catalog.
- `scripts/regenerateChatModels.ts` — the regen script.
- `shared/types/chat.types.ts` — new model-spec types.
- `shared/lib/zodHelpers.ts` — helpers used by the regen script.
- `packages/shared/models/src/Model/ModelModule/` — directory reorganization that the regen script depends on (Model module structure flattened / regrouped).

## Steps to migrate

**Step 0** — `/deslop undrift chat-models-catalog-regeneration`.

1. Create the refactor branch off `develop`.
2. Apply the ModelModule directory reorg verbatim (preserve file moves with `git mv` to keep history).
3. Copy the regen script + helper types verbatim.
4. Copy the generated catalog JSON verbatim.
5. **Do not** include the `Subscription*` portions of commits `09e1a97e` / `32ea53b6` here — those land with the billing rows.
6. Run verification.

### Files to copy verbatim

```
supabase/functions/chat/chat-models-catalog.gen.json
scripts/regenerateChatModels.ts
```

Plus all new files under `packages/shared/models/src/Model/ModelModule/`.

### Files to surgically edit on `develop`

- `shared/types/chat.types.ts` — add new model-spec types.
- `shared/lib/zodHelpers.ts` — add new helpers used by the regen script.
- Anywhere on `develop` that imports from the old `Model/` directory — update import paths to the reorganized `Model/ModelModule/` layout.

### Files to delete

The retired `Model/` files that the reorg replaces (verify against the diff before deleting).

### Dependency changes

None — but verify the regen script's own deps (`zod`, `node:fs`, etc.) are already installed.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run shared packages/shared
pnpm tsx scripts/regenerateChatModels.ts --dry-run   # confirm script runs and produces deterministic output
```

### Manual

1. `pnpm dev` + Supabase stack.
2. Open the chat panel. Open the model picker.
3. Confirm the model list matches the entries in `chat-models-catalog.gen.json`.
4. Re-run `pnpm tsx scripts/regenerateChatModels.ts` and confirm the diff against the committed JSON is empty (the gen step is deterministic).

## Risks + things to look out for

- **Import-path churn.** The ModelModule reorg moves files around. Use `git mv` so reviewers can see the move clearly.
- **Subscription overlap.** The same source commits touch billing files. **Do not bring those over here.** Cross-check the diff before committing.
- **Generated file diffs are noisy.** Treat the JSON as authoritative; don't hand-edit even to fix a typo — fix the regen script and re-run.

## How to mark this feature completed

Standard ritual: verify merge, branch cleanup, `rm docs/deslop/094-chat-models-catalog-regeneration.md`, flip row #94 to `[x] ($MERGE_SHA)`, update `STATE.md`, commit + push.
