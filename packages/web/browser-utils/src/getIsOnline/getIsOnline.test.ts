import { afterEach, describe, expect, it, vi } from "vitest";
import { getIsOnline } from "@browser-utils/getIsOnline/getIsOnline";

describe("getIsOnline", () => {
  afterEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("reads navigator.onLine", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(getIsOnline()).toBe(false);
  });
});
