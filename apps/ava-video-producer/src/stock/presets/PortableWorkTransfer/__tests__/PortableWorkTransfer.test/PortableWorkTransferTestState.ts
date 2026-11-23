import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PortableWorkTransfer } from "../../PortableWorkTransfer";
import { portableWorkTransferContract } from "../../PortableWorkTransfer.contract";
import {
  DEFAULT_INPUT,
  FIXTURES,
  invalidInputs,
} from "../../PortableWorkTransfer.fixtures";
import { inputSchema, type Input } from "../../PortableWorkTransfer.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertUnloadingHandFollowsRigidBodyOptions = {
  body: string;
  hand: string;
  x: number;
  y: number;
  markup: ReturnType<typeof render>;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertAcceptedCopiesUnloadCompletelyLeftOptions = {
  left: number;
  body: string;
  folioLeft: number;
  folioRight: number;
  id: Readonly<Input["artifacts"][number]["id"]>;
  benchBounds: RegExpMatchArray;
  markup: ReturnType<typeof render>;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertAcceptedCopiesUnloadCompletelyIdOptions = {
  id: Readonly<Input["artifacts"][number]["id"]>;
  markup: ReturnType<typeof render>;
  folioLeft: number;
  folioRight: number;
  benchBounds: RegExpMatchArray;
};

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(PortableWorkTransfer, {
      frame,
      input,
      accent: "#6ee7c4",
      id: "test",
    }),
  );
}

const render: ({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>) => string = _render;

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.ownerLabel,
    ...Object.values(input.tools),
    ...input.artifacts.map(prop("label")),
    input.labels.originals,
    input.labels.example,
    frame < 93
      ? input.labels.copies
      : frame >= 130
        ? input.transferState === "accepted"
          ? input.labels.received
          : input.labels.pending
        : input.labels.portable,
  ];
}

const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "pattern",
  "kind",
  "workpieceMaterial",
  "transferState",
  "enclosure",
  "targetModuleId",
  "source",
  "destination",
  "category",
  "measure",
  "question",
  "selectedCategory",
  "columnIds",
  "cachedColumnIds",
  "keyColumnId",
  "cells",
];

const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  invalidInputs,
  contract: portableWorkTransferContract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [30, 90, 150],
} satisfies PresetAssertions<Input>;
/** Shared authored fixtures and renderers for this preset's assertions. */
export const PortableWorkTransferTestState = { render, options };
