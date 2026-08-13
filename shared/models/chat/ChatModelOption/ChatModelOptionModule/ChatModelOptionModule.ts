import { Model } from "@avandar/models";
import { prop } from "@avandar/utils";
// This import must stay `import type`. `ChatModelOption.ts` value-re-exports
// this module, so a value import here would close a real runtime cycle.
import type { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption.ts";

/**
 * Cloud chat models offered in the picker, proprietary models first so the
 * picker renders "Frontier models" above "Open models".
 *
 * Deliberately tiny: one model per frontier lab, plus the three most-used
 * open-weights families. Every id is an undated alias, so a provider shipping
 * a dated revision needs no edit here.
 *
 * Verified against the OpenRouter catalog on 2026-08-12. To re-verify an id,
 * query the OpenRouter `/api/v1/models` endpoint for the exact model id.
 *
 * `nameWithoutProvider` is authored by hand rather than derived from `name`.
 * OpenRouter is inconsistent about the "Vendor: " prefix: its
 * `anthropic/claude-opus-5` (not in this catalog) is named plain "Claude Opus
 * 5", while `claude-sonnet-5` is "Anthropic: Claude Sonnet 5". Deriving the
 * short name by splitting on ":" produced an empty string for the unprefixed
 * ones, which rendered a blank picker button.
 */
const CHAT_MODEL_OPTIONS = [
  Model.make("ChatModelOption", {
    id: "anthropic/claude-sonnet-5",
    name: "Anthropic: Claude Sonnet 5",
    nameWithoutProvider: "Claude Sonnet 5",
    supportsTools: true,
    licenseTier: "proprietary",
    provider: "anthropic",
  }),
  Model.make("ChatModelOption", {
    id: "openai/gpt-5.6-terra",
    name: "OpenAI: GPT-5.6 Terra",
    nameWithoutProvider: "GPT-5.6 Terra",
    supportsTools: true,
    licenseTier: "proprietary",
    provider: "openai",
  }),
  Model.make("ChatModelOption", {
    id: "google/gemini-3.6-flash",
    name: "Google: Gemini 3.6 Flash",
    nameWithoutProvider: "Gemini 3.6 Flash",
    supportsTools: true,
    licenseTier: "proprietary",
    provider: "google",
  }),
  Model.make("ChatModelOption", {
    id: "z-ai/glm-5.2",
    name: "Z.ai: GLM 5.2",
    nameWithoutProvider: "GLM 5.2",
    supportsTools: true,
    licenseTier: "open",
    provider: "z-ai",
  }),
  Model.make("ChatModelOption", {
    id: "moonshotai/kimi-k2.6",
    name: "MoonshotAI: Kimi K2.6",
    nameWithoutProvider: "Kimi K2.6",
    supportsTools: true,
    licenseTier: "open",
    provider: "moonshotai",
  }),
  Model.make("ChatModelOption", {
    id: "deepseek/deepseek-v4-pro",
    name: "DeepSeek: DeepSeek V4 Pro",
    nameWithoutProvider: "DeepSeek V4 Pro",
    supportsTools: true,
    licenseTier: "open",
    provider: "deepseek",
  }),
] as const satisfies readonly ChatModelOption.T[];

/**
 * Model used when the client sends no selection, or sends one that is not in
 * the catalog. Tool-calling into the Data Explorer is the chat panel's core
 * job, so the default favors reliability there over per-token price.
 */
const DEFAULT_CHAT_MODEL_ID: (typeof CHAT_MODEL_OPTIONS)[number]["id"] =
  "anthropic/claude-sonnet-5";

const CHAT_MODEL_ID_SET = new Set<string>(CHAT_MODEL_OPTIONS.map(prop("id")));

function _isValidId(id: string): boolean {
  return CHAT_MODEL_ID_SET.has(id);
}

/**
 * Runtime surface for the {@link ChatModelOption} model. Groups the static
 * catalog of cloud models under `Catalog` so callers reference it as
 * `ChatModelOption.Catalog.values`, mirroring `LocalChatModel.Catalog`.
 *
 * Grouping and group labels live in the picker, not here: this module also
 * runs under Deno on the edge function, where Lingui's `t` is unavailable.
 */
export const ChatModelOptionModule = {
  /** Catalog of cloud chat models offered in the chat model picker. */
  Catalog: {
    /** Cloud models available to clients and edge-function validation. */
    values: CHAT_MODEL_OPTIONS,

    /** Model used when a client has no valid catalog selection. */
    defaultId: DEFAULT_CHAT_MODEL_ID,

    /** Returns whether an id belongs to the cloud model catalog. */
    isValidId: _isValidId,
  },
};
