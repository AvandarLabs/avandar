import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TeacherLearningCover } from "../../TeacherLearningCover";
import { teacherLearningCoverContract as contract } from "../../TeacherLearningCover.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../TeacherLearningCover.fixtures";
import { inputSchema, type Input } from "../../TeacherLearningCover.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return _joinMarkedShapes(
    renderToStaticMarkup(
      createElement(TeacherLearningCover, {
        frame,
        input,
        accent: "#81d7bd",
        id: "packet15",
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
    input.roomLabels.classroom,
    input.roomLabels.supportSpace,
    input.session.prompt,
    input.session.label,
    input.caption,
    frame < 48
      ? input.phaseLabels.cover
      : frame < 104
        ? input.phaseLabels.support
        : input.phaseLabels.return,
    ...Object.values(input.staff).map(prop("label")),
    ...input.learners.map(prop("label")),
  ];
}

const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: ["id", "mode"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;

function _staffX({ markup, role }: { markup: string; role: string }): number {
  const match = markup.match(
    new RegExp(
      `data-staff-role="${role}"[^>]*transform="translate\\(([-.\\d]+) ([-.\\d]+)\\)"`,
    ),
  );
  assert.ok(match);
  assert.equal(Number(match[2]), 250);
  return Number(match[1]);
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const TeacherLearningCoverTestState = {
  render: _render,
  options,
  staffX: _staffX,
};
