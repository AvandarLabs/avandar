/** Physical choreography and authored-contract regression assertions. */
import assert from "node:assert/strict";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { getConservativeWidthFromText } from "../../../text/getConservativeWidthFromText";
import { SharedWorkshopBooking } from "../SharedWorkshopBooking";
import { defaultInput } from "../SharedWorkshopBooking.fixtures";
import { type Input } from "../SharedWorkshopBooking.schema";

function _render({
  frame,
  input = defaultInput,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(SharedWorkshopBooking, {
      frame,
      input,
      accent: "#67e8c2",
      id: "packet20",
    }),
  );
}

function _visible({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.machine.label,
    input.labels.example,
    input.labels.requested,
    input.labels.agreed,
    ...input.timeSlots.map(prop("label")),
    ...input.requests.map(prop("participant")),
    ...(input.requests.some(propEq("agreedSlotId", null))
      ? [input.labels.unresolved]
      : []),
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

const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "kind",
  "requestedSlotId",
  "agreedSlotId",
];

type Bounds = { left: number; top: number; right: number; bottom: number };

function _assertClear({
  first,
  second,
  context,
}: {
  first: Bounds;
  second: Bounds;
  context: string;
}): void {
  assert.ok(
    first.right + 2 <= second.left ||
      second.right + 2 <= first.left ||
      first.bottom + 2 <= second.top ||
      second.bottom + 2 <= first.top,
    `${context}: ${JSON.stringify(first)} intersects ${JSON.stringify(second)}`,
  );
}

function _textBounds(text: string): Bounds[] {
  const fontSize = SvgAttributes.getNumberFromMarkup({
    attributes: text,
    name: "font-size",
  });
  let baseline = SvgAttributes.getNumberFromMarkup({
    attributes: text,
    name: "y",
  });
  return [...text.matchAll(/<tspan([^>]*)>([^<]*)<\/tspan>/g)].map(
    ([, attributes, words]) => {
      baseline += SvgAttributes.getNumberFromMarkup({ attributes, name: "dy" });
      const left = SvgAttributes.getNumberFromMarkup({ attributes, name: "x" });
      return {
        left,
        top: baseline - fontSize,
        bottom: baseline + fontSize * 0.3,
        right: left + getConservativeWidthFromText({ text: words, fontSize }),
      };
    },
  );
}

function _rectBounds(rect: string): Bounds {
  const left = SvgAttributes.getNumberFromMarkup({
    attributes: rect,
    name: "x",
  });
  const top = SvgAttributes.getNumberFromMarkup({
    attributes: rect,
    name: "y",
  });
  return {
    left: left - 1,
    top: top - 1,
    right:
      left +
      SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "width" }) +
      1,
    bottom:
      top +
      SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "height" }) +
      1,
  };
}

function _lineBounds(line: string): Bounds {
  const xCoordinates = [
    SvgAttributes.getNumberFromMarkup({ attributes: line, name: "x1" }),
    SvgAttributes.getNumberFromMarkup({ attributes: line, name: "x2" }),
  ];
  const yCoordinates = [
    SvgAttributes.getNumberFromMarkup({ attributes: line, name: "y1" }),
    SvgAttributes.getNumberFromMarkup({ attributes: line, name: "y2" }),
  ];
  return {
    left: Math.min(...xCoordinates) - 1.5,
    right: Math.max(...xCoordinates) + 1.5,
    top: Math.min(...yCoordinates) - 1.5,
    bottom: Math.max(...yCoordinates) + 1.5,
  };
}

/** Inputs for pathBounds. */
type PathBoundsOptions = {
  path: string;
  x: number;
  y: number;
  padding?: number;
};

function _pathBounds({
  path,
  x,
  y,
  padding = 1.25,
}: PathBoundsOptions): Bounds {
  const points: Array<{ x: number; y: number }> = [];
  let point = { x: 0, y: 0 };
  const commands = path.match(/d="([^"]*)"/)![1];
  Array.from(commands.matchAll(/([MLHV])([^MLHV]+)/g)).forEach(
    ([, command, coordinates]) => {
      const values = coordinates
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      point =
        command === "H"
          ? { ...point, x: values[0] }
          : command === "V"
            ? { ...point, y: values[0] }
            : { x: values[0], y: values[1] };
      points.push(point);
    },
  );
  assert.ok(points.length > 0, "actual person path has points");
  return {
    left: x + Math.min(...points.map(prop("x"))) - padding,
    right: x + Math.max(...points.map(prop("x"))) + padding,
    top: y + Math.min(...points.map(prop("y"))) - padding,
    bottom: y + Math.max(...points.map(prop("y"))) + padding,
  };
}

function _actorBounds(markup: string): Bounds[] {
  return [
    ...markup.matchAll(
      /<g data-participant="[^"]*"><g transform="translate\(([^ ]+) ([^)]+)\) scale\(([^)]+)\)"[^>]*>(.*?)<\/g>/g,
    ),
  ].flatMap(([, xText, yText, scale, actor]) => {
    assert.equal(Number(scale), 1, "actor bounds use emitted unit scale");
    const x = Number(xText);
    const y = Number(yText);
    const head = actor.match(/<circle[^>]*>/)![0];
    const radius =
      SvgAttributes.getNumberFromMarkup({ attributes: head, name: "r" }) + 1.25;
    const cx =
      x + SvgAttributes.getNumberFromMarkup({ attributes: head, name: "cx" });
    const cy =
      y + SvgAttributes.getNumberFromMarkup({ attributes: head, name: "cy" });
    return [
      {
        left: cx - radius,
        right: cx + radius,
        top: cy - radius,
        bottom: cy + radius,
      },
      _pathBounds({ path: actor.match(/<path[^>]*>/)![0], x, y }),
    ];
  });
}

function _assertAgreementClearance({
  input,
  frame,
}: {
  input: Input;
  frame: number;
}): void {
  const markup = _render({ frame: frame, input: input });
  const texts = [...markup.matchAll(/<text[^>]*>.*?<\/text>/g)].map(
    ([text]) => text,
  );
  const caption = texts.find((text) =>
    text.includes(`aria-label="${_escape(input.labels.agreed)}"`),
  );
  assert.ok(caption, "the complete authored agreement caption is present");
  const obstacles = [
    ...[
      ...markup.matchAll(/<rect data-(?:original-)?request="[^"]*"[^>]*>/g),
    ].map(([rect]) => _rectBounds(rect)),
    ...[...markup.matchAll(/<line data-request-hand="[^"]*"[^>]*>/g)].map(
      ([line]) => _lineBounds(line),
    ),
    ..._actorBounds(markup),
    ...texts.filter((text) => text !== caption).flatMap(_textBounds),
    ...[
      ...markup
        .slice(markup.indexOf("<g data-machine="))
        .split("</g>")[0]
        .matchAll(/<path[^>]*>/g),
    ].map(([path]) => _pathBounds({ path, x: 0, y: 0, padding: 2.5 })),
  ];
  assert.equal(_actorBounds(markup).length, input.requests.length * 2);
  _textBounds(caption).forEach((line) =>
    obstacles.forEach((obstacle) =>
      _assertClear({
        first: line,
        second: obstacle,
        context: `agreement at frame ${frame}`,
      }),
    ),
  );
}
export {
  _render,
  _visible,
  _escape,
  EXCLUDED_TEXT_FIELDS,
  _assertClear,
  _textBounds,
  _rectBounds,
  _lineBounds,
  _pathBounds,
  _actorBounds,
  _assertAgreementClearance,
};
export type { Bounds, PathBoundsOptions };
