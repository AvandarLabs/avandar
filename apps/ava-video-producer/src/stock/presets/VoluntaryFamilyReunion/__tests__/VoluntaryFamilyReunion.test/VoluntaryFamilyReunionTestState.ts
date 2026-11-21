import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VoluntaryFamilyReunion } from "../../VoluntaryFamilyReunion";
import { DEFAULT_INPUT } from "../../VoluntaryFamilyReunion.fixtures";
import { type Input } from "../../VoluntaryFamilyReunion.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return _joinMarkedShapes(
    renderToStaticMarkup(
      createElement(VoluntaryFamilyReunion, {
        frame,
        input,
        accent: "#9fefca",
        id: "test",
      }),
    ),
  );
}

/**
 * Rendered markup with each marked sketch-aware shape read as one element.
 * `SketchedShape` draws its plain shape inside a group that carries the
 * shape's markers (`data-*`, `aria-label`, `transform`), so the group's
 * attributes move onto the shape these assertions read.
 */
function _joinMarkedShapes(markup: string): string {
  return markup.replace(
    /<g((?:\s+(?:data-[\w-]+|aria-label|transform)="[^"]*")+)><(path|line|circle|rect|ellipse)\b([^>]*)><\/\2><\/g>/g,
    "<$2$1$3></$2>",
  );
}

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.scenarioCaption,
    input.meetingLabel,
    input.invitationLabels.heading,
    ...(frame >= 36 ? [input.invitationLabels.acceptance] : []),
    ...input.groups.flatMap((group) => {
      return [
        group.label,
        ...(input.showMemberLabels ? group.members.map(prop("label")) : []),
      ];
    }),
  ];
}

const EXCLUDED_TEXT_FIELDS: string[] = ["id", "greeting"];
/** Shared authored fixtures and renderers for this preset's assertions. */
export const VoluntaryFamilyReunionTestState = {
  render: _render,
  joinMarkedShapes: _joinMarkedShapes,
  getVisibleTexts: _getVisibleTexts,
  EXCLUDED_TEXT_FIELDS,
};
