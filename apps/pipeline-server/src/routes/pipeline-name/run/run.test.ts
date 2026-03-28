import { run } from "@pipeline-server/routes/pipeline-name/run/run";
import { describe, expect, it } from "vitest";

describe("run pipeline", () => {
  it("throws when the pipeline does not exist", async () => {
    await expect(
      run({
        pipelineName: "missing-pipeline",
      }),
    ).rejects.toThrow();
  });
});
