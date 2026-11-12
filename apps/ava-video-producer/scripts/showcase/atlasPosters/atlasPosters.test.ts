import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { CONTINUITY_CATALOG } from "../../../src/continuity/continuityCatalog";
import { appRoot } from "../ShowcaseFilms/ShowcaseFilms";

const POSTERS = path.join(appRoot, "showcase/assets/atlas");

test("every composition and sample film has a tracked Atlas card poster", async () => {
  const posters = new Set(await fs.readdir(POSTERS));
  const missing = CONTINUITY_CATALOG.filter(
    (entry) => !posters.has(`${entry.id}.jpg`),
  ).map((entry) => entry.id);
  assert.deepEqual(
    missing,
    [],
    `Run pnpm atlas:posters ${missing.join(" ")} to render the missing posters.`,
  );
});

test("no poster outlives its catalog entry", async () => {
  const ids = new Set(CONTINUITY_CATALOG.map((entry) => `${entry.id}.jpg`));
  const orphans = (await fs.readdir(POSTERS)).filter((file) => !ids.has(file));
  assert.deepEqual(orphans, []);
});
