import assert from "node:assert/strict";
import test from "node:test";
import { ShowcaseFilms } from "./ShowcaseFilms";

test("a helper preview loads as a looping helper film from the catalog", async () => {
  const film = await ShowcaseFilms.load("helper-ease-out");
  assert.equal(film.kind, "helper");
  assert.equal(film.kind === "helper" && film.helper, "ease-out");
  assert.equal(film.frames, 75);
  assert.equal(film.fps, 30);
  assert.deepEqual([film.width, film.height], [960, 600]);
  assert.equal(film.loop, true);
  assert.equal(film.source, "apps/ava-video-producer/src/motion.ts");
  assert.deepEqual(film.kind === "helper" && film.assets, []);
});

test("a helper preview carries the curated media its demo loads", async () => {
  const film = await ShowcaseFilms.load("helper-media-plane");
  assert.deepEqual(film.kind === "helper" && film.assets, [
    "avandar/screens/explorer-explorer-chart.png",
  ]);
});

test("unknown helpers and palette options are rejected", async () => {
  await assert.rejects(ShowcaseFilms.load("helper-missing"));
  await assert.rejects(
    ShowcaseFilms.load("helper-ease-out", { accent: "#ff0000" }),
  );
});

test("helper previews are live only and cannot be exported", async () => {
  const film = await ShowcaseFilms.load("helper-ease-out");
  assert.throws(() => {
    return ShowcaseFilms.assertExportable(film);
  }, /Helper previews play live only/);
  const stock = await ShowcaseFilms.load("stock-plexus-field");
  assert.doesNotThrow(() => {
    return ShowcaseFilms.assertExportable(stock);
  });
});
