import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import {
  BUILT_IN_VIDEO_THEMES,
  makeVideoThemeLibraryFromDocuments,
} from "../../../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { DraftThemeResolution } from "../../../videoThemeEditor/DraftThemeResolution/DraftThemeResolution";
import {
  EMPTY_THEME_DRAFT,
  type ThemeDraft,
  ThemeDrafts,
} from "../../../videoThemeEditor/ThemeDrafts/ThemeDrafts";
import { FilmThemeMessages } from "../FilmThemeMessages";
import type {
  VideoThemeDocument,
  VideoThemeLibrary,
} from "../../../videoTheme/videoTheme.types";

const ITEM_ID = "shared-object-handoff";
const OTHER_ITEM_ID = "occlusion-wipe";
const DRAFT = ThemeDrafts.setTokenInDraft({
  draft: EMPTY_THEME_DRAFT,
  scope: { kind: "theme" },
  tokenPath: "atomic.swatch.cyan",
  value: "#123456",
});
const CUSTOM_THEME: VideoThemeDocument = {
  schemaVersion: 1,
  id: "harbor",
  label: "Harbor",
  extends: "classic",
  overrides: {
    [ITEM_ID]: ThemeDrafts.setTokenInDraft({
      draft: EMPTY_THEME_DRAFT,
      scope: { kind: "theme" },
      tokenPath: "atomic.swatch.cyan",
      value: "#654321",
    }).patch,
  },
};
const CUSTOM_LIBRARY = makeVideoThemeLibraryFromDocuments([CUSTOM_THEME]);
type Case = Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  draft: ThemeDraft;
}>;
/** The hash the live player acknowledges for a snapshot posted to `filmId`. */
function _playerHash({
  input,
  filmId = ITEM_ID,
}: Readonly<{
  input: Case;
  filmId?: string;
}>): string {
  const snapshot = ThemeDrafts.toSnapshot({ ...input, itemId: ITEM_ID });
  const { message } = FilmThemeMessages.makeAcknowledgementFromTheme({
    id: filmId,
    value: structuredClone(snapshot),
  });
  assert.equal(message.type, "film-theme");
  return message.type === "film-theme" ? message.hash : "";
}
/** The hash the gallery resolves for the item. */
function _galleryHash(input: Case): string {
  const gallery = DraftThemeResolution.makeDraftThemeResultFromDraft({
    ...input,
    scope: { kind: "item", itemId: ITEM_ID },
  });
  assert.equal(gallery.ok, true);
  return gallery.ok ? gallery.theme.hash : "";
}
/** The issue messages of a refused snapshot. */
function _refusal(value: unknown): string[] {
  const { snapshot, message } = FilmThemeMessages.makeAcknowledgementFromTheme({
    id: ITEM_ID,
    value,
  });
  assert.equal(snapshot, undefined);
  assert.equal(message.type, "film-theme-error");
  return message.type === "film-theme-error"
    ? message.issues.map(prop("message"))
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
  assert.equal(
    _playerHash({ input: CLASSIC_DRAFT }),
    _galleryHash(CLASSIC_DRAFT),
  );
});
test("classic with no draft matches the gallery hash", () => {
  assert.equal(_playerHash({ input: CLASSIC }), _galleryHash(CLASSIC));
});
test("a draft changes the hash", () => {
  assert.notEqual(
    _playerHash({ input: CLASSIC_DRAFT }),
    _playerHash({ input: CLASSIC }),
  );
});
test("a custom theme with a saved item override matches the gallery hash", () => {
  assert.equal(
    _playerHash({ input: CUSTOM_DRAFT }),
    _galleryHash(CUSTOM_DRAFT),
  );
  const withoutDraft = { ...CUSTOM_DRAFT, draft: EMPTY_THEME_DRAFT };
  assert.equal(
    _playerHash({ input: withoutDraft }),
    _galleryHash(withoutDraft),
  );
});
test("a saved item override does not apply to another film", () => {
  const custom = { ...CUSTOM_DRAFT, draft: EMPTY_THEME_DRAFT };
  assert.notEqual(
    _playerHash({
      input: custom,
      filmId: OTHER_ITEM_ID,
    }),
    _galleryHash(custom),
  );
});
test("a snapshot with a literal semantic value is refused with its path", () => {
  const { snapshot, message } = FilmThemeMessages.makeAcknowledgementFromTheme({
    id: ITEM_ID,
    value: {
      themeId: "classic",
      documents: [],
      patches: [
        { other: { video: { semantic: { color: { accent: "#ff0000" } } } } },
      ],
    },
  });
  assert.equal(snapshot, undefined);
  assert.equal(message.type, "film-theme-error");
  assert.ok(
    message.type === "film-theme-error" &&
      message.issues.some((issue) => {
        return issue.path.includes("accent");
      }),
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
test("the size limit counts bytes, not characters", () => {
  // 100,000 characters stay under the limit as text, but each euro sign is
  // three bytes, so the payload is about 300 KB.
  const padding = "€".repeat(100000);
  assert.ok(padding.length < 256 * 1024);
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
  const accepted = [
    { type: "film-theme", id: ITEM_ID, hash: "abc" },
    {
      type: "film-theme-error",
      id: ITEM_ID,
      issues: [{ path: "a.b", message: "bad" }],
    },
  ];
  accepted.forEach((message) => {
    assert.equal(
      FilmThemeMessages.isFilmThemeAcknowledgement({
        data: message,
        id: ITEM_ID,
      }),
      true,
    );
    assert.equal(
      FilmThemeMessages.isFilmThemeAcknowledgement({
        data: message,
        id: OTHER_ITEM_ID,
      }),
      false,
    );
  });
});
test("malformed acknowledgements are rejected", () => {
  const rejected: unknown[] = [
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
      issues: [{ path: "", message: "x".repeat(10000) }],
    },
  ];
  rejected.forEach((message) => {
    assert.equal(
      FilmThemeMessages.isFilmThemeAcknowledgement({
        data: message,
        id: ITEM_ID,
      }),
      false,
    );
  });
});
test("usage messages are recognised only for their own film", () => {
  const message = FilmThemeMessages.makeTokensUsedMessageFromTokens({
    id: ITEM_ID,
    paths: ["color.accent"],
  });
  assert.equal(
    FilmThemeMessages.isFilmTokensUsedMessage({
      data: message,
      id: ITEM_ID,
    }),
    true,
  );
  assert.equal(
    FilmThemeMessages.isFilmTokensUsedMessage({
      data: message,
      id: OTHER_ITEM_ID,
    }),
    false,
  );
});
