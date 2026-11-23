import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StreetShadeInstallation } from "../../StreetShadeInstallation";
import { streetShadeInstallationContract } from "../../StreetShadeInstallation.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../StreetShadeInstallation.fixtures";
import { inputSchema, type Input } from "../../StreetShadeInstallation.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertConcentratedInstallationsTileTheirLeftOptions = {
  left: number;
  right: number;
  width: number;
  footprint: RegExpMatchArray[number];
  index: number;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertConcentratedInstallationsTileTheirZoneOptions = {
  zone: Readonly<Input["zones"][number]>;
  index: number;
  markup: ReturnType<typeof _render>;
  input: Readonly<Input>;
};

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>) {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(StreetShadeInstallation, {
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
  const total = input.zones.reduce((sum, zone) => {
    return sum + zone.areaM2;
  }, 0);
  const shaded =
    input.zones.reduce((sum, zone) => {
      return sum + zone.existingShadeM2;
    }, 0) +
    input.installations.reduce((sum, item) => {
      return sum + item.addedShadeM2;
    }, 0);
  return [
    input.copy.map,
    input.referenceCondition,
    input.decision.actorLabel,
    input.decision.actionLabel,
    input.copy.existing,
    input.copy.added,
    input.copy[input.decision.stage],
    ...input.zones.map(prop("label")),
    ...input.installations.map(prop("label")),
    ...(input.showAreaBalance
      ? [
          `${input.copy.shaded}: ${shaded} + ${input.copy.unshaded}: ${total - shaded} = ${total} ${input.copy.unit}`,
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
  contract: streetShadeInstallationContract,
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
/** Shared authored fixtures and renderers for this preset's assertions. */
export const StreetShadeInstallationTestState = { render: _render, options };
