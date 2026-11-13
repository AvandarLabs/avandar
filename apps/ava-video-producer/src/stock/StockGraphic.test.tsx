import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoThemeScope } from "../videoTheme/VideoThemeScope/VideoThemeScope";
import { StockGraphic } from "./StockGraphic";

const LIGHT_GROUND = {
  other: { video: { atomic: { swatch: { ground: "#f8fafc" } } } },
};

test("a stock graphic with no colours draws the theme's accent", () => {
  const markup = renderToStaticMarkup(
    <StockGraphic preset="network-graph" frame={120} />,
  );
  assert.match(markup, /#51a7ff/);
  assert.doesNotMatch(markup, /#9fefca/);
});

test("an explicit accent prop wins over the theme", () => {
  const markup = renderToStaticMarkup(
    <StockGraphic preset="network-graph" frame={120} accent="#ff0000" />,
  );
  assert.match(markup, /#ff0000/);
});

test("the surrounding theme's ground reaches the graphic", () => {
  const markup = renderToStaticMarkup(
    <VideoThemeScope patches={[LIGHT_GROUND]}>
      <StockGraphic preset="network-graph" frame={120} />
    </VideoThemeScope>,
  );
  assert.match(markup, /<rect width="960" height="600" fill="#f8fafc"/);
});
