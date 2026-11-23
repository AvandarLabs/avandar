import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueueRelief } from "../../QueueRelief";
import { DEFAULT_INPUT } from "../../QueueRelief.fixtures";
import { type Input } from "../../QueueRelief.schema";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string => {
  return renderToStaticMarkup(
    createElement(QueueRelief, { frame, input, accent: "#72d5bd", id: "test" }),
  );
};

function _items(markup: string) {
  return [...markup.matchAll(/<rect[^>]*data-item-id="[^"]*"[^>]*>/g)].map(
    (match) => {
      return match[0];
    },
  );
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const QueueReliefTestState = { render, items: _items };
