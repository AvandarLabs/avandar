import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { getTextEnvelopesFromMarkup } from "../../getTextEnvelopesFromMarkup";
import { SchemaColumnEvolution } from "../../SchemaColumnEvolution";
import { DEFAULT_INPUT } from "../../SchemaColumnEvolution.fixtures";
import { type Input } from "../../SchemaColumnEvolution.schema";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertWrappedOldAddedValuesBodyOptions = {
  body: RegExpExecArray[][number];
  index: number;
  texts: ReturnType<typeof getTextEnvelopesFromMarkup>;
  records: Readonly<
    Array<Input["earlierRecords"][number] | Input["laterRecord"]>
  >;
  input: Readonly<Input>;
};

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(SchemaColumnEvolution, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
}

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.evidenceLabel,
    input.fields.existingLabel,
    ...input.earlierRecords.flatMap((row) => {
      return [row.label, row.recordedValue, row.id];
    }),
    ...(frame >= 49 ? [input.fields.missingLabel] : []),
    ...(frame >= 12 ? [input.fields.addedLabel] : []),
    ...(input.showVersionLabels
      ? [
          input.phaseLabels.before,
          input.phaseLabels.expanded,
          ...(frame >= 132 ? [input.phaseLabels.later] : []),
        ]
      : []),
    ...(frame >= 93
      ? [
          input.laterRecord.id,
          input.laterRecord.label,
          input.laterRecord.recordedValue,
          input.laterRecord.addedValue ?? input.fields.missingLabel,
        ]
      : []),
  ];
}

const EXCLUDED_TEXT_FIELDS: string[] = ["id"];
/** Shared authored fixtures and renderers for this preset's assertions. */
export const SchemaColumnEvolutionTestState = {
  render: _render,
  getVisibleTexts: _getVisibleTexts,
  EXCLUDED_TEXT_FIELDS,
};
