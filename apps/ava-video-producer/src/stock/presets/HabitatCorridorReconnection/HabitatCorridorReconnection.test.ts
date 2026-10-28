/** Emitted geometry protects the authored accounting and identity semantics. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { HabitatCorridorReconnection } from "./HabitatCorridorReconnection";
import {
  DEFAULT_INPUT,
  changedInput,
  fixtures,
  invalidInputs,
} from "./HabitatCorridorReconnection.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      null,
      createElement(HabitatCorridorReconnection, {
        frame,
        accent: "#74e0bd",
        id: "test",
        input,
      }),
    ),
  );
}
test("corridor land is reclassified inside the fixed boundary and the route joins both patches", () => {
  const markup = _render({ frame: 150, input: changedInput });
  const land = SvgAttributes.fromMarker({ markup, marker: "land-balance" });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: land,
      name: "data-habitat-before",
    }),
    7,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: land,
      name: "data-habitat-after",
    }),
    8,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: land,
      name: "data-other-after",
    }),
    12,
  );
  const route = SvgAttributes.fromMarker({ markup, marker: "corridor-route" });
  assert.match(
    route,
    /d="M 720 300 L 550 300 L 520 250 L 440 250 L 410 300 L 240 300"/,
  );
  assert.match(markup, /aria-label="Illustrative route only"/);
});

import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { habitatCorridorReconnectionContract as contract } from "./HabitatCorridorReconnection.contract";
import {
  inputSchema,
  SEMANTIC_RULES,
} from "./HabitatCorridorReconnection.schema";
import type { Input } from "./HabitatCorridorReconnection.schema";
function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    ...input.patches.map(prop("label")),
    input.corridor.label,
    input.decision.actorLabel,
    input.decision.actionLabel,
    input.copy.map,
    input.copy.barrier,
    input.copy.crossing,
    input.copy[input.decision.stage],
    input.copy.areaUnit,
    input.copy.lengthUnit,
    input.copy.disclaimer,
    ...(input.showIllustrativeTraversal ? [input.copy.traversal] : []),
    ...(input.showLandBalance
      ? [input.copy.habitat, input.copy.otherLand]
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
        id: "unique-patches",
        paths: ["patches.*.id"],
      },
      {
        id: "endpoints",
        paths: ["corridor.fromPatchId", "corridor.toPatchId", "patches.*.id"],
      },
      {
        id: "land-conservation",
        paths: [
          "landBoundaryHa",
          "patches.*.areaHa",
          "corridor.lengthM",
          "corridor.widthM",
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

test("the entire illustrative marker clears the unchanged road through both route directions", () => {
  [
    DEFAULT_INPUT,
    {
      ...changedInput,
      decision: { ...changedInput.decision, stage: "implemented" as const },
    },
  ].forEach((input) => {
    const variant = { ...input, showIllustrativeTraversal: true };
    Array.from({ length: 53 }, (_, index) => 82 + index / 2).forEach(
      (frame) => {
        const markup = _render({ frame: frame, input: variant }),
          marker = SvgAttributes.fromMarker({
            markup,
            marker: "illustrative-traversal",
          });
        const x = SvgAttributes.getNumberFromMarkup({
            attributes: marker,
            name: "cx",
          }),
          y = SvgAttributes.getNumberFromMarkup({
            attributes: marker,
            name: "cy",
          }),
          radius =
            SvgAttributes.getNumberFromMarkup({
              attributes: marker,
              name: "r",
            }) +
            SvgAttributes.getNumberFromMarkup({
              attributes: marker,
              name: "stroke-width",
            }) /
              2;
        assert.ok(
          x - radius >= 233 &&
            x + radius <= 727 &&
            y - radius >= 243 &&
            y + radius <= 307,
        );
        if (x + radius >= 462 && x - radius <= 498) {
          assert.ok(Math.abs(y - 250) < 1e-9);
          assert.ok(y - radius > 232 && y + radius < 268);
        }
      },
    );
  });
});
test("proposals stay outlined with traversal enabled and implemented footprints stay solid", () => {
  const proposal = _render({
      frame: 150,
      input: {
        ...changedInput,
        showIllustrativeTraversal: true,
      },
    }),
    implemented = _render({
      frame: 150,
      input: {
        ...changedInput,
        decision: { ...changedInput.decision, stage: "implemented" },
      },
    });
  assert.match(proposal, /data-proposal-interior/);
  assert.match(proposal, /aria-label="Proposed"/);
  assert.doesNotMatch(implemented, /data-proposal-interior/);
  assert.match(implemented, /aria-label="Implemented"/);
  assert.notEqual(
    SvgAttributes.fromMarker({
      markup: _render({ frame: 24 }),
      marker: "corridor-route",
    }),
    SvgAttributes.fromMarker({
      markup: _render({ frame: 150 }),
      marker: "corridor-route",
    }),
  );
});
test("tiny accepted dimensions and zero remaining other land retain fixed boundary conservation", () => {
  [
    fixtures[1].input,
    fixtures.find(propEq("id", "zero-other-land"))!.input,
  ].forEach((input) => {
    const variant = {
      ...input,
      showLandBalance: true,
      showIllustrativeTraversal: true,
    };
    inputSchema.parse(variant);
    const land = SvgAttributes.fromMarker({
      markup: _render({ frame: 150, input: variant }),
      marker: "land-balance",
    });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: land,
        name: "data-habitat-after",
      }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: land,
          name: "data-other-after",
        }),
      variant.landBoundaryHa,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: land,
        name: "data-other-after",
      }),
      0,
    );
  });
});

test("the complete dense crossing caption clears the unchanged road top", () => {
  const input: Input = {
    ...fixtures[2].input,
    copy: { ...fixtures[2].input.copy, crossing: "路".repeat(28) },
  };
  [24, 78, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    const caption = markup.match(
      new RegExp(`<text aria-label="${input.copy.crossing}"[^>]*>`),
    )![0];
    const road = markup.match(/<rect x="462"[^>]*>/)![0];
    assert.ok(
      SvgAttributes.getNumberFromMarkup({ attributes: caption, name: "x" }) <
        SvgAttributes.getNumberFromMarkup({ attributes: road, name: "x" }),
    );
    assert.ok(
      SvgAttributes.getNumberFromMarkup({ attributes: caption, name: "y" }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: caption,
          name: "font-size",
        }) *
          0.25 <
        SvgAttributes.getNumberFromMarkup({ attributes: road, name: "y" }),
    );
  });
});
