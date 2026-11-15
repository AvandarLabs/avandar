import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { FictionalConflictGlobe } from "./FictionalConflictGlobe";
import { fictionalConflictGlobeContract } from "./FictionalConflictGlobe.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  changedInput,
  invalidInputs,
} from "./FictionalConflictGlobe.fixtures";
import { inputSchema, type Input } from "./FictionalConflictGlobe.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(FictionalConflictGlobe, {
        frame,
        input,
        accent: "#9fefca",
        id: "test",
      }),
    ),
  );
}
function _attributes({
  markup,
  attribute,
  value,
}: {
  markup: string;
  attribute: string;
  value: string;
}): string {
  const element = markup
    .match(/<[^>]+>/g)
    ?.find((tag) => tag.includes(`${attribute}="${value}"`));
  assert.ok(element, `${attribute}=${value}`);
  return element;
}
test("invalid authored inputs reject before rendering", () => {
  invalidInputs.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
});
test("surface coordinates obey front-back occlusion while authored incident totals stay fixed", () => {
  const input = fixtures[2].input;
  const after = _render({ frame: 150, input: input });
  const marker = _attributes({
    markup: after,
    attribute: "data-incident-id",
    value: "front 空",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: marker, name: "data-x" }),
    390,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: marker, name: "data-y" }),
    285,
  );
  assert.ok(!after.includes('data-incident-id="rear"'));
  assert.ok(after.includes('data-incident-id="coincident"'));
  [24, 72, 150].forEach((frame) =>
    assert.ok(
      _render({ frame: frame, input: input }).includes(
        'data-total-incidents="4"',
      ),
    ),
  );
  const across = _render({ frame: 76, input: changedInput });
  const longitude = SvgAttributes.getNumberFromMarkup({
    attributes: _attributes({
      markup: across,
      attribute: "data-globe",
      value: "world",
    }),
    name: "data-longitude",
  });
  assert.ok(longitude > 160 && longitude < 200);
  assert.ok(!across.includes('data-incident-id="rear"'));
  assert.ok(
    !_render({ frame: 150, input: fixtures[4].input }).includes(
      "data-graticule=",
    ),
  );
  assert.ok(
    !_render({ frame: 150, input: fixtures[4].input }).includes(
      "data-incident-label=",
    ),
  );
});

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    input.markerMeaning,
    input.scenarioCaption,
    ...(input.showLabels ? input.incidents.map(prop("label")) : []),
  ];
}
const ASSERTIONS = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: fictionalConflictGlobeContract,
  render: _render,
  excludedTextFields: ["id", "householdId", "slotId", "emphasis", "view"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(ASSERTIONS);
registerStockTextLayoutAssertions(ASSERTIONS);

test("actual X paths project authored latitude and longitude without spreading coincident incidents", () => {
  const markup = _render({ frame: 150, input: DEFAULT_INPUT });
  const incident = DEFAULT_INPUT.incidents[0];
  const x =
    390 +
    195 * Math.cos((24 * Math.PI) / 180) * Math.sin((-73 * Math.PI) / 180);
  const y = 285 - 195 * Math.sin((24 * Math.PI) / 180);
  const cross = _attributes({
    markup,
    attribute: "data-incident-cross",
    value: incident.id,
  });
  assert.ok(cross.includes(`M${x - 7} ${y - 7} L${x + 7} ${y + 7}`));
  const coincident = inputSchema.parse({
    ...DEFAULT_INPUT,
    incidents: [0, 1, 2, 3].map((index) => ({
      id: String(index),
      label: `Situation ${index}`,
      latitude: 0,
      longitude: 85,
    })),
  });
  const coincidentMarkup = _render({ frame: 150, input: coincident });
  assert.equal(
    (coincidentMarkup.match(/data-incident-cross=/g) ?? []).length,
    4,
  );
  assert.equal(
    (coincidentMarkup.match(/data-incident-label=/g) ?? []).length,
    4,
  );
  coincident.incidents.forEach(({ id }) =>
    assert.ok(
      _attributes({
        markup: coincidentMarkup,
        attribute: "data-incident-cross",
        value: id,
      }).includes('d="M383 278 L397 292 M397 278 L383 292"'),
    ),
  );
  assert.equal((coincidentMarkup.match(/data-leader=/g) ?? []).length, 4);
});

test("serialized contract exposes incident identity validation", () => {
  const rules = JSON.parse(
    JSON.stringify(fictionalConflictGlobeContract.semanticRules),
  ) as typeof fictionalConflictGlobeContract.semanticRules;
  const paths = ["incidents.*.id"];
  const rule = rules.find(
    (candidate) =>
      candidate.paths.length === paths.length &&
      paths.every((path) => candidate.paths.includes(path)),
  );
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /unique/i);
});

test("serialized contract exposes shortest sweep validation", () => {
  const rules = JSON.parse(
    JSON.stringify(fictionalConflictGlobeContract.semanticRules),
  ) as typeof fictionalConflictGlobeContract.semanticRules;
  const paths = ["longitudeSweep.start", "longitudeSweep.end"];
  const rule = rules.find(
    (candidate) =>
      candidate.paths.length === paths.length &&
      paths.every((path) => candidate.paths.includes(path)),
  );
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /shortest.*40.*160.*inclusive/i);
});

test("serialized contract exposes endpoint visibility validation", () => {
  const rules = JSON.parse(
    JSON.stringify(fictionalConflictGlobeContract.semanticRules),
  ) as typeof fictionalConflictGlobeContract.semanticRules;
  const paths = [
    "incidents.*.latitude",
    "incidents.*.longitude",
    "longitudeSweep.end",
  ];
  const rule = rules.find(
    (candidate) =>
      candidate.paths.length === paths.length &&
      paths.every((path) => candidate.paths.includes(path)),
  );
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(
    rule.description,
    /at least one.*front-facing.*endpoint.*center latitude 0/i,
  );
});

test("continuous incident leaders bend clear of unrelated geographic crosses", async () => {
  const { fictionalConflictGlobeContract: correctionContract } =
    await import("./FictionalConflictGlobe.contract");
  [
    correctionContract.defaultInput,
    correctionContract.fixtures.find(propEq("id", "dense"))!.input,
  ].forEach((input) =>
    [90, 150].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const marks = [
        ...markup.matchAll(
          /data-incident-id="([^"]*)" data-x="([^"]*)" data-y="([^"]*)"/g,
        ),
      ];
      const leaders = [
        ...markup.matchAll(/data-leader="([^"]*)" d="([^"]*)"/g),
      ];
      leaders.forEach(([, id, leader]) => {
        assert.equal(
          (leader.match(/M/g) ?? []).length,
          1,
          "A continuous bend replaces collinear marker gaps",
        );
        const points = [...leader.matchAll(/[ML]([\d.e+-]+) ([\d.e+-]+)/g)].map(
          ([, x, y]) => [Number(x), Number(y)],
        );
        assert.ok(points.length >= 2);
        points.slice(1).forEach(([endX, endY], index) =>
          marks
            .filter(([, other]) => other !== id)
            .forEach(([, , markerX, markerY]) => {
              const [startX, startY] = points[index],
                deltaX = endX - startX,
                deltaY = endY - startY;
              const progress = Math.max(
                0,
                Math.min(
                  1,
                  ((Number(markerX) - startX) * deltaX +
                    (Number(markerY) - startY) * deltaY) /
                    (deltaX ** 2 + deltaY ** 2),
                ),
              );
              const own = marks.find((mark) => mark[1] === id)!;
              if (own[2] !== markerX || own[3] !== markerY) {
                assert.ok(
                  Math.hypot(
                    Number(markerX) - startX - progress * deltaX,
                    Number(markerY) - startY - progress * deltaY,
                  ) >= 14,
                  "The actual continuous leader clears every unrelated X footprint",
                );
              }
            }),
        );
      });
    }),
  );
});
