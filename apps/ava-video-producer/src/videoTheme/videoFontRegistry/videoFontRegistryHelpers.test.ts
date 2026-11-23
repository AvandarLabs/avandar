import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { prop } from "@avandar/utils";
import { VideoFonts } from "./VideoFonts";

const PUBLIC_DIRECTORY = fileURLToPath(
  new URL("../../../public", import.meta.url),
);

test("every bundled font file exists in public/fonts", async () => {
  await Promise.all(
    VideoFonts.listBundledVideoFonts().map((font) => {
      return fs.access(path.join(PUBLIC_DIRECTORY, font.file));
    }),
  );
});

test("every font file in public/fonts is registered", async () => {
  const files = (await fs.readdir(path.join(PUBLIC_DIRECTORY, "fonts")))
    .filter((name) => {
      return name.endsWith(".woff2");
    })
    .map((name) => {
      return `fonts/${name}`;
    });
  assert.deepEqual(
    files.sort(),
    VideoFonts.listBundledVideoFonts().map(prop("file")).sort(),
  );
});

test("a registered stack maps back to its font id", () => {
  assert.equal(
    VideoFonts.getVideoFontIdFromStack("'Courier New', monospace"),
    "courier",
  );
});

test("an unregistered stack has no font id", () => {
  assert.equal(
    VideoFonts.getVideoFontIdFromStack("Comic Sans MS, cursive"),
    undefined,
  );
});
