import type { PlatformImpls } from "../PlatformProvider/PlatformProvider";

import { afterEach, describe, expect, it } from "vitest";

import { PlatformRegistry } from "./PlatformRegistry";

const fakeImpls = {
  duckDb: { __tag: "duckDb" },
  authProvider: { __tag: "authProvider" },
  datasetBlobStore: { __tag: "datasetBlobStore" },
} as unknown as PlatformImpls;

describe("platformRegistry", () => {
  afterEach(() => {
    PlatformRegistry.resetForTests();
  });

  it("throws when read before PlatformRegistry.setImpls", () => {
    expect(() => {
      return PlatformRegistry.getImpls();
    }).toThrow(/before PlatformProvider mounted/);
  });

  it("returns the registered value after PlatformRegistry.setImpls", () => {
    PlatformRegistry.setImpls(fakeImpls);
    expect(PlatformRegistry.getImpls()).toBe(fakeImpls);
  });

  it("replaces the prior value when set again", () => {
    PlatformRegistry.setImpls(fakeImpls);
    const replacement = {
      ...fakeImpls,
      duckDb: { __tag: "duckDb-2" },
    } as unknown as PlatformImpls;
    PlatformRegistry.setImpls(replacement);
    expect(PlatformRegistry.getImpls()).toBe(replacement);
  });

  it("resets between tests via the test-only seam", () => {
    PlatformRegistry.setImpls(fakeImpls);
    PlatformRegistry.resetForTests();
    expect(() => {
      return PlatformRegistry.getImpls();
    }).toThrow(/before PlatformProvider mounted/);
  });
});
