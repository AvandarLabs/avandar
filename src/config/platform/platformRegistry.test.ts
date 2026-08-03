import { afterEach, describe, expect, it } from "vitest";
import {
  __resetPlatformImplsForTests,
  getPlatformImpls,
  setPlatformImpls,
} from "./platformRegistry";
import type { PlatformImpls } from "./PlatformProvider";

const fakeImpls = {
  duckDb: { __tag: "duckDb" },
  authProvider: { __tag: "authProvider" },
  datasetBlobStore: { __tag: "datasetBlobStore" },
} as unknown as PlatformImpls;

describe("platformRegistry", () => {
  afterEach(() => {
    __resetPlatformImplsForTests();
  });

  it("throws when read before setPlatformImpls", () => {
    expect(() => {
      return getPlatformImpls();
    }).toThrow(/before PlatformProvider mounted/);
  });

  it("returns the registered value after setPlatformImpls", () => {
    setPlatformImpls(fakeImpls);
    expect(getPlatformImpls()).toBe(fakeImpls);
  });

  it("replaces the prior value when set again", () => {
    setPlatformImpls(fakeImpls);
    const replacement = {
      ...fakeImpls,
      duckDb: { __tag: "duckDb-2" },
    } as unknown as PlatformImpls;
    setPlatformImpls(replacement);
    expect(getPlatformImpls()).toBe(replacement);
  });

  it("resets between tests via the test-only seam", () => {
    setPlatformImpls(fakeImpls);
    __resetPlatformImplsForTests();
    expect(() => {
      return getPlatformImpls();
    }).toThrow(/before PlatformProvider mounted/);
  });
});
