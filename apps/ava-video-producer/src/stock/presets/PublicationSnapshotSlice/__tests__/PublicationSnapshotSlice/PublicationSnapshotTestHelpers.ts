import assert from "node:assert/strict";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgPaintAssertions } from "../../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../../../../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { createVideoMotion } from "../../../../../videoTheme/createVideoMotion/createVideoMotion";
import { makeResolvedVideoThemeFromSource } from "../../../../../videoTheme/makeResolvedVideoThemeFromSource/makeResolvedVideoThemeFromSource";
import { PublicationSnapshotSlice } from "../../PublicationSnapshotSlice";
import { publicationSnapshotSliceContract as contract } from "../../PublicationSnapshotSlice.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../PublicationSnapshotSlice.fixtures";
import { inputSchema, type Input } from "../../PublicationSnapshotSlice.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string => {
  return renderToStaticMarkup(
    createElement(PublicationSnapshotSlice, {
      frame,
      input,
      accent: "#72d5bd",
      id: "packet27",
    }),
  );
};
function _marker({
  markup,
  key,
  value,
}: {
  markup: string;
  key: string;
  value: string;
}): string {
  const tags = [...markup.matchAll(/<[^>]+>/g)].map((match) => {
    return match[0];
  });
  const tag = tags.find((candidateTag) => {
    return candidateTag.includes(`data-${key}="${value}"`);
  });
  assert.ok(tag, `${key} ${value}`);
  return tag;
}
const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "rowId",
  "columnId",
  "rowIds",
  "columnIds",
  "audience",
  "cells",
  "value",
];
const getVisibleTexts = ({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] => {
  return [
    ...Object.values(input.copy),
    input.publication.label,
    input.publication.revision,
    ...input.table.columns
      .filter(({ id }) => {
        return (
          input.showExcludedCells || input.selection.columnIds.includes(id)
        );
      })
      .map(prop("label")),
    ...input.table.rows.flatMap((row) => {
      return row.cells.filter((cell, index) => {
        return (
          input.showExcludedCells ||
          (input.selection.rowIds.includes(row.id) &&
            input.selection.columnIds.includes(input.table.columns[index].id))
        );
      });
    }),
    ...(frame >= 139 ? [input.liveEdit.value] : []),
  ];
};
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts,
} satisfies PresetAssertions<Input>;
const CLASSIC_MOTION = createVideoMotion(
  makeResolvedVideoThemeFromSource(DEFAULT_VIDEO_THEME_SOURCE).semantic.motion,
);
function _assertReadablePaint(markup: string): void {
  const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
  SvgPaintAssertions.assertPaintClearance({
    texts: paint.filter(propEq("kind", "text")),
    rectangles: paint.filter((item) => {
      return (
        item.kind === "rect" && item.fill !== "none" && item.fillOpacity > 0
      );
    }),
  });
}
/**
 * Renders publication snapshots and checks their text, paint, and SVG markers.
 */
export const PublicationSnapshotTestHelpers = {
  /** Returns publication snapshot SVG for a frame and authored input. */
  render,
  /** Returns the SVG tag matching a snapshot data marker, or fails the test. */
  marker: _marker,
  /** Schema, fixtures, renderer, and visible text for shared preset checks. */
  options,
  /** Classic motion used by the snapshot travel geometry assertions. */
  CLASSIC_MOTION,
  /** Asserts visible text clears the rendered filled rectangles. */
  assertReadablePaint: _assertReadablePaint,
} as const;
