import assert from "node:assert/strict";
import test from "node:test";
import { propEq, prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChosenServiceAccess } from "./ChosenServiceAccess";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  invalidInputs,
  DENSE_INPUT,
  MINIMUM_INPUT,
} from "./ChosenServiceAccess.fixtures";
import { registerServiceApproachAssertions } from "./registerServiceApproachAssertions";
import { registerServiceBarrierAssertions } from "./registerServiceBarrierAssertions";
import { ServiceSvgGeometry } from "./ServiceSvgGeometry";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(ChosenServiceAccess, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
}
registerServiceApproachAssertions();
registerServiceBarrierAssertions();
test("only the chosen doorway changes physically before participant entry", () => {
  const setup = _render({ frame: 24 });
  const final = _render({ frame: 150 });
  assert.notEqual(setup, final);
  assert.match(final, /data-barrier-selected="true"/);
  assert.match(final, /data-participant-position="inside"/);
});

test("changed authored input emits its physical scene", () => {
  assert.notEqual(
    renderToStaticMarkup(
      createElement(ChosenServiceAccess, {
        frame: 150,
        input: CHANGED_INPUT,
        accent: "#9fefca",
        id: "test",
      }),
    ),
    "",
  );
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";

test("changed choice clears only the other entrance and all mobility/barrier combinations work", () => {
  ["unfold-ramp", "clear-entrance"].forEach((accessChange) =>
    ["walking", "wheelchair"].forEach((participantMobility) => {
      const input = inputSchema.parse({
        ...CHANGED_INPUT,
        accessChange,
        participantMobility,
      });
      const setup = _render({ frame: 24, input: input });
      const final = _render({ frame: 150, input: input });
      const barriers = (markup: string) => [
        ...markup.matchAll(/<path data-barrier="([^"]*)"[^>]*>/g),
      ];
      const before = barriers(setup);
      const after = barriers(final);
      assert.equal(after.length, input.services.length);
      after.forEach((barrier, index) =>
        assert.equal(
          barrier[0] === before[index][0],
          input.services[index].id !== input.chosenServiceId,
        ),
      );
      const actor = final.match(/<g data-participant-position="inside"[^>]*>/);
      assert.ok(actor);
      const choiceIndex = input.services.findIndex(
        propEq("id", input.chosenServiceId),
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: actor[0],
          name: "data-x",
        }),
        160 + ((choiceIndex + 0.5) * 640) / input.services.length,
      );
      assert.notEqual(
        _render({ frame: 88, input: input }).match(
          /<path data-participant-arm[^>]*>/,
        )?.[0],
        _render({ frame: 104, input: input }).match(
          /<path data-participant-arm[^>]*>/,
        )?.[0],
      );
      assert.match(_render({ frame: 65, input: input }), /data-staff-hand/);
      assert.doesNotMatch(final, /data-choice-label/);
    }),
  );
});
test("participant points toward the selected doorway and clears the whole barrier before moving", () => {
  const selected = _render({ frame: 36 });
  assert.match(selected, /data-choice-point="shelter"/);
  const still = _render({ frame: 77 }).match(
    /<g data-participant-position[^>]*>/,
  );
  const travel = _render({ frame: 100 }).match(
    /<g data-participant-position[^>]*>/,
  );
  assert.ok(still && travel);
  assert.notEqual(still[0], travel[0]);
  const staff = _render({ frame: 80 }).match(/<circle data-staff-hand[^>]*>/);
  assert.ok(staff);
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: staff[0], name: "cx" }),
    160 + (0.5 * 640) / 2 + 42,
  );
});

import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { chosenServiceAccessContract } from "./ChosenServiceAccess.contract";
import { inputSchema, type Input } from "./ChosenServiceAccess.schema";

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.scenarioCaption,
    ...input.services.map(prop("label")),
    input.labels.participant,
    input.labels.staff,
    ...(input.showChoiceLabel && frame >= 30 ? [input.labels.choice] : []),
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "symbol",
  "chosenServiceId",
  "accessChange",
  "participantMobility",
];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: chosenServiceAccessContract,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});
test("minimum empty identifiers and maximum accepted collections stay schema-valid", () => {
  assert.deepEqual(inputSchema.parse(MINIMUM_INPUT), MINIMUM_INPUT);
  assert.deepEqual(inputSchema.parse(DENSE_INPUT), DENSE_INPUT);
});
test("folded ramp starts upright and the self-propelled hand stays on the wheel rim", () => {
  const initial = _render({ frame: 24 });
  const rampPath = initial.match(
    /<path data-barrier="shelter"[^>]*d="M([^ ]+) ([^ ]+) L([^ ]+) ([^ ]+)/,
  );
  assert.ok(rampPath);
  assert.equal(Number(rampPath[1]), Number(rampPath[3]));
  [88, 104].forEach((frame) => {
    const markup = _render({ frame: frame });
    const person = markup.match(/<circle data-participant-wheel="rear"[^>]*>/);
    const hand = markup.match(/<circle data-participant-hand[^>]*>/);
    assert.ok(person && hand);
    const distance = Math.hypot(
      SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cx" }) -
        SvgAttributes.getNumberFromMarkup({
          attributes: person[0],
          name: "cx",
        }),
      SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cy" }) -
        SvgAttributes.getNumberFromMarkup({
          attributes: person[0],
          name: "cy",
        }),
    );
    assert.ok(Math.abs(distance - 20) < 1e-8);
  });
});
test("I2 obstruction-only access has a level threshold and wheel clearance", () => {
  ["walking", "wheelchair"].forEach((participantMobility) => {
    const input = inputSchema.parse({ ...CHANGED_INPUT, participantMobility });
    const markup = _render({ frame: 108, input: input });
    assert.doesNotMatch(markup, /d="M598 356 V326 H682"/);
    const actor = _render({ frame: 150, input: input }).match(
      /<g data-participant-position[^>]*>/,
    );
    assert.ok(actor);
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: actor[0],
        name: "data-y",
      }),
      participantMobility === "wheelchair" ? 352 : 356,
    );
  });
});
test("I2 actual wheel rims and walking feet clear the emitted route in both barrier variants", () => {
  ["clear-entrance", "unfold-ramp"].forEach((accessChange) =>
    ["walking", "wheelchair"].forEach((participantMobility) => {
      const input = inputSchema.parse({
        ...CHANGED_INPUT,
        accessChange,
        participantMobility,
      });
      Array.from({ length: 23 }, (_, index) => 98 + index).forEach((frame) => {
        const markup = _render({ frame: frame, input: input }),
          route = markup.match(/<path data-access-route[^>]*>/);
        assert.ok(route);
        const segments = ServiceSvgGeometry.getPathSegmentsFromTag(route[0]);
        const floor = (x: number) => {
          const segment = segments.find(
            ({ start, end }) => x >= start.x && x <= end.x,
          );
          assert.ok(segment);
          return (
            segment.start.y +
            ((x - segment.start.x) / (segment.end.x - segment.start.x)) *
              (segment.end.y - segment.start.y)
          );
        };
        const wheels = [
          ...markup.matchAll(/<circle data-participant-wheel[^>]*>/g),
        ];
        wheels.forEach((wheel) => {
          const cx = SvgAttributes.getNumberFromMarkup({
              attributes: wheel[0],
              name: "cx",
            }),
            cy = SvgAttributes.getNumberFromMarkup({
              attributes: wheel[0],
              name: "cy",
            }),
            radius =
              SvgAttributes.getNumberFromMarkup({
                attributes: wheel[0],
                name: "r",
              }) + 1;
          Array.from(
            { length: 73 },
            (_, index) => (index * Math.PI) / 36,
          ).forEach((angle) =>
            assert.ok(
              cy + radius * Math.sin(angle) <=
                floor(cx + radius * Math.cos(angle)) + 1e-8,
            ),
          );
        });
        if (participantMobility === "walking") {
          const body =
            markup.match(/data-participant-body[^>]*d="([^"]*)"/) ??
            markup.match(/<path d="([^"]*)" data-participant-body/);
          assert.ok(body);
          const feet = [...body[1].matchAll(/L([^ ]+) ([^ M]+)/g)];
          assert.equal(feet.length, 2);
          feet.forEach((foot) =>
            assert.ok(
              Math.abs(Number(foot[2]) - floor(Number(foot[1]))) < 1e-8,
            ),
          );
        }
      });
    }),
  );
});
