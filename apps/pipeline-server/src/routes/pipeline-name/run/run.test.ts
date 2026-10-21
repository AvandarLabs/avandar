import { run } from "@pipeline-server/routes/pipeline-name/run/run";
import { describe, expect, it, vi } from "vitest";

const hdxRun = vi.hoisted(() => {
  return vi.fn();
});

vi.mock("../../../../pipelines/hdx/run.ts", () => {
  return { run: hdxRun };
});

describe("run pipeline", () => {
  it("throws when the pipeline does not exist", async () => {
    await expect(
      run({
        pipelineName: "missing-pipeline",
        mode: "full",
      }),
    ).rejects.toThrow();
  });

  it("passes scopes to the pipeline module's run", async () => {
    await run({
      pipelineName: "hdx",
      mode: "full",
      scopes: ["format:csv"],
    });

    expect(hdxRun).toHaveBeenCalledWith(
      expect.objectContaining({ scopes: ["format:csv"] }),
    );
  });
});
