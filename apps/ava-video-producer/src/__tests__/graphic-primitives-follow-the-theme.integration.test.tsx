import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { getSvgAttributeMatchesFromMarkup } from "../../tests/helpers/getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";
import { Caption } from "../stock/graphics-common/Caption";
import { CircleNode } from "../stock/graphics-common/CircleNode/CircleNode";
import { DrawPath } from "../stock/graphics-common/DrawPath";
import { Eyebrow } from "../stock/graphics-common/Eyebrow";
import { Guide } from "../stock/graphics-common/Guide";
import { Panel } from "../stock/graphics-common/Panel";
import { Pill } from "../stock/graphics-common/Pill";
import { Text } from "../stock/graphics-common/Text";
import { StockGraphic } from "../stock/StockGraphic/StockGraphic";
import { VideoThemeScope } from "../videoTheme/VideoThemeScope/VideoThemeScope";
import type { VideoThemePatch } from "../videoTheme/videoTheme.types";
import type { ReactElement } from "react";

function _svg({
  element,
  patch,
}: Readonly<{
  element: ReactElement;
  patch?: VideoThemePatch;
}>): string {
  const svg = <svg>{element}</svg>;
  return renderToStaticMarkup(
    patch ? <VideoThemeScope patches={[patch]}>{svg}</VideoThemeScope> : svg,
  );
}

test("a pill draws today's classic shape", () => {
  const markup = _svg({
    element: <Pill x={0} y={0} text="05 nodes" color="#728794" width={114} />,
  });
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
  const markup = _svg({
    element: (
      <CircleNode
        x={100}
        y={100}
        label="Hub"
        frame={60}
        accent="#51a7ff"
        size="xl"
      />
    ),
  });
  assert.match(markup, /r="46"/);
  assert.match(
    markup,
    /r="37"[^>]*fill="#101e28"[^>]*stroke="#2a404e"[^>]*stroke-width="1.5"/,
  );
});

test("a theme's panel corner reaches every panel", () => {
  const markup = _svg({
    element: <Panel x={0} y={0} width={10} height={10} />,
    patch: {
      radius: { xl: "6px" },
    },
  });
  assert.match(markup, /rx="6"/);
});

test("the eyebrow sits at the theme's eyebrow origin", () => {
  assert.match(
    _svg({
      element: <Eyebrow>Label</Eyebrow>,
      patch: { spacing: { xl: "40px" } },
    }),
    /x="40" y="40"/,
  );
});

test("the caption sits on the caption baseline", () => {
  assert.match(
    _svg({ element: <Caption>Caption</Caption> }),
    /x="480" y="551"/,
  );
});

test("monospace text uses the code face", () => {
  const patch = {
    other: { video: { atomic: { fontFamily: { courier: "arial" } } } },
  };
  assert.match(
    _svg({
      element: (
        <Text x={0} y={0} mono>
          a
        </Text>
      ),
      patch,
    }),
    /font-family="Arial, sans-serif"/,
  );
});

test("a guide draws its dash pattern at the guide opacity", () => {
  assert.match(
    _svg({ element: <Guide cx={0} cy={0} rx={10} ry={5} /> }),
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
  const markup = _svg({
    element: (
      <>
        <CircleNode x={100} y={100} label="A" frame={60} accent="#51a7ff" />
        <DrawPath d="M0 0 L100 0" frame={60} />
        <Guide cx={0} cy={0} rx={10} ry={5} />
      </>
    ),
    patch,
  });
  assert.equal(markup.match(/data-rough-shape="3"/g)?.length, 5);
  _getSketchProfileElements().forEach((element) => {
    const roughPaths = getSvgAttributeMatchesFromMarkup({
      markup: _svg({ element, patch }),
      attribute: "d",
    }).values;
    const smoothPaths = getSvgAttributeMatchesFromMarkup({
      markup: _svg({
        element,
        patch: {
          other: {
            video: {
              semantic: { sketch: { shape: "$sketch.profile.smooth" } },
            },
          },
        },
      }),
      attribute: "d",
    }).values;
    assert.ok(roughPaths.length > 0);
    roughPaths.forEach((path) => {
      assert.match(path, /[MLCQ]/i);
      assert.doesNotMatch(path, /NaN|Infinity/);
    });
    assert.notDeepEqual(roughPaths, smoothPaths);
  });
});

function _getSketchProfileElements(): readonly ReactElement[] {
  return [
    <CircleNode
      key="node"
      x={100}
      y={100}
      label="A"
      frame={60}
      accent="#51a7ff"
    />,
    <DrawPath key="edge" d="M0 0 L100 0" frame={60} />,
    <Guide key="guide" cx={0} cy={0} rx={10} ry={5} />,
  ];
}
