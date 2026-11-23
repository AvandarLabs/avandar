import { describe, expect, it } from "vitest";
import { ensureOfflineChatSchema } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/ensureOfflineChatSchema/ensureOfflineChatSchema";

describe("ensureOfflineChatSchema", () => {
  it("adds open dataset when cache has no datasets", () => {
    const result = ensureOfflineChatSchema({
      schema: { datasets: [], columns: [] },
      openDatasetId: "ds-open",
    });
    expect(result.datasets).toEqual([{ id: "ds-open", name: "ds-open" }]);
  });

  it("keeps case type statuses when it adds the open dataset", () => {
    const result = ensureOfflineChatSchema({
      schema: {
        datasets: [],
        columns: [],
        concepts: [{ id: "c-1", name: "Case" }],
        conceptStatuses: [{ concept_id: "c-1", name: "Active", position: 0 }],
      },
      openDatasetId: "ds-open",
    });

    expect(result.conceptStatuses).toEqual([
      { concept_id: "c-1", name: "Active", position: 0 },
    ]);
  });
});
