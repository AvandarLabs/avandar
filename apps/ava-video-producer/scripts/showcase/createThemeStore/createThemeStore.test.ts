import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { prop, propEq } from "@avandar/utils";
import { ThemeStoreError } from "../ThemeStoreError";
import { createThemeStore } from "./createThemeStore";

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

test("listing marks built-in themes", () => {
  return _withStore(async (store) => {
    assert.deepEqual(await store.list(), [
      { id: "classic", label: "Classic", builtIn: true },
    ]);
  });
});

test("a created theme reads back with the same hash", () => {
  return _withStore(async (store) => {
    const created = await store.create(WARM);
    assert.equal((await store.read("warm")).hash, created.hash);
  });
});

test("creating a theme whose id exists is a conflict", () => {
  return _withStore(async (store) => {
    await store.create(WARM);
    assert.equal(await _statusOf(store.create(WARM)), 409);
  });
});

test("saving a built-in theme is refused", () => {
  return _withStore(async (store) => {
    const classic = await store.read("classic");
    assert.equal(
      await _statusOf(store.save("classic", classic.document, classic.hash)),
      403,
    );
  });
});

test("saving with a stale hash is a conflict", () => {
  return _withStore(async (store) => {
    await store.create(WARM);
    assert.equal(await _statusOf(store.save("warm", WARM, "stale")), 409);
  });
});

test("saving with the current hash replaces the file", () => {
  return _withStore(async (store) => {
    const created = await store.create(WARM);
    const saved = await store.save(
      "warm",
      { ...WARM, label: "Warmer" },
      created.hash,
    );
    assert.notEqual(saved.hash, created.hash);
    assert.equal((await store.read("warm")).document.label, "Warmer");
  });
});

test("a theme with a broken reference is rejected with its token path", () => {
  return _withStore(async (store) => {
    const broken = {
      ...WARM,
      other: {
        video: { semantic: { color: { accent: "$atomic.swatch.nope" } } },
      },
    };
    await assert.rejects(store.create(broken), (error: unknown) => {
      return (
        error instanceof ThemeStoreError &&
        error.status === 400 &&
        error.issues.some(propEq("path", "color.accent"))
      );
    });
  });
});

test("a theme over the size cap is rejected", () => {
  return _withStore(async (store) => {
    const huge = {
      ...WARM,
      label: "Huge",
      overrides: Object.fromEntries(
        Array.from({ length: 4000 }, (_, index) => {
          return [
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
          ];
        }),
      ),
    };
    assert.equal(await _statusOf(store.create(huge)), 413);
  });
});

test("writes leave no temporary files behind", () => {
  return _withStore(async (store, directory) => {
    await store.create(WARM);
    assert.deepEqual((await fs.readdir(directory)).sort(), [
      "classic.theme.json",
      "warm.theme.json",
    ]);
  });
});

test("theme ids must be slugs", () => {
  return _withStore(async (store) => {
    assert.equal(
      await _statusOf(store.create({ ...WARM, id: "Warm Theme" })),
      400,
    );
  });
});

test("the reserved draft theme id cannot be created", () => {
  return _withStore(async (store) => {
    assert.equal(
      await _statusOf(store.create({ ...WARM, id: "unsaved-draft" })),
      400,
    );
  });
});

test("the reserved draft theme id cannot be saved", () => {
  return _withStore(async (store) => {
    assert.equal(
      await _statusOf(
        store.save("unsaved-draft", { ...WARM, id: "unsaved-draft" }, "any"),
      ),
      400,
    );
  });
});

test("a hand-placed reserved draft theme file is neither listed nor read", () => {
  return _withStore(async (store, directory) => {
    await fs.writeFile(
      path.join(directory, "unsaved-draft.theme.json"),
      JSON.stringify({ ...WARM, id: "unsaved-draft" }),
    );
    assert.deepEqual((await store.list()).map(prop("id")), ["classic"]);
    assert.equal(await _statusOf(store.read("unsaved-draft")), 404);
  });
});

test("a theme whose id differs from its file name is rejected", () => {
  return _withStore(async (store, directory) => {
    await fs.writeFile(
      path.join(directory, "foo.theme.json"),
      JSON.stringify({ ...WARM, id: "warm" }),
    );
    assert.equal(await _statusOf(store.read("foo")), 400);
  });
});

test("the reserved draft id inside another file name is rejected", () => {
  return _withStore(async (store, directory) => {
    await fs.writeFile(
      path.join(directory, "foo.theme.json"),
      JSON.stringify({ ...WARM, id: "unsaved-draft" }),
    );
    assert.equal(await _statusOf(store.read("foo")), 400);
  });
});

test("listing skips rejected files and keeps every valid theme", () => {
  return _withStore(async (store, directory) => {
    await store.create(WARM);
    await fs.writeFile(
      path.join(directory, "foo.theme.json"),
      JSON.stringify({ ...WARM, id: "unsaved-draft" }),
    );
    await fs.writeFile(
      path.join(directory, "bar.theme.json"),
      JSON.stringify({ ...WARM, id: "warm" }),
    );
    assert.deepEqual((await store.list()).map(prop("id")), ["classic", "warm"]);
  });
});

async function _settledStatuses(
  promises: ReadonlyArray<Promise<unknown>>,
): Promise<number[]> {
  return (await Promise.all(promises.map(_statusOf))).sort();
}

test("two creates of the same id at once leave one winner and one conflict", () => {
  return _withStore(async (store, directory) => {
    const statuses = await _settledStatuses([
      store.create(WARM),
      store.create({ ...WARM, label: "Warm again" }),
    ]);
    assert.deepEqual(statuses, [200, 409]);
    assert.deepEqual((await fs.readdir(directory)).sort(), [
      "classic.theme.json",
      "warm.theme.json",
    ]);
  });
});

test("two saves with the same hash at once leave one winner and one conflict", () => {
  return _withStore(async (store) => {
    const created = await store.create(WARM);
    const statuses = await _settledStatuses([
      store.save("warm", { ...WARM, label: "First" }, created.hash),
      store.save("warm", { ...WARM, label: "Second" }, created.hash),
    ]);
    assert.deepEqual(statuses, [200, 409]);
  });
});

test("a refused create leaves the existing file as it was", () => {
  return _withStore(async (store, directory) => {
    await store.create(WARM);
    const before = await fs.readFile(
      path.join(directory, "warm.theme.json"),
      "utf8",
    );
    assert.equal(
      await _statusOf(store.create({ ...WARM, label: "Overwritten" })),
      409,
    );
    assert.equal(
      await fs.readFile(path.join(directory, "warm.theme.json"), "utf8"),
      before,
    );
  });
});

test("a failed write does not block the next write to the same theme", () => {
  return _withStore(async (store) => {
    const created = await store.create(WARM);
    assert.equal(await _statusOf(store.save("warm", WARM, "stale")), 409);
    assert.equal(await _statusOf(store.save("warm", WARM, created.hash)), 200);
  });
});

test("writes to different themes do not wait for each other", () => {
  return _withStore(async (store) => {
    const statuses = await _settledStatuses([
      store.create(WARM),
      store.create({ ...WARM, id: "cool", label: "Cool" }),
    ]);
    assert.deepEqual(statuses, [200, 200]);
  });
});
