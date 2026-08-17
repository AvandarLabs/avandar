import { describe, expect, it, vi } from "vitest";
import { abortDuckDbQuery } from "./abortDuckDbQuery";

describe("abortDuckDbQuery", () => {
  it("cancels the current query once and removes its listener", async () => {
    const controller = new AbortController();
    const cancelSent = vi.fn(async () => {
      return undefined;
    });
    const cleanup = abortDuckDbQuery({
      signal: controller.signal,
      connection: { cancelSent },
    });

    controller.abort();
    controller.abort();
    await Promise.resolve();

    expect(cancelSent).toHaveBeenCalledOnce();
    cleanup();
  });

  it("throws before registration when already aborted", () => {
    const controller = new AbortController();
    controller.abort();

    expect(() => {
      abortDuckDbQuery({
        signal: controller.signal,
        connection: { cancelSent: vi.fn() },
      });
    }).toThrow();
  });
});
