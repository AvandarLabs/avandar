import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readRgbaFromPng, writePngFromRgba } from "./rgbaPng";

test("RGBA pixels survive a PNG round trip unchanged", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "rgba-png-"));
  try {
    const file = path.join(directory, "frame.png");
    const pixels = Uint8Array.from([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 12, 34, 56, 255,
    ]);
    await writePngFromRgba({
      file,
      rgba: pixels,
      size: { width: 2, height: 2 },
    });
    const decoded = await readRgbaFromPng(file, { width: 2, height: 2 });
    assert.deepEqual([...decoded], [...pixels]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
