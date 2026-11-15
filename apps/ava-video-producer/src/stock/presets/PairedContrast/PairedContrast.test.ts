import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PairedContrast } from "./PairedContrast";
import { pairedContrastContract } from "./PairedContrast.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./PairedContrast.fixtures";
import { inputSchema } from "./PairedContrast.schema";
/** Inputs for render. */
type RenderInput = {
  question: string;
  alternatives: Array<{ id: string; label: string }>;
  criteria: Array<{
    id: string;
    label: string;
    leftText: string;
    rightText: string;
  }>;
  focusCriterionId: string;
  comparisonLabel: string;
  showPairBrackets: boolean;
};

function _render({
  frame,
  input = DEFAULT_INPUT,
}: {
  frame: number;
  input?: RenderInput;
}): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(PairedContrast, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}

test("the focused criterion receives the comparison band while every pair remains visible", () => {
  const changed = { ...DEFAULT_INPUT, focusCriterionId: "reader" };
  Array.from([DEFAULT_INPUT, changed]).forEach((input) => {
    const markup = _render({ frame: 150, input });
    assert.match(
      markup,
      new RegExp(`data-comparison-band="${input.focusCriterionId}"`),
    );
    assert.equal((markup.match(/data-comparison-band=/g) ?? []).length, 1);
    input.alternatives.forEach(({ label }) =>
      assert.ok(markup.includes(label)),
    );
    input.criteria.forEach(({ id, label, leftText, rightText }) => {
      assert.ok(markup.includes(`data-criterion="${id}"`));
      [label, leftText, rightText].forEach((text) =>
        assert.ok(markup.includes(text)),
      );
    });
  });
  assert.notEqual(
    _render({ frame: 150 }),
    _render({ frame: 150, input: changed }),
  );
});

test("pair brackets toggle independently of the complete comparison", () => {
  assert.equal(
    (_render({ frame: 150 }).match(/data-pair-bracket=/g) ?? []).length,
    DEFAULT_INPUT.criteria.length,
  );
  const hidden = _render({
    frame: 150,
    input: { ...DEFAULT_INPUT, showPairBrackets: false },
  });
  assert.doesNotMatch(hidden, /data-pair-bracket=/);
  assert.match(hidden, /One self-check/);
});

test("complete default, minimum, dense and changed fixtures retain their text across backward seeks", () => {
  assert.deepEqual(fixtures.map(prop("id")), [
    "default",
    "minimum",
    "dense",
    "changed",
  ]);
  fixtures.forEach(({ input }) => {
    assert.deepEqual(inputSchema.parse(input), input);
    const frames = [0, 36, 90, 150, 179];
    const samples = frames.map((frame) => _render({ frame, input }));
    [...frames]
      .reverse()
      .forEach((frame) =>
        assert.equal(_render({ frame, input }), samples[frames.indexOf(frame)]),
      );
    const markup = _render({ frame: 150, input });
    [
      input.question,
      ...input.criteria.flatMap((row) => [
        row.label,
        row.leftText,
        row.rightText,
      ]),
    ].forEach((text) =>
      assert.ok(markup.includes(`aria-label="${text}"`), text),
    );
  });
});

test("strict input rejects missing content, extra keys, duplicate IDs and absent focus references", () => {
  invalidInputs.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
  assert.equal(inputSchema.safeParse({}).success, false);
  assert.equal(
    inputSchema.safeParse({ ...DEFAULT_INPUT, question: "Q".repeat(61) })
      .success,
    false,
  );
});

test("the public contract carries complete editable content and a valid binding", () => {
  assert.deepEqual(pairedContrastContract.defaultInput, DEFAULT_INPUT);
  pairedContrastContract.bindingExamples.forEach(({ input }) =>
    assert.equal(inputSchema.safeParse(input).success, true),
  );
  assert.equal(pairedContrastContract.jsonSchema.additionalProperties, false);
  assert.deepEqual(
    pairedContrastContract.controls.map(prop("path")),
    Object.keys(DEFAULT_INPUT),
  );
});

test("accepted spaced words and hard breaks retain every label without overflowing", async () => {
  const { textRegressionInputs } = await import("./PairedContrast.fixtures");
  textRegressionInputs.forEach(({ id, input, text }) => {
    assert.deepEqual(inputSchema.parse(input), input, id);
    const markup = _render({ frame: 150, input });
    assert.ok(markup.includes(`aria-label="${text}"`), id);
    text
      .split(/\s+/)
      .forEach((word) =>
        assert.ok(
          markup.includes(`>${word}</tspan>`) ||
            markup.includes(`>${word} `) ||
            markup.includes(` ${word}<`) ||
            markup.includes(` ${word} `),
          `${id}: ${word}`,
        ),
      );
  });
});

function _getSegmentsFromBracket(path: string): number[][] {
  const tokens = path.match(/[MmHhVv]|-?\d+(?:\.\d+)?/g) ?? [];
  const segments: number[][] = [];
  let x = 0;
  let y = 0;
  let index = 0;
  tokens.forEach((_, tokenIndex) => {
    if (tokenIndex !== index) {
      return;
    }
    const command = tokens[index++];
    const value = Number(tokens[index++]);
    const previousX = x;
    const previousY = y;
    if (command.toUpperCase() === "M") {
      x = command === "m" ? x + value : value;
      y = Number(tokens[index++]) + (command === "m" ? y : 0);
    } else {
      if (command.toUpperCase() === "H") {
        x = command === "h" ? x + value : value;
      } else y = command === "v" ? y + value : value;
      segments.push([previousX, previousY, x, y]);
    }
  });
  return segments;
}

test("paired bracket strokes clear the full criterion text area including four-line labels", async () => {
  const { textRegressionInputs } = await import("./PairedContrast.fixtures");
  [DEFAULT_INPUT, fixtures[2].input, textRegressionInputs[2].input].forEach(
    (input) => {
      const markup = _render({ frame: 150, input });
      const labels = [
        ...markup.matchAll(
          /<text\b[^>]*x="480" y="([^"]+)"[^>]*font-size="14"[^>]*>(.*?)<\/text>/g,
        ),
      ];
      const brackets = [
        ...markup.matchAll(/data-pair-bracket="[^"]+"><path d="([^"]+)"/g),
      ];
      assert.equal(brackets.length, input.criteria.length);
      brackets.forEach((bracket, index) => {
        const top = Number(labels[index][1]) - 14;
        const bottom =
          Number(labels[index][1]) +
          ((labels[index][2].match(/<tspan/g) ?? []).length - 1) * 18.2 +
          4;
        _getSegmentsFromBracket(bracket[1]).forEach(([x1, y1, x2, y2]) =>
          assert.ok(
            Math.max(x1, x2) < 408 ||
              Math.min(x1, x2) > 552 ||
              Math.max(y1, y2) < top ||
              Math.min(y1, y2) > bottom,
            bracket[1],
          ),
        );
      });
    },
  );
});

test("a short criterion attribute prefix shares lines with both oversized authored tokens", () => {
  const text = [1, 15, 15].map((length) => "界".repeat(length)).join(" ");
  const input = {
    ...DEFAULT_INPUT,
    criteria: [
      { ...DEFAULT_INPUT.criteria[0], leftText: text },
      DEFAULT_INPUT.criteria[1],
    ],
  };
  assert.deepEqual(inputSchema.parse(input), input);
  const markup = _render({ frame: 150, input });
  assert.ok(markup.includes(`aria-label="${text}"`));
  const copy = markup.match(
    new RegExp(`<text[^>]*aria-label="${text}"[^>]*>(.*?)</text>`),
  );
  assert.ok(copy);
  assert.ok((copy[1].match(/<tspan/g) ?? []).length <= 4);
});
