import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { getConservativeWidthFromText } from "../../../text/getConservativeWidthFromText";
import { ChartFocusEdit } from "../ChartFocusEdit";
import { DEFAULT_INPUT } from "../ChartFocusEdit.fixtures";
import { type Input } from "../ChartFocusEdit.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(ChartFocusEdit, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}

type TextBox = {
  x: number;
  y: number;
  width: number;
  top: number;
  bottom: number;
};

function _contextBox(markup: string): TextBox {
  const text = markup.match(/<text[^>]*>/)?.[0];
  assert.ok(text);
  const x = SvgAttributes.getNumberFromMarkup({ attributes: text, name: "x" }),
    y = SvgAttributes.getNumberFromMarkup({ attributes: text, name: "y" }),
    fontSize = SvgAttributes.getNumberFromMarkup({
      attributes: text,
      name: "font-size",
    });
  const lines = [...markup.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map(
    (match) => match[1],
  );
  const leading = [...markup.matchAll(/<tspan[^>]* dy="([^"]*)"/g)].reduce(
    (sum, match) => sum + Number(match[1]),
    0,
  );
  const width = Math.max(
    ...lines.map((line) =>
      getConservativeWidthFromText({ text: line, fontSize }),
    ),
  );
  return {
    x,
    y,
    width,
    top: y - fontSize,
    bottom: y + leading + fontSize * 0.3,
  };
}

function _assertDirectLabelsClear({
  markup,
  box,
}: {
  markup: string;
  box: Readonly<TextBox>;
}): void {
  [
    ...markup.matchAll(
      /<g data-category-label="[^"]*" transform="translate\(([^ ]*) ([^)]*)\)">([\s\S]*?)<\/g>/g,
    ),
  ].forEach(([, x, y, copy]) => {
    const label = _contextBox(copy),
      labelX = Number(x) + label.x,
      labelTop = Number(y) + label.top,
      labelBottom = Number(y) + label.bottom;
    assert.ok(
      box.x + box.width < labelX ||
        labelX + label.width < box.x ||
        box.bottom < labelTop ||
        labelBottom < box.top,
    );
  });
}

function _assertBarsClear({
  bars,
  box,
}: {
  bars: readonly RegExpMatchArray[];
  box: Readonly<TextBox>;
}): void {
  bars.forEach((bar) => {
    const x = SvgAttributes.getNumberFromMarkup({
        attributes: bar[0],
        name: "x",
      }),
      y = SvgAttributes.getNumberFromMarkup({ attributes: bar[0], name: "y" }),
      width = SvgAttributes.getNumberFromMarkup({
        attributes: bar[0],
        name: "width",
      }),
      height = SvgAttributes.getNumberFromMarkup({
        attributes: bar[0],
        name: "height",
      });
    assert.ok(
      box.x + box.width < x ||
        x + width < box.x ||
        box.bottom < y ||
        y + height < box.top,
    );
  });
}

function _assertContextPlacement({
  input,
  frame,
}: {
  input: Input;
  frame: number;
}): void {
  const markup = _render({ frame: frame, input: input });
  const contexts = [
    ...markup.matchAll(
      /<g data-context="([^"]*)" opacity="([^"]*)">([\s\S]*?)<\/g>/g,
    ),
  ];
  assert.equal(contexts.length, 1);
  assert.equal(contexts[0][1], input.focusId);
  assert.ok(contexts[0][3].includes(`aria-label="${input.headings.after}"`));
  const opacity = Number(contexts[0][2]);
  if (frame >= 112) {
    assert.equal(opacity, 1);
  } else if (frame === 104 && input.treatment === "both") {
    assert.equal(opacity, 0);
  } else {
    assert.ok(opacity > 0 && opacity < 1);
  }
  const box = _contextBox(contexts[0][3]);
  const bars = [...markup.matchAll(/<rect data-chart-bar="([^"]*)"[^>]*>/g)];
  const selected = bars.find((bar) => bar[1] === input.focusId)![0],
    barX = SvgAttributes.getNumberFromMarkup({
      attributes: selected,
      name: "x",
    }),
    barY = SvgAttributes.getNumberFromMarkup({
      attributes: selected,
      name: "y",
    });
  assert.equal(box.x, barX);
  assert.ok(box.bottom < barY && barY - box.bottom <= 14);
  _assertDirectLabelsClear({ markup, box });
  _assertBarsClear({ bars, box });
  assert.ok(box.top > 123 && box.bottom < 534);
}
export {
  _render,
  _contextBox,
  _assertDirectLabelsClear,
  _assertBarsClear,
  _assertContextPlacement,
};
export type { TextBox };
