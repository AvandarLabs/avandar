import { clearOpfs } from "@browser-utils/clearOpfs/clearOpfs";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("clearOpfs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses root.remove({ recursive: true }) when available", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const root = { remove };
    vi.stubGlobal("navigator", {
      storage: { getDirectory: vi.fn().mockResolvedValue(root) },
    });

    await clearOpfs();

    expect(remove).toHaveBeenCalledWith({ recursive: true });
  });

  it("falls back to removing each entry when remove is unavailable", async () => {
    const removeEntry = vi.fn().mockResolvedValue(undefined);
    // Root has no `remove`, so clearOpfs iterates entries and calls
    // removeOpfsFile (which itself resolves the directory again).
    const root = {
      queryPermission: vi.fn().mockResolvedValue("granted"),
      requestPermission: vi.fn().mockResolvedValue("granted"),
      removeEntry,
      async *entries(): AsyncGenerator<[string, unknown]> {
        yield ["first.parquet", {}];
        yield ["second.parquet", {}];
      },
    };
    vi.stubGlobal("navigator", {
      storage: { getDirectory: vi.fn().mockResolvedValue(root) },
    });

    await clearOpfs();

    expect(removeEntry).toHaveBeenCalledTimes(2);
    expect(removeEntry).toHaveBeenCalledWith("first.parquet", {
      recursive: false,
    });
    expect(removeEntry).toHaveBeenCalledWith("second.parquet", {
      recursive: false,
    });
  });
});
