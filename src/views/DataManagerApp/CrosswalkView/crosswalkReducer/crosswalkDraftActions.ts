import { uuid } from "$/lib/uuid";
import { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import {
  deriveColumnDataType,
  getRefreshedStatus,
  prefillLayoutByNameAndType,
  refreshStatuses,
  withLayoutMappings,
} from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/prefillCrosswalkLayout";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  CrosswalkAction,
  CrosswalkContext,
  ReferenceColumnBinding,
} from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { LayoutMappings } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/prefillCrosswalkLayout";

type ActionOf<Type extends CrosswalkAction["type"]> = Extract<
  CrosswalkAction,
  { type: Type }
>;

function _nameOf(context: CrosswalkContext): (datasetId: string) => string {
  return (datasetId) => {
    return context.datasetsById.get(datasetId)?.name ?? "";
  };
}

function _omitKey<Value>(
  record: Readonly<Record<string, Value>>,
  key: string,
): Record<string, Value> {
  return Object.fromEntries(
    Object.entries(record).filter(([candidate]) => {
      return candidate !== key;
    }),
  );
}

function _createLayout(group: CrosswalkLayout.Group): CrosswalkDraft.Layout {
  return {
    id: uuid<CrosswalkLayout.Id>(),
    key: group.key,
    signature: group.signature,
    columnNames: group.columnNames,
    isReference: false,
    status: "to_do",
    datasetIds: group.datasetIds,
  };
}

/** Joins each group to the layout with its key, or makes it a new layout. */
function _mergeGroups(
  layouts: readonly CrosswalkDraft.Layout[],
  groups: readonly CrosswalkLayout.Group[],
  context: CrosswalkContext,
): {
  layouts: CrosswalkDraft.Layout[];
  createdLayoutIds: CrosswalkLayout.Id[];
} {
  const existingKeys = new Set(
    layouts.map((layout) => {
      return layout.key;
    }),
  );
  const grownLayouts = layouts.map((layout) => {
    const group = groups.find((candidate) => {
      return candidate.key === layout.key;
    });
    return group
      ? {
          ...layout,
          datasetIds: CrosswalkDraft.sortDatasetIdsByName(
            [...layout.datasetIds, ...group.datasetIds],
            _nameOf(context),
          ),
        }
      : layout;
  });
  const createdLayouts = groups
    .filter((group) => {
      return !existingKeys.has(group.key);
    })
    .map(_createLayout);
  return {
    layouts: [...grownLayouts, ...createdLayouts],
    createdLayoutIds: createdLayouts.map((layout) => {
      return layout.id;
    }),
  };
}

/** Marks the layout that covers the others best as the reference, if none. */
function _ensureReference(draft: CrosswalkDraft.T): CrosswalkDraft.T {
  if (CrosswalkDraft.getReferenceLayout(draft)) {
    return draft;
  }
  const referenceKey = CrosswalkLayout.chooseReferenceLayout(
    draft.layouts.map((layout) => {
      return {
        key: layout.key,
        signature: layout.signature,
        columnNames: [...layout.columnNames],
        datasetIds: [...layout.datasetIds],
      };
    }),
  );
  return {
    ...draft,
    layouts: draft.layouts.map((layout) => {
      return layout.key === referenceKey
        ? { ...layout, isReference: true, status: "mapped" as const }
        : layout;
    }),
  };
}

/**
 * Adds datasets the draft does not hold yet. Each joins the layout with its
 * key or forms a new one; the first time, a reference is chosen. Once
 * columns exist, every new layout is prefilled by name and type. A dataset
 * with no columns is left out: a layout needs at least one column name.
 */
export function addDatasets(
  draft: CrosswalkDraft.T,
  datasetIds: readonly Dataset.Id[],
  context: CrosswalkContext,
): CrosswalkDraft.T {
  const knownDatasetIds = new Set<string>(CrosswalkDraft.getDatasetIds(draft));
  const addedDatasets = [...new Set(datasetIds)].flatMap((datasetId) => {
    const dataset = knownDatasetIds.has(datasetId)
      ? undefined
      : context.datasetsById.get(datasetId);
    return dataset && dataset.columns.length > 0 ? [dataset] : [];
  });
  if (addedDatasets.length === 0) {
    return draft;
  }
  const mergedGroups = _mergeGroups(
    draft.layouts,
    CrosswalkLayout.groupDatasetsByLayout(addedDatasets),
    context,
  );
  const withReference = _ensureReference({
    ...draft,
    layouts: mergedGroups.layouts,
  });
  const prefilledDraft = mergedGroups.createdLayoutIds.reduce(
    (draftSoFar, layoutId) => {
      const layout = draftSoFar.layouts.find((candidate) => {
        return candidate.id === layoutId;
      });
      return layout && !layout.isReference
        ? prefillLayoutByNameAndType(draftSoFar, layout, context)
        : draftSoFar;
    },
    withReference,
  );
  return {
    ...prefilledDraft,
    layouts: CrosswalkDraft.sortLayouts(
      prefilledDraft.layouts,
      _nameOf(context),
    ),
  };
}

/**
 * Removes a dataset. A layout left with no dataset goes with its mappings,
 * except the reference, which stays so its columns keep their meaning.
 */
export function removeDataset(
  draft: CrosswalkDraft.T,
  datasetId: Dataset.Id,
): CrosswalkDraft.T {
  const layout = draft.layouts.find((candidate) => {
    return candidate.datasetIds.includes(datasetId);
  });
  if (!layout) {
    return draft;
  }
  const remainingDatasetIds = layout.datasetIds.filter((id) => {
    return id !== datasetId;
  });
  if (remainingDatasetIds.length === 0 && !layout.isReference) {
    return {
      ...draft,
      layouts: draft.layouts.filter((candidate) => {
        return candidate.id !== layout.id;
      }),
      mappings: _omitKey(draft.mappings, layout.id),
    };
  }
  return {
    ...draft,
    layouts: draft.layouts.map((candidate) => {
      return candidate.id === layout.id
        ? { ...candidate, datasetIds: remainingDatasetIds }
        : candidate;
    }),
  };
}

/**
 * Makes another layout the reference, first in the list, and clears every
 * column and mapping so the next Next seeds them again. Every other layout
 * that is not skipped goes back to to do. The reducer checks
 * `canChangeReference` before calling this.
 */
export function chooseReference(
  draft: CrosswalkDraft.T,
  layoutId: CrosswalkLayout.Id,
): CrosswalkDraft.T {
  const newReferenceLayout = draft.layouts.find((layout) => {
    return layout.id === layoutId;
  });
  if (!newReferenceLayout || newReferenceLayout.isReference) {
    return draft;
  }
  const otherLayouts = draft.layouts
    .filter((layout) => {
      return layout.id !== layoutId;
    })
    .map((layout) => {
      return {
        ...layout,
        isReference: false,
        status:
          layout.status === "skipped"
            ? ("skipped" as const)
            : ("to_do" as const),
      };
    });
  return {
    ...draft,
    layouts: [
      { ...newReferenceLayout, isReference: true, status: "mapped" },
      ...otherLayouts,
    ],
    columns: [],
    mappings: {},
  };
}

function _identityMapping(
  column: CrosswalkDraft.Column,
  sourceColumnName: string,
  binding: ReferenceColumnBinding | undefined,
): CrosswalkDraft.Mapping {
  const isGoverned = column.entryId !== undefined;
  const isListPending = isGoverned && binding?.codeListId === undefined;
  return {
    id: uuid<CrosswalkMapping.Id>(),
    fill: {
      kind: "column",
      sourceColumn: sourceColumnName,
      convert: undefined,
      codeListId: isGoverned ? binding?.codeListId : undefined,
      holdsLabels: isGoverned ? (binding?.holdsLabels ?? false) : false,
    },
    status: "confirmed",
    confidence: undefined,
    // A governed column whose list the reference does not name yet is marked
    // as matched, not chosen, so reading its values picks the list that fits
    // them. Any other fill with no reason is one the user chose.
    reason: isListPending ? "name_and_type" : undefined,
  };
}

/**
 * Makes the combined dataset's columns from the reference dataset's, in its
 * column order, governed where the reference binds a known entry. A column
 * is named without its header's edge spaces, as it is saved, while its fill
 * reads the source column exactly as the dataset spells it. The
 * reference layout fills each from itself, confirmed; every other layout is
 * prefilled by name and type. Does nothing once columns exist.
 */
export function seedColumns(
  draft: CrosswalkDraft.T,
  bindingsByColumnName: ReadonlyMap<string, ReferenceColumnBinding>,
  context: CrosswalkContext,
): CrosswalkDraft.T {
  const reference = CrosswalkDraft.getReferenceLayout(draft);
  const firstId = reference?.datasetIds[0];
  const dataset = firstId ? context.datasetsById.get(firstId) : undefined;
  if (draft.columns.length > 0 || !reference || !dataset) {
    return draft;
  }
  const columns = dataset.columns.map((sourceColumn, position) => {
    const binding = bindingsByColumnName.get(sourceColumn.name);
    const entryId =
      binding && context.entriesById.has(binding.entryId)
        ? binding.entryId
        : undefined;
    const dataType = deriveColumnDataType({
      dataType: sourceColumn.dataType,
      entryId,
      codesOutputAs: draft.codesOutputAs,
      context,
    });
    const id = uuid<CrosswalkColumn.Id>();
    return { id, name: sourceColumn.name.trim(), position, dataType, entryId };
  });
  const referenceMappings = Object.fromEntries(
    columns.map((column, position) => {
      const sourceName = dataset.columns[position]?.name ?? column.name;
      return [
        column.id,
        _identityMapping(
          column,
          sourceName,
          bindingsByColumnName.get(sourceName),
        ),
      ];
    }),
  );
  const seededDraft: CrosswalkDraft.T = {
    ...draft,
    columns,
    mappings: { [reference.id]: referenceMappings },
  };
  return seededDraft.layouts.reduce((draftSoFar, layout) => {
    return layout.isReference
      ? draftSoFar
      : prefillLayoutByNameAndType(draftSoFar, layout, context);
  }, seededDraft);
}

function _hasLayoutAndColumn(
  draft: CrosswalkDraft.T,
  layoutId: string,
  columnId: string,
): boolean {
  return (
    draft.layouts.some((layout) => {
      return layout.id === layoutId;
    }) &&
    draft.columns.some((column) => {
      return column.id === columnId;
    })
  );
}

/** Stores a fill the user chose: confirmed, with no reason or confidence. */
export function setFill(
  draft: CrosswalkDraft.T,
  action: ActionOf<"fill_set">,
): CrosswalkDraft.T {
  if (!_hasLayoutAndColumn(draft, action.layoutId, action.columnId)) {
    return draft;
  }
  const currentMappings = draft.mappings[action.layoutId] ?? {};
  const mapping: CrosswalkDraft.Mapping = {
    id: currentMappings[action.columnId]?.id ?? uuid<CrosswalkMapping.Id>(),
    fill: action.fill,
    status: "confirmed",
    confidence: undefined,
    reason: undefined,
  };
  return withLayoutMappings(draft, action.layoutId, {
    ...currentMappings,
    [action.columnId]: mapping,
  });
}

/**
 * Rewrites one layout's mappings: `update` returns the mapping to keep, or
 * undefined to drop it. The layout's status is refreshed after.
 */
export function updateMappings(
  draft: CrosswalkDraft.T,
  layoutId: string,
  update: (
    mapping: CrosswalkDraft.Mapping,
    columnId: string,
  ) => CrosswalkDraft.Mapping | undefined,
): CrosswalkDraft.T {
  const currentMappings = draft.mappings[layoutId];
  if (!currentMappings) {
    return draft;
  }
  const nextMappingEntries = Object.entries(currentMappings).flatMap(
    ([columnId, mapping]) => {
      const updated = update(mapping, columnId);
      return updated ? [[columnId, updated] as const] : [];
    },
  );
  return withLayoutMappings(
    draft,
    layoutId,
    Object.fromEntries(nextMappingEntries),
  );
}

function _setLayoutStatus(
  draft: CrosswalkDraft.T,
  layoutId: string,
  toStatus: (layout: CrosswalkDraft.Layout) => CrosswalkLayout.Status,
): CrosswalkDraft.T {
  return {
    ...draft,
    layouts: draft.layouts.map((layout) => {
      return layout.id === layoutId && !layout.isReference
        ? { ...layout, status: toStatus(layout) }
        : layout;
    }),
  };
}

/**
 * Confirms every fill of a layout, leaves every other column empty, and marks
 * it mapped.
 */
export function confirmLayout(
  draft: CrosswalkDraft.T,
  layoutId: CrosswalkLayout.Id,
): CrosswalkDraft.T {
  const layout = draft.layouts.find((candidate) => {
    return candidate.id === layoutId;
  });
  if (!layout || layout.isReference) {
    return draft;
  }
  const currentMappings = draft.mappings[layoutId] ?? {};
  const mappings: LayoutMappings = Object.fromEntries(
    draft.columns.map((column) => {
      const existing = currentMappings[column.id];
      const mapping: CrosswalkDraft.Mapping = existing
        ? { ...existing, status: "confirmed" }
        : {
            id: uuid<CrosswalkMapping.Id>(),
            fill: { kind: "empty" },
            status: "confirmed",
            confidence: undefined,
            reason: undefined,
          };
      return [column.id, mapping];
    }),
  );
  const withMappings = {
    ...draft,
    mappings: { ...draft.mappings, [layoutId]: mappings },
  };
  return _setLayoutStatus(withMappings, layoutId, () => {
    return "mapped";
  });
}

/** Skips a layout: its datasets are left out of the combined dataset. */
export function skipLayout(
  draft: CrosswalkDraft.T,
  layoutId: CrosswalkLayout.Id,
): CrosswalkDraft.T {
  return _setLayoutStatus(draft, layoutId, () => {
    return "skipped";
  });
}

/** Brings a skipped layout back, with the status its fills give. */
export function reopenLayout(
  draft: CrosswalkDraft.T,
  layoutId: CrosswalkLayout.Id,
): CrosswalkDraft.T {
  return _setLayoutStatus(draft, layoutId, (layout) => {
    return layout.status === "skipped"
      ? getRefreshedStatus({ ...layout, status: "to_do" }, draft)
      : layout.status;
  });
}

/** Appends a column with no fills anywhere. */
export function addColumn(
  draft: CrosswalkDraft.T,
  action: ActionOf<"column_added">,
): CrosswalkDraft.T {
  const isTaken = draft.columns.some((column) => {
    return column.id === action.columnId;
  });
  if (isTaken) {
    return draft;
  }
  const column: CrosswalkDraft.Column = {
    id: action.columnId,
    name: action.name.trim(),
    position: draft.columns.length,
    dataType: action.dataType,
    entryId: undefined,
  };
  return refreshStatuses({ ...draft, columns: [...draft.columns, column] });
}

/** Removes a column and its fills from every layout, and renumbers the rest. */
export function removeColumn(
  draft: CrosswalkDraft.T,
  columnId: CrosswalkColumn.Id,
): CrosswalkDraft.T {
  if (
    !draft.columns.some((column) => {
      return column.id === columnId;
    })
  ) {
    return draft;
  }
  const columns = draft.columns
    .filter((column) => {
      return column.id !== columnId;
    })
    .map((column, position) => {
      return { ...column, position };
    });
  const mappings = Object.fromEntries(
    Object.entries(draft.mappings).map(([layoutId, layoutMappings]) => {
      return [layoutId, _omitKey(layoutMappings, columnId)];
    }),
  );
  return refreshStatuses({ ...draft, columns, mappings });
}

/**
 * Every `column` fill of one column, without a code list. When the column is
 * governed by an entry, each such fill is marked as matched, not chosen, so
 * reading its values picks the list that fits them.
 */
function _clearCodeLists(
  mappings: CrosswalkDraft.T["mappings"],
  columnId: string,
  isGoverned: boolean,
): CrosswalkDraft.T["mappings"] {
  return Object.fromEntries(
    Object.entries(mappings).map(([layoutId, layoutMappings]) => {
      const mapping = layoutMappings[columnId];
      if (!mapping || mapping.fill.kind !== "column") {
        return [layoutId, layoutMappings];
      }
      const fill = {
        ...mapping.fill,
        codeListId: undefined,
        holdsLabels: false,
      };
      const reason = isGoverned ? "name_and_type" : mapping.reason;
      return [
        layoutId,
        { ...layoutMappings, [columnId]: { ...mapping, fill, reason } },
      ];
    }),
  );
}

/**
 * Renames a column, changes its type, or changes its dictionary entry. A
 * governed column's type follows its entry. A changed entry clears every
 * fill's code list for that column, since the old list belongs to another
 * entry; the next `values_read` picks one again.
 */
export function changeColumn(
  draft: CrosswalkDraft.T,
  action: ActionOf<"column_changed">,
): CrosswalkDraft.T {
  const column = draft.columns.find((candidate) => {
    return candidate.id === action.columnId;
  });
  if (!column) {
    return draft;
  }
  const { changes } = action;
  const entryId =
    changes.entryId === undefined
      ? column.entryId
      : (changes.entryId ?? undefined);
  const nextColumn = {
    ...column,
    name: changes.name?.trim() ?? column.name,
    entryId,
    dataType: deriveColumnDataType({
      dataType: changes.dataType ?? column.dataType,
      entryId,
      codesOutputAs: draft.codesOutputAs,
      context: action.context,
    }),
  };
  return {
    ...draft,
    columns: draft.columns.map((candidate) => {
      return candidate.id === column.id ? nextColumn : candidate;
    }),
    mappings:
      entryId === column.entryId
        ? draft.mappings
        : _clearCodeLists(draft.mappings, column.id, entryId !== undefined),
  };
}

/** Changes how codes come out and whether the source column is added. */
export function changeSettings(
  draft: CrosswalkDraft.T,
  action: ActionOf<"settings_changed">,
): CrosswalkDraft.T {
  const codesOutputAs = action.changes.codesOutputAs ?? draft.codesOutputAs;
  return {
    ...draft,
    codesOutputAs,
    addsSourceColumn: action.changes.addsSourceColumn ?? draft.addsSourceColumn,
    columns: draft.columns.map((column) => {
      return {
        ...column,
        dataType: deriveColumnDataType({
          dataType: column.dataType,
          entryId: column.entryId,
          codesOutputAs,
          context: action.context,
        }),
      };
    }),
  };
}
