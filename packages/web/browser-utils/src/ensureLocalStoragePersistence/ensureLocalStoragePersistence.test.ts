import { ensureLocalStoragePersistence } from "@browser-utils/ensureLocalStoragePersistence/ensureLocalStoragePersistence";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("ensureLocalStoragePersistence", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests persistence when not already persisting", async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("navigator", {
      storage: {
        persisted: vi.fn().mockResolvedValue(false),
        persist,
      },
    });

    await ensureLocalStoragePersistence();

    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("does not request persistence when already persisting", async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("navigator", {
      storage: {
        persisted: vi.fn().mockResolvedValue(true),
        persist,
      },
    });

    await ensureLocalStoragePersistence();

    expect(persist).not.toHaveBeenCalled();
  });

  it("resolves without throwing when the persistence API is unavailable", async () => {
    vi.stubGlobal("navigator", { storage: {} });
    await expect(ensureLocalStoragePersistence()).resolves.toBeUndefined();
  });
});
