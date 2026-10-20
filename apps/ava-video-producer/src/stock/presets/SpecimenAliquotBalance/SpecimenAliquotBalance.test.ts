import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";
import { SpecimenAliquotBalance } from "./SpecimenAliquotBalance";
import { specimenAliquotBalanceContract } from "./SpecimenAliquotBalance.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  changedInput,
  invalidInputs,
} from "./SpecimenAliquotBalance.fixtures";
import { inputSchema, type Input } from "./SpecimenAliquotBalance.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(SpecimenAliquotBalance, {
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
test("transferred liquid reduces the parent and preserves every child's lineage", () => {
  const before = _render({ frame: 30, input: DEFAULT_INPUT });
  const after = _render({ frame: 150, input: DEFAULT_INPUT });
  const parentBefore = _attributes({
    markup: before,
    attribute: "data-liquid-id",
    value: DEFAULT_INPUT.parent.id,
  });
  const parentAfter = _attributes({
    markup: after,
    attribute: "data-liquid-id",
    value: DEFAULT_INPUT.parent.id,
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: parentBefore,
      name: "height",
    }),
    54,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: parentAfter,
      name: "height",
    }),
    9,
  );
  let volume =
    SvgAttributes.getNumberFromMarkup({
      attributes: parentAfter,
      name: "height",
    }) / 9;
  DEFAULT_INPUT.aliquots.forEach((aliquot) => {
    const liquid = _attributes({
      markup: after,
      attribute: "data-liquid-id",
      value: aliquot.id,
    });
    volume +=
      SvgAttributes.getNumberFromMarkup({
        attributes: liquid,
        name: "height",
      }) / 9;
    assert.ok(liquid.includes(`data-parent-id="${DEFAULT_INPUT.parent.id}"`));
  });
  assert.equal(volume, DEFAULT_INPUT.parent.volume);
  const exhausted = _render({ frame: 150, input: changedInput });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _attributes({
        markup: exhausted,
        attribute: "data-liquid-id",
        value: changedInput.parent.id,
      }),
      name: "height",
    }),
    0,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _attributes({
        markup: exhausted,
        attribute: "data-liquid-id",
        value: changedInput.aliquots[0].id,
      }),
      name: "height",
    }),
    108,
  );
});

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    input.sceneLabel,
    input.unitLabel,
    input.parent.label,
    ...input.aliquots.map(prop("label")),
    ...Object.values(input.copy),
    ...(input.showLineage
      ? [input.parent.id, ...input.aliquots.map(prop("id"))]
      : []),
  ];
}
const ASSERTIONS = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: specimenAliquotBalanceContract,
  render: _render,
  excludedTextFields: ["id", "householdId", "slotId", "emphasis", "view"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(ASSERTIONS);
registerStockTextLayoutAssertions(ASSERTIONS);

test("every intermediate fill conserves material at the common tube scale", () => {
  [DEFAULT_INPUT, fixtures[2].input, changedInput].forEach((input) => {
    [30, 36, 48, 60, 72, 84, 96, 108, 150].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const volumes = [input.parent, ...input.aliquots].map((tube) => {
        const liquid = _attributes({
          markup,
          attribute: "data-liquid-id",
          value: tube.id,
        });
        const height = SvgAttributes.getNumberFromMarkup({
          attributes: liquid,
          name: "height",
        });
        assert.ok(height >= 0);
        assert.equal(
          SvgAttributes.getNumberFromMarkup({ attributes: liquid, name: "y" }) +
            height,
          270,
        );
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: liquid,
            name: "width",
          }),
          40,
        );
        return height / 9;
      });
      assert.ok(
        Math.abs(
          volumes.reduce((total, volume) => total + volume, 0) -
            input.parent.volume,
        ) < 1e-10,
      );
    });
  });
  const noLineage = _render({ frame: 150, input: fixtures[4].input });
  assert.ok(!noLineage.includes("data-lineage="));
  assert.equal((noLineage.match(/data-liquid-id=/g) ?? []).length, 5);
});

test("the exact equality appears only after all authored aliquots are complete", () => {
  const before = _render({ frame: 60, input: fixtures[2].input });
  assert.ok(!before.includes('aria-label="12 ='));
  const after = _render({ frame: 150, input: fixtures[2].input });
  assert.ok(after.includes('aria-label="12 = 1 + 2 + 3 + 5 + 1"'));
});

function _getTextBoxes(markup: string) {
  return Array.from(
    markup.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g),
    ([, attributes, content]) => {
      const fontSize = SvgAttributes.getNumberFromMarkup({
        attributes,
        name: "font-size",
      });
      let baseline = SvgAttributes.getNumberFromMarkup({
        attributes: attributes,
        name: "y",
      });
      const anchor = attributes.match(/text-anchor="([^"]+)"/)?.[1];
      const lines = Array.from(
        content.matchAll(/<tspan([^>]*)>([^<]*)<\/tspan>/g),
        ([, span, text]) => {
          baseline += SvgAttributes.getNumberFromMarkup({
            attributes: span,
            name: "dy",
          });
          const width = getConservativeWidthFromText({ text, fontSize });
          const x = SvgAttributes.getNumberFromMarkup({
            attributes: span,
            name: "x",
          });
          const left =
            x -
            (anchor === "end" ? width : anchor === "middle" ? width / 2 : 0);
          return {
            left,
            right: left + width,
            top: baseline - fontSize,
            bottom: baseline + fontSize * 0.3,
          };
        },
      );
      return {
        content,
        left: Math.min(...lines.map(prop("left"))),
        right: Math.max(...lines.map(prop("right"))),
        top: Math.min(...lines.map(prop("top"))),
        bottom: Math.max(...lines.map(prop("bottom"))),
      };
    },
  );
}

test("dense complete tube labels and ledger text occupy separate boxes", () => {
  const boxes = _getTextBoxes(
    _render({ frame: 150, input: fixtures[2].input }),
  );
  boxes.forEach((box, index) => {
    boxes.slice(index + 1).forEach((other) => {
      assert.ok(
        box.right + 4 <= other.left ||
          other.right + 4 <= box.left ||
          box.bottom + 4 <= other.top ||
          other.bottom + 4 <= box.top,
        `Text collision: ${JSON.stringify(box)} / ${JSON.stringify(other)}`,
      );
    });
  });
});

test("serialized contract exposes tube identity validation", () => {
  const rules = JSON.parse(
    JSON.stringify(specimenAliquotBalanceContract.semanticRules),
  ) as typeof specimenAliquotBalanceContract.semanticRules;
  const paths = ["parent.id", "aliquots.*.id"];
  const rule = rules.find(
    (candidate) =>
      candidate.paths.length === paths.length &&
      paths.every((path) => candidate.paths.includes(path)),
  );
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /unique.*distinct.*parent\.id/i);
});

test("serialized contract exposes volume conservation validation", () => {
  const rules = JSON.parse(
    JSON.stringify(specimenAliquotBalanceContract.semanticRules),
  ) as typeof specimenAliquotBalanceContract.semanticRules;
  const paths = ["parent.volume", "aliquots.*.volume"];
  const rule = rules.find(
    (candidate) =>
      candidate.paths.length === paths.length &&
      paths.every((path) => candidate.paths.includes(path)),
  );
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /sum.*<=.*parent\.volume/i);
});
