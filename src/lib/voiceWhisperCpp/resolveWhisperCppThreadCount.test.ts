import { describe, expect, it } from "vitest";
import { resolveWhisperCppThreadCount } from "./resolveWhisperCppThreadCount";

describe("resolveWhisperCppThreadCount", () => {
  it("returns 1 thread on web", () => {
    expect(resolveWhisperCppThreadCount()).toBe(1);
  });
});
