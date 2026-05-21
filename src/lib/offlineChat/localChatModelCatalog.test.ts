import { describe, expect, it } from "vitest";
import { isLocalChatModelId, LOCAL_CHAT_MODELS } from "./localChatModelCatalog";

describe("localChatModelCatalog", () => {
  it("lists models in ascending RAM tier", () => {
    const tiers = LOCAL_CHAT_MODELS.map((model) => {
      return model.minRamGb;
    });
    expect(tiers).toEqual([4, 8, 12, 16, 24, 32]);
  });

  it("caps RAM guidance at 32 GB", () => {
    const maxTier = Math.max(
      ...LOCAL_CHAT_MODELS.map((model) => {
        return model.minRamGb;
      }),
    );
    expect(maxTier).toBe(32);
  });

  it("uses unique catalog and MLC ids", () => {
    const catalogIds = LOCAL_CHAT_MODELS.map((model) => {
      return model.id;
    });
    const mlcIds = LOCAL_CHAT_MODELS.map((model) => {
      return model.mlcModelId;
    });
    expect(new Set(catalogIds).size).toBe(catalogIds.length);
    expect(new Set(mlcIds).size).toBe(mlcIds.length);
  });

  it("isLocalChatModelId accepts every catalog id", () => {
    for (const model of LOCAL_CHAT_MODELS) {
      expect(isLocalChatModelId(model.id)).toBe(true);
    }
    expect(isLocalChatModelId("not-a-model")).toBe(false);
  });
});
