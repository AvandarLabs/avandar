/** Emitted geometry protects the authored accounting and identity semantics. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { EnvironmentalObservationGaps } from "./EnvironmentalObservationGaps";
import {
  DEFAULT_INPUT,
  changedInput,
  fixtures,
  invalidInputs,
} from "./EnvironmentalObservationGaps.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      null,
      createElement(EnvironmentalObservationGaps, {
        frame,
        accent: "#74e0bd",
        id: "test",
        input,
      }),
    ),
  );
}
test("point observations retain missing-cell hatches and do not increase observed area", () => {
  const before = _render({ frame: 150, input: DEFAULT_INPUT }),
    after = _render({ frame: 150, input: changedInput });
  assert.equal((after.match(/data-missing-cell=/g) || []).length, 2);
  assert.equal((after.match(/data-point-check=/g) || []).length, 3);
  const areaBefore = SvgAttributes.fromMarker({
    markup: before,
    marker: "coverage",
  });
  const areaAfter = SvgAttributes.fromMarker({
    markup: after,
    marker: "coverage",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: areaBefore,
      name: "data-observed-area",
    }),
    4,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: areaAfter,
      name: "data-observed-area",
    }),
    4,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: areaAfter,
      name: "data-missing-area",
    }),
    2,
  );
});

import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { environmentalObservationGapsContract as contract } from "./EnvironmentalObservationGaps.contract";
import {
  inputSchema,
  SEMANTIC_RULES,
} from "./EnvironmentalObservationGaps.schema";
import type { Input } from "./EnvironmentalObservationGaps.schema";

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    ...input.cells.map(prop("label")),
    input.metric.label,
    input.metric.unit,
    input.metric.periodLabel,
    ...Object.values(input.decision),
    input.copy.map,
    input.copy.disclaimer,
    ...(input.fieldChecks.length
      ? [
          input.copy.fieldCheck,
          input.copy.pointSupport,
          ...input.fieldChecks.map(prop("label")),
        ]
      : []),
    ...(input.showCoverageTotals
      ? [input.copy.observed, input.copy.missing, input.copy.areaUnit]
      : []),
  ];
}
const assertions = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: [
    "id",
    "cellId",
    "fromPatchId",
    "toPatchId",
    "learnerId",
    "state",
    "orientation",
    "context",
    "stage",
    "deskLayout",
  ],
  getVisibleTexts: _getVisibleTexts,
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(assertions);
registerStockTextLayoutAssertions(assertions);
test("serialized semantic rules retain every runtime relation", () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(contract.semanticRules)).map(
      ({ id, paths }: { id: string; paths: string[] }) => ({ id, paths }),
    ),
    [
      {
        id: "unique-cells",
        paths: ["cells.*.id"],
      },
      {
        id: "unique-points",
        paths: ["fieldChecks.*.id"],
      },
      {
        id: "rectangle",
        paths: ["cells.*.row", "cells.*.column"],
      },
      {
        id: "metric-range",
        paths: ["metric.minimum", "metric.maximum"],
      },
      {
        id: "readings",
        paths: ["cells.*.value", "metric"],
      },
      {
        id: "point-reference-range",
        paths: [
          "fieldChecks.*.cellId",
          "fieldChecks.*.value",
          "cells.*.id",
          "metric",
        ],
      },
    ],
  );
  assert.ok(
    SEMANTIC_RULES.every(
      (rule) => rule.paths.length && rule.description.length,
    ),
  );
});

test("offset rectangles retain all cells and point references including empty IDs", () => {
  const input = fixtures.find(propEq("id", "offset-rectangle"))!.input;
  inputSchema.parse(input);
  const markup = _render({ frame: 150, input: input });
  assert.equal((markup.match(/data-observation-cell=/g) || []).length, 4);
  assert.equal((markup.match(/data-missing-cell=/g) || []).length, 4);
  assert.match(markup, /data-point-check=""/);
  const cells = Array.from(
    markup.matchAll(/<rect[^>]*data-missing-cell=[^>]*>/g),
    (match) => match[0],
  );
  assert.equal(
    Math.min(
      ...cells.map((cell) =>
        SvgAttributes.getNumberFromMarkup({ attributes: cell, name: "x" }),
      ),
    ),
    270,
  );
  assert.equal(
    Math.min(
      ...cells.map((cell) =>
        SvgAttributes.getNumberFromMarkup({ attributes: cell, name: "y" }),
      ),
    ),
    105,
  );
});
test("concentrated checks stay distinct and the team clears all previously placed supports", () => {
  const layouts = [
    fixtures[2].input,
    fixtures.find(propEq("id", "separated-checks"))!.input,
    {
      ...fixtures[2].input,
      fieldChecks: fixtures[2].input.fieldChecks.map((check, index) => ({
        ...check,
        cellId: fixtures[2].input.cells[index].id,
      })),
    },
  ];
  layouts.forEach((input) => {
    Array.from({ length: 105 }, (_, index) => 54 + index / 2).forEach(
      (frame) => {
        const markup = _render({ frame: frame, input: input }),
          team = SvgAttributes.fromMarker({ markup, marker: "team-position" });
        const x = SvgAttributes.getNumberFromMarkup({
            attributes: team,
            name: "data-x",
          }),
          y = SvgAttributes.getNumberFromMarkup({
            attributes: team,
            name: "data-y",
          });
        assert.ok(x - 5 > 225 && x + 5 < 920 && y - 8 >= 105 && y + 9 <= 405);
        const hand = SvgAttributes.fromMarker({
            markup,
            marker: "sampling-hand",
          }),
          handX = SvgAttributes.getNumberFromMarkup({
            attributes: hand,
            name: "cx",
          });
        Array.from(
          markup.matchAll(/<circle[^>]*data-point-check="([^"]*)"[^>]*>/g),
        ).forEach((match) => {
          const pointX = SvgAttributes.getNumberFromMarkup({
              attributes: match[0],
              name: "cx",
            }),
            pointY = SvgAttributes.getNumberFromMarkup({
              attributes: match[0],
              name: "cy",
            });
          assert.ok(
            x + 5 < pointX - 5.5 ||
              x - 5 > pointX + 5.5 ||
              y + 9 < pointY - 5.5 ||
              y - 8 > pointY + 5.5,
            "full team body clears retained point",
          );
          if (Math.abs(pointX - handX) < 1e-9) {
            assert.equal(
              pointY,
              SvgAttributes.getNumberFromMarkup({
                attributes: hand,
                name: "cy",
              }),
            );
          }
        });
      },
    );
    const points = Array.from(
      _render({ frame: 150, input: input }).matchAll(
        /<circle[^>]*data-point-check="([^"]*)"[^>]*>/g,
      ),
    );
    points.forEach((point, index) =>
      points.slice(index + 1).forEach((other) =>
        assert.ok(
          Math.hypot(
            SvgAttributes.getNumberFromMarkup({
              attributes: point[0],
              name: "cx",
            }) -
              SvgAttributes.getNumberFromMarkup({
                attributes: other[0],
                name: "cx",
              }),
            SvgAttributes.getNumberFromMarkup({
              attributes: point[0],
              name: "cy",
            }) -
              SvgAttributes.getNumberFromMarkup({
                attributes: other[0],
                name: "cy",
              }),
          ) >= 36,
        ),
      ),
    );
  });
});
test("an extreme finite metric yields finite readings without inventing coverage", () => {
  const input = fixtures[2].input,
    markup = _render({ frame: 150, input: input });
  assert.doesNotMatch(markup, /NaN|Infinity/);
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({ markup, marker: "coverage" }),
      name: "data-observed-area",
    }),
    4 * 0.3,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({ markup, marker: "coverage" }),
      name: "data-missing-area",
    }),
    8 * 0.3,
  );
  assert.match(markup, /data-globe-context/);
  assert.doesNotMatch(
    _render({ frame: 150, input: { ...input, context: "schematic-tile" } }),
    /data-globe-context/,
  );
});
