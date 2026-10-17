import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { appRoot, loadFilm } from "./loadFilm";

test("unknown IDs and unsafe render options cannot become render inputs", async () => {
  await assert.rejects(loadFilm("../.env.local"));
  await assert.rejects(
    loadFilm("stock-plexus-field", { accent: "url(https://example.com)" }),
  );
  await assert.rejects(loadFilm("avandar-home", { background: "#ffffff" }));
});

test("stock downloads carry the selected palette into the composition", async () => {
  const film = await loadFilm("stock-plexus-field", {
    accent: "#ff0000",
    background: "#ffffff",
  });
  assert.equal(film.kind, "stock");
  assert.equal(film.accent, "#ff0000");
  assert.equal(film.background, "#ffffff");
  assert.equal(film.frames, 180);
});

test("homepage captions can be hidden without changing product stage geometry", async () => {
  const film = await loadFilm("avandar-home", { captions: false });
  assert.equal(film.plan?.captions, true);
  assert.equal(film.showCaptions, false);
  assert.equal(film.frames, 590);
  assert.equal(film.source, "apps/ava-video-producer/storyboards/home.json");
});

async function _withCatalogCopy(
  action: (root: string, load: typeof loadFilm) => Promise<void>,
) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "showcase-catalog-"));
  try {
    const files = [
      "scripts/showcase/loadFilm/loadFilm.ts",
      "src/storyboard/schema/schema.ts",
      "src/storyboard/schema/primitives.ts",
      "src/storyboard/schema/shotSchema.ts",
      "src/storyboard/schema/storyboardSchema.ts",
      "src/storyboard/schema/timeline.ts",
      "src/scenes/layout/layout.ts",
      "src/scenes/layout/geometry.ts",
      "src/scenes/layout/graphLayout.ts",
      "src/scenes/layout/textLayout.ts",
      "src/scenes/layout/captionLayout.ts",
      "src/motion.ts",
      "src/stock/catalog.ts",
    ];
    await Promise.all(
      files.map(async (file) => {
        await fs.mkdir(path.dirname(path.join(root, file)), {
          recursive: true,
        });
        await fs.copyFile(path.join(appRoot, file), path.join(root, file));
      }),
    );
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ type: "module" }),
    );
    await fs.symlink(
      path.join(appRoot, "node_modules"),
      path.join(root, "node_modules"),
    );
    await fs.writeFile(
      path.join(root, "src/composition-timing.ts"),
      "export const TITLE_LEN=12; export const TITLE_STUDY_LEN=90; export const MOTION_LAB_LEN=42;",
    );
    const catalog: typeof import("./loadFilm") = await import(
      pathToFileURL(path.join(root, "scripts/showcase/loadFilm/loadFilm.ts"))
        .href
    );
    await action(root, catalog.loadFilm);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("stock exports use edited source duration without restarting the catalog", async () => {
  await _withCatalogCopy(async (root, load) => {
    assert.equal((await load("stock-plexus-field")).frames, 180);
    const filename = path.join(root, "src/stock/catalog.ts");
    const source = await fs.readFile(filename, "utf8");
    await fs.writeFile(
      filename,
      source.replace("STOCK_LOOP_FRAMES = 180", "STOCK_LOOP_FRAMES = 240"),
    );
    assert.equal((await load("stock-plexus-field")).frames, 240);
  });
});

test("fixed film durations follow edited shared timing without restarting", async () => {
  await _withCatalogCopy(async (root, load) => {
    assert.equal((await load("title-study")).frames, 90);
    assert.equal((await load("motion-lab")).frames, 54);
    await fs.writeFile(
      path.join(root, "src/composition-timing.ts"),
      "export const TITLE_LEN=24; export const TITLE_STUDY_LEN=120; export const MOTION_LAB_LEN=66;",
    );
    assert.equal((await load("title-study")).frames, 120);
    assert.equal((await load("motion-lab")).frames, 90);
  });
});
