# Offline WebLLM Chat Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` or implement task-by-task below.

**Goal:** When the user is offline (or a chat POST fails while a local model is downloaded), run a **single resident WebLLM model** with a **multi-pass** pipeline (analyze → SQL → optional DuckDB fix), streaming phased UI text, and **voice/chat RAM swap** on 8 GB machines.

**Architecture:** `src/lib/offlineChat/` owns engine abstraction, schema resolution, prompts, and pipeline. `useAvandarChatRuntime` delegates to `runOfflineChatTurn` when appropriate. Real `@mlc-ai/web-llm` loads only via dynamic import; tests and Playwright use `createMockOfflineChatEngine`. No model weights in git.

**Tech Stack:** `@mlc-ai/web-llm`, assistant-ui `ChatModelAdapter`, existing privacy (`crossBoundary`), Vitest, Playwright.

**Branch / worktree:** `feat/offline-webllm-chat` at `.claude/worktrees/offline-webllm-chat` → merge into `feat/ict4d-demo` when verified.

---

## Product decisions (confirmed)

| Topic | Choice |
|-------|--------|
| Offline trigger | `navigator.onLine === false` → local only, no prompt |
| Failed POST | Offer local **only if** model downloaded; toast with reject if still online |
| Voice | Swap: unload WebLLM → Whisper → transcribe → user sends; reload WebLLM on next chat turn |
| Scope v1 | Data Explorer + Dashboards (dashboard: text blocks + DataViz SQL; no `proposePlan` offline) |
| Time budget | 2-pass default; +1 fix pass on DuckDB error; stream phase labels in assistant text |

---

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/offlineChat/offlineChat.types.ts` | Engine interface, pipeline I/O |
| `src/lib/offlineChat/localChatModelCatalog.ts` | Model ids, sizes, WebLLM model strings |
| `src/lib/offlineChat/localChatModelStore.ts` | Downloaded marker + selected model in localStorage |
| `src/lib/offlineChat/resolveOfflineChatMode.ts` | `cloud` \| `local` \| `offer_local_fallback` |
| `src/lib/offlineChat/fetchOfflineChatSchema.ts` | Online Supabase schema + session cache + offline fallback |
| `src/lib/offlineChat/truncateSchemaForOffline.ts` | Column caps |
| `src/lib/offlineChat/buildOfflinePrompts.ts` | Analyze / SQL / fix prompts |
| `src/lib/offlineChat/parseOfflineLlmOutput.ts` | JSON analyze + SQL fence |
| `src/lib/offlineChat/createMockOfflineChatEngine.ts` | Deterministic test engine |
| `src/lib/offlineChat/createWebLLMOfflineChatEngine.ts` | Dynamic WebLLM import |
| `src/lib/offlineChat/createOfflineChatEngine.ts` | Factory (mock in test) |
| `src/lib/offlineChat/OfflineChatResourceManager.ts` | Singleton load/unload; coordinates voice |
| `src/lib/offlineChat/runOfflineChatPipeline.ts` | Multi-pass orchestration |
| `src/lib/offlineChat/runOfflineChatTurn.ts` | Maps pipeline → `ChatResponse`-like result |
| `src/lib/offlineChat/offlineChatFallbackToast.ts` | Mantine toast for failed POST |
| `src/components/ChatPanel/useAvandarChatRuntime.ts` | Branch cloud vs offline |
| `src/components/ChatPanel/OfflineChatModelDownload/` | Download UI (mirrors voice pattern) |
| `src/lib/voice/VoiceModelManager.ts` | `releaseLoadedPipeline()` for swap |
| `src/config/FeatureFlagConfig.ts` | `enable-offline-chat` |
| `tests/e2e/offline-chat.spec.ts` | Mock engine, flag on |

---

## Tasks

- [ ] **1** Add `@mlc-ai/web-llm` dependency; feature flag `enable-offline-chat`
- [ ] **2** Types + catalog + store + `resolveOfflineChatMode` (Vitest)
- [ ] **3** Schema fetch + truncate + prompts + parsers (Vitest)
- [ ] **4** Mock engine + pipeline + `runOfflineChatTurn` (Vitest)
- [ ] **5** WebLLM engine + resource manager (unit test with mock factory only)
- [ ] **6** Wire `useAvandarChatRuntime` + fallback toast
- [ ] **7** Voice `releaseLoadedPipeline`; mic handler calls swap
- [ ] **8** Offline model download UI in chat panel
- [ ] **9** Playwright: offline chat SQL turn with mock engine
- [ ] **10** Manual verify screenshots → `~/Downloads/offline-webllm-chat/`
- [ ] **11** Merge `feat/offline-webllm-chat` → `feat/ict4d-demo`

---

## Testing rules

- Vitest: 100% pipeline/prompt/parse/mode via **mock engine** (no WebLLM import).
- Playwright: `VITE_OFFLINE_CHAT_MOCK=true` or init script flag; never download weights in CI.
- Optional manual: real WebLLM on dev machine only.

---

## Out of scope (v1)

- `proposePlan`, schema-drift regen, discovery clarify (use simple `fixed_options` / proceed)
- Desktop native LLM (webview WebLLM only)
- Workspace-default offline model in Supabase
