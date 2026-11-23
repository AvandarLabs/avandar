import { createParquetCopyQueue } from "@pipeline-server/openDataParquetCache/createParquetCopyQueue/createParquetCopyQueue";
import { describe, expect, it, vi } from "vitest";

function _job(buildId: string) {
  return { catalogListingId: "listing", buildId };
}

describe("createParquetCopyQueue", () => {
  it("runs builds one at a time, in the order they were queued", async () => {
    const events: string[] = [];
    const queue = createParquetCopyQueue({
      runJob: async (job) => {
        events.push(`start ${job.buildId}`);
        await new Promise((resolve) => {
          setTimeout(resolve, 5);
        });
        events.push(`end ${job.buildId}`);
      },
      onJobError: vi.fn(),
    });

    queue.enqueue(_job("a"));
    queue.enqueue(_job("b"));
    await queue.whenIdle();

    expect(events).toEqual(["start a", "end a", "start b", "end b"]);
  });

  it("ignores a build that is already queued or running", async () => {
    const runJob = vi.fn(async () => {});
    const queue = createParquetCopyQueue({ runJob, onJobError: vi.fn() });

    expect([queue.enqueue(_job("a")), queue.enqueue(_job("a"))]).toEqual([
      true,
      false,
    ]);
    await queue.whenIdle();

    expect(runJob).toHaveBeenCalledTimes(1);
  });

  it("keeps going after a build throws, and reports the error", async () => {
    const onJobError = vi.fn();
    const runJob = vi.fn(async (job: { buildId: string }) => {
      if (job.buildId === "a") {
        throw new Error("boom");
      }
    });
    const queue = createParquetCopyQueue({ runJob, onJobError });

    queue.enqueue(_job("a"));
    queue.enqueue(_job("b"));
    await queue.whenIdle();

    expect(runJob).toHaveBeenCalledTimes(2);
    expect(onJobError).toHaveBeenCalledWith(_job("a"), expect.any(Error));
  });

  it("accepts the same build again once it has finished", async () => {
    const runJob = vi.fn(async () => {});
    const queue = createParquetCopyQueue({ runJob, onJobError: vi.fn() });

    queue.enqueue(_job("a"));
    await queue.whenIdle();

    expect(queue.enqueue(_job("a"))).toBe(true);
  });
});
