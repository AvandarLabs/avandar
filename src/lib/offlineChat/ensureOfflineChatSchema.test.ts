import { describe, expect, it } from "vitest";
import { ensureOfflineChatSchema } from "./ensureOfflineChatSchema";

describe("ensureOfflineChatSchema", () => {
  it("adds open dataset when cache has no datasets", () => {
    const result = ensureOfflineChatSchema({
      schema: { datasets: [], columns: [] },
      openDatasetId: "ds-open",
    });
    expect(result.datasets).toEqual([{ id: "ds-open", name: "ds-open" }]);
  });
});
