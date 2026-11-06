import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { getConservativeWidthFromText } from "../../../text/getConservativeWidthFromText";
import { MobileClinicRelocation } from ".././MobileClinicRelocation";
import { mobileClinicRelocationContract } from ".././MobileClinicRelocation.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from ".././MobileClinicRelocation.fixtures";
import { inputSchema, type Input } from ".././MobileClinicRelocation.schema";
import type { PresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(MobileClinicRelocation, {
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

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    input.sceneLabel,
    ...input.sites.map(({ label }) => label),
    ...input.slots.map(({ label }) => label),
    ...input.people.map(({ label }) => label),
    input.copy.map,
    input.copy.clinic,
    input.copy.people,
    input.copy.booked,
    input.copy.unbooked,
    ...(input.showSlotLedger ? [input.copy.slots, input.copy.open] : []),
  ];
}

const ASSERTIONS = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: mobileClinicRelocationContract,
  render: _render,
  excludedTextFields: ["id", "householdId", "slotId", "emphasis", "view"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;

function _getLabelLineBoxes({
  markup,
  label,
}: Readonly<{ markup: string; label: string }>) {
  const element = markup
    .match(/<text\b[^>]*>[\s\S]*?<\/text>/g)
    ?.find((text) => text.includes(`aria-label="${label}"`));
  assert.ok(element, "Complete authored label remains present.");
  const fontSize = SvgAttributes.getNumberFromMarkup({
    attributes: element,
    name: "font-size",
  });
  let baseline = SvgAttributes.getNumberFromMarkup({
    attributes: element,
    name: "y",
  });
  const lines = Array.from(element.matchAll(/<tspan([^>]*)>([^<]*)<\/tspan>/g));
  assert.equal(
    lines
      .map(([, , text]) => text)
      .join("")
      .replace(/\s/g, ""),
    label.replace(/\s/g, ""),
  );
  const boxes = lines.map(([, attributes, text]) => {
    baseline += SvgAttributes.getNumberFromMarkup({ attributes, name: "dy" });
    const x = SvgAttributes.getNumberFromMarkup({ attributes, name: "x" });
    return {
      left: x,
      right: x + getConservativeWidthFromText({ text, fontSize }),
      top: baseline - fontSize,
      bottom: baseline + fontSize * 0.3,
    };
  });
  return boxes;
}

function _getOpenVehicleEnvelope(markup: string) {
  const vehicle = _attributes({
    markup,
    attribute: "data-clinic",
    value: "vehicle",
  });
  const transform = vehicle.match(/transform="translate\(([^ ]+) ([^)]+)\)"/);
  assert.ok(transform);
  const x = Number(transform[1]);
  const y = Number(transform[2]);
  assert.ok(
    _attributes({ markup, attribute: "data-awning", value: "clinic" }).includes(
      'd="M-42 -22 H20 L30 -44 H-52 Z"',
    ),
  );
  assert.ok(markup.includes('d="M-42 -21 H23 L42 -3 V18 H-42 Z"'));
  // Open awning, body and wheels plus one pixel of stroke allowance.
  return { left: x - 53, right: x + 43, top: y - 45, bottom: y + 28 };
}

function _assertClearance({
  box,
  other,
  label,
}: {
  box: ReturnType<typeof _getOpenVehicleEnvelope>;
  other: ReturnType<typeof _getOpenVehicleEnvelope>;
  label: string;
}) {
  assert.ok(
    box.right + 6 <= other.left ||
      other.right + 6 <= box.left ||
      box.bottom + 6 <= other.top ||
      other.bottom + 6 <= box.top,
    `${label}: ${JSON.stringify(box)} intersects ${JSON.stringify(other)}`,
  );
}

function _assertSiteLabelClearance({
  input,
  markup,
}: {
  input: Input;
  markup: string;
}) {
  const envelope = _getOpenVehicleEnvelope(markup);
  const neighboringCopy = [
    input.sceneLabel,
    input.copy.map,
    input.copy.clinic,
    ...input.slots.map(({ label }) => label),
    ...input.people.map(({ label }) => label),
  ];
  input.sites.forEach(({ label }) => {
    const neighbors = [
      ...neighboringCopy,
      ...input.sites.filter((site) => site.label !== label).map(prop("label")),
    ].flatMap((text) => _getLabelLineBoxes({ markup: markup, label: text }));
    _getLabelLineBoxes({ markup: markup, label: label }).forEach((box) => {
      neighbors.forEach((other) =>
        _assertClearance({ box, other, label: "Neighboring text" }),
      );
      _assertClearance({ box, other: envelope, label: "Open clinic vehicle" });
    });
  });
}

type Point = { x: number; y: number };

function _sampleSegment({
  start,
  end,
  control,
}: {
  start: Point;
  end: Point;
  control?: Point;
}): Point[] {
  const numSteps = control
    ? 2000
    : Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) * 4);
  return Array.from({ length: numSteps }, (_, index) => {
    const progress = (index + 1) / numSteps;
    const remaining = 1 - progress;
    return control
      ? {
          x:
            remaining ** 2 * start.x +
            2 * remaining * progress * control.x +
            progress ** 2 * end.x,
          y:
            remaining ** 2 * start.y +
            2 * remaining * progress * control.y +
            progress ** 2 * end.y,
        }
      : {
          x: start.x + (end.x - start.x) * progress,
          y: start.y + (end.y - start.y) * progress,
        };
  });
}

function _getBookingSamples(path: string): Point[] {
  const geometry = path.match(/ d="([^"]+)"/)?.[1];
  assert.ok(geometry);
  let cursor = { x: 0, y: 0 };
  const samples: Point[] = [];
  Array.from(geometry.matchAll(/([A-Za-z])([^A-Za-z]*)/g)).forEach(
    ([, command, values]) => {
      const numbers = values.trim().split(/[ ,]+/).map(Number);
      assert.ok(numbers.every(Number.isFinite));
      assert.ok(
        ["M", "Q", "H", "V", "L"].includes(command),
        "Unsupported booking geometry.",
      );
      const end =
        command === "H"
          ? { x: numbers[0], y: cursor.y }
          : command === "V"
            ? { x: cursor.x, y: numbers[0] }
            : { x: numbers.at(-2)!, y: numbers.at(-1)! };
      if (command === "M") {
        assert.equal(samples.length, 0, "Booking path must remain continuous.");
        samples.push(end);
      } else {
        const control =
          command === "Q" ? { x: numbers[0], y: numbers[1] } : undefined;
        samples.push(..._sampleSegment({ start: cursor, end, control }));
      }
      cursor = end;
    },
  );
  return samples;
}

function _assertBookingClearsLabels({
  path,
  boxes,
  clearance = 0,
}: {
  path: string;
  boxes: ReturnType<typeof _getLabelLineBoxes>;
  clearance?: number;
}) {
  const dash = path.match(/stroke-dasharray="([\d.]+) ([\d.]+)"/);
  assert.ok(dash, "Booking remains a painted dashed connection.");
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: path, name: "opacity" }),
    1,
  );
  const paintedLength = Number(dash[1]);
  const period = paintedLength + Number(dash[2]);
  const samples = _getBookingSamples(path);
  let distance = 0;
  samples.forEach((point, index) => {
    if (index > 0) {
      distance += Math.hypot(
        point.x - samples[index - 1].x,
        point.y - samples[index - 1].y,
      );
    }
    if (distance % period >= paintedLength) {
      return;
    }
    boxes.forEach((box) => {
      assert.ok(
        point.x < box.left - clearance ||
          point.x > box.right + clearance ||
          point.y < box.top - clearance ||
          point.y > box.bottom + clearance,
        `Painted booking at ${JSON.stringify(point)} crosses label ${JSON.stringify(box)}`,
      );
    });
  });
  return samples;
}
export {
  _render,
  _attributes,
  _getVisibleTexts,
  ASSERTIONS,
  _getLabelLineBoxes,
  _getOpenVehicleEnvelope,
  _assertClearance,
  _assertSiteLabelClearance,
  _sampleSegment,
  _getBookingSamples,
  _assertBookingClearsLabels,
};
export type { Point };
