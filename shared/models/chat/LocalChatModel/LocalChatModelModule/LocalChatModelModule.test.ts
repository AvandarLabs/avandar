import { describe, expect, it } from "vitest";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel.ts";

describe("LocalChatModel.OFFLINE_BUNDLE", () => {
  it("lists only models that are in the catalog", () => {
    LocalChatModel.getModelIdsFromBundle(LocalChatModel.OFFLINE_BUNDLE).forEach(
      (modelId) => {
        expect(LocalChatModel.Catalog.isValidId(modelId)).toBe(true);
      },
    );
  });

  it("fits a 16 GB computer running Chrome, the app, and DuckDB", () => {
    // At most one large model is resident at a time, so the peak is the
    // largest single model, not the sum of the bundle.
    expect(
      LocalChatModel.getPeakMemoryMbFromBundle(LocalChatModel.OFFLINE_BUNDLE),
    ).toBeLessThanOrEqual(LocalChatModel.PEAK_MODEL_MEMORY_BUDGET_MB);
    LocalChatModel.getModelIdsFromBundle(LocalChatModel.OFFLINE_BUNDLE).forEach(
      (modelId) => {
        expect(
          LocalChatModel.Catalog.find(modelId).minRamGb,
        ).toBeLessThanOrEqual(16);
      },
    );
  });
});

describe("LocalChatModel bundle helpers", () => {
  const catalogIds = LocalChatModel.Catalog.values.map((model) => {
    return model.id;
  });
  const onlyId = catalogIds[0]!;

  it("counts a model used for several jobs once", () => {
    const bundle = { answer: onlyId, router: onlyId, escalation: onlyId };
    expect(LocalChatModel.getModelIdsFromBundle(bundle)).toEqual([onlyId]);
  });

  it("sums the download of each distinct model once", () => {
    const bundle = { answer: onlyId, router: onlyId };
    expect(LocalChatModel.getDownloadMbFromBundle(bundle)).toBe(
      LocalChatModel.Catalog.find(onlyId).approxDownloadMb,
    );
  });
});

describe("LocalChatModel.Catalog", () => {
  it("isValidId accepts every catalog id and rejects unknown ids", () => {
    LocalChatModel.Catalog.values.forEach((model) => {
      expect(LocalChatModel.Catalog.isValidId(model.id)).toBe(true);
    });
    expect(LocalChatModel.Catalog.isValidId("not-a-model")).toBe(false);
  });
});
