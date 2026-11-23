import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SharedJigPreparation } from "../../SharedJigPreparation";
import { sharedJigPreparationContract } from "../../SharedJigPreparation.contract";
import {
  DEFAULT_INPUT,
  FIXTURES,
  invalidInputs,
} from "../../SharedJigPreparation.fixtures";
import { inputSchema, type Input } from "../../SharedJigPreparation.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertMarkingHandsContactSelectedHandXOptions = {
  hand: string;
  origin: RegExpMatchArray;
  markup: ReturnType<typeof render>;
  guide: string;
  pattern: string;
  id: Readonly<Input["collaborators"][number]["id"]>;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertMarkingHandsContactSelectedHandOptions = {
  hand: string;
  id: Readonly<Input["collaborators"][number]["id"]>;
  markup: ReturnType<typeof render>;
  guide: string;
  pattern: string;
  radius: number;
  x: number;
  y: number;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertMarkingHandsContactSelectedMarkupGuideOptions = {
  markup: ReturnType<typeof render>;
  guide: string;
  tool: string;
  pattern: string;
  handX: number;
  handY: number;
  radius: number;
  arm: string;
  x: number;
  y: number;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertMarkingHandsContactSelectedMarkupOptions = {
  markup: ReturnType<typeof render>;
  guide: string;
  tool: string;
  pattern: string;
  handX: number;
  handY: number;
  radius: number;
  arm: string;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertMarkingHandsContactSelectedPatternMarkupOptions = {
  patternMarkup: ReturnType<typeof render>;
  handX: number;
  handY: number;
  radius: number;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertMarkingHandsContactSelectedIdOptions = {
  id: Readonly<Input["collaborators"][number]["id"]>;
  index: number;
  duration: number;
  input: Readonly<Input>;
  pattern: string;
};

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(SharedJigPreparation, {
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
    input.makerLabel,
    input.guide.label,
    ...input.collaborators.flatMap(({ label, workpieceLabel }) => {
      return [label, workpieceLabel];
    }),
    input.labels.example,
    frame < 49
      ? input.labels.prepare
      : frame < 131
        ? input.labels.apply
        : input.labels.retained,
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
  contract: sharedJigPreparationContract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [30, 90, 150],
} satisfies PresetAssertions<Input>;
/** Shared authored fixtures and renderers for this preset's assertions. */
export const SharedJigPreparationTestState = { render, options };
