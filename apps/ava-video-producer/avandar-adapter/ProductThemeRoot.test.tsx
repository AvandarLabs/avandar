// tsx applies the producer tsconfig (and its automatic JSX runtime) only to
// `src`, so this file opts in itself when the node test runner loads it.
/** @jsxRuntime automatic */
import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_THEME, useMantineTheme } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../src/videoTheme/builtInVideoThemes/builtInVideoThemes";
import { VideoThemeProvider } from "../src/videoTheme/VideoThemeProvider/VideoThemeProvider";
import { ProductThemeRoot } from "./ProductThemeRoot";

function ProductProbe() {
  const theme = useMantineTheme();
  return (
    <span>{`${String(theme.other.video === undefined)}|${theme.fontSizes.md}|${theme.primaryColor}`}</span>
  );
}

test("a reenactment inside a themed film resolves only the product theme", () => {
  const markup = renderToStaticMarkup(
    <VideoThemeProvider source={DEFAULT_VIDEO_THEME_SOURCE} element="none">
      <ProductThemeRoot
        theme={{ primaryColor: "grape" }}
        withCssVariables={false}
        withGlobalClasses={false}
      >
        <ProductProbe />
      </ProductThemeRoot>
    </VideoThemeProvider>,
  );
  assert.equal(markup, `<span>true|${DEFAULT_THEME.fontSizes.md}|grape</span>`);
});
