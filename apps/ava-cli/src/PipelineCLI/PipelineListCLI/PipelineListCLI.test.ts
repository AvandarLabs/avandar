import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Acclimate } from "@avandar/acclimate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function _getCombinedLogs(): string {
  const logCalls = (Acclimate.log as unknown as { mock: { calls: unknown[] } })
    .mock.calls;

  return logCalls.flat().join("\n");
}

describe("runPipelineList", () => {
  let tempDirPath: string | undefined = undefined;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(Acclimate, "log").mockImplementation(() => {});
    tempDirPath = await mkdtemp(path.join(tmpdir(), "ava-pipeline-list-"));
  });

  afterEach(async () => {
    if (tempDirPath) {
      await rm(tempDirPath, {
        force: true,
        recursive: true,
      });
      tempDirPath = undefined;
    }
  });

  it("lists available pipeline names", async () => {
    const pipelinesDirPath: string = path.join(tempDirPath!, "pipelines");
    await mkdir(path.join(pipelinesDirPath, "second-pipeline"), {
      recursive: true,
    });
    await mkdir(path.join(pipelinesDirPath, "first-pipeline"), {
      recursive: true,
    });
    await mkdir(path.join(pipelinesDirPath, "ignored-pipeline"), {
      recursive: true,
    });

    await writeFile(
      path.join(pipelinesDirPath, "first-pipeline", "run.ts"),
      "export async function run(): Promise<string> { return 'first-pipeline'; }\n",
    );
    await writeFile(
      path.join(pipelinesDirPath, "second-pipeline", "run.ts"),
      "export async function run(): Promise<string> { return 'second-pipeline'; }\n",
    );

    const { runPipelineList } = await import("./PipelineListCLI");
    await runPipelineList({ pipelinesDirPath });

    const logs = _getCombinedLogs();
    expect(logs).toContain("Available pipelines:");
    expect(logs).toContain("first-pipeline");
    expect(logs).toContain("second-pipeline");
    expect(logs).not.toContain("ignored-pipeline");
  });

  it("prints a friendly message when no pipelines are found", async () => {
    const pipelinesDirPath: string = path.join(tempDirPath!, "pipelines");
    await mkdir(pipelinesDirPath, {
      recursive: true,
    });

    const { runPipelineList } = await import("./PipelineListCLI");
    await runPipelineList({ pipelinesDirPath });

    const logs = _getCombinedLogs();
    expect(logs).toContain("No pipelines found.");
  });
});
