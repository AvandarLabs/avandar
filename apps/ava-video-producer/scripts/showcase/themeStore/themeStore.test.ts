import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createThemeStore, ThemeStoreError } from "./themeStore";

const CLASSIC_FILE = fileURLToPath(
  new URL("../../../themes/classic.theme.json", import.meta.url),
);

const WARM = {
  schemaVersion: 1,
  id: "warm",
  label: "Warm",
  extends: "classic",
  other: { video: { atomic: { swatch: { ground: "#201510" } } } },
};

async function _withStore(
  run: (
    store: ReturnType<typeof createThemeStore>,
    directory: string,
  ) => Promise<void>,
) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "video-themes-"));
  try {
    await fs.copyFile(CLASSIC_FILE, path.join(directory, "classic.theme.json"));
    await run(createThemeStore({ directory }), directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

async function _statusOf(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ThemeStoreError) {
      return error.status;
    }
    throw error;
  }
  return 200;
}

test("listing marks built-in themes", () =>
  _withStore(async (store) => {
    assert.deepEqual(await store.list(), [
      { id: "classic", label: "Classic", builtIn: true },
    ]);
  }));

test("a created theme reads back with the same hash", () =>
  _withStore(async (store) => {
    const created = await store.create(WARM);
    assert.equal((await store.read("warm")).hash, created.hash);
  }));

test("creating a theme whose id exists is a conflict", () =>
  _withStore(async (store) => {
    await store.create(WARM);
    assert.equal(await _statusOf(store.create(WARM)), 409);
  }));

test("saving a built-in theme is refused", () =>
  _withStore(async (store) => {
    const classic = await store.read("classic");
    assert.equal(
      await _statusOf(store.save("classic", classic.document, classic.hash)),
      403,
    );
  }));

test("saving with a stale hash is a conflict", () =>
  _withStore(async (store) => {
    await store.create(WARM);
    assert.equal(await _statusOf(store.save("warm", WARM, "stale")), 409);
  }));

test("saving with the current hash replaces the file", () =>
  _withStore(async (store) => {
    const created = await store.create(WARM);
    const saved = await store.save(
      "warm",
      { ...WARM, label: "Warmer" },
      created.hash,
    );
    assert.notEqual(saved.hash, created.hash);
    assert.equal((await store.read("warm")).document.label, "Warmer");
  }));

test("a theme with a broken reference is rejected with its token path", () =>
  _withStore(async (store) => {
    const broken = {
      ...WARM,
      other: {
        video: { semantic: { color: { accent: "$atomic.swatch.nope" } } },
      },
    };
    await assert.rejects(
      store.create(broken),
      (error: unknown) =>
        error instanceof ThemeStoreError &&
        error.status === 400 &&
        error.issues.some((issue) => issue.path === "color.accent"),
    );
  }));

test("a theme over the size cap is rejected", () =>
  _withStore(async (store) => {
    const huge = {
      ...WARM,
      label: "Huge",
      overrides: Object.fromEntries(
        Array.from({ length: 4000 }, (_, index) => [
          `item-${index}`,
          {
            other: {
              video: {
                atomic: {
                  swatch: {
                    ground: "#201510",
                    surface: "#201510",
                    line: "#201510",
                  },
                },
              },
            },
          },
        ]),
      ),
    };
    assert.equal(await _statusOf(store.create(huge)), 413);
  }));

test("writes leave no temporary files behind", () =>
  _withStore(async (store, directory) => {
    await store.create(WARM);
    assert.deepEqual((await fs.readdir(directory)).sort(), [
      "classic.theme.json",
      "warm.theme.json",
    ]);
  }));

test("theme ids must be slugs", () =>
  _withStore(async (store) => {
    assert.equal(
      await _statusOf(store.create({ ...WARM, id: "Warm Theme" })),
      400,
    );
  }));

test("the reserved draft theme id cannot be created", () =>
  _withStore(async (store) => {
    assert.equal(
      await _statusOf(store.create({ ...WARM, id: "unsaved-draft" })),
      400,
    );
  }));

test("the reserved draft theme id cannot be saved", () =>
  _withStore(async (store) => {
    assert.equal(
      await _statusOf(
        store.save("unsaved-draft", { ...WARM, id: "unsaved-draft" }, "any"),
      ),
      400,
    );
  }));

test("a hand-placed reserved draft theme file is neither listed nor read", () =>
  _withStore(async (store, directory) => {
    await fs.writeFile(
      path.join(directory, "unsaved-draft.theme.json"),
      JSON.stringify({ ...WARM, id: "unsaved-draft" }),
    );
    assert.deepEqual(
      (await store.list()).map((summary) => summary.id),
      ["classic"],
    );
    assert.equal(await _statusOf(store.read("unsaved-draft")), 404);
  }));

test("a theme whose id differs from its file name is rejected", () =>
  _withStore(async (store, directory) => {
    await fs.writeFile(
      path.join(directory, "foo.theme.json"),
      JSON.stringify({ ...WARM, id: "warm" }),
    );
    assert.equal(await _statusOf(store.read("foo")), 400);
  }));

test("the reserved draft id inside another file name is rejected", () =>
  _withStore(async (store, directory) => {
    await fs.writeFile(
      path.join(directory, "foo.theme.json"),
      JSON.stringify({ ...WARM, id: "unsaved-draft" }),
    );
    assert.equal(await _statusOf(store.read("foo")), 400);
  }));

test("listing skips rejected files and keeps every valid theme", () =>
  _withStore(async (store, directory) => {
    await store.create(WARM);
    await fs.writeFile(
      path.join(directory, "foo.theme.json"),
      JSON.stringify({ ...WARM, id: "unsaved-draft" }),
    );
    await fs.writeFile(
      path.join(directory, "bar.theme.json"),
      JSON.stringify({ ...WARM, id: "warm" }),
    );
    assert.deepEqual(
      (await store.list()).map((summary) => summary.id),
      ["classic", "warm"],
    );
  }));
