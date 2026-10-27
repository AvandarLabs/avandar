import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StormwaterStorageSpill } from "../StormwaterStorageSpill";
import { stormwaterStorageSpillContract } from "../StormwaterStorageSpill.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../StormwaterStorageSpill.fixtures";
import { inputSchema, type Input } from "../StormwaterStorageSpill.schema";
import type { PresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>) {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(StormwaterStorageSpill, {
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
  const incoming = input.event.incomingM3;
  const infiltration = input.event.infiltratedM3;
  const discharge = input.event.dischargedM3;
  const detained = Math.min(
    input.detentionCapacityM3,
    incoming - (infiltration + discharge),
  );
  const overflow = incoming - (infiltration + discharge) - detained;
  return [
    ...Object.values(input.boundary),
    ...Object.values(input.decision),
    input.copy.inflow,
    input.copy.capacity,
    `${input.detentionCapacityM3} ${input.copy.unit}`,
    input.copy.infiltration,
    input.copy.discharge,
    input.copy.detained,
    input.copy.overflow,
    ...[infiltration, discharge, detained, overflow].map(
      (value) => `${value} ${input.copy.unit}`,
    ),
    ...(input.showBalance
      ? [
          `${incoming} = ${infiltration} + ${discharge} + ${detained} + ${overflow} ${input.copy.unit}`,
        ]
      : []),
    input.copy.disclaimer,
  ];
}

const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: stormwaterStorageSpillContract,
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
export { _render, _getVisibleTexts, options };
