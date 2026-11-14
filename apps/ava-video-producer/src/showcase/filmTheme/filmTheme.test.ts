import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILT_IN_VIDEO_THEMES,
  createVideoThemeLibrary,
} from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { resolveDraftTheme } from "../../videoThemeEditor/resolveDraftTheme/resolveDraftTheme";
import {
  createSnapshotFromDraft,
  EMPTY_THEME_DRAFT,
  setTokenInDraft,
  type ThemeDraft,
} from "../../videoThemeEditor/themeDraft/themeDraft";
import {
  createFilmThemeAcknowledgement,
  createFilmTokensUsedMessage,
  isFilmThemeAcknowledgement,
  isFilmTokensUsedMessage,
  parseFilmControlMessage,
  type FilmThemeAcknowledgement,
} from "./filmTheme";
import type {
  VideoThemeDocument,
  VideoThemeLibrary,
} from "../../videoTheme/videoTheme.types";

const ITEM_ID = "shared-object-handoff";
const OTHER_ITEM_ID = "occlusion-wipe";
const DRAFT = setTokenInDraft(
  EMPTY_THEME_DRAFT,
  { kind: "theme" },
  "atomic.swatch.cyan",
  "#123456",
);
const CUSTOM_THEME: VideoThemeDocument = {
  schemaVersion: 1,
  id: "harbor",
  label: "Harbor",
  extends: "classic",
  overrides: {
    [ITEM_ID]: setTokenInDraft(
      EMPTY_THEME_DRAFT,
      { kind: "theme" },
      "atomic.swatch.cyan",
      "#654321",
    ).patch,
  },
};
const CUSTOM_LIBRARY = createVideoThemeLibrary([CUSTOM_THEME]);

type Case = Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  draft: ThemeDraft;
}>;

/** The hash the live player acknowledges for a snapshot posted to `filmId`. */
function _playerHash(input: Case, filmId: string = ITEM_ID): string {
  const snapshot = createSnapshotFromDraft({ ...input, itemId: ITEM_ID });
  const { message } = createFilmThemeAcknowledgement(
    filmId,
    JSON.parse(JSON.stringify(snapshot)),
  );
  assert.equal(message.type, "film-theme");
  return message.type === "film-theme" ? message.hash : "";
}

/** The hash the gallery resolves for the item. */
function _galleryHash(input: Case): string {
  const gallery = resolveDraftTheme({
    ...input,
    scope: { kind: "item", itemId: ITEM_ID },
  });
  assert.equal(gallery.ok, true);
  return gallery.ok ? gallery.theme.hash : "";
}

/** The issue messages of a refused snapshot. */
function _refusal(value: unknown): readonly string[] {
  const { snapshot, message } = createFilmThemeAcknowledgement(ITEM_ID, value);
  assert.equal(snapshot, undefined);
  assert.equal(message.type, "film-theme-error");
  return message.type === "film-theme-error"
    ? message.issues.map((issue) => issue.message)
    : [];
}

const CLASSIC = {
  library: BUILT_IN_VIDEO_THEMES,
  themeId: "classic",
  draft: EMPTY_THEME_DRAFT,
};
const CLASSIC_DRAFT = { ...CLASSIC, draft: DRAFT };
const CUSTOM_DRAFT = {
  library: CUSTOM_LIBRARY,
  themeId: "harbor",
  draft: DRAFT,
};
const VALID_SNAPSHOT = { themeId: "classic", documents: [], patches: [] };

test("the player acknowledges a draft with the hash the gallery resolves", () => {
  assert.equal(_playerHash(CLASSIC_DRAFT), _galleryHash(CLASSIC_DRAFT));
});

test("classic with no draft matches the gallery hash", () => {
  assert.equal(_playerHash(CLASSIC), _galleryHash(CLASSIC));
});

test("a draft changes the hash", () => {
  assert.notEqual(_playerHash(CLASSIC_DRAFT), _playerHash(CLASSIC));
});

test("a custom theme with a saved item override matches the gallery hash", () => {
  assert.equal(_playerHash(CUSTOM_DRAFT), _galleryHash(CUSTOM_DRAFT));
  const withoutDraft = { ...CUSTOM_DRAFT, draft: EMPTY_THEME_DRAFT };
  assert.equal(_playerHash(withoutDraft), _galleryHash(withoutDraft));
});

test("a saved item override does not apply to another film", () => {
  const custom = { ...CUSTOM_DRAFT, draft: EMPTY_THEME_DRAFT };
  assert.notEqual(_playerHash(custom, OTHER_ITEM_ID), _galleryHash(custom));
});

test("a snapshot with a literal semantic value is refused with its path", () => {
  const { snapshot, message } = createFilmThemeAcknowledgement(ITEM_ID, {
    themeId: "classic",
    documents: [],
    patches: [
      { other: { video: { semantic: { color: { accent: "#ff0000" } } } } },
    ],
  });
  assert.equal(snapshot, undefined);
  assert.equal(message.type, "film-theme-error");
  assert.ok(
    message.type === "film-theme-error" &&
      message.issues.some((issue) => issue.path.includes("accent")),
  );
});

test("malformed snapshots are refused", () => {
  _refusal({ ...VALID_SNAPSHOT, themeId: "Not A Slug" });
  _refusal("classic");
  _refusal(null);
  _refusal([VALID_SNAPSHOT]);
  _refusal({ ...VALID_SNAPSHOT, extra: true });
  _refusal({ ...VALID_SNAPSHOT, patches: [{}, {}, {}, {}, {}] });
  _refusal({ ...VALID_SNAPSHOT, documents: Array(9).fill(CUSTOM_THEME) });
  _refusal({ ...VALID_SNAPSHOT, documents: [{ id: "harbor" }] });
});

test("an oversized snapshot is refused before it is parsed", () => {
  const padding = "x".repeat(300 * 1024);
  const huge = {
    ...VALID_SNAPSHOT,
    documents: [{ ...CUSTOM_THEME, label: padding }],
  };
  assert.deepEqual(_refusal(huge), ["payload-too-large"]);
});

test("an unexpected failure is reported with a fixed code", () => {
  const cyclic: Record<string, unknown> = { ...VALID_SNAPSHOT };
  cyclic.self = cyclic;
  assert.deepEqual(_refusal(cyclic), ["payload-unreadable"]);
});

test("acknowledgements are recognised only for their own film", () => {
  const accepted: readonly FilmThemeAcknowledgement[] = [
    { type: "film-theme", id: ITEM_ID, hash: "abc" },
    {
      type: "film-theme-error",
      id: ITEM_ID,
      issues: [{ path: "a.b", message: "bad" }],
    },
  ];
  for (const message of accepted) {
    assert.equal(isFilmThemeAcknowledgement(message, ITEM_ID), true);
    assert.equal(isFilmThemeAcknowledgement(message, OTHER_ITEM_ID), false);
  }
});

test("malformed acknowledgements are rejected", () => {
  const rejected: readonly unknown[] = [
    null,
    "film-theme",
    [{ type: "film-theme", id: ITEM_ID, hash: "abc" }],
    { type: "film-theme", id: ITEM_ID, hash: 7 },
    { type: "film-theme", id: ITEM_ID, hash: "abc", extra: 1 },
    { type: "film-theme-error", id: ITEM_ID, issues: "bad" },
    {
      type: "film-theme-error",
      id: ITEM_ID,
      issues: [{ path: 1, message: "" }],
    },
    {
      type: "film-theme-error",
      id: ITEM_ID,
      issues: Array(1000).fill({ path: "", message: "bad" }),
    },
    {
      type: "film-theme-error",
      id: ITEM_ID,
      issues: [{ path: "", message: "x".repeat(10_000) }],
    },
  ];
  for (const message of rejected) {
    assert.equal(isFilmThemeAcknowledgement(message, ITEM_ID), false);
  }
});

test("usage messages are recognised only for their own film", () => {
  const message = createFilmTokensUsedMessage(ITEM_ID, ["color.accent"]);
  assert.equal(isFilmTokensUsedMessage(message, ITEM_ID), true);
  assert.equal(isFilmTokensUsedMessage(message, OTHER_ITEM_ID), false);
});

test("malformed usage messages are rejected", () => {
  const base = { type: "film-tokens-used", id: ITEM_ID };
  const rejected: readonly unknown[] = [
    [{ ...base, paths: [] }],
    { ...base, paths: [1] },
    { ...base, paths: [], extra: true },
    { ...base, paths: ["x".repeat(10_000)] },
    { ...base, paths: Array(100_000).fill("color.accent") },
  ];
  for (const message of rejected) {
    assert.equal(isFilmTokensUsedMessage(message, ITEM_ID), false);
  }
});

test("a control message for this film yields its action and value", () => {
  assert.deepEqual(
    parseFilmControlMessage(
      { type: "film-control", id: ITEM_ID, action: "seek", value: 12 },
      ITEM_ID,
    ),
    { action: "seek", value: 12 },
  );
});

test("a transport control without a film id applies to the current film", () => {
  assert.deepEqual(
    parseFilmControlMessage({ type: "film-control", action: "play" }, ITEM_ID),
    { action: "play", value: undefined },
  );
});

test("a control message for another film is ignored", () => {
  assert.equal(
    parseFilmControlMessage(
      { type: "film-control", id: OTHER_ITEM_ID, action: "play" },
      ITEM_ID,
    ),
    undefined,
  );
});

test("a theme or appearance control must name its film", () => {
  for (const action of ["theme", "appearance"]) {
    assert.equal(
      parseFilmControlMessage(
        { type: "film-control", action, value: VALID_SNAPSHOT },
        ITEM_ID,
      ),
      undefined,
    );
  }
});

test("malformed control messages are ignored", () => {
  const base = { type: "film-control", id: ITEM_ID };
  const rejected: readonly unknown[] = [
    null,
    "film-control",
    [{ ...base, action: "play" }],
    { ...base, type: "film-options", action: "play" },
    { ...base, action: "launch" },
    { ...base, action: "reload", requestId: "1" },
    { ...base, action: 7 },
    { ...base, id: 7, action: "play" },
    { ...base, action: "play", extra: true },
  ];
  for (const message of rejected) {
    assert.equal(parseFilmControlMessage(message, ITEM_ID), undefined);
  }
});
