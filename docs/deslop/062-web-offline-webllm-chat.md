# 062 — Web offline WebLLM chat

- **Slug**: `web-offline-webllm-chat`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-062/web-offline-webllm-chat`
- **Depends on**: `061-web-offline-mode`.
- **Estimated PR size**: large — WebLLM pipeline + lifecycle + fixtures, ~1.5k lines.

## Notes for future you

- Driver commits: `d515040`, `2d60b41`, `8744137`. Spec: `docs/superpowers/plans/2026-05-20-offline-webllm-chat.md`.
- `releaseLoadedPipeline` lifecycle is critical — WebLLM holds GBs of memory; failure to release leaks across navigations.
- E2E fixtures in the spec cover the model-download flow.

## What this feature is

When offline, the chat panel can run against a locally cached WebLLM (TVM/WebGPU) instead of the Supabase chat edge function. Multi-pass local inference is supported. `releaseLoadedPipeline` cleans up the WebLLM session on unmount / route change.

## Steps to migrate

**Step 0** — `/deslop undrift web-offline-webllm-chat`.

1. Confirm #061 has merged.
2. Copy the WebLLM pipeline + lifecycle.

### Files to copy verbatim

```
src/lib/offline-chat/webllmPipeline.ts
src/lib/offline-chat/releaseLoadedPipeline.ts
src/lib/offline-chat/OfflineChatResourceManager.ts
src/components/ChatPanel/OfflineChatDownloadControl/ (whatever lives here)
src/components/OfflineChatDownloadIndicator/OfflineChatDownloadIndicator.tsx
```

### Dependency changes

```
pnpm add @mlc-ai/web-llm
```

(Exact pkg may differ — match `feat/ict4d-demo`.)

## How to mark this feature completed

Standard ritual.
