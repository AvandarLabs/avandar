# Limit the chat model picker to six models

Date: 2026-08-12
Branch: `feat/limit-models`

## Problem

The chat model picker ships 139 models across 12 groups. The catalog is
produced by substring matching against OpenRouter model ids, canonical slugs,
and display names, which both over-matches and goes stale:

- `"o1"` matches `sao10k/l3-euryale-70b`, a roleplay finetune that lands in
  the "Proprietary" group.
- `"llama"` pulls in `nvidia/llama-3.3-nemotron-super-49b-v1.5`.
- `"qwen"` alone yields 39 entries.
- `AppConfig.chat.defaultModelId` is `openai/gpt-4o-mini`, which no longer
  appears in the curated catalog, so model resolution silently falls through
  to `availableModels[0]`.

The live OpenRouter catalog (text output, tools support) currently holds 329
models. Keeping pace with it is not worth the machinery.

## Goal

Show at most six models: one per frontier lab, plus the three most-used
open-weights families. Replace the entire curation pipeline with a hardcoded
list.

## Decisions

| Decision | Choice |
| --- | --- |
| Google/Gemini | Included as a frontier lab |
| Grok | Excluded |
| Qwen vs DeepSeek | Keep DeepSeek, drop Qwen |
| Live OpenRouter fetch | Removed; catalog is fully hardcoded |
| `GET /chat/models` endpoint | Deleted; the client reads shared config |
| Model tier | Workhorse tier, not flagship |
| `ChatModelOption` fields | Unchanged |
| Catalog home | `ChatModelOptionModule`, following the `LocalChatModel` precedent |
| Config naming | Split the two `AppConfig`s into `GlobalAppConfig` and `WebAppConfig` |

### Why DeepSeek over Qwen

OpenRouter usage data for Q2/June 2026: DeepSeek holds 17.6% vendor share and
three of the top ten slots; the Qwen family holds 8.6% across all sizes.
Chinese open-weights models crossed 60% of platform traffic in June 2026, with
DeepSeek the single largest vendor.

Sources:
- <https://apirank.vip/tutorials/openrouter-q2-2026-token-share-leaderboard/>
- <https://nodemini.com/en/blog/2026-openrouter-rankings-june-chinese-models-61-percent.html>
- <https://pro.stockalarm.io/blog/openrouter-llm-rankings-investor-analysis>

The OpenRouter public API exposes no usage data. `?order=top-weekly` on
`/api/v1/models` is silently ignored and returns recency order.

## The catalog

Verified against the live OpenRouter catalog on 2026-08-12. All six support
tools and text output.

| Group | Model id | `name` | `nameWithoutProvider` | $/M in | $/M out | Context |
| --- | --- | --- | --- | --- | --- | --- |
| Frontier | `anthropic/claude-sonnet-5` | Anthropic: Claude Sonnet 5 | Claude Sonnet 5 | 2.00 | 10.00 | 1M |
| Frontier | `openai/gpt-5.6-terra` | OpenAI: GPT-5.6 Terra | GPT-5.6 Terra | 1.00 | 6.00 | 1.05M |
| Frontier | `google/gemini-3.6-flash` | Google: Gemini 3.6 Flash | Gemini 3.6 Flash | 1.50 | 7.50 | 1M |
| Open | `z-ai/glm-5.2` | Z.ai: GLM 5.2 | GLM 5.2 | 0.76 | 2.42 | 1M |
| Open | `moonshotai/kimi-k2.6` | MoonshotAI: Kimi K2.6 | Kimi K2.6 | 0.95 | 4.00 | 262K |
| Open | `deepseek/deepseek-v4-pro` | DeepSeek: DeepSeek V4 Pro | DeepSeek V4 Pro | 1.17 | 2.34 | 1M |

`defaultModelId` becomes `anthropic/claude-sonnet-5`. The chat panel's primary
job is tool-calling into the data explorer, which is where model quality shows
most; the extra cost over GLM 5.2 buys reliability on the path that matters.

Group order is Frontier models first, then Open models, reversing today's
open-first ordering. The client-side "Offline models" group continues to be
prepended ahead of both.

All ids are undated aliases so they do not need editing when a provider ships
a dated revision.

## Bugs this fixes

### Blank picker trigger on prefix-less model names

`curateOpenRouterModels.ts:148` derives `nameWithoutProvider` as
`model.name.split(":").slice(1).join(" ")`. OpenRouter's `name` field is not
consistently prefixed: `anthropic/claude-opus-5` is literally `"Claude Opus
5"` while `anthropic/claude-sonnet-5` is `"Anthropic: Claude Sonnet 5"`. For
an unprefixed name the expression yields `""`.

`ChatModelPicker.tsx:181` renders `selectedModel?.nameWithoutProvider ??
t\`Model\``. An empty string is not nullish, so the trigger button renders
blank. Authoring `nameWithoutProvider` by hand removes the derivation
entirely.

### Inverted cache-emptiness check

`GetChatModels.ts:55` computes `isCacheNonEmpty` as
`groups.some((group) => group.models.length === 0)`, which is true when *any*
group is empty. The name and the logic disagree, making cache usage
accidental. The check disappears with the endpoint.

## Implementation

### Catalog home

The repo already has a hardcoded-catalog pattern one directory over:
`shared/models/chat/LocalChatModel/LocalChatModelModule/LocalChatModelModule.ts`
holds `LOCAL_CHAT_MODELS`, `DEFAULT_LOCAL_CHAT_MODEL_ID`, and `isValidId`,
exposed as `LocalChatModel.Catalog`. The cloud catalog follows it exactly.

New `shared/models/chat/ChatModelOption/ChatModelOptionModule/ChatModelOptionModule.ts`
holds the six entries, builds them with `Model.make` (required because
`ChatModelOptionRead` is a `Model.Base`, so each object needs its `__type`
brand), and exposes:

```ts
export const ChatModelOptionModule = {
  Catalog: {
    values,      // readonly ChatModelOption.T[], all six, Frontier then Open
    defaultId,   // "anthropic/claude-sonnet-5"
    isValidId,   // (id: string) => boolean, backs the send-path allowlist
  },
};
```

This mirrors `LocalChatModel.Catalog` (`values`, `defaultId`, `isValidId`,
`find`) minus `find`, which has no caller here.

Grouping stays out of the module. `useChatModelCatalog` partitions `values` by
`licenseTier` into "Frontier models" and "Open models" using `t`, the same
place it already builds the translated "Offline models" label. That keeps the
shared module free of presentation concerns (it cannot call `t`, since it also
has to work under Deno) and it means all three group headers are translated.
Today's cloud group labels arrive from the edge function as untranslated
English, so this is a small improvement rather than a regression.

`ChatModelOption.ts` gains the namespace-merge re-export used by
`ChatPageContext.ts` and `LocalChatModel.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
export { ChatModelOptionModule as ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOptionModule/ChatModelOptionModule.ts";
```

`AppConfig.chat` is deleted. `defaultModelId` moves to
`ChatModelOption.Catalog.defaultId` and the three token arrays die with the
curation module.

`chat` turns out to be the shared `AppConfig` object's *only* key, which
surfaced a naming problem worth fixing in the same change. See the next
section.

`ChatModelOption` keeps all its current fields. `supportsTools` is `true` for
all six; `provider` is the OpenRouter id prefix.

### Config naming

Removing `AppConfig.chat` exposed that `chat` was the shared `AppConfig`
object's only key, and that a second, unrelated object in
`src/config/AppConfig.tsx` carries the same name. Two different `AppConfig`s
reached through near-identical import paths (`$/config/AppConfig` versus
`@/config/AppConfig`) is a standing trap, so this change renames both:

| Before | After | Contents |
| --- | --- | --- |
| `AppConfig` in `shared/config/AppConfig.ts` | `GlobalAppConfig` in `shared/config/GlobalAppConfig.ts` | Config meaningful in every runtime: web, desktop, edge functions |
| `AppConfig` in `src/config/AppConfig.tsx` | `WebAppConfig` in `src/config/WebAppConfig.ts` | Config meaningful only inside the browser bundle |

Contents get redistributed on that boundary. Of the five things in the web
config, only `logoFilename` is genuinely web-specific (it is documented as
relative to the Vite `public/` directory):

| Key | Destination | Reasoning |
| --- | --- | --- |
| `logoFilename` | Stays in `WebAppConfig` | Points into the web bundle's asset root |
| `dataManagerApp.maxDatasetNameLength` | `GlobalAppConfig` | Domain validation limit; a server-side validator wants the same number |
| `dataManagerApp.maxDatasetDescriptionLength` | `GlobalAppConfig` | Same |
| `dataManagerApp.maxPreviewRows` | `GlobalAppConfig` | An ingest limit sent *to* import services as a request parameter |
| `WAITLIST_URL` | `GlobalAppConfig.ts` as a standalone const | A brand-level URL, the same kind of fact as the `SUPPORT_EMAIL` and `INFO_EMAIL` consts already in that file |
| `supportEmail` | Deleted | Dead: a pure alias of `SUPPORT_EMAIL`, zero consumers |
| `infoEmail` | Deleted | Dead: a pure alias of `INFO_EMAIL`, zero consumers |
| `featurePlansMetadata` | Deleted | Dead: a pure re-wrap of `$/config/FeaturePlansConfig`, zero consumers |

`WebAppConfig` ends up holding one key with one consumer (`Logo.tsx`). That is
the honest state of the web-only config; it stays an object so future web-only
settings have a home.

`GlobalAppConfig` ends up holding only `dataManagerApp` once `chat` is
removed. The four standalone named exports in the same file (`APP_NAME`,
`SUPPORT_EMAIL`, `INFO_EMAIL`, `MAX_FREE_PLAN_SEATS`) keep their names and stay
outside the object; folding them in would touch seven unrelated call sites for
no functional gain.

### Deletions

| Path | Lines |
| --- | --- |
| `supabase/functions/chat/utils/curateOpenRouterModels/curateOpenRouterModels.ts` | 256 |
| `supabase/functions/chat/utils/curateOpenRouterModels/curateOpenRouterModels.test.ts` | 175 |
| `supabase/functions/chat/GetChatModels.ts` | 63 |
| `supabase/functions/chat/chat-models-catalog.gen.json` | ~1,100 |
| `scripts/regenerateChatModels.ts` | 84 |

Also remove:

- the `chat` key from `GlobalAppConfig` (its last key), plus the three dead
  keys in the web config listed under "Config naming"
- the `chat:regenerate-models` script in `package.json:55`
- the `"/models"` entry in `ChatRoutes.ts`
- the `/models` route string in the `ChatAPI` path tuple **and** its shape in
  the body of `ChatRoutes.types.ts` (the MiniServer DSL duplicates every
  route's type, so both sites need editing)

### Client

`src/components/ChatPanel/useChatModelCatalog.ts`

- Remove `useQuery` and the `APIClient.get({ route: "chat/models" })` call.
- `cloudGroups` becomes `ChatModelCatalog.groups`.
- Drop `isLoading` and `isError` from `UseChatModelCatalogResult`.
- Keep the offline-group prepend unchanged.

`src/components/ChatPanel/ChatModelPicker/ChatModelPicker.tsx`

- Remove the `isLoading` branches at lines 58, 83-88, 144, and 149.
- Remove the `isError` early return at lines 151-153.
- Remove `Combobox.Search` (line 188) and the `filteredGroups` memo (lines
  119-141); six ungrouped-by-search entries do not need filtering.
- `tooltipLabel` collapses to the selected-model case plus a
  "Choose a model" fallback.

`src/components/ChatPanel/ChatModelStorage/ChatModelStorage.ts`

- Drop the `honorStoredWhenMissing` parameter and its branch. It existed only
  to tolerate an async catalog.

### Server-side allowlist

`PostChatMessages.ts:37-42` validates the incoming `model` with
`OPENROUTER_MODEL_ID_PATTERN`, a shape check that accepts any
`vendor/model-name` string, and only falls back to the default when the shape
fails. Replace the regex with `ChatModelOption.Catalog.isValidId`, coercing to
`Catalog.defaultId` on mismatch. This prevents a crafted request from billing
us for a model outside the picker (for example `openai/gpt-5.5-pro` at $180/M
output, 18x the priciest catalog entry).

### Stale localStorage

No migration is needed. A stored `ava.chat.selectedModel` of, say,
`openai/gpt-5.4` fails the `isCandidateAvailable` check in
`resolveChatModelId` and falls through to `defaultModelId`. This works better
than today because the new default is actually present in the catalog.

## Testing

- Delete `curateOpenRouterModels.test.ts`.
- Update `ChatModelStorage.test.ts` for `ChatModelOption.Catalog.defaultId` and
  the removed `honorStoredWhenMissing` parameter.
- Add `ChatModelOptionModule.test.ts`, modelled on
  `LocalChatModelModule.test.ts`, asserting:
  - exactly six entries, three per `licenseTier`
  - all ids unique
  - every entry has a non-empty `name` and `nameWithoutProvider` (the
    regression guard for the blank-trigger bug)
  - **`Catalog.defaultId` is present in `Catalog.values`** (this is the
    assertion that would have caught the `gpt-4o-mini` drift)
  - `isValidId` accepts every catalog id and rejects an unknown one
- Add `useChatModelCatalog.test.ts` asserting the hook returns two groups in
  Frontier-then-Open order covering all six models, and that a downloaded
  offline model prepends a third group. Needs
  `renderHook(fn, { wrapper: TestProviders })`, since `@/test-utils`
  re-exports `renderHook` unwrapped and the hook calls `useLingui`.
- Add a `PostChatMessages` test covering allowlist coercion of an
  off-catalog model id.
- No e2e changes. `tests/e2e/dashboard-chat-block.spec.ts` and
  `tests/e2e/chat-interactive-workflows.spec.ts` mock the messages endpoint,
  not `/models`.
- Re-run i18n extraction: removing the search box retires the "Search models"
  placeholder and aria-label and the "No models match your search" string;
  removing the loading state retires "Loading models...". Model display names
  are proper nouns and are not translated.

## Expected diff

Roughly 1,800 lines removed against about 120 added.

## Out of scope

`supportsTools`, `provider`, and `description` on `ChatModelOption` are
written by both the cloud and offline paths and read by neither;
`OfflineChatPickerModels.ts:41-48` formats a `description` that is never
rendered. Trimming them was considered and deliberately deferred to keep this
change contained to the picker.
