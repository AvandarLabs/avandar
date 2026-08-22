/** Persist only on a clean idle edge for the same chat generation. */
import { describe, expect, it } from "vitest";
import { shouldPersistThreadOnRunEnd } from "./shouldPersistThreadOnRunEnd";

describe("shouldPersistThreadOnRunEnd", () => {
  it("persists on true→false when generation is unchanged", () => {
    expect(
      shouldPersistThreadOnRunEnd({
        wasRunning: true,
        isRunning: false,
        runStartGeneration: 2,
        currentGeneration: 2,
      }),
    ).toBe(true);
  });

  it("skips when New chat bumped generation during the run", () => {
    expect(
      shouldPersistThreadOnRunEnd({
        wasRunning: true,
        isRunning: false,
        runStartGeneration: 2,
        currentGeneration: 3,
      }),
    ).toBe(false);
  });

  it("skips when the run did not end", () => {
    expect(
      shouldPersistThreadOnRunEnd({
        wasRunning: true,
        isRunning: true,
        runStartGeneration: 1,
        currentGeneration: 1,
      }),
    ).toBe(false);
    expect(
      shouldPersistThreadOnRunEnd({
        wasRunning: false,
        isRunning: false,
        runStartGeneration: 1,
        currentGeneration: 1,
      }),
    ).toBe(false);
  });
});
