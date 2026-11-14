import { uuid } from "$/lib/uuid";
import { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import { CrosswalkMatch } from "$/models/crosswalks/CrosswalkMatch/CrosswalkMatch";
import { CrosswalkSql } from "$/models/crosswalks/CrosswalkSql/CrosswalkSql";
import { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type {
  CrosswalkAction,
  CrosswalkContext,
} from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";

/** One layout's mappings, by column id. */
export type LayoutMappings = Readonly<Record<string, CrosswalkDraft.Mapping>>;

type ValuesRead = Extract<CrosswalkAction, { type: "values_read" }>;
type MeaningMatchesFound = Extract<
  CrosswalkAction,
  { type: "meaning_matches_found" }
>;
type CarriedFill = {
  columnId: CrosswalkColumn.Id;
  fill: CrosswalkMapping.Fill;
};

/**
 * A layout's status from its fills. The reference is always mapped, and a
 * mapped or skipped layout keeps its status until the user changes it.
 */
export function getRefreshedStatus(
  layout: CrosswalkDraft.Layout,
  draft: CrosswalkDraft.T,
): CrosswalkLayout.Status {
  if (layout.isReference) {
    return "mapped";
  }
  if (layout.status === "mapped" || layout.status === "skipped") {
    return layout.status;
  }
  return CrosswalkLayout.getStatusAfterFill({
    columnIds: draft.columns.map((column) => {
      return column.id;
    }),
    filledColumnIds: new Set(Object.keys(draft.mappings[layout.id] ?? {})),
  });
}

/** The draft with every layout's status refreshed from its fills. */
export function refreshStatuses(draft: CrosswalkDraft.T): CrosswalkDraft.T {
  return {
    ...draft,
    layouts: draft.layouts.map((layout) => {
      return { ...layout, status: getRefreshedStatus(layout, draft) };
    }),
  };
}

/** The draft with one layout's mappings replaced and its status refreshed. */
export function withLayoutMappings(
  draft: CrosswalkDraft.T,
  layoutId: string,
  mappings: LayoutMappings,
): CrosswalkDraft.T {
  const withMappings = {
    ...draft,
    mappings: { ...draft.mappings, [layoutId]: mappings },
  };
  return {
    ...withMappings,
    layouts: draft.layouts.map((layout) => {
      return layout.id === layoutId
        ? { ...layout, status: getRefreshedStatus(layout, withMappings) }
        : layout;
    }),
  };
}

/**
 * A column's type: a governed column (its entry has a code list) takes the
 * type its codes come out as; any other column keeps `dataType`.
 */
export function deriveColumnDataType(
  options: Readonly<{
    dataType: AvaDataType.T;
    entryId: DataDictionaryEntry.Id | undefined;
    codesOutputAs: Crosswalk.CodesOutput;
    context: CrosswalkContext;
  }>,
): AvaDataType.T {
  const entry = options.entryId
    ? options.context.entriesById.get(options.entryId)
    : undefined;
  const primaryList = entry?.codeLists[0];
  return primaryList
    ? CrosswalkSql.getGovernedDataType({
        codesOutputAs: options.codesOutputAs,
        primaryPairs: primaryList.pairs,
      })
    : options.dataType;
}

/** Mappings for prefills, keeping the id of a mapping each replaces. */
function _toMappings(
  prefills: readonly CrosswalkMatch.Prefill[],
  existing: LayoutMappings,
): Record<string, CrosswalkDraft.Mapping> {
  return Object.fromEntries(
    prefills.map((prefill) => {
      const mapping: CrosswalkDraft.Mapping = {
        id: existing[prefill.columnId]?.id ?? uuid<CrosswalkMapping.Id>(),
        fill: prefill.fill,
        status: prefill.status,
        confidence: prefill.confidence,
        reason: prefill.reason,
      };
      return [prefill.columnId, mapping];
    }),
  );
}

/** The combined dataset's columns as name-and-type profiles to match. */
function _toNameAndTypeTargets(
  draft: CrosswalkDraft.T,
  context: CrosswalkContext,
): CrosswalkMatch.Target[] {
  const referenceDatasetId =
    CrosswalkDraft.getReferenceLayout(draft)?.datasetIds[0];
  const referenceDataset = referenceDatasetId
    ? context.datasetsById.get(referenceDatasetId)
    : undefined;
  if (!referenceDataset) {
    return [];
  }
  const profiles = CrosswalkMatch.toNameAndTypeProfiles({
    datasetId: referenceDataset.id,
    datasetName: referenceDataset.name,
    columns: draft.columns,
  });
  return draft.columns.flatMap((column, index) => {
    const profile = profiles[index];
    return profile ? [{ columnId: column.id, profile }] : [];
  });
}

/** A layout's first dataset's columns as name-and-type profiles. */
function _toNameAndTypeSources(
  layout: CrosswalkDraft.Layout,
  context: CrosswalkContext,
): ColumnProfile.T[] | undefined {
  const firstId = layout.datasetIds[0];
  const dataset = firstId ? context.datasetsById.get(firstId) : undefined;
  return dataset
    ? CrosswalkMatch.toNameAndTypeProfiles({
        datasetId: dataset.id,
        datasetName: dataset.name,
        columns: dataset.columns,
      })
    : undefined;
}

/**
 * Confirmed fills of the most similar other layout, carried over to this
 * one. The reference layout is never the source: its fills are identity
 * fills, which name-and-type matching finds anyway, and better.
 */
function _carryOverFromSimilarLayout(
  draft: CrosswalkDraft.T,
  layout: CrosswalkDraft.Layout,
): CarriedFill[] {
  const confirmedFillsOf = (layoutId: string): CarriedFill[] => {
    return Object.entries(draft.mappings[layoutId] ?? {}).flatMap(
      ([columnId, mapping]) => {
        return mapping.status === "confirmed"
          ? [{ columnId: columnId as CrosswalkColumn.Id, fill: mapping.fill }]
          : [];
      },
    );
  };
  const candidates = draft.layouts
    .filter((candidate) => {
      return (
        candidate.id !== layout.id &&
        !candidate.isReference &&
        confirmedFillsOf(candidate.id).length > 0
      );
    })
    .map((candidate) => {
      return { id: candidate.id, columnNames: candidate.columnNames };
    });
  const similarId = CrosswalkLayout.findMostSimilarLayout({
    columnNames: layout.columnNames,
    candidates,
  });
  return similarId
    ? CrosswalkMatch.carryOverFills({
        fills: confirmedFillsOf(similarId),
        columnNames: layout.columnNames,
      })
    : [];
}

/**
 * Fills a layout from its first dataset's column names and types, carrying
 * over fills from the most similar layout first. Used when columns are
 * seeded and when a layout is added after that; values come later, when the
 * layout is opened (`values_read`).
 */
export function prefillLayoutByNameAndType(
  draft: CrosswalkDraft.T,
  layout: CrosswalkDraft.Layout,
  context: CrosswalkContext,
): CrosswalkDraft.T {
  const sources = _toNameAndTypeSources(layout, context);
  const targets = _toNameAndTypeTargets(draft, context);
  if (sources === undefined || targets.length === 0) {
    return draft;
  }
  const prefills = CrosswalkMatch.prefillLayout({
    columns: draft.columns,
    targets,
    sources,
    carriedOver: _carryOverFromSimilarLayout(draft, layout),
    entriesById: context.entriesById,
  });
  return withLayoutMappings(draft, layout.id, _toMappings(prefills, {}));
}

/**
 * Confirmed governed fills, given the code list their values fit. A fill the
 * user set by hand has no `reason`, so it is kept as it is, including a
 * choice of no translation. A fill whose list the matcher guessed, or left
 * pending, before the values were read has a `reason` and is chosen again
 * from them.
 */
function _chooseCodeListsFromValues(
  draft: CrosswalkDraft.T,
  confirmed: LayoutMappings,
  action: ValuesRead,
): Record<string, CrosswalkDraft.Mapping> {
  return Object.fromEntries(
    Object.entries(confirmed).map(([columnId, mapping]) => {
      const { fill } = mapping;
      const column = draft.columns.find((candidate) => {
        return candidate.id === columnId;
      });
      const entry = column?.entryId
        ? action.context.entriesById.get(column.entryId)
        : undefined;
      const isChosenByUser =
        fill.kind === "column" && mapping.reason === undefined;
      if (!entry || fill.kind !== "column" || fill.convert || isChosenByUser) {
        return [columnId, mapping];
      }
      const profile = action.sources.find((candidate) => {
        return (
          candidate.columnName.toLowerCase() === fill.sourceColumn.toLowerCase()
        );
      });
      const choice = profile
        ? CrosswalkMatch.chooseCodeList({ profile, entry })
        : undefined;
      return [
        columnId,
        choice
          ? {
              ...mapping,
              fill: {
                ...fill,
                codeListId: choice.codeListId,
                holdsLabels: choice.holdsLabels,
              },
            }
          : mapping,
      ];
    }),
  );
}

function _confirmedOnly(mappings: LayoutMappings): LayoutMappings {
  return Object.fromEntries(
    Object.entries(mappings).filter(([, mapping]) => {
      return mapping.status === "confirmed";
    }),
  );
}

function _usedSourceColumns(mappings: LayoutMappings): Set<string> {
  return new Set(
    Object.values(mappings).flatMap((mapping) => {
      return mapping.fill.kind === "column"
        ? [mapping.fill.sourceColumn.toLowerCase()]
        : [];
    }),
  );
}

/**
 * Refills a layout from its real values. Confirmed fills are kept (a
 * governed one gets the list its values fit, unless the user chose one).
 * Every other column is matched again, carried over first, against the source
 * columns no confirmed fill uses. A suggestion the values no longer support
 * is dropped.
 */
export function applyLayoutValues(
  draft: CrosswalkDraft.T,
  action: ValuesRead,
): CrosswalkDraft.T {
  const layout = draft.layouts.find((candidate) => {
    return candidate.id === action.layoutId;
  });
  if (!layout) {
    return draft;
  }
  const current = draft.mappings[layout.id] ?? {};
  const confirmed = _confirmedOnly(current);
  const usedSources = _usedSourceColumns(confirmed);
  const openColumns = draft.columns.filter((column) => {
    return confirmed[column.id] === undefined;
  });
  const isOpen = (columnId: string): boolean => {
    return confirmed[columnId] === undefined;
  };
  const prefills = CrosswalkMatch.prefillLayout({
    columns: openColumns,
    targets: action.targets.filter((target) => {
      return isOpen(target.columnId);
    }),
    sources: action.sources.filter((profile) => {
      return !usedSources.has(profile.columnName.toLowerCase());
    }),
    carriedOver: _carryOverFromSimilarLayout(draft, layout).filter(
      (carried) => {
        return isOpen(carried.columnId);
      },
    ),
    entriesById: action.context.entriesById,
    dateFormatsBySourceColumn: action.dateFormatsBySourceColumn,
  });
  return withLayoutMappings(draft, layout.id, {
    ..._chooseCodeListsFromValues(draft, confirmed, action),
    ..._toMappings(prefills, current),
  });
}

/**
 * The column fill a meaning match suggests: the source column with no
 * conversion, and for a governed column the code list the source's values
 * fit, as a values match would choose it.
 */
function _toMeaningFill(
  options: Readonly<{
    column: CrosswalkDraft.Column;
    sourceColumn: string;
    action: MeaningMatchesFound;
  }>,
): CrosswalkMapping.Fill {
  const { column, sourceColumn, action } = options;
  const entry = column.entryId
    ? action.context.entriesById.get(column.entryId)
    : undefined;
  const profile = action.sources.find((candidate) => {
    return candidate.columnName.toLowerCase() === sourceColumn.toLowerCase();
  });
  const choice =
    entry && profile
      ? CrosswalkMatch.chooseCodeList({ profile, entry })
      : undefined;
  return {
    kind: "column",
    sourceColumn,
    convert: undefined,
    codeListId: choice?.codeListId,
    holdsLabels: choice?.holdsLabels ?? false,
  };
}

/**
 * The suggested mappings meaning matches add to one layout: one per column
 * with no fill, from a layout column (spelled as the layout spells it) that
 * no fill reads yet. Each column and each source is used once, first match
 * first.
 */
function _makeMeaningMappings(
  draft: CrosswalkDraft.T,
  layout: CrosswalkDraft.Layout,
  action: MeaningMatchesFound,
): Record<string, CrosswalkDraft.Mapping> {
  const current = draft.mappings[layout.id] ?? {};
  const usedSources = _usedSourceColumns(current);
  const added: Record<string, CrosswalkDraft.Mapping> = {};
  action.matches.forEach((match) => {
    const column = draft.columns.find((candidate) => {
      return candidate.id === match.columnId;
    });
    const sourceColumn = layout.columnNames.find((name) => {
      return name.toLowerCase() === match.sourceColumn.toLowerCase();
    });
    if (
      !column ||
      !sourceColumn ||
      current[column.id] ||
      added[column.id] ||
      usedSources.has(sourceColumn.toLowerCase())
    ) {
      return;
    }
    usedSources.add(sourceColumn.toLowerCase());
    added[column.id] = {
      id: uuid<CrosswalkMapping.Id>(),
      fill: _toMeaningFill({ column, sourceColumn, action }),
      status: "suggested",
      confidence: undefined,
      reason: "meaning",
    };
  });
  return added;
}

/**
 * Stores meaning matches as suggested fills of one layout, marked
 * `meaning`. A fill that exists is never replaced, the reference layout and
 * a mapped or skipped layout are left alone, and the layout's status is
 * refreshed, so a To do layout becomes Review once every column has a fill.
 * Returns the same draft when nothing is added.
 */
export function applyMeaningMatches(
  draft: CrosswalkDraft.T,
  action: MeaningMatchesFound,
): CrosswalkDraft.T {
  const layout = draft.layouts.find((candidate) => {
    return candidate.id === action.layoutId;
  });
  if (
    !layout ||
    layout.isReference ||
    layout.status === "mapped" ||
    layout.status === "skipped"
  ) {
    return draft;
  }
  const added = _makeMeaningMappings(draft, layout, action);
  return Object.keys(added).length === 0
    ? draft
    : withLayoutMappings(draft, layout.id, {
        ...draft.mappings[layout.id],
        ...added,
      });
}
