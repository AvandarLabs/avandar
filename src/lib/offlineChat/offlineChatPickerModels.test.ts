import { describe, expect, it } from "vitest";
import {
  buildOfflineChatPickerGroup,
  buildOfflineChatPickerModelId,
  OFFLINE_CHAT_PICKER_GROUP_LABEL,
  parseOfflineChatPickerModelId,
} from "./offlineChatPickerModels";

describe("offlineChatPickerModels", () => {
  it("round-trips offline picker ids", () => {
    const pickerId = buildOfflineChatPickerModelId("qwen-1.5b");
    expect(pickerId).toBe("offline:qwen-1.5b");
    expect(parseOfflineChatPickerModelId(pickerId)).toBe("qwen-1.5b");
  });

  it("returns undefined for cloud model ids", () => {
    expect(parseOfflineChatPickerModelId("anthropic/claude-3.5-sonnet")).toBe(
      undefined,
    );
  });

  it("builds an Offline models group for downloaded ids", () => {
    const group = buildOfflineChatPickerGroup(["qwen-1.5b"]);
    expect(group?.group).toBe(OFFLINE_CHAT_PICKER_GROUP_LABEL);
    expect(group?.models[0]?.id).toBe("offline:qwen-1.5b");
    expect(group?.models[0]?.name).toBe("Qwen 2.5 1.5B");
    expect(group?.models[0]?.description).toContain("8 GB RAM");
  });

  it("parses new catalog ids", () => {
    expect(parseOfflineChatPickerModelId("offline:qwen-7b")).toBe("qwen-7b");
    expect(parseOfflineChatPickerModelId("offline:llama-8b")).toBe("llama-8b");
  });
});
