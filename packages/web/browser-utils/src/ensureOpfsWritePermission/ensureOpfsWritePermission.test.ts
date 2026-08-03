import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureOpfsWritePermission } from "@browser-utils/ensureOpfsWritePermission/ensureOpfsWritePermission";

describe("ensureOpfsWritePermission", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does nothing when OPFS is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    // Should resolve without throwing.
    await expect(ensureOpfsWritePermission()).resolves.toBeUndefined();
  });

  it("does not request permission when it is already granted", async () => {
    const requestPermission = vi.fn();
    const root = {
      queryPermission: vi.fn().mockResolvedValue("granted"),
      requestPermission,
    };
    vi.stubGlobal("navigator", {
      storage: { getDirectory: vi.fn().mockResolvedValue(root) },
    });

    await ensureOpfsWritePermission();

    expect(root.queryPermission).toHaveBeenCalledWith({ mode: "readwrite" });
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("requests permission when not yet granted and succeeds", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    const root = {
      queryPermission: vi.fn().mockResolvedValue("prompt"),
      requestPermission,
    };
    vi.stubGlobal("navigator", {
      storage: { getDirectory: vi.fn().mockResolvedValue(root) },
    });

    await ensureOpfsWritePermission();

    expect(requestPermission).toHaveBeenCalledWith({ mode: "readwrite" });
  });

  it("throws when the requested permission is denied", async () => {
    const root = {
      queryPermission: vi.fn().mockResolvedValue("prompt"),
      requestPermission: vi.fn().mockResolvedValue("denied"),
    };
    vi.stubGlobal("navigator", {
      storage: { getDirectory: vi.fn().mockResolvedValue(root) },
    });

    await expect(ensureOpfsWritePermission()).rejects.toThrow(
      "OPFS write permission was not granted",
    );
  });
});
