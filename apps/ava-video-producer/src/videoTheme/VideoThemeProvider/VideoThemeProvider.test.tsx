import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../builtInVideoThemes/builtInVideoThemes";
import { createTokenUsageCollector, VideoTokenUsageContext } from "../tokenUsage/tokenUsage";
import { useVideoProps, useVideoTokens } from "../useVideoTheme/useVideoTheme";
import { VideoThemeProvider } from "./VideoThemeProvider";

function TokenProbe() {
  const tokens = useVideoTokens();
  return (
    <span>
      {tokens.color.accent}|{tokens.text.stage.heading.fontSize}
    </span>
  );
}

function BarProbe({ height }: { height?: number }) {
  const props = useVideoProps("ProgressBar", { height });
  return <span>{props.height}</span>;
}

test("reading tokens outside a provider fails loudly", () => {
  assert.throws(() => renderToStaticMarkup(<TokenProbe />), /VideoThemeProvider/);
});

test("the provider sets video CSS variables on its wrapper", () => {
  const markup = renderToStaticMarkup(
    <VideoThemeProvider source={DEFAULT_VIDEO_THEME_SOURCE}>
      <span />
    </VideoThemeProvider>,
  );
  assert.match(markup, /--video-color-ground:#0b1219/);
});

test("useVideoTokens reads resolved semantic tokens", () => {
  const markup = renderToStaticMarkup(
    <VideoThemeProvider source={DEFAULT_VIDEO_THEME_SOURCE} element="none">
      <TokenProbe />
    </VideoThemeProvider>,
  );
  assert.equal(markup, "<span>#51a7ff|48</span>");
});

test("useVideoProps returns theme defaults and reports the ones it used", () => {
  const collector = createTokenUsageCollector();
  const markup = renderToStaticMarkup(
    <VideoTokenUsageContext.Provider value={collector.report}>
      <VideoThemeProvider source={DEFAULT_VIDEO_THEME_SOURCE} element="none">
        <BarProbe />
      </VideoThemeProvider>
    </VideoTokenUsageContext.Provider>,
  );
  assert.equal(markup, "<span>3</span>");
  assert.deepEqual(collector.getPaths(), [
    "components.ProgressBar.height",
    "components.ProgressBar.paint",
  ]);
});

test("a prop given to a themed component wins and is not reported", () => {
  const collector = createTokenUsageCollector();
  const markup = renderToStaticMarkup(
    <VideoTokenUsageContext.Provider value={collector.report}>
      <VideoThemeProvider source={DEFAULT_VIDEO_THEME_SOURCE} element="none">
        <BarProbe height={6} />
      </VideoThemeProvider>
    </VideoTokenUsageContext.Provider>,
  );
  assert.equal(markup, "<span>6</span>");
  assert.ok(!collector.getPaths().includes("components.ProgressBar.height"));
});
