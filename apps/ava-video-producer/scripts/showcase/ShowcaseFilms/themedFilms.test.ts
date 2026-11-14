import assert from "node:assert/strict";
import test from "node:test";
import { DRAFT_THEME_ID } from "../../../src/videoTheme/createDraftThemeTarget/createDraftThemeTarget";
import { ShowcaseFilms } from "./ShowcaseFilms";

test("a film without a theme option carries the classic snapshot", async () => {
  const film = await ShowcaseFilms.load("occlusion-wipe");
  assert.deepEqual(film.theme, {
    themeId: "classic",
    documents: [],
    patches: [],
  });
});

test("a draft on a built-in theme renders as the unsaved theme that extends it", async () => {
  const patch = {
    other: { video: { atomic: { swatch: { ground: "#201510" } } } },
  };
  const film = await ShowcaseFilms.load("stock-network-graph", {
    theme: { id: "avandar", patch },
  });
  assert.equal(film.theme?.themeId, DRAFT_THEME_ID);
  assert.deepEqual(
    film.theme?.documents.map((document) => document.extends),
    ["avandar"],
  );
  assert.deepEqual(film.theme?.patches, [patch]);
});

test("a stock film keeps its theme out of the stock request", async () => {
  const film = await ShowcaseFilms.load("stock-network-graph", {
    theme: { id: "avandar" },
  });
  assert.equal(film.kind === "stock" && film.preset, "network-graph");
});

test("an unknown theme is refused", async () => {
  await assert.rejects(
    ShowcaseFilms.load("occlusion-wipe", { theme: { id: "missing" } }),
  );
});

test("a continuity film keeps its theme out of the appearance options", async () => {
  const film = await ShowcaseFilms.load("qetl-motion", {
    theme: { id: "avandar" },
  });
  assert.equal(film.theme?.themeId, "avandar");
});
