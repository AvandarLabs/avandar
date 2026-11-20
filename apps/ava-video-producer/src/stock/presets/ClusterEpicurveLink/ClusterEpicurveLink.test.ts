import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { createThemePatchFromStockColors } from "../../../videoTheme/createThemePatchFromStockColors/createThemePatchFromStockColors";
import { VideoThemeScope } from "../../../videoTheme/VideoThemeScope/VideoThemeScope";
import { ClusterEpicurveLink } from "./ClusterEpicurveLink";
import { clusterEpicurveLinkContract } from "./ClusterEpicurveLink.contract";
import {
  invalidInputs,
  defaultInput,
  fixtures,
  changedInput,
} from "./ClusterEpicurveLink.fixtures";
import { inputSchema, type Input } from "./ClusterEpicurveLink.schema";

test("The default investigation group contains three cases, including one unknown onset. Each case maps to exactly one histogram bin or the unknown compartment. Focusing a time bin highlights precisely its case IDs on the map.", () => {
  const markup = _render({ frame: 150 });
  assert.equal((markup.match(/data-histogram-case=/g) ?? []).length, 5);
  assert.match(markup, /data-investigation-count="3"/);
});
function _render({
  frame,
  input = defaultInput,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(ClusterEpicurveLink, {
        frame,
        input,
        accent: "#46dbc9",
        id: "packet17",
      }),
    ),
  );
}
function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    ...input.cases.map(prop("label")),
    ...input.timeBins.map(prop("label")),
    ...Object.values(input.copy),
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "stratumId",
  "parcelId",
  "onsetBinId",
  "focusedBinId",
  "investigationCaseIds",
  "selectedSiteIds",
  "measure",
  "gapEmphasis",
];
registerStockPresetAssertions({
  inputSchema,
  defaultInput,
  fixtures,
  invalidInputs,
  contract: clusterEpicurveLinkContract,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});
test("every case occupies one ordered bin or the unknown compartment, independent of selection", () => {
  const markup = _render({ frame: 150 });
  assert.equal((markup.match(/data-unknown-onset="true"/g) ?? []).length, 1);
  assert.deepEqual(
    [
      ...markup.matchAll(/data-focused-case="([^"]*)" data-is-focused="true"/g),
    ].map((match) => {
      return match[1];
    }),
    ["b", "d"],
  );
  assert.equal(
    (
      _render({ frame: 150, input: changedInput }).match(
        /data-unknown-onset="true"/g,
      ) ?? []
    ).length,
    5,
  );
  const emptyFocus = { ...changedInput, focusedBinId: "d1" };
  assert.doesNotMatch(
    _render({ frame: 150, input: emptyFocus }),
    /data-is-focused="true"/,
  );
  assert.equal(
    (
      _render({ frame: 150, input: fixtures[1].input }).match(
        /data-is-focused="true"/g,
      ) ?? []
    ).length,
    1,
  );
});
test("identity guides join each selected map pin to its own histogram segment", () => {
  const markup = _render({ frame: 60 });
  assert.equal((markup.match(/data-identity-guide=/g) ?? []).length, 3);
  const guide = SvgAttributes.fromMarker({ markup, marker: "identity-guide" });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: guide, name: "x1" }),
    122.5,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: guide, name: "x2" }),
    365,
  );
  assert.doesNotMatch(
    _render({
      frame: 60,
      input: { ...defaultInput, showIdentityGuides: false },
    }),
    /data-identity-guide=/,
  );
  const early = SvgAttributes.fromMarker({
    markup: _render({ frame: 36 }),
    marker: "lifted-case",
  });
  const late = SvgAttributes.fromMarker({
    markup: _render({ frame: 84 }),
    marker: "lifted-case",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: early, name: "cx" }),
    122.5,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: late, name: "cx" }),
    365,
  );
});
test("case schemas reject foreign onset, focus and investigation references", () => {
  [
    { ...defaultInput, focusedBinId: "missing" },
    { ...defaultInput, investigationCaseIds: ["a", "a"] },
    { ...defaultInput, investigationCaseIds: ["missing"] },
    {
      ...defaultInput,
      cases: defaultInput.cases.map((record) => {
        return { ...record, onsetBinId: "missing" };
      }),
    },
  ].forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
});
test("twelve unknown cases retain twelve non-overlapping keyed histogram units", () => {
  const input = inputSchema.parse({
    ...fixtures[2].input,
    cases: fixtures[2].input.cases.map((record) => {
      return { ...record, onsetBinId: null };
    }),
  });
  const markup = _render({ frame: 150, input });
  const segments = [
    ...markup.matchAll(/data-unknown-onset="true"><rect([^>]+)>/g),
  ].map((match) => {
    return match[1];
  });
  assert.equal(segments.length, 12);
  const bounds = segments
    .map((attributes) => {
      return {
        y: SvgAttributes.getNumberFromMarkup({ attributes, name: "y" }),
        height: SvgAttributes.getNumberFromMarkup({
          attributes,
          name: "height",
        }),
      };
    })
    .sort((a, b) => {
      return a.y - b.y;
    });
  bounds.forEach((bound, index) => {
    assert.ok(bound.y >= 130);
    if (index) {
      assert.ok(bounds[index - 1].y + bounds[index - 1].height < bound.y);
    }
  });
  assert.equal((markup.match(/data-map-case=/g) ?? []).length, 12);
});
test("selected histogram identity numerals contrast against their bright blocks", async () => {
  const { clusterEpicurveLinkContract: correctionContract } =
    await import("./ClusterEpicurveLink.contract");
  const { ClusterEpicurveLink: Component } =
    await import("./ClusterEpicurveLink");
  Array.from([
    correctionContract.defaultInput,
    correctionContract.fixtures.find(propEq("id", "dense"))!.input,
  ]).forEach((source) => {
    const input = { ...source };
    const markup = renderToStaticMarkup(
      createElement(Component, {
        input,
        frame: 150,
        accent: "#9fefca",
        id: "correction",
      }),
    );
    const groups = [
      ...markup.matchAll(
        /data-histogram-case="([^"]*)"[\s\S]*?<rect([^>]*)><\/rect><text([^>]*)>/g,
      ),
    ];
    assert.equal(groups.length, input.cases.length);
    groups
      .filter(([, id]) => {
        return input.investigationCaseIds.includes(id);
      })
      .forEach(([, , rect, text]) => {
        const fill = rect.match(/fill="([^"]*)"/)![1];
        const textFill = text.match(/fill="([^"]*)"/)![1];
        assert.notEqual(
          textFill,
          "#edf7f4",
          "Selected identities need dark ink against the bright selected block",
        );
        assert.equal(fill, "#9fefca");
      });
  });
});
test("selected histogram identities keep at least 4.5 contrast under light and dark accents", async () => {
  const { HistogramSegments } =
    await import("./HistogramSegments/HistogramSegments");
  const { defaultInput: identityInput } =
    await import("./ClusterEpicurveLink.fixtures");
  const luminance = (color: string) => {
    return color
      .slice(1)
      .match(/../g)!
      .map((channel) => {
        return Number.parseInt(channel, 16) / 255;
      })
      .map((channel) => {
        return channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, channel, index) => {
        return sum + channel * [0.2126, 0.7152, 0.0722][index];
      }, 0);
  };
  ["#9fefca", "#3caeff", "#15151a", "#ffffff", "#ff0000", "#777777"].forEach(
    (accent) => {
      const markup = renderToStaticMarkup(
        createElement(VideoThemeScope, {
          patches: [createThemePatchFromStockColors({ accent })],
          children: createElement(HistogramSegments, {
            input: identityInput,
            frame: 150,
            accent,
          }),
        }),
      );
      const identityFill = markup.match(/<text[^>]*fill="([^"]*)"/)![1];
      const values = [luminance(identityFill), luminance(accent)].sort(
        (first, second) => {
          return first - second;
        },
      );
      assert.ok((values[1] + 0.05) / (values[0] + 0.05) >= 4.5, accent);
    },
  );
});
