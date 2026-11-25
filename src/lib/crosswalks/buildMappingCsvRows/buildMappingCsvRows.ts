import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";

/** Where one row of the exported mapping stands. */
export type MappingCsvStatus =
  | "confirmed"
  | "suggested"
  | "not_filled"
  | "skipped";

/**
 * One row of the exported mapping: how one column of the combined dataset
 * is filled for one dataset. Values are structured, not words, so the view
 * that exports the rows translates them.
 */
export type MappingCsvRow = {
  /** The layout's name, from `nameLayout`, given its readable datasets. */
  layoutName: string;
  isReferenceLayout: boolean;
  datasetName: string;
  /** The column of the combined dataset. */
  columnName: string;
  /** "none" while the column has no fill for this layout. */
  fillKind: CrosswalkMapping.Fill["kind"] | "none";
  /** The source column, the fixed value, or the Combine expression. */
  filledFrom: string | undefined;
  convert: CrosswalkMapping.Convert | undefined;
  /** Set when the fill translates codes through a code list. */
  translation:
    | {
        /** Undefined once the list is deleted or no longer readable. */
        codeListName: string | undefined;
        holdsLabels: boolean;
      }
    | undefined;
  status: MappingCsvStatus;
};

type BuildOptions = Readonly<{
  draft: CrosswalkDraft.T;
  datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset>;
  codeListNamesById: ReadonlyMap<string, string>;
  /**
   * A layout's name, given the ids of its datasets the user can read, in
   * the layout's order. Always called with at least one id.
   */
  nameLayout: (datasetIds: readonly Dataset.Id[]) => string;
}>;

function _getFilledFrom(fill: CrosswalkMapping.Fill): string | undefined {
  switch (fill.kind) {
    case "column":
      return fill.sourceColumn;
    case "constant":
      return fill.value;
    case "expression":
      return fill.sql;
    case "empty":
      return undefined;
  }
}

function _getTranslation(
  fill: CrosswalkMapping.Fill,
  codeListNamesById: ReadonlyMap<string, string>,
): MappingCsvRow["translation"] {
  if (fill.kind !== "column" || fill.codeListId === undefined) {
    return undefined;
  }
  return {
    codeListName: codeListNamesById.get(fill.codeListId),
    holdsLabels: fill.holdsLabels,
  };
}

function _getStatus(
  layout: CrosswalkDraft.Layout,
  mapping: CrosswalkDraft.Mapping | undefined,
): MappingCsvStatus {
  if (layout.status === "skipped") {
    return "skipped";
  }
  return mapping ? mapping.status : "not_filled";
}

function _toRow(
  options: Readonly<{
    layout: CrosswalkDraft.Layout;
    layoutName: string;
    datasetName: string;
    column: CrosswalkDraft.Column;
    mapping: CrosswalkDraft.Mapping | undefined;
    codeListNamesById: ReadonlyMap<string, string>;
  }>,
): MappingCsvRow {
  const { layout, mapping } = options;
  const fill = mapping?.fill;
  return {
    layoutName: options.layoutName,
    isReferenceLayout: layout.isReference,
    datasetName: options.datasetName,
    columnName: options.column.name,
    fillKind: fill?.kind ?? "none",
    filledFrom: fill ? _getFilledFrom(fill) : undefined,
    convert: fill?.kind === "column" ? fill.convert : undefined,
    translation: fill
      ? _getTranslation(fill, options.codeListNamesById)
      : undefined,
    status: _getStatus(layout, mapping),
  };
}

function _getLayoutRows(
  options: BuildOptions & Readonly<{ layout: CrosswalkDraft.Layout }>,
): MappingCsvRow[] {
  const { draft, layout } = options;
  const datasets = layout.datasetIds.flatMap((datasetId) => {
    const dataset = options.datasetsById.get(datasetId);
    return dataset ? [dataset] : [];
  });
  if (datasets.length === 0) {
    return [];
  }
  const layoutName = options.nameLayout(
    datasets.map((dataset) => {
      return dataset.id;
    }),
  );
  return datasets.flatMap((dataset) => {
    return draft.columns.map((column) => {
      return _toRow({
        layout,
        layoutName,
        datasetName: dataset.name,
        column,
        mapping: draft.mappings[layout.id]?.[column.id],
        codeListNamesById: options.codeListNamesById,
      });
    });
  });
}

/**
 * One row per dataset and column of the combined dataset, in layout order
 * (the reference layout first), then the layout's datasets by name, then
 * column position. A dataset the user can no longer read is left out, and
 * a layout is named by `nameLayout` from the datasets that remain. Used by
 * Export mapping.
 */
export function buildMappingCsvRows(options: BuildOptions): MappingCsvRow[] {
  return options.draft.layouts.flatMap((layout) => {
    return _getLayoutRows({ ...options, layout });
  });
}
