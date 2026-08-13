import { prop } from "@avandar/utils";
import {
  buildModelDedupeKey,
  curateOpenRouterModels,
  modelMatchesClass,
} from "@sbfn/chat/utils/curateOpenRouterModels/curateOpenRouterModels.ts";
import { describe, expect, it } from "vitest";
import type { OpenRouterModelInput } from "@sbfn/chat/utils/curateOpenRouterModels/curateOpenRouterModels.ts";

function createModel(
  overrides: Partial<OpenRouterModelInput> & Pick<OpenRouterModelInput, "id">,
): OpenRouterModelInput {
  const idSuffix = overrides.id.split("/")[1] ?? overrides.id;
  return {
    name: overrides.name ?? idSuffix,
    canonical_slug: overrides.canonical_slug ?? overrides.id,
    created: overrides.created ?? 1,
    architecture: { output_modalities: ["text"] },
    supported_parameters: ["tools"],
    ...overrides,
  };
}

describe("modelMatchesClass", () => {
  it("matches class tokens in id and display name", () => {
    const model = createModel({
      id: "moonshotai/kimi-k2.6",
      name: "Kimi K2.6",
    });
    expect(modelMatchesClass(model, "kimi")).toBe(true);
    expect(modelMatchesClass(model, "gpt")).toBe(false);
  });
});

describe("buildModelDedupeKey", () => {
  it("strips dated slug suffixes but keeps size tiers", () => {
    expect(
      buildModelDedupeKey(
        createModel({
          id: "openai/gpt-4o",
          canonical_slug: "openai/gpt-4o-2024-08-06",
        }),
      ),
    ).toBe("openai/gpt-4o");

    expect(
      buildModelDedupeKey(
        createModel({
          id: "openai/gpt-4o-mini",
          canonical_slug: "openai/gpt-4o-mini",
        }),
      ),
    ).toBe("openai/gpt-4o-mini");
  });
});

describe("curateOpenRouterModels", () => {
  it("drops preview, beta, latest, deprecated, and non-allowlisted models", () => {
    const groups = curateOpenRouterModels([
      createModel({
        id: "openai/gpt-4o",
        canonical_slug: "openai/gpt-4o",
        created: 10,
      }),
      createModel({
        id: "openai/gpt-4o-preview",
        canonical_slug: "openai/gpt-4o-preview",
        created: 11,
      }),
      createModel({
        id: "moonshotai/kimi-latest",
        name: "Kimi Latest",
        canonical_slug: "moonshotai/kimi-latest",
        created: 12,
      }),
      createModel({
        id: "openai/gpt-4o-old",
        canonical_slug: "openai/gpt-4o-old",
        created: 13,
        expiration_date: "2020-01-01",
      }),
      createModel({
        id: "vendor/obscure-model",
        canonical_slug: "vendor/obscure-model",
        created: 14,
      }),
    ]);

    const models = groups.flatMap(prop("models"));
    expect(models.map(prop("id"))).toEqual(["openai/gpt-4o"]);
  });

  it("dedupes dated variants by keeping the newest created slug", () => {
    const groups = curateOpenRouterModels([
      createModel({
        id: "openai/gpt-4o-2024-08-06",
        canonical_slug: "openai/gpt-4o-2024-08-06",
        created: 5,
      }),
      createModel({
        id: "openai/gpt-4o",
        canonical_slug: "openai/gpt-4o",
        created: 20,
      }),
    ]);

    const models = groups.flatMap(prop("models"));
    expect(models).toHaveLength(1);
    expect(models[0]?.id).toBe("openai/gpt-4o");
  });

  it("includes gpt-5 family models when allowlisted", () => {
    const groups = curateOpenRouterModels([
      createModel({
        id: "openai/gpt-5",
        canonical_slug: "openai/gpt-5",
        created: 10,
      }),
      createModel({
        id: "openai/gpt-5-mini",
        canonical_slug: "openai/gpt-5-mini",
        created: 11,
      }),
    ]);

    const models = groups.flatMap(prop("models"));
    expect(models.map(prop("id")).sort()).toEqual([
      "openai/gpt-5",
      "openai/gpt-5-mini",
    ]);
  });

  it("keeps separate size tiers as separate picker entries", () => {
    const groups = curateOpenRouterModels([
      createModel({
        id: "openai/gpt-4o",
        canonical_slug: "openai/gpt-4o",
        created: 10,
      }),
      createModel({
        id: "openai/gpt-4o-mini",
        canonical_slug: "openai/gpt-4o-mini",
        created: 11,
      }),
    ]);

    const models = groups.flatMap(prop("models"));
    expect(models.map(prop("id")).sort()).toEqual([
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
    ]);
  });

  it("groups models by license tier and provider", () => {
    const groups = curateOpenRouterModels([
      createModel({
        id: "openai/gpt-4o-mini",
        canonical_slug: "openai/gpt-4o-mini",
        created: 10,
      }),
      createModel({
        id: "meta-llama/llama-3.3-70b-instruct",
        canonical_slug: "meta-llama/llama-3.3-70b-instruct",
        created: 11,
      }),
    ]);

    expect(groups.map(prop("group"))).toEqual([
      "Open models · Meta",
      "Proprietary · OpenAI",
    ]);
    expect(groups[0]?.models[0]?.licenseTier).toBe("open");
    expect(groups[1]?.models[0]?.licenseTier).toBe("proprietary");
  });
});
