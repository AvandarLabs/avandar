import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_THEME, MantineProvider, useMantineTheme } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../builtInVideoThemes/builtInVideoThemes";
import { VideoThemeProvider } from "../VideoThemeProvider/VideoThemeProvider";
import { ReenactmentThemeBoundary } from "./ReenactmentThemeBoundary";

function ProductProbe() {
  const theme = useMantineTheme();
  return (
    <span>{`${String(theme.other.video === undefined)}|${theme.fontSizes.md}`}</span>
  );
}

function _render(withBoundary: boolean): string {
  const product = (
    <MantineProvider
      theme={{ primaryColor: "blue" }}
      withCssVariables={false}
      withGlobalClasses={false}
    >
      <ProductProbe />
    </MantineProvider>
  );
  return renderToStaticMarkup(
    <VideoThemeProvider source={DEFAULT_VIDEO_THEME_SOURCE} element="none">
      {withBoundary ? (
        <ReenactmentThemeBoundary>{product}</ReenactmentThemeBoundary>
      ) : (
        product
      )}
    </VideoThemeProvider>,
  );
}

test("product UI inside the boundary sees only its own theme", () => {
  assert.equal(
    _render(true),
    `<span>true|${DEFAULT_THEME.fontSizes.md}</span>`,
  );
});

test("without the boundary a product MantineProvider inherits the video theme", () => {
  assert.equal(_render(false), "<span>false|16px</span>");
});
