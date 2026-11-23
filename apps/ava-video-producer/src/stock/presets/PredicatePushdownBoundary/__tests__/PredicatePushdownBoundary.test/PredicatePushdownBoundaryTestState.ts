import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PredicatePushdownBoundary } from "../../PredicatePushdownBoundary";
import { DEFAULT_INPUT } from "../../PredicatePushdownBoundary.fixtures";
import { type Input } from "../../PredicatePushdownBoundary.schema";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string => {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(PredicatePushdownBoundary, {
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
    input.labels.source,
    input.labels.destination,
    ...(frame >= 50 ? [input.labels.condition] : []),
    ...(frame >= 95 ? [input.labels.retained] : []),
    ...(frame >= 139 ? [input.labels.transferred] : []),
    input.metric.label,
    input.metric.unit,
  ];
};

function _accounting(markup: string): Array<{ kind: string; content: string }> {
  return [
    ...markup.matchAll(/<g data-accounting="([^"]+)"[^>]*>(.*?)<\/g><\/g>/g),
  ].map(([, kind, content]) => {
    return { kind, content };
  });
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const PredicatePushdownBoundaryTestState = {
  render,
  marks: _marks,
  attribute: _attribute,
  number: _number,
  getVisibleTexts,
  accounting: _accounting,
};
