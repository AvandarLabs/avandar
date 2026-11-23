import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { useVideoTokens } from "../useVideoTheme";
import { VideoThemeScope } from "./VideoThemeScope";

function AccentProbe() {
  return <span>{useVideoTokens().color.accentAlt}</span>;
}

const CYAN_PATCH = {
  other: { video: { atomic: { swatch: { cyan: "#123456" } } } },
};

test("a scope outside any provider starts from classic and applies its patches", () => {
  const markup = renderToStaticMarkup(
    <VideoThemeScope patches={[CYAN_PATCH]}>
      <AccentProbe />
    </VideoThemeScope>,
  );
  assert.equal(markup, "<span>#123456</span>");
});
