import { DICTIONARY_SUGGESTIONS_MAX_NAME_LENGTH } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import { DictionarySuggestions } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import type { DictionarySuggestionsRequest } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkMatch } from "$/models/crosswalks/CrosswalkMatch/CrosswalkMatch";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type {
  DictionaryMatchColumn,
  DictionarySuggestionModel,
} from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";

/** A layout column the model says means a combined-dataset column. */
export type CrosswalkMeaningMatch = {
  columnId: CrosswalkColumn.Id;
  sourceColumn: string;
};

/**
 * A meaning-match request for one layout, and which side of the crosswalk
 * each name in it is on, so a reply's pairs can be oriented.
 */
export type CrosswalkMatchesRequest = {
  request: Extract<DictionarySuggestionsRequest, { task: "matches" }>;
  /** Each combined-dataset column in the request, by the name it is sent as. */
  columnIdByName: ReadonlyMap<string, CrosswalkColumn.Id>;
  /** The layout columns in the request, as the layout spells them. */
  sourceNames: ReadonlySet<string>;
};

/**
 * What asking about one layout comes to: a request, nothing to ask about
 * (a reference or mapped layout, or no column left on one side), or too
 * many columns for the model to take, even cut down to one pair.
 */
export type CrosswalkMatchesResult =
  | { status: "ready"; request: CrosswalkMatchesRequest }
  | { status: "nothing_to_match" }
  | { status: "too_large_for_model" };

function _toKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Every layout column a fill of this layout reads, by comparison key. */
function _getUsedSourceKeys(
  mappings: Readonly<Record<string, CrosswalkDraft.Mapping>>,
): Set<string> {
  return new Set(
    Object.values(mappings).flatMap(({ fill }) => {
      if (fill.kind === "column") {
        return [_toKey(fill.sourceColumn)];
      }
      return fill.kind === "expression"
        ? CrosswalkMapping.getCombineColumnNames(fill.sql).map(_toKey)
        : [];
    }),
  );
}

/** The combined dataset's columns this layout has no fill for. */
function _getTargetColumns(
  options: Readonly<{
    draft: CrosswalkDraft.T;
    mappings: Readonly<Record<string, CrosswalkDraft.Mapping>>;
    targets: readonly CrosswalkMatch.Target[];
  }>,
): Array<DictionaryMatchColumn & { columnId: CrosswalkColumn.Id }> {
  return options.draft.columns
    .filter((column) => {
      return options.mappings[column.id] === undefined;
    })
    .map((column) => {
      return {
        columnId: column.id,
        name: column.name,
        dataType: column.dataType,
        profile: options.targets.find((target) => {
          return target.columnId === column.id;
        })?.profile,
      };
    });
}

/**
 * The layout's columns no fill reads and no combined-dataset column is
 * named like (ignoring case), typed from the layout's first dataset.
 */
function _getSourceColumns(
  options: Readonly<{
    draft: CrosswalkDraft.T;
    layout: CrosswalkDraft.Layout;
    mappings: Readonly<Record<string, CrosswalkDraft.Mapping>>;
    datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset>;
    profilesBySourceColumn: ReadonlyMap<string, ColumnProfile.T>;
  }>,
): DictionaryMatchColumn[] {
  const takenKeys = new Set([
    ..._getUsedSourceKeys(options.mappings),
    ...options.draft.columns.map((column) => {
      return _toKey(column.name);
    }),
  ]);
  const [firstDatasetId] = options.layout.datasetIds;
  const datasetColumns = firstDatasetId
    ? (options.datasetsById.get(firstDatasetId)?.columns ?? [])
    : [];
  return options.layout.columnNames
    .filter((name) => {
      return !takenKeys.has(_toKey(name));
    })
    .map((name) => {
      const datasetColumn = datasetColumns.find((column) => {
        return _toKey(column.name) === _toKey(name);
      });
      return {
        name,
        dataType: datasetColumn?.dataType ?? "varchar",
        profile: options.profilesBySourceColumn.get(name),
      };
    });
}

/** Whether the route's schema takes the column's name uncut. */
function _hasSendableName(column: Readonly<{ name: string }>): boolean {
  return (
    column.name.length > 0 &&
    column.name.length <= DICTIONARY_SUGGESTIONS_MAX_NAME_LENGTH
  );
}

/**
 * The columns alternated one side then the other. A request cut to fit its
 * model drops columns from the end, so alternating keeps both sides in it
 * until the last pair.
 */
function _interleave<Item>(
  first: readonly Item[],
  second: readonly Item[],
): Item[] {
  return Array.from(
    { length: Math.max(first.length, second.length) },
    (_item, index) => {
      return [first[index], second[index]].filter((column) => {
        return column !== undefined;
      });
    },
  ).flat();
}

/**
 * The meaning-match request for one layout: the combined dataset's columns
 * it has not filled, alternating with its own columns that no fill reads.
 * Nothing to match for the reference layout and when either side is empty.
 * Too large when the request cannot be cut to fit the model that will
 * answer and still hold a column of each side.
 */
export function makeCrosswalkMatchesRequest(
  options: Readonly<{
    draft: CrosswalkDraft.T;
    layoutId: CrosswalkLayout.Id;
    /** Every readable dataset with its columns, for the layout's types. */
    datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset>;
    targets: readonly CrosswalkMatch.Target[];
    profilesBySourceColumn: ReadonlyMap<string, ColumnProfile.T>;
    locale: string;
    model: DictionarySuggestionModel;
  }>,
): CrosswalkMatchesResult {
  const layout = options.draft.layouts.find((candidate) => {
    return candidate.id === options.layoutId;
  });
  if (!layout || layout.isReference) {
    return { status: "nothing_to_match" };
  }
  const mappings = options.draft.mappings[layout.id] ?? {};
  const targetColumns = _getTargetColumns({ ...options, mappings }).filter(
    _hasSendableName,
  );
  const sourceColumns = _getSourceColumns({
    ...options,
    layout,
    mappings,
  }).filter(_hasSendableName);
  if (targetColumns.length === 0 || sourceColumns.length === 0) {
    return { status: "nothing_to_match" };
  }
  const request = DictionarySuggestions.makeMatchesRequestFromColumns({
    columns: _interleave(targetColumns, sourceColumns),
    locale: options.locale,
    model: options.model,
  });
  const crosswalkRequest =
    request?.task === "matches"
      ? _toCrosswalkRequest(request, targetColumns)
      : undefined;
  return crosswalkRequest
    ? { status: "ready", request: crosswalkRequest }
    : { status: "too_large_for_model" };
}

/** Splits a fitted request's names back into the crosswalk's two sides. */
function _toCrosswalkRequest(
  request: Extract<DictionarySuggestionsRequest, { task: "matches" }>,
  targetColumns: ReadonlyArray<{ columnId: CrosswalkColumn.Id; name: string }>,
): CrosswalkMatchesRequest | undefined {
  const sentNames = new Set(
    request.columns.map((column) => {
      return column.name;
    }),
  );
  const columnIdByName = new Map(
    targetColumns.flatMap((column) => {
      return sentNames.has(column.name)
        ? [[column.name, column.columnId] as const]
        : [];
    }),
  );
  const sourceNames = new Set(
    [...sentNames].filter((name) => {
      return !columnIdByName.has(name);
    }),
  );
  return columnIdByName.size > 0 && sourceNames.size > 0
    ? { request, columnIdByName, sourceNames }
    : undefined;
}

function _orientMatch(
  request: CrosswalkMatchesRequest,
  match: Readonly<DictionaryProposal.MeaningMatch>,
): CrosswalkMeaningMatch | undefined {
  const fromName = request.columnIdByName.get(match.name);
  if (fromName && request.sourceNames.has(match.sameAs)) {
    return { columnId: fromName, sourceColumn: match.sameAs };
  }
  const fromSameAs = request.columnIdByName.get(match.sameAs);
  if (fromSameAs && request.sourceNames.has(match.name)) {
    return { columnId: fromSameAs, sourceColumn: match.name };
  }
  return undefined;
}

/**
 * The reply's pairs that join a combined-dataset column to a layout
 * column, each column in at most one pair, first pair first. A pair within
 * one side is dropped.
 */
export function toCrosswalkMeaningMatches(
  options: Readonly<{
    request: CrosswalkMatchesRequest;
    matches: readonly DictionaryProposal.MeaningMatch[];
  }>,
): CrosswalkMeaningMatch[] {
  const pairedColumnIds = new Set<string>();
  const pairedSources = new Set<string>();
  return options.matches.flatMap((match) => {
    const pair = _orientMatch(options.request, match);
    if (
      !pair ||
      pairedColumnIds.has(pair.columnId) ||
      pairedSources.has(pair.sourceColumn)
    ) {
      return [];
    }
    pairedColumnIds.add(pair.columnId);
    pairedSources.add(pair.sourceColumn);
    return [pair];
  });
}
