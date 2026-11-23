import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { prop } from "@avandar/utils";
import { loadVideoThemeSnapshot } from "./loadVideoThemeSnapshot";

const THEMES = fileURLToPath(new URL("../../../themes", import.meta.url));

const WARM = {
  schemaVersion: 1,
  id: "warm",
  label: "Warm",
  extends: "classic",
};

const WARMER = {
  schemaVersion: 1,
  id: "warmer",
  label: "Warmer",
  extends: "warm",
};

async function _withThemes(run: (directory: string) => Promise<void>) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "theme-snapshot-"));
  try {
    for (const name of ["classic.theme.json", "avandar.theme.json"]) {
      await fs.copyFile(path.join(THEMES, name), path.join(directory, name));
    }
    await fs.writeFile(
      path.join(directory, "warm.theme.json"),
      JSON.stringify(WARM),
    );
    await fs.writeFile(
      path.join(directory, "warmer.theme.json"),
      JSON.stringify(WARMER),
    );
    await run(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test("a built-in theme snapshot carries no documents", () => {
  return _withThemes(async (directory) => {
    assert.deepEqual(
      await loadVideoThemeSnapshot({
        request: { id: "avandar" },
        options: { directory },
      }),
      {
        themeId: "avandar",
        documents: [],
        patches: [],
      },
    );
  });
});

test("a custom theme snapshot carries its extends chain, root first", () => {
  return _withThemes(async (directory) => {
    const snapshot = await loadVideoThemeSnapshot({
      request: { id: "warmer" },
      options: { directory },
    });
    assert.deepEqual(snapshot.documents.map(prop("id")), ["warm", "warmer"]);
  });
});

test("a draft patch travels with the snapshot", () => {
  return _withThemes(async (directory) => {
    const patch = {
      other: { video: { atomic: { swatch: { ground: "#201510" } } } },
    };
    assert.deepEqual(
      (
        await loadVideoThemeSnapshot({
          request: { id: "classic", patch },
          options: { directory },
        })
      ).patches,
      [patch],
    );
  });
});

test("an invalid draft patch is rejected", () => {
  return _withThemes(async (directory) => {
    const patch = {
      other: { video: { semantic: { color: { accent: "#ff0000" } } } },
    };
    await assert.rejects(
      loadVideoThemeSnapshot({
        request: { id: "classic", patch },
        options: { directory },
      }),
    );
  });
});

test("an unknown theme is rejected", () => {
  return _withThemes(async (directory) => {
    await assert.rejects(
      loadVideoThemeSnapshot({
        request: { id: "missing" },
        options: { directory },
      }),
      /Unknown video theme "missing"/,
    );
  });
});

test("an empty draft patch on a custom theme is kept as a draft", () => {
  return _withThemes(async (directory) => {
    const snapshot = await loadVideoThemeSnapshot({
      request: { id: "warm", patch: {} },
      options: { directory },
    });
    assert.deepEqual([snapshot.themeId, snapshot.patches], ["warm", [{}]]);
  });
});
