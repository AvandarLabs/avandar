import { Model } from "@models/Model/Model.ts";
import { AppConfig } from "$/config/AppConfig.ts";
import type { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption.ts";

/** Raw OpenRouter model row used when curating the picker catalog. */
export type OpenRouterModelInput = {
  id: string;
  name: string;
  canonical_slug: string;
  created: number;
  description?: string;
  expiration_date?: string | null;
  architecture?: { output_modalities?: string[] };
  supported_parameters?: string[];
};

const UNSTABLE_MODEL_PATTERN = /(?:^|[/._-])(?:preview|beta)(?:$|[/._-])/i;
const LATEST_LABEL_PATTERN = /\blatest\b/i;
const LATEST_ID_PATTERN = /-latest$/i;
const ISO_DATE_SUFFIX_PATTERN = /-\d{4}-\d{2}-\d{2}$/;
const COMPACT_DATE_SUFFIX_PATTERN = /-\d{8}$/;

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  "meta-llama": "Meta",
  moonshotai: "Moonshot AI",
  qwen: "Qwen",
  deepseek: "DeepSeek",
  mistralai: "Mistral",
  cohere: "Cohere",
  perplexity: "Perplexity",
  xai: "xAI",
};

function _modelSearchText(model: OpenRouterModelInput): string {
  const idSuffix = model.id.split("/")[1] ?? model.id;
  return [model.id, model.canonical_slug, idSuffix, model.name]
    .join(" ")
    .toLowerCase();
}

/** True when the model id/name/slug contains a configured class token. */
export function modelMatchesClass(
  model: OpenRouterModelInput,
  classToken: string,
): boolean {
  return _modelSearchText(model).includes(classToken.toLowerCase());
}

function _isUnstableModel(model: OpenRouterModelInput): boolean {
  const searchable = _modelSearchText(model);
  if (UNSTABLE_MODEL_PATTERN.test(searchable)) {
    return true;
  }
  if (LATEST_LABEL_PATTERN.test(model.name)) {
    return true;
  }
  if (LATEST_ID_PATTERN.test(model.id)) {
    return true;
  }
  return false;
}

function _isDeprecated(model: OpenRouterModelInput): boolean {
  if (!model.expiration_date) {
    return false;
  }
  const expiresAt = new Date(model.expiration_date);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt < new Date();
}

function _supportsTextOutput(model: OpenRouterModelInput): boolean {
  return model.architecture?.output_modalities?.includes("text") ?? false;
}

function _supportsTools(model: OpenRouterModelInput): boolean {
  return model.supported_parameters?.includes("tools") ?? false;
}

function _isAllowedModel(model: OpenRouterModelInput): boolean {
  return AppConfig.chat.allowedModelClasses.some((classToken) => {
    return modelMatchesClass(model, classToken);
  });
}

function _classifyLicenseTier(
  model: OpenRouterModelInput,
): ChatModelOption.LicenseTier | undefined {
  const isProprietary = AppConfig.chat.proprietaryModelClasses.some(
    (classToken) => {
      return modelMatchesClass(model, classToken);
    },
  );
  if (isProprietary) {
    return "proprietary";
  }
  const isOpen = AppConfig.chat.openModelClasses.some((classToken) => {
    return modelMatchesClass(model, classToken);
  });
  return isOpen ? "open" : undefined;
}

/**
 * Normalizes a canonical slug for deduping dated variants while keeping size
 * tiers (mini, turbo, etc.) as separate models.
 */
export function buildModelDedupeKey(model: OpenRouterModelInput): string {
  let normalized = model.canonical_slug.toLowerCase();
  normalized = normalized.replace(ISO_DATE_SUFFIX_PATTERN, "");
  normalized = normalized.replace(COMPACT_DATE_SUFFIX_PATTERN, "");
  return normalized;
}

function _getProviderSlug(model: OpenRouterModelInput): string {
  return model.id.split("/")[0] ?? model.id;
}

function _formatProviderLabel(providerSlug: string): string {
  const knownLabel = PROVIDER_DISPLAY_NAMES[providerSlug];
  if (knownLabel) {
    return knownLabel;
  }
  return providerSlug
    .split("-")
    .map((part) => {
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function _buildGroupLabel(
  licenseTier: ChatModelOption.LicenseTier,
  providerSlug: string,
): string {
  const tierLabel = licenseTier === "open" ? "Open models" : "Proprietary";
  return `${tierLabel} · ${_formatProviderLabel(providerSlug)}`;
}

function _toChatModelOption(
  model: OpenRouterModelInput,
  licenseTier: ChatModelOption.LicenseTier,
): ChatModelOption.T {
  return Model.make("ChatModelOption", {
    id: model.id,
    name: model.name,
    nameWithoutProvider: model.name.split(":").slice(1).join(" "),
    ...(model.description ? { description: model.description } : {}),
    supportsTools: _supportsTools(model),
    licenseTier,
    provider: _getProviderSlug(model),
  });
}

/**
 * Given a list of OpenRouter models, returns the latest model for each
 * deduplicated key. The dedupe key is computed by `buildModelDedupeKey`,
 * which is the model's canonical_slug lowercased, with any date suffixes
 * removed. Variants with different dates collapse to the same dedupe key,
 * but separate size tiers (like 'mini', 'turbo') remain distinct.
 *
 * @example
 * [
 *   { id: 'provider1/model-1-20231201',
 *     canonical_slug: 'model-1-20231201',
 *     created: 100 },
 *   { id: 'provider1/model-1-20240220',
 *     canonical_slug: 'model-1-20240220',
 *     created: 200 },
 *   { id: 'provider1/model-2-mini',
 *     canonical_slug: 'model-2-mini',
 *     created: 130 }
 * ]
 *
 * // The two 'model-1' entries collapse to one dedupe key, so only the later
 * // (larger 'created' value) remains. The result would be:
 *
 * [
 *   { id: 'provider1/model-1-20240220',
 *     canonical_slug: 'model-1-20240220',
 *     created: 200 },
 *   { id: 'provider1/model-2-mini',
 *     canonical_slug: 'model-2-mini',
 *     created: 130 }
 * ]
 */
function _pickLatestPerDedupeKey(
  models: OpenRouterModelInput[],
): OpenRouterModelInput[] {
  const latestByKey = new Map<string, OpenRouterModelInput>();
  models.forEach((model) => {
    const dedupeKey = buildModelDedupeKey(model);
    const existing = latestByKey.get(dedupeKey);
    if (!existing || model.created > existing.created) {
      latestByKey.set(dedupeKey, model);
    }
  });
  return [...latestByKey.values()];
}

/**
 * Filters, dedupes, and groups OpenRouter models for the chat model picker.
 */
export function curateOpenRouterModels(
  models: readonly OpenRouterModelInput[],
): ChatModelOption.OptionGroup[] {
  const eligible = models.filter((model) => {
    if (
      !_supportsTextOutput(model) ||
      !_supportsTools(model) ||
      _isUnstableModel(model) ||
      _isDeprecated(model) ||
      !_isAllowedModel(model) ||
      _classifyLicenseTier(model) === undefined
    ) {
      return false;
    }

    return true;
  });

  const deduped = _pickLatestPerDedupeKey(eligible);

  const grouped = new Map<string, ChatModelOption.T[]>();
  deduped.forEach((model) => {
    const licenseTier = _classifyLicenseTier(model);
    if (!licenseTier) {
      return;
    }
    const providerSlug = _getProviderSlug(model);
    const groupLabel = _buildGroupLabel(licenseTier, providerSlug);
    const option = _toChatModelOption(model, licenseTier);
    const existing = grouped.get(groupLabel) ?? [];
    grouped.set(groupLabel, [...existing, option]);
  });

  const tierOrder = (label: string): number => {
    return label.startsWith("Open models") ? 0 : 1;
  };

  return [...grouped.entries()]
    .map(([group, groupModels]) => {
      const sortedModels = [...groupModels].sort((left, right) => {
        return left.name.localeCompare(right.name);
      });
      return { group, models: sortedModels };
    })
    .sort((left, right) => {
      const tierCompare = tierOrder(left.group) - tierOrder(right.group);
      if (tierCompare !== 0) {
        return tierCompare;
      }
      return left.group.localeCompare(right.group);
    });
}
