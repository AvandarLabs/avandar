import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgPaintAssertions } from "../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { StratifiedSpatialSample } from "./StratifiedSpatialSample";
import {
  defaultInput,
  fixtures,
  invalidInputs,
  changedInput,
} from "./StratifiedSpatialSample.fixtures";

test("default stratum hold frame reports one of three west and one of two east selections", () => {
  const markup = _render({ frame: 150 });
  assert.match(markup, /data-stratum="w" data-selected="1" data-eligible="3"/);
  assert.match(markup, /data-stratum="e" data-selected="1" data-eligible="2"/);
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { stratifiedSpatialSampleContract } from "./StratifiedSpatialSample.contract";
import { inputSchema, type Input } from "./StratifiedSpatialSample.schema";

/**
 * Rendered markup with each marked sketch-aware shape read as one element.
 * `SketchedShape` draws its plain shape inside a group that carries the
 * shape's markers (`data-*`, `aria-label`, `transform`), so the group's
 * attributes move onto the shape these assertions read.
 */
function _joinMarkedShapes(markup: string): string {
  return markup.replace(
    /<g((?:\s+(?:data-[\w-]+|aria-label|transform)="[^"]*")+)><(path|line|circle|rect|ellipse)\b([^>]*)><\/\2><\/g>/g,
    "<$2$1$3></$2>",
  );
}

function _render({
  frame,
  input = defaultInput,
}: Readonly<{ frame: number; input?: Input }>): string {
  return _joinMarkedShapes(
    renderToStaticMarkup(
      createElement(
        "svg",
        {},
        createElement(StratifiedSpatialSample, {
          frame,
          input,
          accent: "#46dbc9",
          id: "packet17",
        }),
      ),
    ),
  );
}
function _getSummaryNumbers({
  frame,
  input,
}: {
  frame: number;
  input: Input;
}): string[] {
  return SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
    _render({ frame: frame, input: input }),
  )
    .filter(({ kind, top, text }) => {
      return kind === "text" && top >= 480 && /^\d+$/.test(text ?? "");
    })
    .map(({ text }) => {
      return text ?? "";
    });
}
function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    ...input.strata.map(prop("label")),
    ...input.sites
      .filter((site) => {
        return (
          input.showUnselectedLabels || input.selectedSiteIds.includes(site.id)
        );
      })
      .map(prop("label")),
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
  contract: stratifiedSpatialSampleContract,
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
test("an unsampled stratum keeps every denominator and eligible site visible", () => {
  const markup = _render({ frame: 150, input: changedInput });
  assert.match(markup, /data-stratum="e" data-selected="0" data-eligible="2"/);
  assert.equal((markup.match(/data-site=/g) ?? []).length, 5);
  const hidden = _render({
    frame: 150,
    input: { ...changedInput, showUnselectedLabels: false },
  });
  assert.equal((hidden.match(/data-site=/g) ?? []).length, 5);
  assert.doesNotMatch(hidden, /aria-label="Site B"/);
});
test("selected stems rise above unchanged map anchors", () => {
  const early = _render({ frame: 0 });
  const late = _render({ frame: 150 });
  const raised = SvgAttributes.fromMarker({
    markup: late,
    marker: "raised-site",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: raised, name: "cy" }),
    210,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: early,
        marker: "raised-site",
      }),
      name: "cy",
    }),
    224,
  );
  assert.equal(
    SvgAttributes.fromMarker({ markup: early, marker: "site-anchor" }),
    SvgAttributes.fromMarker({ markup: late, marker: "site-anchor" }),
  );
  assert.match(
    SvgAttributes.fromMarker({ markup: early, marker: "stratum-boundary" }),
    /stroke-opacity="0"/,
  );
  assert.match(
    SvgAttributes.fromMarker({ markup: late, marker: "stratum-boundary" }),
    /stroke-opacity="1"/,
  );
});
test("sampling rejects foreign and boundary sites, missing denominators and overlapping strata", () => {
  [
    {
      ...defaultInput,
      sites: defaultInput.sites.map((site, index) => {
        return index ? site : { ...site, x: 70 };
      }),
    },
    {
      ...defaultInput,
      sites: defaultInput.sites.map((site, index) => {
        return index ? site : { ...site, x: 50 };
      }),
    },
    {
      ...defaultInput,
      strata: [defaultInput.strata[0], { ...defaultInput.strata[0], id: "e" }],
    },
    { ...defaultInput, selectedSiteIds: ["foreign"] },
    {
      ...defaultInput,
      sites: defaultInput.sites.map((site) => {
        return { ...site, stratumId: "w" };
      }),
    },
  ].forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
  assert.equal(inputSchema.safeParse(defaultInput).success, true);
});
test("coincident sites retain distinct fixed keys for alternating selections", () => {
  const input = inputSchema.parse({
    ...fixtures[2].input,
    selectedSiteIds: ["0", "2", "4", "6", "8", "10"],
  });
  const markup = _render({ frame: 150, input: input });
  assert.equal((markup.match(/data-site-anchor=/g) ?? []).length, 12);
  const keys = [...markup.matchAll(/<circle cx="638" cy="([^"]+)" r="9"/g)].map(
    (match) => {
      return Number(match[1]);
    },
  );
  assert.equal(keys.length, 12);
  keys.slice(1).forEach((y, index) => {
    return assert.ok(y - keys[index] > 19);
  });
  [...markup.matchAll(/<path d="M[^"]+ L([\d.]+) 456"/g)].forEach((match) => {
    return assert.ok(Number(match[1]) <= 430);
  });
});

[
  { name: "default", input: defaultInput, totals: ["2", "5", "3"] },
  {
    name: "one stratum unsampled",
    input: changedInput,
    totals: ["1", "5", "4"],
  },
  {
    name: "all sites selected",
    input: inputSchema.parse({
      ...defaultInput,
      selectedSiteIds: ["a", "b", "c", "d", "e"],
    }),
    totals: ["5", "5", "0"],
  },
  { name: "dense", input: fixtures[2].input, totals: ["8", "12", "4"] },
].forEach(({ name, input, totals }) => {
  test(`${name} displays selected, eligible and unselected totals in the reading hold`, () => {
    assert.deepEqual(_getSummaryNumbers({ frame: 150, input }), totals);
  });
});

test("aggregate quantities enter after sampling resolves and count into the hold", () => {
  const input = fixtures[2].input;
  assert.deepEqual(_getSummaryNumbers({ frame: 90, input }), []);
  const resolving = _getSummaryNumbers({ frame: 116, input }).map(Number);
  assert.equal(resolving.length, 3);
  assert.ok(resolving[1] > 0 && resolving[1] < 12);
  assert.deepEqual(_getSummaryNumbers({ frame: 150, input }), ["8", "12", "4"]);
});

test("long summary captions, quantities and unit retain separate painted space", () => {
  const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
    _render({ frame: 150, input: fixtures[2].input }),
  );
  SvgPaintAssertions.assertPaintClearance({
    texts: paint.filter(({ kind, top }) => {
      return kind === "text" && top >= 470;
    }),
    rectangles: paint.filter(({ kind }) => {
      return kind === "rect";
    }),
  });
});
