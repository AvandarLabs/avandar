import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createTokenUsageCollector,
  VideoTokenUsageContext,
} from "../../videoTheme/tokenUsageHelpers/tokenUsageHelpers";
import { VideoThemeScope } from "../../videoTheme/VideoThemeScope/VideoThemeScope";
import {
  useGraphicMotion,
  useGraphicProps,
  useGraphicTokens,
} from "./useGraphicTheme";

function AccentProbe() {
  return <span>{useGraphicTokens().color.accentAlt}</span>;
}

function BarProbe({ height }: { height?: number }) {
  return <span>{useGraphicProps("ProgressBar", { height }).height}</span>;
}

function PanelDurationProbe() {
  return <span>{useGraphicMotion().panel}</span>;
}

test("outside any provider a shape draws with classic", () => {
  assert.equal(renderToStaticMarkup(<AccentProbe />), "<span>#82c8f2</span>");
});

test("inside a scope a shape draws with that scope", () => {
  const patch = {
    other: { video: { atomic: { swatch: { cyan: "#123456" } } } },
  };
  assert.equal(
    renderToStaticMarkup(
      <VideoThemeScope patches={[patch]}>
        <AccentProbe />
      </VideoThemeScope>,
    ),
    "<span>#123456</span>",
  );
});

test("a given prop wins over the component default", () => {
  assert.equal(renderToStaticMarkup(<BarProbe height={6} />), "<span>6</span>");
});

test("only the defaults a shape relies on are reported", () => {
  const collector = createTokenUsageCollector();
  renderToStaticMarkup(
    <VideoTokenUsageContext.Provider value={collector.report}>
      <BarProbe height={6} />
    </VideoTokenUsageContext.Provider>,
  );
  assert.deepEqual(collector.getPaths(), ["components.ProgressBar.paint"]);
});

test("graphic motion follows the theme tempo", () => {
  const patch = { other: { video: { atomic: { tempo: { md: 1.5 } } } } };
  assert.equal(
    renderToStaticMarkup(
      <VideoThemeScope patches={[patch]}>
        <PanelDurationProbe />
      </VideoThemeScope>,
    ),
    "<span>6</span>",
  );
});
