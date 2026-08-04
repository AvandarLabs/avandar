import { describe, expect, it } from "vitest";
import { LocalChatModelCatalog } from "./LocalChatModelCatalog";

describe("LocalChatModelCatalog/LocalChatModelCatalog", () => {
  it("lists models in ascending RAM tier", () => {
    const tiers = LocalChatModelCatalog.values.map((model) => {
      return model.minRamGb;
    });
    const sortedTiers = [...tiers].sort((leftTier, rightTier) => {
      return leftTier - rightTier;
    });
    expect(tiers).toEqual(sortedTiers);
  });

  it("caps RAM guidance at 32 GB", () => {
    const maxTier = Math.max(
      ...LocalChatModelCatalog.values.map((model) => {
        return model.minRamGb;
      }),
    );
    expect(maxTier).toBe(32);
  });

  it("uses unique catalog and MLC ids", () => {
    const catalogIds = LocalChatModelCatalog.values.map((model) => {
      return model.id;
    });
    const mlcIds = LocalChatModelCatalog.values.map((model) => {
      return model.mlcModelId;
    });
    expect(new Set(catalogIds).size).toBe(catalogIds.length);
    expect(new Set(mlcIds).size).toBe(mlcIds.length);
  });

  it("LocalChatModelCatalog.isValidId accepts every catalog id", () => {
    LocalChatModelCatalog.values.forEach((model) => {
      expect(LocalChatModelCatalog.isValidId(model.id)).toBe(true);
    });
    expect(LocalChatModelCatalog.isValidId("not-a-model")).toBe(false);
  });
});
