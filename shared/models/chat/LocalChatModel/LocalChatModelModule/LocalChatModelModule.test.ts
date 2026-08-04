import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel.ts";
import { describe, expect, it } from "vitest";

describe("LocalChatModel.Catalog", () => {
  it("lists models in ascending RAM tier", () => {
    const tiers = LocalChatModel.Catalog.values.map((model) => {
      return model.minRamGb;
    });
    const sortedTiers = [...tiers].sort((leftTier, rightTier) => {
      return leftTier - rightTier;
    });
    expect(tiers).toEqual(sortedTiers);
  });

  it("caps RAM guidance at 32 GB", () => {
    const maxTier = Math.max(
      ...LocalChatModel.Catalog.values.map((model) => {
        return model.minRamGb;
      }),
    );
    expect(maxTier).toBe(32);
  });

  it("uses unique catalog and MLC ids", () => {
    const catalogIds = LocalChatModel.Catalog.values.map((model) => {
      return model.id;
    });
    const mlcIds = LocalChatModel.Catalog.values.map((model) => {
      return model.mlcModelId;
    });
    expect(new Set(catalogIds).size).toBe(catalogIds.length);
    expect(new Set(mlcIds).size).toBe(mlcIds.length);
  });

  it("isValidId accepts every catalog id and rejects unknown ids", () => {
    LocalChatModel.Catalog.values.forEach((model) => {
      expect(LocalChatModel.Catalog.isValidId(model.id)).toBe(true);
    });
    expect(LocalChatModel.Catalog.isValidId("not-a-model")).toBe(false);
  });
});
