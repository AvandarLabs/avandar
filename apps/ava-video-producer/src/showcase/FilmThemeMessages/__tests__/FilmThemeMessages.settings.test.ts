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
test("malformed usage messages are rejected", () => {
  const base = { type: "film-tokens-used", id: ITEM_ID };
  const rejected: unknown[] = [
    [{ ...base, paths: [] }],
    { ...base, paths: [1] },
    { ...base, paths: [], extra: true },
    { ...base, paths: ["x".repeat(10000)] },
    { ...base, paths: Array(100000).fill("color.accent") },
  ];
  rejected.forEach((message) => {
    assert.equal(
      FilmThemeMessages.isFilmTokensUsedMessage({
        data: message,
        id: ITEM_ID,
      }),
      false,
    );
  });
});
test("a control message for this film yields its action and value", () => {
  assert.deepEqual(
    FilmThemeMessages.parseFilmControlMessage({
      data: { type: "film-control", id: ITEM_ID, action: "seek", value: 12 },
      id: ITEM_ID,
    }),
    { action: "seek", value: 12 },
  );
});
test("a transport control without a film id applies to the current film", () => {
  assert.deepEqual(
    FilmThemeMessages.parseFilmControlMessage({
      data: { type: "film-control", action: "play" },
      id: ITEM_ID,
    }),
    { action: "play", value: undefined },
  );
});
test("a control message for another film is ignored", () => {
  assert.equal(
    FilmThemeMessages.parseFilmControlMessage({
      data: { type: "film-control", id: OTHER_ITEM_ID, action: "play" },
      id: ITEM_ID,
    }),
    undefined,
  );
});
test("a theme or appearance control must name its film", () => {
  ["theme", "appearance"].forEach((action) => {
    assert.equal(
      FilmThemeMessages.parseFilmControlMessage({
        data: { type: "film-control", action, value: VALID_SNAPSHOT },
        id: ITEM_ID,
      }),
      undefined,
    );
  });
});
test("malformed control messages are ignored", () => {
  const base = { type: "film-control", id: ITEM_ID };
  const rejected: unknown[] = [
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
  rejected.forEach((message) => {
    assert.equal(
      FilmThemeMessages.parseFilmControlMessage({
        data: message,
        id: ITEM_ID,
      }),
      undefined,
    );
  });
});
test("a film that cannot take a theme refuses it with a fixed code", () => {
  const message = FilmThemeMessages.makeUnsupportedThemeErrorFromMessage({
    id: ITEM_ID,
  });
  assert.deepEqual(message, {
    type: "film-theme-error",
    id: ITEM_ID,
    issues: [{ path: "", message: "film-unsupported" }],
  });
  assert.equal(
    FilmThemeMessages.isFilmThemeAcknowledgement({
      data: message,
      id: ITEM_ID,
    }),
    true,
  );
});
test("a usage message drops overlong paths and keeps within the path cap", () => {
  const longPath = "x".repeat(257);
  const paths = [
    longPath,
    ...Array.from({ length: 5000 }, (_, i) => {
      return `p${i}`;
    }),
  ];
  const message = FilmThemeMessages.makeTokensUsedMessageFromTokens({
    id: ITEM_ID,
    paths,
  });
  assert.equal(message.paths.length, 4096);
  assert.equal(message.paths.includes(longPath), false);
  assert.equal(message.paths[0], "p0");
  assert.equal(
    FilmThemeMessages.isFilmTokensUsedMessage({
      data: message,
      id: ITEM_ID,
    }),
    true,
  );
});
test("the player echoes the request a theme answers, whether it resolves or not", () => {
  const resolved = FilmThemeMessages.makeAcknowledgementFromTheme({
    id: ITEM_ID,
    value: VALID_SNAPSHOT,
    requestKey: "film:abc:0",
  });
  assert.equal(resolved.message.requestKey, "film:abc:0");
  const refused = FilmThemeMessages.makeAcknowledgementFromTheme({
    id: ITEM_ID,
    value: null,
    requestKey: "film:def:1",
  });
  assert.equal(refused.message.requestKey, "film:def:1");
  assert.equal(
    FilmThemeMessages.makeUnsupportedThemeErrorFromMessage({
      id: ITEM_ID,
      requestKey: "film:abc:2",
    }).requestKey,
    "film:abc:2",
  );
});
test("an acknowledgement for a theme sent without a request names none", () => {
  assert.equal(
    "requestKey" in
      FilmThemeMessages.makeAcknowledgementFromTheme({
        id: ITEM_ID,
        value: VALID_SNAPSHOT,
      }).message,
    false,
  );
});
test("a theme control carries the request it was sent for", () => {
  assert.deepEqual(
    FilmThemeMessages.parseFilmControlMessage({
      data: {
        type: "film-control",
        id: ITEM_ID,
        action: "theme",
        value: VALID_SNAPSHOT,
        requestKey: "film:abc:0",
      },
      id: ITEM_ID,
    }),
    { action: "theme", value: VALID_SNAPSHOT, requestKey: "film:abc:0" },
  );
});
test("acknowledgements may carry a request, and only a short string", () => {
  const withRequest = {
    type: "film-theme-error",
    id: ITEM_ID,
    issues: [],
    requestKey: "film:abc:0",
  };
  assert.equal(
    FilmThemeMessages.isFilmThemeAcknowledgement({
      data: withRequest,
      id: ITEM_ID,
    }),
    true,
  );
  assert.equal(
    FilmThemeMessages.isFilmThemeAcknowledgement({
      data: { ...withRequest, requestKey: "x".repeat(10000) },
      id: ITEM_ID,
    }),
    false,
  );
  assert.equal(
    FilmThemeMessages.isFilmThemeAcknowledgement({
      data: { ...withRequest, requestKey: 7 },
      id: ITEM_ID,
    }),
    false,
  );
});
