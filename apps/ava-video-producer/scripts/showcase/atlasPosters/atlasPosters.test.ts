import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { CONTINUITY_CATALOG } from "../../../src/continuity/continuityCatalog";
import { appRoot } from "../ShowcaseFilms/ShowcaseFilms";

const POSTERS = path.join(appRoot, "showcase/assets/atlas");
/**
 * Themes with tracked posters. A card in any other theme falls back to
 * `classic`.
 */
const POSTER_THEME_IDS = ["classic", "avandar"] as const;

async function _readPosterNames(themeId: string): Promise<readonly string[]> {
  return fs.readdir(path.join(POSTERS, themeId)).catch(() => {
    return [];
  });
}

for (const themeId of POSTER_THEME_IDS) {
  test(`every composition and sample film has a tracked ${themeId} poster`, async () => {
    const posters = new Set(await _readPosterNames(themeId));
    const missing = CONTINUITY_CATALOG.filter((entry) => {
      return !posters.has(`${entry.id}.jpg`);
    }).map((entry) => {
      return entry.id;
    });
    assert.deepEqual(
      missing,
      [],
      `Run pnpm atlas:posters --theme ${themeId} ${missing.join(" ")} to render the missing posters.`,
    );
  });

  test(`no ${themeId} poster outlives its catalog entry`, async () => {
    const ids = new Set(
      CONTINUITY_CATALOG.map((entry) => {
        return `${entry.id}.jpg`;
      }),
    );
    assert.deepEqual(
      (await _readPosterNames(themeId)).filter((file) => {
        return !ids.has(file);
      }),
      [],
    );
  });
}

test("posters live only in theme folders", async () => {
  const entries = await fs.readdir(POSTERS, { withFileTypes: true });
  assert.deepEqual(
    entries
      .filter((entry) => {
        return !entry.isDirectory();
      })
      .map((entry) => {
        return entry.name;
      }),
    [],
  );
});
