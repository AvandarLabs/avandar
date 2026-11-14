import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_VIDEO_THEMES } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { resolveDraftTheme } from "../../videoThemeEditor/resolveDraftTheme/resolveDraftTheme";
import {
  createSnapshotFromDraft,
  EMPTY_THEME_DRAFT,
  setTokenInDraft,
} from "../../videoThemeEditor/themeDraft/themeDraft";
import {
  createFilmThemeAcknowledgement,
  createFilmTokensUsedMessage,
  isFilmTokensUsedMessage,
} from "./filmTheme";

const ITEM_ID = "shared-object-handoff";
const DRAFT = setTokenInDraft(
  EMPTY_THEME_DRAFT,
  { kind: "theme" },
  "atomic.swatch.cyan",
  "#123456",
);

test("the player acknowledges a snapshot with the hash the gallery resolves", () => {
  const snapshot = createSnapshotFromDraft({
    library: BUILT_IN_VIDEO_THEMES,
    themeId: "classic",
    draft: DRAFT,
    itemId: ITEM_ID,
  });
  const { message } = createFilmThemeAcknowledgement(
    ITEM_ID,
    JSON.parse(JSON.stringify(snapshot)),
  );
  const gallery = resolveDraftTheme({
    library: BUILT_IN_VIDEO_THEMES,
    themeId: "classic",
    draft: DRAFT,
    scope: { kind: "item", itemId: ITEM_ID },
  });
  assert.equal(
    message.type === "film-theme" && message.hash,
    gallery.ok && gallery.theme.hash,
  );
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
  assert.ok(
    message.type === "film-theme-error" &&
      message.issues.some((issue) => issue.path.includes("accent")),
  );
});

test("usage messages are recognised only for their own film", () => {
  const message = createFilmTokensUsedMessage(ITEM_ID, ["color.accent"]);
  assert.equal(isFilmTokensUsedMessage(message, ITEM_ID), true);
  assert.equal(isFilmTokensUsedMessage(message, "occlusion-wipe"), false);
});
