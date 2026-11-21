import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_THEME_DRAFT } from "../ThemeDrafts/ThemeDrafts";
import { ThemeDraftStorage } from "./ThemeDraftStorage";

function _storage(entries: Record<string, string> = {}): Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
> & {
  values: Map<string, string>;
} {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key: string) => {
      return values.get(key) ?? null;
    },
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
  ThemeDraftStorage.writeStoredThemeDraft({
    storage,
    themeId: "classic",
    stored: { baseHash: "abc", draft: DRAFT },
  });
  assert.deepEqual(
    ThemeDraftStorage.readStoredThemeDraft({ storage, themeId: "classic" }),
    {
      baseHash: "abc",
      draft: DRAFT,
    },
  );
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
  assert.equal(
    ThemeDraftStorage.readStoredThemeDraft({ storage, themeId: "classic" }),
    undefined,
  );
});

test("storing an empty draft forgets the stored one", () => {
  const storage = _storage();
  ThemeDraftStorage.writeStoredThemeDraft({
    storage,
    themeId: "classic",
    stored: { baseHash: "abc", draft: DRAFT },
  });
  ThemeDraftStorage.writeStoredThemeDraft({
    storage,
    themeId: "classic",
    stored: { baseHash: "abc", draft: EMPTY_THEME_DRAFT },
  });
  assert.equal(storage.values.size, 0);
});

test("the theme in the URL wins over the remembered one", () => {
  const storage = _storage();
  ThemeDraftStorage.rememberActiveThemeId({ storage, themeId: "avandar" });
  assert.equal(
    ThemeDraftStorage.getActiveThemeIdFromLocation({
      search: "?theme=classic",
      storage,
      available: ["classic", "avandar"],
    }),
    "classic",
  );
});

test("an unknown theme in the URL falls back to the remembered theme", () => {
  const storage = _storage();
  ThemeDraftStorage.rememberActiveThemeId({ storage, themeId: "avandar" });
  assert.equal(
    ThemeDraftStorage.getActiveThemeIdFromLocation({
      search: "?theme=missing",
      storage,
      available: ["classic", "avandar"],
    }),
    "avandar",
  );
});

test("with nothing chosen the active theme is classic", () => {
  assert.equal(
    ThemeDraftStorage.getActiveThemeIdFromLocation({
      search: "",
      storage: _storage(),
      available: ["classic", "avandar"],
    }),
    "classic",
  );
});
