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

test("a helper preview renders in classic unless a theme is given", async () => {
  const film = await ShowcaseFilms.load("helper-ease-out");
  assert.equal(film.theme?.themeId, "classic");
  const themed = await ShowcaseFilms.load("helper-ease-out", {
    theme: { id: "avandar" },
  });
  assert.equal(themed.theme?.themeId, "avandar");
});

test("the fixed compositions default to the starter theme they were authored on", async () => {
  const titleStudy = await ShowcaseFilms.load("title-study");
  const motionLab = await ShowcaseFilms.load("motion-lab");
  assert.deepEqual(
    [titleStudy.theme?.themeId, motionLab.theme?.themeId],
    ["starter", "starter"],
  );
  const classic = await ShowcaseFilms.load("title-study", {
    theme: { id: "classic" },
  });
  assert.equal(classic.theme?.themeId, "classic");
});
