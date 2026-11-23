import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProportionalSymbolArea } from "../../ProportionalSymbolArea";
import { DEFAULT_INPUT } from "../../ProportionalSymbolArea.fixtures";
import { type Input } from "../../ProportionalSymbolArea.schema";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string => {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(ProportionalSymbolArea, {
        frame,
        input,
        accent: "#72d5bd",
        id: "packet28",
      }),
    ),
  );
};

function _marks({ markup, name }: { markup: string; name: string }): string[] {
  return [
    ...markup.matchAll(new RegExp(`<[^>]*data-${name}="[^"]*"[^>]*>`, "g")),
  ].map((match) => {
    return match[0];
  });
}

function _attribute({
  markup,
  name,
}: {
  markup: string;
  name: string;
}): string {
  const result = markup.match(new RegExp(` ${name}="([^"]*)"`));
  assert.ok(result, `Missing ${name} in ${markup}`);
  return result[1];
}

function _number({ markup, name }: { markup: string; name: string }): number {
  return Number(_attribute({ markup, name }));
}

const getVisibleTexts = ({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] => {
  return [
    ...Object.values(input.copy),
    ...input.sites.flatMap((site, index) => {
      return [
        `${index + 1} · ${site.label}`,
        `${site.value} ${input.unitLabel}`,
      ];
    }),
    `1 ${input.unitLabel} = ${input.areaPerUnit} px²`,
  ];
};
/** Shared authored fixtures and renderers for this preset's assertions. */
export const ProportionalSymbolAreaTestState = {
  render,
  marks: _marks,
  attribute: _attribute,
  number: _number,
  getVisibleTexts,
};
