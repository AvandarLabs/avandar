import { getIsOnline } from "@browser-utils/getIsOnline/getIsOnline";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("getIsOnline", () => {
  afterEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("reads navigator.onLine", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(getIsOnline()).toBe(false);
  });
});
