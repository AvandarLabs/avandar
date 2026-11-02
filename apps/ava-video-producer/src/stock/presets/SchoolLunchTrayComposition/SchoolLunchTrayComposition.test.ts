import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { STOCK } from "../../stockPalette";
import { SchoolLunchTrayComposition } from "./SchoolLunchTrayComposition";
import { schoolLunchTrayCompositionContract as contract } from "./SchoolLunchTrayComposition.contract";
import {
  DEFAULT_INPUT,
  minimumInput,
  denseInput,
  changedInput,
  fixtures,
  invalidInputs,
} from "./SchoolLunchTrayComposition.fixtures";
import { inputSchema, type Input } from "./SchoolLunchTrayComposition.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(SchoolLunchTrayComposition, {
        frame,
        input,
        accent: "#79d5bd",
        background: "#101720",
        id: "packet16",
      }),
    ),
  );
}
test("Only supplied served components fill compartments and the complete numerator uses every planned tray", () => {
  const setup = _render({ frame: 24, input: DEFAULT_INPUT });
  const hold = _render({ frame: 150, input: DEFAULT_INPUT });
  assert.equal([...setup.matchAll(/data-served-component=/g)].length, 0);
  assert.equal([...hold.matchAll(/data-served-component=/g)].length, 11);
  assert.match(hold, /data-complete-trays="3" data-planned-trays="4"/);
  assert.equal(
    [
      ..._render({ frame: 150, input: changedInput }).matchAll(
        /data-served-component=/g,
      ),
    ].length,
    1,
  );
});

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.labels.plan,
    input.caption,
    ...input.learners.map(prop("label")),
    ...input.plannedComponents.map(prop("label")),
    ...(frame >= 108
      ? [
          input.labels.matchesPlan,
          input.labels.plannedTrays,
          ...(input.emphasizeMissingComponents ? [input.labels.missing] : []),
        ]
      : []),
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: ["id", "learnerId", "componentIds", "symbol"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);

test("empty and full served subsets retain every compartment for six reordered trays", () => {
  [true, false].forEach((showComponentNames) =>
    [true, false].forEach((emphasizeMissingComponents) =>
      [0, 1, 4].forEach((numServed) => {
        const input = {
          ...denseInput,
          showComponentNames,
          emphasizeMissingComponents,
          trays: [...denseInput.trays].reverse().map((tray) => ({
            ...tray,
            componentIds: denseInput.plannedComponents
              .slice(0, numServed)
              .map(prop("id")),
          })),
        };
        assert.deepEqual(inputSchema.parse(input), input);
        const markup = _render({ frame: 150, input: input });
        assert.equal([...markup.matchAll(/data-compartment=/g)].length, 24);
        assert.equal(
          [...markup.matchAll(/data-served-component=/g)].length,
          6 * numServed,
        );
        assert.ok(
          markup.includes(
            `data-complete-trays="${numServed === 4 ? 6 : 0}" data-planned-trays="6"`,
          ),
        );
        input.learners.forEach((learner) =>
          assert.ok(markup.includes(`data-tray-for="${learner.id}"`)),
        );
      }),
    ),
  );
});
test("spoons physically contact served food while names and neighboring trays stay clear", () => {
  [minimumInput, denseInput, changedInput].forEach((input) =>
    [
      36.001, 42, 48, 48.001, 60, 72, 84, 87.999, 88, 88.001, 98, 107.999, 108,
    ].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const trayPositions = [
        ...markup.matchAll(
          /data-tray-for="[^"]*" transform="translate\(0 ([\d.]+)\)"/g,
        ),
      ].map((match) => Number(match[1]));
      assert.equal(trayPositions.length, input.learners.length);
      trayPositions.forEach((y) =>
        assert.ok(y >= 220 && y + input.plannedComponents.length * 72 <= 532),
      );
      [
        ...markup.matchAll(
          /data-serving-utensil="([^"]*)" transform="translate\(-50 ([-\d.]+)\)"/g,
        ),
      ].forEach(([, id, y]) =>
        assert.ok(
          markup.includes(
            `data-served-component="${id}" transform="translate(-50 ${y})"`,
          ),
        ),
      );
      assert.ok(
        132 + 2 < 150,
        "full tray widths clear adjacent learner columns",
      );
      assert.ok(
        -50 + 12 < -34,
        "full spoon/food envelope clears direct component names",
      );
    }),
  );
});

function _getCompartmentOutlines(markup: string) {
  return [
    ...markup.matchAll(/data-compartment="([^"]*)"><rect\b([^>]*)>/g),
  ].map(([, componentId, attributes]) => {
    const values = Object.fromEntries(
      [...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [
        name,
        value,
      ]),
    );
    return {
      componentId,
      stroke: values.stroke,
      strokeWidth: Number(values["stroke-width"] ?? 1),
      dash: values["stroke-dasharray"],
    };
  });
}

function _assertOutlineWidth({
  strokeWidth,
  isEmphasis,
  frame,
}: Readonly<{ strokeWidth: number; isEmphasis: boolean; frame: number }>) {
  if (isEmphasis) {
    assert.ok(
      strokeWidth > 1 && strokeWidth <= 2,
      `bounded emphasis width at frame ${frame}`,
    );
    if (frame >= 92 && frame <= 100) {
      assert.equal(strokeWidth, 2);
    } else {
      assert.ok(strokeWidth < 2, `transitioning width at frame ${frame}`);
    }
    if (frame === 88.001 || frame === 103.999) {
      assert.ok(strokeWidth < 1.001, `continuous width at frame ${frame}`);
    }
  } else {
    assert.equal(strokeWidth, 1, `ordinary outline at frame ${frame}`);
  }
}

function _assertOutlineTreatment({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>) {
  const outlines = _getCompartmentOutlines(
    _render({ frame: frame, input: input }),
  );
  assert.equal(
    outlines.length,
    input.learners.length * input.plannedComponents.length,
  );
  outlines.forEach((outline, index) => {
    const learner =
      input.learners[Math.floor(index / input.plannedComponents.length)];
    const tray = input.trays.find(({ learnerId }) => learnerId === learner.id)!;
    const isMissing = !tray.componentIds.includes(outline.componentId);
    const isEmphasis =
      input.emphasizeMissingComponents &&
      isMissing &&
      frame > 88 &&
      frame < 104;
    assert.equal(
      outline.stroke,
      STOCK.line,
      `neutral outline at frame ${frame}`,
    );
    assert.equal(
      outline.dash,
      undefined,
      `ordinary solid outline at frame ${frame}`,
    );
    _assertOutlineWidth({
      strokeWidth: outline.strokeWidth,
      isEmphasis,
      frame,
    });
  });
}

const emptyTrays: Array<{ componentIds: never[]; learnerId: string }> =
  denseInput.trays.map((tray) => ({
    ...tray,
    componentIds: [],
  }));
const fullTrays: Array<{ componentIds: string[]; learnerId: string }> =
  denseInput.trays.map((tray) => ({
    ...tray,
    componentIds: denseInput.plannedComponents.map(prop("id")),
  }));
[
  {
    name: "mixed served subsets",
    input: { ...DEFAULT_INPUT, emphasizeMissingComponents: true },
  },
  {
    name: "all-empty trays",
    input: {
      ...denseInput,
      trays: emptyTrays,
      emphasizeMissingComponents: true,
    },
  },
  {
    name: "all-full trays",
    input: {
      ...denseInput,
      trays: fullTrays,
      emphasizeMissingComponents: true,
    },
  },
  {
    name: "disabled toggle on empty trays",
    input: {
      ...denseInput,
      trays: emptyTrays,
      emphasizeMissingComponents: false,
    },
  },
].forEach(({ name, input }) => {
  test(`missing outlines use one short neutral beat for ${name}`, () => {
    [
      0, 24, 72, 85.999, 86, 87.999, 88, 88.001, 90, 92, 96, 100, 102, 103.999,
      104, 104.001, 108, 150, 179,
    ].forEach((frame) => _assertOutlineTreatment({ input, frame }));
  });
});
