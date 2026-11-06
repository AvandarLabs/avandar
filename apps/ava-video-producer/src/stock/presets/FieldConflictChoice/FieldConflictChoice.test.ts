import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { FieldConflictChoice } from "./FieldConflictChoice";
import { fieldConflictChoiceContract as contract } from "./FieldConflictChoice.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./FieldConflictChoice.fixtures";
import { inputSchema, type Input } from "./FieldConflictChoice.schema";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string =>
  renderToStaticMarkup(
    createElement(FieldConflictChoice, {
      frame,
      input,
      accent: "#72d5bd",
      id: "test",
    }),
  );
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: ["id", "sourceId", "chosenSourceId", "decisionStyle"],
  textFrames: [36, 150],
  getVisibleTexts: ({ input, frame }) => [
    input.recordTitle,
    ...input.fields.flatMap((field) => [
      field.label,
      ...field.candidates
        .filter(
          (candidate) =>
            frame < 112 ||
            field.chosenSourceId === null ||
            input.showRetainedAlternatives ||
            candidate.sourceId === field.chosenSourceId,
        )
        .map(prop("value")),
    ]),
  ],
});
function _cells(markup: string) {
  return [
    ...markup.matchAll(/<rect[^>]*data-candidate-source="[^"]*"[^>]*>/g),
  ].map((match) => match[0]);
}
function _texts({ markup, label }: { markup: string; label: string }) {
  return [...markup.matchAll(/<text\b[^>]*>/g)]
    .map((match) => match[0])
    .filter((text) => text.includes(`aria-label="${label}"`));
}
function _chosenCell({
  markup,
  input,
  fieldIndex,
}: {
  markup: string;
  input: Input;
  fieldIndex: number;
}) {
  const field = input.fields[fieldIndex];
  const cell = _cells(markup).find(
    (candidate) =>
      candidate.includes(`data-field="${field.id}"`) &&
      candidate.includes(`data-candidate-source="${field.chosenSourceId}"`),
  );
  assert.ok(cell);
  return cell;
}
function _assertChoiceMarks({
  markup,
  input,
}: {
  markup: string;
  input: Input;
}) {
  const marks = [...markup.matchAll(/<path[^>]*data-choice-[^>]*>/g)];
  assert.equal(marks.length, input.fields.length);
  marks.forEach(([mark], fieldIndex) => {
    const panel = _chosenCell({ markup, input, fieldIndex });
    const path = mark.match(/d="M([\d.-]+) ([\d.-]+)([^"]+)"/);
    assert.ok(path);
    const x = SvgAttributes.getNumberFromMarkup({
      attributes: panel,
      name: "x",
    });
    const top = SvgAttributes.getNumberFromMarkup({
      attributes: panel,
      name: "y",
    });
    const isRail = input.decisionStyle === "sliding-rail";
    assert.equal(Number(path[1]), x + (isRail ? 0 : 2));
    assert.equal(Number(path[2]), top - 5);
    assert.equal(path[3], isRail ? `H${x + 416}` : "h-8v76h8");
  });
}
Array.from(["sliding-rail", "selection-bracket"] as const).forEach(
  (decisionStyle) => {
    test(`${decisionStyle} stays attached to either chosen panel throughout travel`, () => {
      [DEFAULT_INPUT, fixtures[1].input].forEach((seed) =>
        seed.sources.forEach((source) =>
          [true, false].forEach((showRetainedAlternatives) => {
            const input = {
              ...seed,
              decisionStyle,
              showRetainedAlternatives,
              fields: seed.fields.map((field) => ({
                ...field,
                chosenSourceId: source.id,
              })),
            };
            [60, 77, 100, 112, 150].forEach((frame) =>
              _assertChoiceMarks({
                markup: render({ frame: frame, input: input }),
                input,
              }),
            );
          }),
        ),
      );
    });
  },
);
test("selected captions follow either chosen panel below its content with separate field rows", () => {
  fixtures[2].input.sources.forEach((source) =>
    [true, false].forEach((showRetainedAlternatives) => {
      const input = {
        ...fixtures[2].input,
        showRetainedAlternatives,
        labels: { ...DEFAULT_INPUT.labels, selected: "界".repeat(28) },
        fields: fixtures[2].input.fields.map((field) => ({
          ...field,
          chosenSourceId: source.id,
        })),
      };
      [60, 77, 100, 112, 150].forEach((frame) => {
        const markup = render({ frame: frame, input: input });
        const captions = _texts({ markup, label: input.labels.selected });
        assert.equal(captions.length, input.fields.length);
        captions.forEach((caption, index) => {
          const panel = _chosenCell({ markup, input, fieldIndex: index });
          assert.equal(
            SvgAttributes.getNumberFromMarkup({
              attributes: caption,
              name: "x",
            }),
            SvgAttributes.getNumberFromMarkup({
              attributes: panel,
              name: "x",
            }) + 12,
          );
          const baseline = SvgAttributes.getNumberFromMarkup({
            attributes: caption,
            name: "y",
          });
          assert.equal(
            baseline,
            SvgAttributes.getNumberFromMarkup({
              attributes: panel,
              name: "y",
            }) + 81,
          );
          assert.ok(baseline + 4 <= 600);
          if (index + 1 < input.fields.length) {
            const heading = _texts({
              markup,
              label: input.fields[index + 1].label,
            })[index + 1];
            assert.ok(
              baseline + 4 <
                SvgAttributes.getNumberFromMarkup({
                  attributes: heading,
                  name: "y",
                }) -
                  14,
            );
          }
        });
      });
    }),
  );
});
test("unresolved status spans the open pair without a chosen result caption", () => {
  const input = {
    ...DEFAULT_INPUT,
    fields: DEFAULT_INPUT.fields.map((field) => ({
      ...field,
      chosenSourceId: null,
    })),
  };
  const markup = render({ frame: 150, input: input });
  assert.equal(_texts({ markup, label: input.labels.selected }).length, 0);
  _texts({ markup, label: input.labels.unresolved }).forEach((caption) => {
    const x = SvgAttributes.getNumberFromMarkup({
      attributes: caption,
      name: "x",
    });
    assert.ok(x < 460 && x + 416 > 500);
  });
  assert.equal((markup.match(/data-review-field=/g) ?? []).length, 2);
});
test("moving decision marks leave clear space below the field names", () => {
  const input = {
    ...fixtures[2].input,
    fields: fixtures[2].input.fields.map((field, index) => ({
      ...field,
      label: `${"W".repeat(21)}${index}`,
      chosenSourceId: DEFAULT_INPUT.sources[index % 2].id,
    })),
  };
  [60, 77, 100, 112].forEach((frame) => {
    const markup = render({ frame: frame, input: input });
    const marks = [...markup.matchAll(/<path[^>]*data-choice-[^>]*>/g)];
    input.fields.forEach((field, index) => {
      const heading = _texts({ markup, label: field.label })[0];
      const path = marks[index][0].match(/d="M[\d.-]+ ([\d.-]+)/);
      assert.ok(path);
      assert.ok(
        Number(path[1]) >=
          SvgAttributes.getNumberFromMarkup({
            attributes: heading,
            name: "y",
          }) +
            6,
      );
    });
  });
});
test("only explicit selected source values enter result while unresolved alternatives stay open", () => {
  const output = render({ frame: 150 });
  assert.match(
    output,
    /data-result-field="name" data-result-value="Label rolls"/,
  );
  assert.doesNotMatch(output, /data-result-field="location"/);
  assert.equal((output.match(/data-review-field="location"/g) ?? []).length, 1);
  assert.match(output, /aria-label="Bay A"/);
  assert.match(output, /aria-label="Bay C"/);
  const hidden = render({ frame: 150, input: fixtures[3].input });
  assert.match(hidden, /data-result-field="name" data-result-value="Labels"/);
  assert.doesNotMatch(hidden, /aria-label="Label rolls"/);
  assert.match(
    render({ frame: 150, input: fixtures[1].input }),
    /data-result-field="" data-result-value=""/,
  );
});
test("source choices move horizontally into the result lane and retain source identity", () => {
  const input = {
    ...DEFAULT_INPUT,
    fields: DEFAULT_INPUT.fields.map((field) => ({
      ...field,
      chosenSourceId: "notes",
    })),
  };
  const start = _cells(render({ frame: 36, input: input })),
    hold = _cells(render({ frame: 150, input: input }));
  assert.equal(start.length, 4);
  assert.equal(hold.length, 4);
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: start[1], name: "x" }) >
      SvgAttributes.getNumberFromMarkup({ attributes: start[0], name: "x" }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: hold[1], name: "x" }) <
      SvgAttributes.getNumberFromMarkup({ attributes: hold[0], name: "x" }),
  );
  assert.match(render({ frame: 72, input: input }), /data-choice-rail=/);
  assert.match(
    render({
      frame: 150,
      input: { ...input, decisionStyle: "selection-bracket" },
    }),
    /data-choice-bracket=/,
  );
});
test("all dense data lanes stay on canvas and settle into separate bounded rows", () => {
  [36, 42, 66, 90, 112, 150].forEach((frame) => {
    const output = render({ frame: frame, input: fixtures[2].input });
    const rects = _cells(output);
    assert.equal(rects.length, 8);
    rects.forEach((rect) => {
      const x = SvgAttributes.getNumberFromMarkup({
          attributes: rect,
          name: "x",
        }),
        y = SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "y" });
      assert.ok(
        x >= 0 &&
          x +
            SvgAttributes.getNumberFromMarkup({
              attributes: rect,
              name: "width",
            }) <=
            960,
      );
      assert.ok(
        y >= 0 &&
          y +
            SvgAttributes.getNumberFromMarkup({
              attributes: rect,
              name: "height",
            }) <=
            600,
      );
    });
    if (frame === 150) {
      [0, 2, 4].forEach((index) =>
        assert.ok(
          SvgAttributes.getNumberFromMarkup({
            attributes: rects[index],
            name: "y",
          }) +
            SvgAttributes.getNumberFromMarkup({
              attributes: rects[index],
              name: "height",
            }) <
            SvgAttributes.getNumberFromMarkup({
              attributes: rects[index + 2],
              name: "y",
            }),
        ),
      );
    }
  });
});

test("conflict decisions preserve maximum whitespace values and reject duplicate empty references", () => {
  const value = `${" \t\n\r".repeat(6)}  `;
  const input = {
    ...fixtures[1].input,
    fields: fixtures[1].input.fields.map((field) => ({
      ...field,
      candidates: field.candidates.map((candidate) => ({
        ...candidate,
        value,
      })),
    })),
  };
  const markup = render({ frame: 150, input: input });
  assert.ok(markup.includes(`data-result-value="${value}"`));
  assert.ok(markup.includes(`aria-label="${value}"`));
  assert.equal(
    inputSchema.safeParse({
      ...input,
      sources: [input.sources[0], input.sources[0]],
    }).success,
    false,
  );
  assert.equal(
    inputSchema.safeParse({
      ...input,
      fields: [{ ...input.fields[0], extra: true }, input.fields[1]],
    }).success,
    false,
  );
});
