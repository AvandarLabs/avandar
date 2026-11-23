import { describe, expect, it } from "vitest";
import { narrowOfflineSchema } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/narrowOfflineSchema/narrowOfflineSchema";

describe("narrowOfflineSchema", () => {
  it("keeps every case type's statuses when it narrows to one dataset", () => {
    const narrowed = narrowOfflineSchema(
      {
        datasets: [
          { id: "ds-a", name: "A" },
          { id: "ds-b", name: "B" },
        ],
        columns: [],
        concepts: [{ id: "c-1", name: "Case" }],
        conceptAttributes: [],
        conceptStatuses: [{ concept_id: "c-1", name: "Active", position: 0 }],
      },
      "ds-a",
    );

    expect(narrowed.conceptStatuses).toEqual([
      { concept_id: "c-1", name: "Active", position: 0 },
    ]);
  });
});
