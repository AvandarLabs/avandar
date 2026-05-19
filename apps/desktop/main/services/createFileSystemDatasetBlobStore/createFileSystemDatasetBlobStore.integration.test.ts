import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createFileSystemDatasetBlobStore } from "./createFileSystemDatasetBlobStore";

/*
 * G2.15 + G2.16 — `FileSystemDatasetBlobStore` round-trip and atomicity
 * invariants. The store is the only persistence layer for dataset
 * parquets and source files on desktop, so the test surface intentionally
 * over-covers: happy path, prefix listing, stat, delete, plus the
 * atomic-write crash sim and the path-traversal guard that the manual
 * review can't enforce.
 */

describe("FileSystemDatasetBlobStore", () => {
  let dir = "";

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "avandar-blob-test-"));
  });

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = "";
    }
  });

  it("put then getBytes round-trips bytes", async () => {
    const store = createFileSystemDatasetBlobStore(dir);
    const key = "workspaces/w/datasets/d/data.parquet";
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    await store.put(key, bytes);
    const out = await store.getBytes(key);
    expect(Array.from(out)).toEqual([1, 2, 3, 4, 5]);
  });

  it("exists / stat reflect store state", async () => {
    const store = createFileSystemDatasetBlobStore(dir);
    expect(await store.exists("missing")).toBe(false);
    expect(await store.stat("missing")).toBeNull();

    await store.put("present", new Uint8Array([1, 2]));
    expect(await store.exists("present")).toBe(true);
    const stat = await store.stat("present");
    expect(stat?.sizeBytes).toBe(2);
    expect(typeof stat?.mtimeMs).toBe("number");
  });

  it("delete removes the file and is idempotent", async () => {
    const store = createFileSystemDatasetBlobStore(dir);
    await store.put("rm-me", new Uint8Array([9]));
    expect(await store.exists("rm-me")).toBe(true);
    await store.delete("rm-me");
    expect(await store.exists("rm-me")).toBe(false);
    // Deleting a missing key is a no-op.
    await store.delete("rm-me");
    await store.delete("never-existed");
  });

  it("list returns matching keys under a prefix and skips in-flight .tmp files", async () => {
    const store = createFileSystemDatasetBlobStore(dir);
    await store.put("a/x", new Uint8Array([1]));
    await store.put("a/y", new Uint8Array([1]));
    await store.put("b/z", new Uint8Array([1]));
    // Drop a stray .tmp file directly; list must skip it.
    writeFileSync(join(dir, "a", "stray.tmp"), Buffer.from([0]));

    const aKeys = await store.list("a/");
    expect([...aKeys].sort()).toEqual(["a/x", "a/y"]);

    const allKeys = await store.list("");
    expect([...allKeys].sort()).toEqual(["a/x", "a/y", "b/z"]);
  });

  it("list returns [] for a prefix that has no files", async () => {
    const store = createFileSystemDatasetBlobStore(dir);
    expect(await store.list("nothing-here/")).toEqual([]);
  });

  it("put writes atomically — no .tmp remnant visible after a successful write", async () => {
    const store = createFileSystemDatasetBlobStore(dir);
    await store.put("k", new Uint8Array([1, 2, 3]));
    expect(existsSync(join(dir, "k.tmp"))).toBe(false);
    expect(existsSync(join(dir, "k"))).toBe(true);
  });

  it("crash during rename leaves no visible key (only the .tmp file)", async () => {
    /*
     * Inject a stubbed `fs` that throws on `renameSync` so the .tmp
     * file is on disk but the destination key never appears. The store
     * is expected to propagate the error untouched: callers see the
     * write fail; subsequent reads see no value at the key.
     */
    const realFs = await import("node:fs");
    let renameCalled = false;
    const fakeFs = {
      ...realFs,
      renameSync: () => {
        renameCalled = true;
        throw new Error("simulated crash during rename");
      },
    } as typeof realFs;

    const store = createFileSystemDatasetBlobStore(dir, fakeFs);
    await expect(
      store.put("doomed", new Uint8Array([1, 2, 3])),
    ).rejects.toThrow(/simulated crash/);
    expect(renameCalled).toBe(true);

    // Confirm the on-disk state: `.tmp` exists, final key does not.
    expect(existsSync(join(dir, "doomed"))).toBe(false);
    expect(existsSync(join(dir, "doomed.tmp"))).toBe(true);

    // The store using the real fs reports the same view.
    const realStore = createFileSystemDatasetBlobStore(dir);
    expect(await realStore.exists("doomed")).toBe(false);
  });

  it("rejects path-traversal keys (../ and ..\\)", async () => {
    const store = createFileSystemDatasetBlobStore(dir);
    await expect(
      store.put("../escape", new Uint8Array([1])),
    ).rejects.toThrow(/path traversal/);
    await expect(
      store.put("a/../../escape", new Uint8Array([1])),
    ).rejects.toThrow(/path traversal/);
    await expect(
      store.put("a\\..\\escape", new Uint8Array([1])),
    ).rejects.toThrow(/path traversal/);

    // Confirm the escapes never landed on disk.
    expect(readdirSync(dir)).toEqual([]);
  });

  it("rejects absolute paths", async () => {
    const store = createFileSystemDatasetBlobStore(dir);
    await expect(
      store.put("/etc/passwd", new Uint8Array([1])),
    ).rejects.toThrow(/absolute path/);
    await expect(
      store.put("C:/Windows/System32/evil", new Uint8Array([1])),
    ).rejects.toThrow(/absolute path/);
  });

  it("preserves byte-for-byte fidelity on a non-trivial payload", async () => {
    const store = createFileSystemDatasetBlobStore(dir);
    const bytes = new Uint8Array(8192);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = (i * 13 + 7) & 0xff;
    }
    await store.put("workspaces/w/datasets/d/source.bin", bytes);

    const out = await store.getBytes("workspaces/w/datasets/d/source.bin");
    expect(out.length).toBe(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) {
      if (out[i] !== bytes[i]) {
        throw new Error(`byte ${i} differs: ${out[i]} !== ${bytes[i]}`);
      }
    }

    const stat = await store.stat("workspaces/w/datasets/d/source.bin");
    expect(stat?.sizeBytes).toBe(bytes.length);
    expect(statSync(join(dir, "workspaces/w/datasets/d/source.bin")).size).toBe(
      bytes.length,
    );
  });
});
