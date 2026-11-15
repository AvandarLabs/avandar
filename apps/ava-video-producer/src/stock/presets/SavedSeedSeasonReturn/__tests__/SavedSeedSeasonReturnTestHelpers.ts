/** Physical choreography and authored-contract regression assertions. */
import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { SavedSeedSeasonReturn } from ".././SavedSeedSeasonReturn";
import { defaultInput, fixtures } from ".././SavedSeedSeasonReturn.fixtures";
import { type Input } from ".././SavedSeedSeasonReturn.schema";

function _render({
  frame,
  input = defaultInput,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(SavedSeedSeasonReturn, {
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
    input.evidenceLabel,
    input.crop.label,
    input.crop.unitLabel,
    input.cultivator.label,
    input.cultivator.choiceLabel,
    frame < 49
      ? input.seasons.harvestLabel
      : frame < 101
        ? input.seasons.storageLabel
        : input.seasons.plantingLabel,
    frame < 12 ? input.crop.label : input.balanceLabels.currentUse,
    frame < 144 ? input.balanceLabels.reserved : input.balanceLabels.remaining,
    input.balanceLabels.storageLoss,
    input.balanceLabels.sown,
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

const EXCLUDED_TEXT_FIELDS: string[] = ["symbol", "mode"];

function _lid({ frame, input }: { frame: number; input: Input }): number {
  return SvgAttributes.getNumberFromMarkup({
    attributes: SvgAttributes.fromMarker({
      markup: _render({ frame: frame, input: input }),
      marker: "jar-lid",
    }),
    name: "y",
  });
}

function _lossInputs(): Input[] {
  return [
    ...fixtures.map(prop("input")),
    {
      ...defaultInput,
      crop: {
        ...defaultInput.crop,
        harvestQuantity: 8.03,
        reservedQuantity: 8.03,
        storageLossQuantity: 8.03,
        sownQuantity: 0,
      },
    },
  ];
}

type CaptionCase = {
  input: Input;
  current: string;
  reserve: string;
  remaining: string;
  loss: string;
  sown: string;
};

const captionCases: CaptionCase[] = [
  {
    input: defaultInput,
    current: "8",
    reserve: "3",
    remaining: "1",
    loss: "1",
    sown: "2",
  },
  {
    input: fixtures[1].input,
    current: "0.01",
    reserve: "0",
    remaining: "0",
    loss: "0",
    sown: "0",
  },
  {
    input: fixtures[3].input,
    current: "5.02",
    reserve: "3",
    remaining: "0.5",
    loss: "0.01",
    sown: "2.5",
  },
  {
    input: fixtures[5].input,
    current: "8",
    reserve: "0",
    remaining: "0",
    loss: "4",
    sown: "0",
  },
  {
    input: fixtures[6].input,
    current: "8",
    reserve: "3",
    remaining: "3",
    loss: "1",
    sown: "0",
  },
  {
    input: {
      ...defaultInput,
      crop: {
        ...defaultInput.crop,
        harvestQuantity: 8.03,
        reservedQuantity: 7.02,
        storageLossQuantity: 1.01,
        sownQuantity: 0.01,
      },
    },
    current: "1.01",
    reserve: "6.01",
    remaining: "6",
    loss: "1.01",
    sown: "0.01",
  },
];

function _assertBalanceCaptions({
  value,
  frame,
}: {
  value: CaptionCase;
  frame: number;
}): void {
  const input = { ...value.input, showQuantities: true };
  const markup = _render({ frame: frame, input: input });
  const labels = [
    ...markup.matchAll(/<text aria-label="([^"]*)"[^>]*y="450"[^>]*>/g),
  ].map((match) => match[1]);
  const quantities = [
    ...markup.matchAll(/<text aria-label="([^"]*)"[^>]*y="535"[^>]*>/g),
  ].map((match) => match[1]);
  assert.deepEqual(labels, [
    input.balanceLabels.currentUse,
    frame < 144 ? input.balanceLabels.reserved : input.balanceLabels.remaining,
    input.balanceLabels.storageLoss,
    input.balanceLabels.sown,
  ]);
  assert.deepEqual(
    quantities,
    [
      value.current,
      frame < 144 ? value.reserve : value.remaining,
      value.loss,
      frame < 144 ? "0" : value.sown,
    ].map((amount) => `${amount} ${input.crop.unitLabel}`),
  );
  const sown = SvgAttributes.fromMarker({ markup, marker: "seed-sown" });
  if (input.crop.sownQuantity > 0) {
    const arrived =
      SvgAttributes.getNumberFromMarkup({ attributes: sown, name: "x" }) ===
        738 &&
      SvgAttributes.getNumberFromMarkup({ attributes: sown, name: "y" }) ===
        385;
    assert.equal(
      arrived,
      frame >= 144,
      "final caption and actual whole-band arrival agree",
    );
  }
}
export {
  _render,
  _visible,
  _escape,
  EXCLUDED_TEXT_FIELDS as excludedTextFields,
  _lid,
  _lossInputs,
  captionCases,
  _assertBalanceCaptions,
};
export type { CaptionCase };
