import { prop } from "@utils";
import { Parser } from "node-sql-parser";
import { forceFromTableToDatasetId } from "@/components/ChatPanel/offline-chat-helpers/forceFromTableToDatasetId/forceFromTableToDatasetId";
import { logOfflineChat } from "@/components/ChatPanel/offline-chat-helpers/logOfflineChat";
import { matchOfflineDatasetTable } from "@/components/ChatPanel/offline-chat-helpers/matchOfflineDatasetTable";
import { OfflineSqlHallucinationSubstitutions } from "@/components/ChatPanel/offline-chat-helpers/OfflineSqlHallucinationSubstitutions/OfflineSqlHallucinationSubstitutions";
import { OfflineSqlTableNamespaces } from "@/components/ChatPanel/offline-chat-helpers/OfflineSqlTableNamespaces/OfflineSqlTableNamespaces";
import { repairOfflineColumnFromError } from "@/components/ChatPanel/offline-chat-helpers/repairOfflineColumnFromError";
import { resolveOfflineDataset } from "@/components/ChatPanel/offline-chat-helpers/resolveOfflineDataset/resolveOfflineDataset";
import type { OfflineChatSchema } from "@/clients/LocalChatModel/offlineChat.types";

const PARSER_DATABASE = "postgresql";
const MAX_REPAIR_ROUNDS = 4;

type FromEntry = Record<string, unknown>;

export type RepairOfflineGeneratedSqlArgs = {
  sql: string;
  schema: OfflineChatSchema;
  lastUserPrompt: string;
  openDatasetId?: string;
  analyzeTableName?: string;
  /** Pipeline-resolved dataset; skips re-resolve when set. */
  resolvedDatasetId?: string;
  /** DuckDB error from the previous execution attempt. */
  executionError?: string;
};

export type RepairOfflineGeneratedSqlResult = {
  sql: string;
  /** Human-readable steps applied (for debugging and future UI). */
  appliedSteps: readonly string[];
  resolvedDatasetId?: string;
};

function buildAllowedTableIdSet(
  schema: OfflineChatSchema,
): ReadonlySet<string> {
  return new Set(schema.datasets.map(prop("id")));
}

function applyParseFailureHeuristics(
  sql: string,
  errorMessage: string,
): { sql: string; applied: string[] } {
  const applied: string[] = [];
  let current = sql;
  if (/\bTOP\b/i.test(errorMessage) || /\bSELECT\s+TOP\b/i.test(current)) {
    const normalizedSql =
      OfflineSqlHallucinationSubstitutions.normalizeSelectTopToLimit(current);
    if (normalizedSql !== current) {
      applied.push("parse_heuristic_top_to_limit");
      current = normalizedSql;
    }
  }
  if (/FROM/i.test(errorMessage)) {
    const { sql: quoted, appliedRuleIds } =
      OfflineSqlHallucinationSubstitutions.apply(current);
    if (quoted !== current) {
      applied.push(
        ...appliedRuleIds.map((id) => {
          return `parse_heuristic_${id}`;
        }),
      );
      current = quoted;
    }
  }
  return { sql: current, applied };
}

function remapTableInFromList(
  fromList: unknown,
  args: {
    datasets: OfflineChatSchema["datasets"];
    lastUserPrompt: string;
    preferredDatasetId?: string;
  },
): boolean {
  if (!Array.isArray(fromList)) {
    return false;
  }
  let changed = false;
  fromList.forEach((rawItem) => {
    const item = rawItem as FromEntry;
    const tableName = typeof item.table === "string" ? item.table : undefined;
    if (!tableName) {
      return;
    }
    const matched = matchOfflineDatasetTable({
      tableRef: tableName,
      datasets: args.datasets,
      lastUserPrompt: args.lastUserPrompt,
      preferredDatasetId: args.preferredDatasetId,
    });
    if (matched && matched.id !== tableName) {
      item.table = matched.id;
      changed = true;
    }
  });
  return changed;
}

function remapTablesInSelectAst(
  ast: Record<string, unknown>,
  args: {
    schema: OfflineChatSchema;
    lastUserPrompt: string;
    preferredDatasetId?: string;
  },
): boolean {
  let changed = false;
  if (
    remapTableInFromList(ast.from, {
      datasets: args.schema.datasets,
      lastUserPrompt: args.lastUserPrompt,
      preferredDatasetId: args.preferredDatasetId,
    })
  ) {
    changed = true;
  }
  return changed;
}

function tryParseRemapAndSqlify(args: {
  sql: string;
  schema: OfflineChatSchema;
  lastUserPrompt: string;
  preferredDatasetId?: string;
}): {
  sql: string;
  ok: boolean;
  error?: string;
  remapped: boolean;
  namespaceStripped?: boolean;
  tablesRemapped?: boolean;
} {
  const parser = new Parser();
  try {
    let parsedAst = parser.astify(args.sql.trim(), {
      database: PARSER_DATABASE,
    });
    if (Array.isArray(parsedAst)) {
      if (parsedAst.length !== 1) {
        return {
          sql: args.sql,
          ok: false,
          error: "multiple statements",
          remapped: false,
        };
      }
      parsedAst = parsedAst[0]!;
    }
    const ast = parsedAst as unknown as Record<string, unknown> | null;
    if (!ast || ast.type !== "select") {
      return {
        sql: args.sql,
        ok: false,
        error: "not a select",
        remapped: false,
      };
    }
    const namespaceStripped = OfflineSqlTableNamespaces.stripInSelectAst(ast);
    const tablesRemapped = remapTablesInSelectAst(ast, {
      schema: args.schema,
      lastUserPrompt: args.lastUserPrompt,
      preferredDatasetId: args.preferredDatasetId,
    });
    const sql = parser.sqlify(
      ast as unknown as Parameters<Parser["sqlify"]>[0],
    );
    return {
      sql,
      ok: true,
      remapped: tablesRemapped || namespaceStripped,
      namespaceStripped,
      tablesRemapped,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { sql: args.sql, ok: false, error: message, remapped: false };
  }
}

function applyForcedDatasetTableId(args: {
  sql: string;
  datasetTableId: string;
  allowedTableIds: ReadonlySet<string>;
  appliedSteps: string[];
}): string {
  const forced = forceFromTableToDatasetId({
    sql: args.sql,
    datasetTableId: args.datasetTableId,
    allowedTableIds: args.allowedTableIds,
  });
  if (forced.changed) {
    args.appliedSteps.push("force_from_to_resolved_dataset");
  }
  return forced.sql;
}

/**
 * Deterministic offline SQL repair: substitution dictionary, parse/remap tables
 * via node-sql-parser, fuzzy dataset matching, and optional column repair from
 * DuckDB errors.
 */
export function repairOfflineGeneratedSql(
  args: RepairOfflineGeneratedSqlArgs,
): RepairOfflineGeneratedSqlResult {
  const appliedSteps: string[] = [];
  const resolved = resolveOfflineDataset({
    schema: args.schema,
    lastUserPrompt: args.lastUserPrompt,
    openDatasetId: args.openDatasetId,
    analyzeTableName: args.analyzeTableName,
  });
  const preferredDatasetId =
    args.resolvedDatasetId ?? resolved?.id ?? args.openDatasetId;
  const allowedTableIds = buildAllowedTableIdSet(args.schema);

  logOfflineChat("repairOfflineGeneratedSql:start", {
    sqlIn: args.sql.trim(),
    datasetCount: args.schema.datasets.length,
    datasetLabels: args.schema.datasets.map((dataset) => {
      return { id: dataset.id, name: dataset.name };
    }),
    openDatasetId: args.openDatasetId,
    resolvedFromPrompt: resolved?.id,
    resolvedDatasetIdArg: args.resolvedDatasetId,
    preferredDatasetId,
    allowedTableIds: [...allowedTableIds],
  });

  let sql = args.sql.trim();

  if (preferredDatasetId) {
    sql = applyForcedDatasetTableId({
      sql,
      datasetTableId: preferredDatasetId,
      allowedTableIds,
      appliedSteps,
    });
  }

  const substitutions = OfflineSqlHallucinationSubstitutions.apply(sql);
  if (substitutions.appliedRuleIds.length > 0) {
    appliedSteps.push(...substitutions.appliedRuleIds);
    sql = substitutions.sql;
  }

  if (preferredDatasetId) {
    if (sql.includes("__FORBIDDEN_TABLE_REMOVED__")) {
      sql = sql.replace(
        /"__FORBIDDEN_TABLE_REMOVED__"/gi,
        `"${preferredDatasetId}"`,
      );
      appliedSteps.push("replace_forbidden_system_table");
    }
    if (/\bpg_database\b/i.test(sql)) {
      sql = sql.replace(
        /\b(?:FROM|JOIN)\s+(?:"|')?pg_database(?:"|')?/gi,
        `FROM "${preferredDatasetId}"`,
      );
      appliedSteps.push("replace_pg_database_literal");
    }
  }

  for (let round = 0; round < MAX_REPAIR_ROUNDS; round += 1) {
    const before = sql;
    const namespaceStrippedSql = OfflineSqlTableNamespaces.stripInSql(sql);
    if (namespaceStrippedSql !== sql) {
      appliedSteps.push("strip_table_namespace_qualifiers");
      sql = namespaceStrippedSql;
    }
    const attempt = tryParseRemapAndSqlify({
      sql,
      schema: args.schema,
      lastUserPrompt: args.lastUserPrompt,
      preferredDatasetId,
    });
    if (attempt.ok) {
      sql = attempt.sql;
      if (attempt.namespaceStripped) {
        appliedSteps.push("parser_strip_table_namespaces");
      }
      if (attempt.tablesRemapped) {
        appliedSteps.push("parser_remap_table_names");
      }
      break;
    }
    const heuristic = applyParseFailureHeuristics(sql, attempt.error ?? "");
    if (heuristic.applied.length > 0) {
      appliedSteps.push(...heuristic.applied);
      sql = heuristic.sql;
    }
    if (sql === before) {
      break;
    }
  }

  if (preferredDatasetId) {
    sql = applyForcedDatasetTableId({
      sql,
      datasetTableId: preferredDatasetId,
      allowedTableIds,
      appliedSteps,
    });
  }

  const finalSub = OfflineSqlHallucinationSubstitutions.apply(sql);
  if (finalSub.appliedRuleIds.length > 0) {
    const appliedStepSet = new Set(appliedSteps);
    appliedSteps.push(
      ...finalSub.appliedRuleIds.filter((ruleId) => {
        return !appliedStepSet.has(ruleId);
      }),
    );
    sql = finalSub.sql;
  }

  if (preferredDatasetId) {
    sql = applyForcedDatasetTableId({
      sql,
      datasetTableId: preferredDatasetId,
      allowedTableIds,
      appliedSteps,
    });
  }

  if (args.executionError && preferredDatasetId) {
    const columnRepair = repairOfflineColumnFromError({
      sql,
      error: args.executionError,
      schema: args.schema,
      datasetId: preferredDatasetId,
    });
    if (columnRepair.repaired) {
      appliedSteps.push(
        `repair_column_${columnRepair.repairedColumn ?? "unknown"}`,
      );
      sql = columnRepair.sql;
    }
  }

  logOfflineChat("repairOfflineGeneratedSql:done", {
    sqlOut: sql,
    appliedSteps,
    preferredDatasetId,
  });

  return {
    sql,
    appliedSteps,
    resolvedDatasetId: preferredDatasetId,
  };
}
