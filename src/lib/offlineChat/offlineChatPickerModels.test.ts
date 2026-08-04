import { describe, expect, it } from "vitest";
import { OfflineChatPickerModels } from "./offlineChatPickerModels";
import type { LocalChatModelCopy } from "./LocalChatModelCatalog/LocalChatModelCatalog";

const TRANSLATED_GROUP_LABEL = "Modelos sin conexión";

function getTranslatedCopy(): LocalChatModelCopy {
  return {
    displayName: "Qwen 2.5 1.5B (sin conexión)",
    pickerName: "Qwen 2.5 1.5B",
    description: "Modelo equilibrado para consultas SQL cotidianas.",
    systemRequirements: "8 GB de RAM",
    recommendedIf: "Recomendado para equipos con unos 8 GB de RAM.",
  };
}

describe("offlineChatPickerModels", () => {
  it("round-trips offline picker ids", () => {
    const pickerId = OfflineChatPickerModels.buildModelId("qwen-1.5b");
    expect(pickerId).toBe("offline:qwen-1.5b");
    expect(OfflineChatPickerModels.parseModelId(pickerId)).toBe("qwen-1.5b");
  });

  it("returns undefined for cloud model ids", () => {
    expect(
      OfflineChatPickerModels.parseModelId("anthropic/claude-3.5-sonnet"),
    ).toBe(undefined);
  });

  it("builds an Offline models group for downloaded ids", () => {
    const group = OfflineChatPickerModels.buildGroup(
      ["qwen-1.5b"],
      getTranslatedCopy,
      TRANSLATED_GROUP_LABEL,
    );
    expect(group?.group).toBe(TRANSLATED_GROUP_LABEL);
    expect(group?.models[0]?.id).toBe("offline:qwen-1.5b");
    expect(group?.models[0]?.name).toBe("Qwen 2.5 1.5B");
    expect(group?.models[0]?.description).toContain("8 GB de RAM");
  });

  it("parses new catalog ids", () => {
    expect(OfflineChatPickerModels.parseModelId("offline:qwen-7b")).toBe(
      "qwen-7b",
    );
    expect(OfflineChatPickerModels.parseModelId("offline:llama-8b")).toBe(
      "llama-8b",
    );
  });
});
