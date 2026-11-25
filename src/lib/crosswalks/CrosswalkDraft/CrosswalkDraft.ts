/* oxlint-disable typescript/no-namespace */
import { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  CrosswalkContents,
  CrosswalkDraftColumn,
  CrosswalkDraftLayout,
  CrosswalkDraftMapping,
  CrosswalkDraftT,
} from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft.types";

/** A dataset's name by its id; an unknown dataset sorts as "". */
type NameOf = (datasetId: string) => string;

type MappingsByLayout = Record<string, Record<string, CrosswalkDraftMapping>>;

/** A new, unsaved crosswalk with no datasets. */
function makeEmpty(
  options: Readonly<{ crosswalkId: Crosswalk.Id; name: string }>,
): CrosswalkDraftT {
  return {
    crosswalkId: options.crosswalkId,
    isSaved: false,
    name: options.name,
    description: undefined,
    codesOutputAs: "labels",
    addsSourceColumn: true,
    outputDatasetId: undefined,
    columns: [],
    layouts: [],
    mappings: {},
  };
}

/**
 * A locale-free order by name, the one `CrosswalkLayout.groupDatasetsByLayout`
 * sorts a layout's datasets by, so a new layout's first dataset (whose
 * spelling its column names take) stays first after a reload. An undefined
 * name sorts last.
 */
function _compareNames(
  nameA: string | undefined,
  nameB: string | undefined,
): number {
  if (nameA === nameB) {
    return 0;
  }
  if (nameA === undefined || nameB === undefined) {
    return nameA === undefined ? 1 : -1;
  }
  return nameA < nameB ? -1 : 1;
}

/**
 * Dataset ids by dataset name, then id, so the order never depends on the
 * server.
 */
function sortDatasetIdsByName(
  datasetIds: readonly Dataset.Id[],
  nameOf: NameOf,
): Dataset.Id[] {
  return [...datasetIds].sort((idA, idB) => {
    return _compareNames(nameOf(idA), nameOf(idB)) || (idA < idB ? -1 : 1);
  });
}

/**
 * The reference layout first, then by first dataset name, empty layouts
 * last.
 */
function sortLayouts(
  layouts: readonly CrosswalkDraftLayout[],
  nameOf: NameOf,
): CrosswalkDraftLayout[] {
  const firstNameOf = (layout: CrosswalkDraftLayout): string | undefined => {
    const firstId = layout.datasetIds[0];
    return firstId === undefined ? undefined : nameOf(firstId);
  };
  return [...layouts].sort((layoutA, layoutB) => {
    if (layoutA.isReference !== layoutB.isReference) {
      return layoutA.isReference ? -1 : 1;
    }
    return (
      _compareNames(firstNameOf(layoutA), firstNameOf(layoutB)) ||
      (layoutA.signature < layoutB.signature ? -1 : 1)
    );
  });
}

function _toDraftColumns(
  columns: readonly CrosswalkColumn.T[],
): CrosswalkDraftColumn[] {
  return [...columns]
    .sort((columnA, columnB) => {
      return columnA.position - columnB.position;
    })
    .map((column, position) => {
      return {
        id: column.id,
        name: column.name,
        position,
        dataType: column.dataType,
        entryId: column.entryId,
      };
    });
}

function _toDraftLayouts(
  contents: CrosswalkContents,
  nameOf: NameOf,
): CrosswalkDraftLayout[] {
  const datasetIdsByLayoutId = new Map<string, Dataset.Id[]>();
  contents.datasets.forEach((membership) => {
    datasetIdsByLayoutId.set(membership.layoutId, [
      ...(datasetIdsByLayoutId.get(membership.layoutId) ?? []),
      membership.datasetId,
    ]);
  });
  const layouts = contents.layouts.map((layout) => {
    return {
      id: layout.id,
      key: CrosswalkLayout.buildLayoutKey(layout.columnNames),
      signature: layout.signature,
      columnNames: layout.columnNames,
      isReference: layout.isReference,
      status: layout.status,
      datasetIds: sortDatasetIdsByName(
        datasetIdsByLayoutId.get(layout.id) ?? [],
        nameOf,
      ),
    };
  });
  return sortLayouts(layouts, nameOf);
}

function _toDraftMappings(contents: CrosswalkContents): MappingsByLayout {
  const mappings: MappingsByLayout = {};
  contents.mappings.forEach((mapping) => {
    mappings[mapping.layoutId] = {
      ...mappings[mapping.layoutId],
      [mapping.columnId]: {
        id: mapping.id,
        fill: mapping.fill,
        status: mapping.status,
        confidence: mapping.confidence,
        reason: mapping.reason,
      },
    };
  });
  return mappings;
}

/**
 * The draft of a saved crosswalk, from its five tables. Layouts and their
 * datasets are sorted by dataset name, which the tables do not hold, so the
 * names come from `datasetsById`.
 */
function fromContents(
  contents: CrosswalkContents,
  options: Readonly<{ datasetsById: ReadonlyMap<string, { name: string }> }>,
): CrosswalkDraftT {
  const { crosswalk } = contents;
  const nameOf: NameOf = (datasetId) => {
    return options.datasetsById.get(datasetId)?.name ?? "";
  };
  return {
    crosswalkId: crosswalk.id,
    isSaved: true,
    name: crosswalk.name,
    description: crosswalk.description,
    codesOutputAs: crosswalk.codesOutputAs,
    addsSourceColumn: crosswalk.addsSourceColumn,
    outputDatasetId: crosswalk.outputDatasetId,
    columns: _toDraftColumns(contents.columns),
    layouts: _toDraftLayouts(contents, nameOf),
    mappings: _toDraftMappings(contents),
  };
}

function _toPayloadMappings(
  draft: CrosswalkDraftT,
): Crosswalk.SavePayload["mappings"] {
  return draft.layouts.flatMap((layout) => {
    return draft.columns.flatMap((column) => {
      const mapping = draft.mappings[layout.id]?.[column.id];
      return mapping
        ? [
            {
              id: mapping.id,
              layoutId: layout.id,
              columnId: column.id,
              fill: mapping.fill,
              status: mapping.status,
              confidence: mapping.confidence,
              reason: mapping.reason,
            },
          ]
        : [];
    });
  });
}

/**
 * Everything `rpc_crosswalks__save` replaces: memberships in layout order,
 * mappings in layout then column order. A mapping for a layout or column no
 * longer in the draft is left out.
 */
function toSavePayload(draft: CrosswalkDraftT): Crosswalk.SavePayload {
  return {
    crosswalkId: draft.crosswalkId,
    settings: {
      name: draft.name.trim(),
      description: draft.description,
      codesOutputAs: draft.codesOutputAs,
      addsSourceColumn: draft.addsSourceColumn,
    },
    columns: draft.columns.map((column) => {
      const { id, position, dataType, entryId } = column;
      return { id, name: column.name.trim(), position, dataType, entryId };
    }),
    layouts: draft.layouts.map((layout) => {
      const { id, signature, columnNames, isReference, status } = layout;
      return { id, signature, columnNames, isReference, status };
    }),
    datasets: draft.layouts.flatMap((layout) => {
      return layout.datasetIds.map((datasetId) => {
        return { datasetId, layoutId: layout.id };
      });
    }),
    mappings: _toPayloadMappings(draft),
  };
}

/** A `JSON.stringify` replacer that writes every object's keys sorted. */
function _sortKeys(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).sort(([keyA], [keyB]) => {
      return keyA < keyB ? -1 : 1;
    }),
  );
}

/** The rows a draft saves, as JSON whose objects list their keys sorted. */
function _toComparableJson(draft: CrosswalkDraftT): string {
  return JSON.stringify(toSavePayload(draft), _sortKeys);
}

/**
 * Whether two drafts would save the same rows. Ignores `isSaved` and the
 * order of a fill's keys, since a fill read back from the server and one
 * built in the browser can list them differently. An `undefined` field and
 * a missing one compare equal, as they save the same.
 */
function isSameContent(
  draftA: CrosswalkDraftT,
  draftB: CrosswalkDraftT,
): boolean {
  return (
    draftA === draftB || _toComparableJson(draftA) === _toComparableJson(draftB)
  );
}

/** The reference layout, or undefined before one is chosen. */
function getReferenceLayout(
  draft: CrosswalkDraftT,
): CrosswalkDraftLayout | undefined {
  return draft.layouts.find((layout) => {
    return layout.isReference;
  });
}

/** How one layout fills one column, or undefined when it has no fill yet. */
function getFill(
  draft: CrosswalkDraftT,
  layoutId: string,
  columnId: string,
): CrosswalkDraftMapping | undefined {
  return draft.mappings[layoutId]?.[columnId];
}

/** Every dataset in the crosswalk, in layout order. */
function getDatasetIds(draft: CrosswalkDraftT): Dataset.Id[] {
  return draft.layouts.flatMap((layout) => {
    return [...layout.datasetIds];
  });
}

/**
 * How many datasets the crosswalk holds and where they stand. `mapped`
 * counts the reference layout's datasets and every mapped layout's;
 * `unconfirmed` is everything neither mapped nor skipped.
 */
function countDatasets(draft: CrosswalkDraftT): {
  total: number;
  mapped: number;
  skipped: number;
  unconfirmed: number;
} {
  const countWhere = (isCounted: (layout: CrosswalkDraftLayout) => boolean) => {
    return draft.layouts.filter(isCounted).reduce((sum, layout) => {
      return sum + layout.datasetIds.length;
    }, 0);
  };
  const total = countWhere(() => {
    return true;
  });
  const mapped = countWhere((layout) => {
    return layout.isReference || layout.status === "mapped";
  });
  const skipped = countWhere((layout) => {
    return !layout.isReference && layout.status === "skipped";
  });
  return { total, mapped, skipped, unconfirmed: total - mapped - skipped };
}

/** Building, reading, and saving a crosswalk as the browser edits it. */
export const CrosswalkDraft = {
  makeEmpty,
  fromContents,
  toSavePayload,
  isSameContent,
  getReferenceLayout,
  getFill,
  getDatasetIds,
  countDatasets,
  sortDatasetIdsByName,
  sortLayouts,
};

/** Public namespace for the crosswalk draft. */
export namespace CrosswalkDraft {
  /** A whole crosswalk as the browser edits it. */
  export type T = CrosswalkDraftT;
  /** One column of the combined dataset. */
  export type Column = CrosswalkDraftColumn;
  /** One layout and the datasets that share it. */
  export type Layout = CrosswalkDraftLayout;
  /** How one layout fills one column. */
  export type Mapping = CrosswalkDraftMapping;
  /** The crosswalk's five tables, as their clients read them. */
  export type Contents = CrosswalkContents;
}
