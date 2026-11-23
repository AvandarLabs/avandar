import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProvenancePeelback } from "../../ProvenancePeelback";
import { DEFAULT_INPUT } from "../../ProvenancePeelback.fixtures";
import { type Input } from "../../ProvenancePeelback.schema";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertFocalCitationNamesOnlyCitationOptions = {
  citation: string;
  input: Readonly<Input>;
  selected: Readonly<NonNullable<Input["sources"][number]>>;
  markup: string;
};

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(ProvenancePeelback, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}

function _visibleTexts(input: Readonly<Input>): string[] {
  return [
    input.summary.label,
    input.summary.text,
    input.citationLabel,
    ...input.sources.flatMap((source) => {
      return [
        source.title,
        source.excerpt,
        ...(input.showLocators ? [source.locator] : []),
      ];
    }),
  ];
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const ProvenancePeelbackTestState = {
  render: _render,
  visibleTexts: _visibleTexts,
};
