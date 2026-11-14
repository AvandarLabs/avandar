import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoThemeScope } from "../videoTheme/VideoThemeScope/VideoThemeScope";
import {
  Caption,
  CircleNode,
  DrawPath,
  Eyebrow,
  Guide,
  Panel,
  Pill,
  Text,
} from "./graphics-common";
import { StockGraphic } from "./StockGraphic";
import type { VideoThemePatch } from "../videoTheme/videoTheme.types";
import type { ReactElement } from "react";

function _svg(element: ReactElement, patch?: VideoThemePatch): string {
  const svg = <svg>{element}</svg>;
  return renderToStaticMarkup(
    patch ? <VideoThemeScope patches={[patch]}>{svg}</VideoThemeScope> : svg,
  );
}

test("a pill draws today's classic shape", () => {
  const markup = _svg(<Pill x={0} y={0} text="05 nodes" />);
  assert.match(
    markup,
    /rx="15"[^>]*fill-opacity="0.08"[^>]*stroke-opacity="0.32"/,
  );
  assert.match(
    markup,
    /font-size="13"[^>]*font-family="&#x27;Courier New&#x27;, monospace"/,
  );
});

test("a node draws today's classic radii and outline", () => {
  const markup = _svg(
    <CircleNode
      x={100}
      y={100}
      label="Hub"
      frame={60}
      accent="#51a7ff"
      size="xl"
    />,
  );
  assert.match(markup, /r="46"/);
  assert.match(
    markup,
    /r="37"[^>]*fill="#101e28"[^>]*stroke="#2a404e"[^>]*stroke-width="1.5"/,
  );
});

test("a theme's panel corner reaches every panel", () => {
  const markup = _svg(<Panel x={0} y={0} width={10} height={10} />, {
    radius: { xl: "6px" },
  });
  assert.match(markup, /rx="6"/);
});

test("the eyebrow sits at the theme's eyebrow origin", () => {
  assert.match(
    _svg(<Eyebrow>Label</Eyebrow>, { spacing: { xl: "40px" } }),
    /x="40" y="40"/,
  );
});

test("the caption sits on the caption baseline", () => {
  assert.match(_svg(<Caption>Caption</Caption>), /x="480" y="551"/);
});

test("monospace text uses the code face", () => {
  const patch = {
    other: { video: { atomic: { fontFamily: { courier: "arial" } } } },
  };
  assert.match(
    _svg(
      <Text x={0} y={0} mono>
        a
      </Text>,
      patch,
    ),
    /font-family="Arial, sans-serif"/,
  );
});

test("a guide draws its dash pattern at the guide opacity", () => {
  assert.match(
    _svg(<Guide cx={0} cy={0} rx={10} ry={5} />),
    /stroke-dasharray="3 9"[^>]*opacity="0.65"/,
  );
});

test("a raised panel references the theme's elevation filter", () => {
  const markup = renderToStaticMarkup(
    <VideoThemeScope
      patches={[
        {
          components: {
            Panel: { defaultProps: { elevation: "$elevation.floating" } },
          },
        },
      ]}
    >
      <StockGraphic preset="data-pipeline" frame={120} />
    </VideoThemeScope>,
  );
  assert.match(
    markup,
    /<filter id="stock-[^"]*-fx-components-Panel-elevation"/,
  );
  assert.match(
    markup,
    /filter="url\(#stock-[^"]*-fx-components-Panel-elevation\)"/,
  );
});

test("the shape sketch profile turns nodes, edges, and guides into hand-drawn paths", () => {
  const patch: VideoThemePatch = {
    other: {
      video: { semantic: { sketch: { shape: "$sketch.profile.rough" } } },
    },
  };
  const markup = _svg(
    <>
      <CircleNode x={100} y={100} label="A" frame={60} accent="#51a7ff" />
      <DrawPath d="M0 0 L100 0" frame={60} />
      <Guide cx={0} cy={0} rx={10} ry={5} />
    </>,
    patch,
  );
  assert.equal(markup.match(/data-rough-shape="3"/g)?.length, 5);
});
