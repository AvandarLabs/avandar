import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatOfflineQueryError,
  OFFLINE_UNCACHED_MESSAGE,
} from "@/lib/offline/formatOfflineQueryError/formatOfflineQueryError";

describe("formatOfflineQueryError", () => {
  afterEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("returns undefined when online", () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(formatOfflineQueryError()).toBeUndefined();
  });

  it("returns offline message when offline", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(formatOfflineQueryError()).toBe(OFFLINE_UNCACHED_MESSAGE);
  });
});
