import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption";
import { afterEach, describe, expect, it } from "vitest";
import { useChatModelCatalog } from "@/components/ChatPanel/useChatModelCatalog";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import { renderHook, TestProviders } from "@/test-utils";

function renderCatalog() {
  return renderHook(
    () => {
      return useChatModelCatalog();
    },
    { wrapper: TestProviders },
  );
}

describe("useChatModelCatalog", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns frontier models before open models", () => {
    const { result } = renderCatalog();

    expect(
      result.current.groups.map((entry) => {
        return entry.group;
      }),
    ).toEqual(["Frontier models", "Open models"]);
  });

  it("exposes every catalog model exactly once", () => {
    const { result } = renderCatalog();

    const flattenedIds = result.current.models.map((model) => {
      return model.id;
    });
    const catalogIds = ChatModelOption.Catalog.values.map((model) => {
      return model.id;
    });
    expect([...flattenedIds].sort()).toEqual([...catalogIds].sort());
  });

  it("partitions models by license tier", () => {
    // Without this, swapping the two `modelsInTier` arguments would ship
    // Claude Sonnet 5 under "Open models" and every other test would pass:
    // the label test only checks labels, and the coverage test sorts both
    // sides before comparing.
    const { result } = renderCatalog();

    expect(
      result.current.groups[0]?.models.every((model) => {
        return model.licenseTier === "proprietary";
      }),
    ).toBe(true);
    expect(
      result.current.groups[1]?.models.every((model) => {
        return model.licenseTier === "open";
      }),
    ).toBe(true);
  });

  it("prepends an offline group when a local model is downloaded", () => {
    LocalChatModelStore.markDownloaded("qwen-1.5b");

    const { result } = renderCatalog();

    expect(result.current.groups).toHaveLength(3);
    expect(result.current.groups[0]?.group).toBe("Offline models");
    expect(result.current.models).toHaveLength(
      ChatModelOption.Catalog.values.length + 1,
    );
  });
});
