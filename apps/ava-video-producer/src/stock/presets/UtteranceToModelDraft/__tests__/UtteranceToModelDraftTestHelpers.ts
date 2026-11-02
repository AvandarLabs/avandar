import { prop } from "@avandar/utils";
import { createElement } from "react";
/**
 * Behavioral, contract, and text-layout coverage for utterance-to-model-draft.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { UtteranceToModelDraft } from ".././UtteranceToModelDraft";
import { DEFAULT_INPUT, fixtures } from ".././UtteranceToModelDraft.fixtures";
import { inputSchema, type Input } from ".././UtteranceToModelDraft.schema";
import type { PresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(UtteranceToModelDraft, {
      frame,
      input,
      accent: "#65d6ad",
      id: "packet22",
    }),
  );
}

const options = {
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: [
    "id",
    "partId",
    "entityId",
    "fromEntityId",
    "toEntityId",
    "outcome",
    "modelLayout",
    "label",
    "text",
  ],
  getVisibleTexts: ({ input }: Readonly<{ input: Input }>) => [
    input.copy.source,
    input.copy.draft,
    input.copy.entity,
    input.copy.relationship,
    ...(input.draft.attributes.length ? [input.copy.attribute] : []),
    input.copy.example,
    input.review.reviewerLabel,
    input.review.note,
    input.review.outcome === "accept"
      ? input.copy.accepted
      : input.copy.pending,
    ...input.sentenceParts.map(prop("text")),
    ...input.draft.entities.map(prop("label")),
    ...input.draft.relationships.map(prop("label")),
    ...input.draft.attributes.map(prop("label")),
  ],
} satisfies Pick<
  PresetAssertions<Input>,
  | "inputSchema"
  | "fixtures"
  | "render"
  | "excludedTextFields"
  | "getVisibleTexts"
>;

function _attributes({
  markup,
  marker,
}: {
  markup: string;
  marker: string;
}): string[] {
  return [
    ...markup.matchAll(new RegExp(`<[^>]+data-${marker}="[^>]+>`, "g")),
  ].map((match) => match[0]);
}
export { _render, options, _attributes };
