import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SchoolTransitionRehearsal } from "../../SchoolTransitionRehearsal";
import { defaultInput } from "../../SchoolTransitionRehearsal.fixtures";
import { type Input } from "../../SchoolTransitionRehearsal.schema";

function _render({
  frame,
  input = defaultInput,
}: Readonly<{ frame: number; input?: Input }>): string {
  return _joinMarkedShapes(
    renderToStaticMarkup(
      createElement(SchoolTransitionRehearsal, {
        frame,
        input,
        accent: "#67e8c2",
        id: "packet20",
      }),
    ),
  );
}

/**
 * Rendered markup with each marked sketch-aware shape read as one element.
 * `SketchedShape` draws its plain shape inside a group that carries the
 * shape's markers (`data-*`, `aria-label`, `transform`), so the group's
 * attributes move onto the shape these assertions read.
 */
function _joinMarkedShapes(markup: string): string {
  return markup.replace(
    /<g((?:\s+(?:data-[\w-]+|aria-label|transform)="[^"]*")+)><(path|line|circle|rect|ellipse)\b([^>]*)><\/\2><\/g>/g,
    "<$2$1$3></$2>",
  );
}

function _visible({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    ...Object.values(input.people),
    ...Object.values(input.labels),
    ...input.stops.map(prop("label")),
    ...(input.showPracticeStrip ? input.stops.map(prop("actionLabel")) : []),
  ];
}

function _escape(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const EXCLUDED_TEXT_FIELDS: string[] = ["id", "kind", "finalStepSupport"];
/** Shared authored fixtures and renderers for this preset's assertions. */
export const SchoolTransitionRehearsalTestState = {
  render: _render,
  visible: _visible,
  escape: _escape,
  EXCLUDED_TEXT_FIELDS,
};
