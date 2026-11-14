import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_THEME_DRAFT } from "../themeDraft/themeDraft";
import {
  getActiveThemeIdFromLocation,
  readStoredThemeDraft,
  rememberActiveThemeId,
  writeStoredThemeDraft,
} from "./themeDraftStorage";

function _storage(entries: Record<string, string> = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    values,
  };
}

const DRAFT = {
  patch: { other: { video: { atomic: { swatch: { mint: "#123456" } } } } },
  overrides: {},
};

test("a stored draft reads back with its base hash", () => {
  const storage = _storage();
  writeStoredThemeDraft(storage, "classic", { baseHash: "abc", draft: DRAFT });
  assert.deepEqual(readStoredThemeDraft(storage, "classic"), {
    baseHash: "abc",
    draft: DRAFT,
  });
});

test("a stored draft that no longer matches the theme schema is ignored", () => {
  const storage = _storage({
    "video-theme-draft:v1:classic": JSON.stringify({
      baseHash: "abc",
      draft: {
        patch: {
          other: {
            video: { semantic: { color: { sparkle: "$color.accent" } } },
          },
        },
        overrides: {},
      },
    }),
  });
  assert.equal(readStoredThemeDraft(storage, "classic"), undefined);
});

test("storing an empty draft forgets the stored one", () => {
  const storage = _storage();
  writeStoredThemeDraft(storage, "classic", { baseHash: "abc", draft: DRAFT });
  writeStoredThemeDraft(storage, "classic", {
    baseHash: "abc",
    draft: EMPTY_THEME_DRAFT,
  });
  assert.equal(storage.values.size, 0);
});

test("the theme in the URL wins over the remembered one", () => {
  const storage = _storage();
  rememberActiveThemeId(storage, "avandar");
  assert.equal(
    getActiveThemeIdFromLocation({
      search: "?theme=classic",
      storage,
      available: ["classic", "avandar"],
    }),
    "classic",
  );
});

test("an unknown theme in the URL falls back to the remembered theme", () => {
  const storage = _storage();
  rememberActiveThemeId(storage, "avandar");
  assert.equal(
    getActiveThemeIdFromLocation({
      search: "?theme=missing",
      storage,
      available: ["classic", "avandar"],
    }),
    "avandar",
  );
});

test("with nothing chosen the active theme is classic", () => {
  assert.equal(
    getActiveThemeIdFromLocation({
      search: "",
      storage: _storage(),
      available: ["classic", "avandar"],
    }),
    "classic",
  );
});
