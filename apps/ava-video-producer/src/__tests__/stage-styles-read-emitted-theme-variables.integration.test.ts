/*
 * Every stage stylesheet (each CSS module in a renderer directory, listed in
 * `scripts/videoTheme/themeLiterals/rendererGlobs.json`) reads only
 * `--video-*` variables the theme actually emits, so a typo or a renamed
 * token cannot silently fall back to the browser default. None reads an
 * Atlas chrome token: the chrome scale is not the video theme.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { RendererFiles } from "../../scripts/videoTheme/themeLiterals/RendererFiles";
import { makeResolvedVideoThemeFromLibrary } from "../videoTheme/makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { makeVideoCssVariablesFromTheme } from "../videoTheme/makeVideoCssVariablesFromTheme/makeVideoCssVariablesFromTheme";
import { BUILT_IN_VIDEO_THEMES } from "../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";

const STYLE_FILES = RendererFiles.listRendererFiles().filter((file) => {
  return file.endsWith(".css");
});
function _readStyles(): Array<{
  file: string;
  css: string;
}> {
  return STYLE_FILES.map((file) => {
    return {
      file,
      css: fs.readFileSync(path.join(RendererFiles.APP_ROOT, file), "utf8"),
    };
  });
}
test("the renderer directories hold the stage stylesheets", () => {
  assert.ok(STYLE_FILES.length >= 5, STYLE_FILES.join(", "));
  assert.ok(
    STYLE_FILES.includes(
      "src/continuity/ContinuityScene/ContinuityScene.module.css",
    ),
  );
});
test("every required theme variable in the stage styles is emitted by every built-in theme", () => {
  const required = new Set(
    _readStyles().flatMap(({ css }) => {
      return [...css.matchAll(/var\((--video-[a-z0-9-]+)\)/g)].map((match) => {
        return match[1];
      });
    }),
  );
  [...BUILT_IN_VIDEO_THEMES.keys()].forEach((themeId) => {
    const emitted = makeVideoCssVariablesFromTheme(
      makeResolvedVideoThemeFromLibrary({
        library: BUILT_IN_VIDEO_THEMES,
        themeId,
      }),
    );
    assert.deepEqual(
      [...required].filter((name) => {
        return !(name in emitted);
      }),
      [],
      themeId,
    );
  });
});
test("no stage stylesheet reads an Atlas chrome token", () => {
  assert.deepEqual(
    _readStyles().flatMap(({ file, css }) => {
      return /var\(--atlas-/.test(css) ? [file] : [];
    }),
    [],
  );
});
test("every helper preview variable the preview styles read is set from the theme", async () => {
  const { DemoTheme } =
    await import("../gallery/HelperGallery/demos/DemoTheme");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { createElement } = await import("react");
  const { VideoThemeScope } =
    await import("../videoTheme/VideoThemeScope/VideoThemeScope");
  const emitted = new Set<string>();
  function Probe() {
    Object.keys(DemoTheme.useDemoThemeStyle()).forEach((name) => {
      return emitted.add(name);
    });
    return null;
  }
  renderToStaticMarkup(
    createElement(VideoThemeScope, null, createElement(Probe)),
  );
  const read = new Set(
    _readStyles().flatMap(({ css }) => {
      return [...css.matchAll(/var\((--demo-[a-z0-9-]+)\)/g)].map((match) => {
        return match[1];
      });
    }),
  );
  assert.ok(read.size > 0);
  assert.deepEqual(
    [...read].filter((name) => {
      return !emitted.has(name);
    }),
    [],
  );
});
