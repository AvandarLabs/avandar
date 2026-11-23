import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { StaticFiles } from "./StaticFiles";

test("served files reject traversal and symlinks outside their public directory", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "showcase-files-"));
  try {
    await fs.mkdir(path.join(root, "public"));
    await fs.writeFile(path.join(root, "secret.txt"), "private");
    await fs.writeFile(path.join(root, "public", "asset.txt"), "public");
    await fs.symlink(
      path.join(root, "secret.txt"),
      path.join(root, "public", "escape.txt"),
    );
    assert.equal(
      await StaticFiles.servedFile({
        root: path.join(root, "public"),
        relative: "asset.txt",
      }),
      await fs.realpath(path.join(root, "public", "asset.txt")),
    );
    await assert.rejects(
      StaticFiles.servedFile({
        root: path.join(root, "public"),
        relative: "../secret.txt",
      }),
    );
    await assert.rejects(
      StaticFiles.servedFile({
        root: path.join(root, "public"),
        relative: "escape.txt",
      }),
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
