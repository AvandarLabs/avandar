import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { EASE } from "../../../../motion";
import { ComputeCapacityConsolidation } from "../ComputeCapacityConsolidation";
import { computeCapacityConsolidationContract } from "../ComputeCapacityConsolidation.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../ComputeCapacityConsolidation.fixtures";
import {
  inputSchema,
  type Input,
} from "../ComputeCapacityConsolidation.schema";
import { type JobRectangle } from "../findJobRoute";
import type { PresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>) {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(ComputeCapacityConsolidation, {
        frame,
        input,
        accent: "#78d4bc",
        id: "test",
      }),
    ),
  );
}

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>) {
  const occupied = new Set(input.jobs.map(prop("finalHostId"))).size;
  return [
    input.windowLabel,
    frame < 108 ? input.copy.before : input.copy.after,
    input.decision.actorLabel,
    input.decision.actionLabel,
    ...input.hosts.map(prop("label")),
    ...input.jobs.map(prop("label")),
    `${input.copy.work}: ${input.jobs.reduce((sum, job) => sum + job.cpuHours, 0)} ${input.copy.unit}`,
    `${input.copy.occupied}: ${occupied} · ${input.copy[input.emptyHostState]}: ${input.hosts.length - occupied}`,
    input.copy.disclaimer,
    ...(frame >= 108 && occupied < input.hosts.length
      ? [input.copy[input.emptyHostState]]
      : []),
  ];
}

const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: computeCapacityConsolidationContract,
  render: _render,
  excludedTextFields: [
    "id",
    "initialHostId",
    "finalHostId",
    "zoneId",
    "kind",
    "route",
    "stage",
    "assemblyShape",
    "overflowSide",
    "emptyHostState",
  ],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;

function _getJobs({
  frame,
  input,
}: {
  frame: number;
  input: Input;
}): JobRectangle[] {
  return [
    ..._render({ frame: frame, input: input }).matchAll(
      /<rect[^>]*data-job="\d+"[^>]*>/g,
    ),
  ].map(([attributes]) => ({
    x: SvgAttributes.getNumberFromMarkup({ attributes, name: "x" }),
    y: SvgAttributes.getNumberFromMarkup({ attributes, name: "y" }),
    width: SvgAttributes.getNumberFromMarkup({ attributes, name: "width" }),
    height: SvgAttributes.getNumberFromMarkup({ attributes, name: "height" }),
  }));
}

function _assertClear({
  rectangle,
  obstacle,
}: {
  rectangle: JobRectangle;
  obstacle: JobRectangle;
}) {
  const overlapX =
    Math.min(rectangle.x + rectangle.width, obstacle.x + obstacle.width) -
    Math.max(rectangle.x, obstacle.x);
  const overlapY =
    Math.min(rectangle.y + rectangle.height, obstacle.y + obstacle.height) -
    Math.max(rectangle.y, obstacle.y);
  assert.ok(
    overlapX <= 1e-8 || overlapY <= 1e-8,
    `swept rectangle overlaps ${overlapX} x ${overlapY}`,
  );
}

function _getBoundaryFrame(progress: number): number {
  let lower = 48,
    upper = 108;
  for (let iteration = 0; iteration < 50; iteration++) {
    const middle = (lower + upper) / 2;
    if (EASE.inOut((middle - 48) / 60) < progress) {
      lower = middle;
    } else {
      upper = middle;
    }
  }
  return (lower + upper) / 2;
}
export {
  _render,
  _getVisibleTexts,
  options,
  _getJobs,
  _assertClear,
  _getBoundaryFrame,
};
