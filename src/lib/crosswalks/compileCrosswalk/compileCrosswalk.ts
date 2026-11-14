import { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import { CrosswalkSql } from "$/models/crosswalks/CrosswalkSql/CrosswalkSql";
import { validateCombineExpression } from "@/lib/crosswalks/validateCombineExpression/validateCombineExpression";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  CrosswalkDraftLayout,
  CrosswalkDraftMapping,
  CrosswalkDraftT,
} from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft.types";

/** Something to tell the user about a combined dataset before it is saved. */
export type CrosswalkProblem =
  /**
   * The dataset is left out: its columns changed since it was mapped, or it
   * can no longer be read (its name is then its id).
   */
  | { kind: "columns_changed"; datasetId: Dataset.Id; datasetName: string }
  /**
   * The dataset is left out: a column the layout reads has a type that
   * cannot be stacked with the same column of the layout's first dataset.
   */
  | { kind: "column_types_differ"; datasetId: Dataset.Id; datasetName: string }
  /** Blocks: a Combine expression the combined dataset cannot run. */
  | {
      kind: "invalid_expression";
      layoutId: CrosswalkLayout.Id;
      columnId: CrosswalkColumn.Id;
    }
  /** The fill's code list is gone, so its values pass through unchanged. */
  | {
      kind: "missing_code_list";
      layoutId: CrosswalkLayout.Id;
      columnId: CrosswalkColumn.Id;
    }
  /** Blocks: no layout has a dataset to combine. */
  | { kind: "nothing_to_combine" }
  | { kind: "unconfirmed"; datasetCount: number }
  | { kind: "skipped"; datasetCount: number };

/** The combined dataset ready to save, or why it cannot be. */
export type CompileCrosswalkResult =
  | {
      status: "ready";
      sql: string;
      columns: Array<{ name: string; dataType: AvaDataType.T }>;
      bindings: Crosswalk.CombinePayload["bindings"];
      compiledCodeLists: Crosswalk.CompiledCodeList[];
      includedDatasetIds: Dataset.Id[];
      problems: CrosswalkProblem[];
    }
  | { status: "blocked"; problems: CrosswalkProblem[] };

type CompileOptions = Readonly<{
  draft: CrosswalkDraftT;
  datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset>;
  entriesById: ReadonlyMap<string, DictionaryMatch.Entry>;
}>;

type CodeListsById = ReadonlyMap<
  string,
  { pairs: readonly DataDictionaryCodeList.Pair[] }
>;

/** One layout's part of the compile: what it adds, and what it reports. */
type LayoutPart = {
  sqlLayout: CrosswalkSql.Layout | undefined;
  problems: CrosswalkProblem[];
  unconfirmedCount: number;
};

function _getCodeListsById(
  entriesById: CompileOptions["entriesById"],
): CodeListsById {
  return new Map(
    [...entriesById.values()].flatMap((entry) => {
      return entry.codeLists.map((codeList) => {
        return [codeList.id as string, { pairs: codeList.pairs }] as const;
      });
    }),
  );
}

type DraftFills = ReadonlyArray<readonly [string, CrosswalkMapping.Fill]>;

/** The Ava types DuckDB stacks into one column, when they differ. */
const STACKABLE_TYPE_GROUPS: ReadonlyArray<ReadonlySet<AvaDataType.T>> = [
  new Set(["bigint", "double"]),
  new Set(["date", "timestamp"]),
];

/**
 * Whether two columns of one name can stack: the same type, text with
 * anything, two numbers, or a date with a timestamp. DuckDB fails the
 * whole query on any other pair, such as a date with a boolean.
 */
function _areTypesStackable(
  typeA: AvaDataType.T,
  typeB: AvaDataType.T,
): boolean {
  return (
    typeA === typeB ||
    typeA === "varchar" ||
    typeB === "varchar" ||
    STACKABLE_TYPE_GROUPS.some((group) => {
      return group.has(typeA) && group.has(typeB);
    })
  );
}

/** Lowercased names of the dataset columns a layout's fills read. */
function _getReadColumnNames(fills: DraftFills): Set<string> {
  return new Set(
    fills.flatMap(([, fill]) => {
      if (fill.kind === "column") {
        return [fill.sourceColumn.toLowerCase()];
      }
      return fill.kind === "expression"
        ? CrosswalkMapping.getCombineColumnNames(fill.sql).map((name) => {
            return name.toLowerCase();
          })
        : [];
    }),
  );
}

function _hasDifferingTypes(
  dataset: CrosswalkLayout.Dataset,
  baseline: CrosswalkLayout.Dataset,
  readNames: ReadonlySet<string>,
): boolean {
  const baselineTypes = new Map(
    baseline.columns.map((column) => {
      return [column.name.toLowerCase(), column.dataType] as const;
    }),
  );
  return dataset.columns.some((column) => {
    const key = column.name.toLowerCase();
    const baselineType = baselineTypes.get(key);
    return (
      readNames.has(key) &&
      baselineType !== undefined &&
      !_areTypesStackable(column.dataType, baselineType)
    );
  });
}

function _toDatasetProblem(
  kind: "columns_changed" | "column_types_differ",
  dataset: Readonly<{ id: Dataset.Id; name: string }>,
): CrosswalkProblem {
  return { kind, datasetId: dataset.id, datasetName: dataset.name };
}

/**
 * The layout's datasets that can be stacked, and a problem for each that
 * cannot: unreadable, columns changed since mapping, or a type that clashes
 * with the layout's first usable dataset.
 */
function _splitDatasets(
  layout: CrosswalkDraftLayout,
  datasetsById: CompileOptions["datasetsById"],
  readNames: ReadonlySet<string>,
): { included: CrosswalkLayout.Dataset[]; problems: CrosswalkProblem[] } {
  const found = layout.datasetIds.map((datasetId) => {
    return { datasetId, dataset: datasetsById.get(datasetId) };
  });
  const missing = found.flatMap(({ datasetId, dataset }) => {
    return dataset
      ? []
      : [
          _toDatasetProblem("columns_changed", {
            id: datasetId,
            name: datasetId,
          }),
        ];
  });
  const datasets = found.flatMap(({ dataset }) => {
    return dataset ? [dataset] : [];
  });
  const changed = datasets.filter((dataset) => {
    return CrosswalkLayout.hasColumnsChanged({
      layoutKey: layout.key,
      currentColumnNames: dataset.columns.map((column) => {
        return column.name;
      }),
    });
  });
  const intact = datasets.filter((dataset) => {
    return !changed.includes(dataset);
  });
  const [baseline] = intact;
  const differing = intact.filter((dataset) => {
    return (
      baseline !== undefined && _hasDifferingTypes(dataset, baseline, readNames)
    );
  });
  return {
    included: intact.filter((dataset) => {
      return !differing.includes(dataset);
    }),
    problems: [
      ...missing,
      ...changed.map((dataset) => {
        return _toDatasetProblem("columns_changed", dataset);
      }),
      ...differing.map((dataset) => {
        return _toDatasetProblem("column_types_differ", dataset);
      }),
    ],
  };
}

function _getFillProblem(
  layout: CrosswalkDraftLayout,
  columnId: CrosswalkColumn.Id,
  fill: CrosswalkMapping.Fill,
  codeListsById: CodeListsById,
): CrosswalkProblem | undefined {
  if (
    fill.kind === "expression" &&
    !validateCombineExpression({
      sql: fill.sql,
      columnNames: layout.columnNames,
    }).isValid
  ) {
    return { kind: "invalid_expression", layoutId: layout.id, columnId };
  }
  if (
    fill.kind === "column" &&
    fill.codeListId !== undefined &&
    !codeListsById.has(fill.codeListId)
  ) {
    return { kind: "missing_code_list", layoutId: layout.id, columnId };
  }
  return undefined;
}

/** The layout's mappings for columns the draft still has, by column id. */
function _getLayoutMappings(
  layout: CrosswalkDraftLayout,
  draft: CrosswalkDraftT,
): Array<[string, CrosswalkDraftMapping]> {
  const columnIds = new Set<string>(
    draft.columns.map((column) => {
      return column.id;
    }),
  );
  return Object.entries(draft.mappings[layout.id] ?? {}).filter(
    ([columnId]) => {
      return columnIds.has(columnId);
    },
  );
}

function _toLayoutPart(
  layout: CrosswalkDraftLayout,
  options: CompileOptions,
  codeListsById: CodeListsById,
): LayoutPart {
  const fills = _getLayoutMappings(layout, options.draft);
  const { included, problems } = _splitDatasets(
    layout,
    options.datasetsById,
    _getReadColumnNames(
      fills.map(([columnId, mapping]) => {
        return [columnId, mapping.fill] as const;
      }),
    ),
  );
  if (included.length === 0) {
    return { sqlLayout: undefined, problems, unconfirmedCount: 0 };
  }
  const fillProblems = fills.flatMap(([columnId, mapping]) => {
    const problem = _getFillProblem(
      layout,
      columnId as CrosswalkColumn.Id,
      mapping.fill,
      codeListsById,
    );
    return problem ? [problem] : [];
  });
  return {
    sqlLayout: {
      layoutId: layout.id,
      datasets: included.map((dataset) => {
        return { id: dataset.id, name: dataset.name };
      }),
      fillsByColumnId: new Map(
        fills.map(([columnId, mapping]) => {
          return [columnId, mapping.fill] as const;
        }),
      ),
    },
    problems: [...problems, ...fillProblems],
    unconfirmedCount: layout.status === "mapped" ? 0 : included.length,
  };
}

function _getBindings(
  draft: CrosswalkDraftT,
  entriesById: CompileOptions["entriesById"],
): Crosswalk.CombinePayload["bindings"] {
  return draft.columns.flatMap((column) => {
    const entry =
      column.entryId === undefined
        ? undefined
        : entriesById.get(column.entryId);
    const primaryList = entry?.codeLists[0];
    if (!entry || !primaryList) {
      return [];
    }
    return [
      {
        columnName: column.name,
        dictionaryId: entry.dictionaryId,
        entryId: entry.entryId,
        codeListId: primaryList.id,
        direction: draft.codesOutputAs === "labels" ? "encode" : "decode",
      },
    ];
  });
}

function _getPrimaryCodeListIdByEntryId(
  entriesById: CompileOptions["entriesById"],
): Map<string, string> {
  return new Map(
    [...entriesById.values()].flatMap((entry) => {
      const primaryList = entry.codeLists[0];
      return primaryList
        ? [[entry.entryId as string, primaryList.id as string] as const]
        : [];
    }),
  );
}

function _countProblems(
  draft: CrosswalkDraftT,
  parts: readonly LayoutPart[],
): CrosswalkProblem[] {
  const unconfirmedCount = parts.reduce((sum, part) => {
    return sum + part.unconfirmedCount;
  }, 0);
  const skippedCount = draft.layouts
    .filter((layout) => {
      return layout.status === "skipped";
    })
    .reduce((sum, layout) => {
      return sum + layout.datasetIds.length;
    }, 0);
  return [
    ...(unconfirmedCount > 0
      ? [{ kind: "unconfirmed" as const, datasetCount: unconfirmedCount }]
      : []),
    ...(skippedCount > 0
      ? [{ kind: "skipped" as const, datasetCount: skippedCount }]
      : []),
  ];
}

function _compileSql(
  options: CompileOptions,
  sqlLayouts: readonly CrosswalkSql.Layout[],
  codeListsById: CodeListsById,
): CrosswalkSql.Output | undefined {
  try {
    return CrosswalkSql.compile({
      codesOutputAs: options.draft.codesOutputAs,
      sourceColumnName: options.draft.addsSourceColumn
        ? Crosswalk.SOURCE_COLUMN_NAME
        : undefined,
      columns: options.draft.columns,
      layouts: sqlLayouts,
      codeListsById,
      primaryCodeListIdByEntryId: _getPrimaryCodeListIdByEntryId(
        options.entriesById,
      ),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "crosswalk-nothing-to-combine"
    ) {
      return undefined;
    }
    throw error;
  }
}

/** Each layout's part of the SQL, and every problem the layouts report. */
function _compileLayouts(
  options: CompileOptions,
  codeListsById: CodeListsById,
): { sqlLayouts: CrosswalkSql.Layout[]; problems: CrosswalkProblem[] } {
  const parts = options.draft.layouts
    .filter((layout) => {
      return layout.status !== "skipped";
    })
    .map((layout) => {
      return _toLayoutPart(layout, options, codeListsById);
    });
  return {
    sqlLayouts: parts.flatMap((part) => {
      return part.sqlLayout ? [part.sqlLayout] : [];
    }),
    problems: [
      ...parts.flatMap((part) => {
        return part.problems;
      }),
      ..._countProblems(options.draft, parts),
    ],
  };
}

/** A fingerprint of each code list the SQL embedded. */
function _getCompiledCodeLists(
  usedCodeListIds: readonly string[],
  codeListsById: CodeListsById,
): Crosswalk.CompiledCodeList[] {
  return usedCodeListIds.flatMap((codeListId) => {
    const codeList = codeListsById.get(codeListId);
    return codeList
      ? [
          {
            codeListId: codeListId as DataDictionaryCodeList.Id,
            fingerprint: CrosswalkSql.getCodeListFingerprint(codeList.pairs),
          },
        ]
      : [];
  });
}

/**
 * Compiles a crosswalk draft into its combined dataset, ready for
 * `rpc_crosswalks__save_combined_dataset`. Use it to preview the combined
 * dataset, list its problems, and build what is saved.
 *
 * Datasets that cannot be stacked are left out and reported as problems.
 * An invalid Combine expression, or nothing left to combine, blocks it.
 */
export function compileCrosswalk(
  options: CompileOptions,
): CompileCrosswalkResult {
  const codeListsById = _getCodeListsById(options.entriesById);
  const { sqlLayouts, problems } = _compileLayouts(options, codeListsById);
  const output = _compileSql(options, sqlLayouts, codeListsById);
  if (output === undefined) {
    return {
      status: "blocked",
      problems: [...problems, { kind: "nothing_to_combine" }],
    };
  }
  if (
    problems.some((problem) => {
      return problem.kind === "invalid_expression";
    })
  ) {
    return { status: "blocked", problems };
  }
  return {
    status: "ready",
    sql: output.sql,
    columns: output.columns,
    bindings: _getBindings(options.draft, options.entriesById),
    compiledCodeLists: _getCompiledCodeLists(
      output.usedCodeListIds,
      codeListsById,
    ),
    includedDatasetIds: sqlLayouts.flatMap((layout) => {
      return layout.datasets.map((dataset) => {
        return dataset.id;
      });
    }),
    problems,
  };
}
