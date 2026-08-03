import { afterEach, describe, expect, it, vi } from "vitest";
import { removeOpfsFile } from "@browser-utils/removeOpfsFile/removeOpfsFile";

function stubOpfsRoot(): {
  removeEntry: ReturnType<typeof vi.fn>;
} {
  const root = {
    queryPermission: vi.fn().mockResolvedValue("granted"),
    requestPermission: vi.fn().mockResolvedValue("granted"),
    removeEntry: vi.fn().mockResolvedValue(undefined),
  };
  vi.stubGlobal("navigator", {
    storage: { getDirectory: vi.fn().mockResolvedValue(root) },
  });
  return root;
}

describe("removeOpfsFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("removes the entry by name (non-recursive)", async () => {
    const root = stubOpfsRoot();

    await removeOpfsFile("data.parquet");

    expect(root.removeEntry).toHaveBeenCalledWith("data.parquet", {
      recursive: false,
    });
  });

  it("strips the opfs:// prefix before removing", async () => {
    const root = stubOpfsRoot();

    await removeOpfsFile("opfs://nested/data.parquet");

    expect(root.removeEntry).toHaveBeenCalledWith("nested/data.parquet", {
      recursive: false,
    });
  });
});
