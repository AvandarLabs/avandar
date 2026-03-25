import { describe, expect, it } from "vitest";
import { run } from "./run";

describe("run pipeline", () => {
  it("runs the requested pipeline module", async () => {
    await expect(
      run({
        pipelineName: "first-pipeline",
      }),
    ).resolves.toBe("first-pipeline");
  });

  it("throws when the pipeline does not exist", async () => {
    await expect(
      run({
        pipelineName: "missing-pipeline",
      }),
    ).rejects.toThrow();
  });
});
