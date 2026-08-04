import { isDefined } from "@utils";
import Fuse from "fuse.js";
import type {
  OfflineChatSchema,
  OfflineChatSchemaColumn,
} from "./offlineChat.types";

const COLUMN_ERROR_RE = /(?:Referenced column|column)\s+"([^"]+)"\s+not found/i;

/**
 * Maps common invented column names to likely Schema labels (geo / time).
 */
const COLUMN_ALIAS_CANDIDATES: Readonly<Record<string, readonly string[]>> = {
  country: ["Country/Region", "country", "country_code", "nation"],
  state: ["Province/State", "state", "region", "administrative_area"],
  city: ["city", "City", "place"],
  date: ["date", "Date", "reported_date", "observation_date"],
};

function resolveColumnFromAliasDictionary(
  missing: string,
  columns: readonly OfflineChatSchemaColumn[],
): string | undefined {
  const candidates = COLUMN_ALIAS_CANDIDATES[missing.toLowerCase()];
  if (!candidates) {
    return undefined;
  }
  return candidates
    .map((candidate) => {
      return columns.find((entry) => {
        return (
          entry.name === candidate ||
          entry.name.toLowerCase() === candidate.toLowerCase()
        );
      });
    })
    .find(isDefined)?.name;
}

/**
 * Extracts a missing column name from a DuckDB binder error message.
 */
export function extractMissingColumnFromError(
  error: string,
): string | undefined {
  const match = COLUMN_ERROR_RE.exec(error);
  return match?.[1]?.trim();
}

/**
 * Replaces a wrong column identifier in SQL when DuckDB reports it missing.
 */
export function repairOfflineColumnFromError(args: {
  sql: string;
  error: string;
  schema: OfflineChatSchema;
  datasetId: string;
}): { sql: string; repaired: boolean; repairedColumn?: string } {
  const missing = extractMissingColumnFromError(args.error);
  if (!missing) {
    return { sql: args.sql, repaired: false };
  }

  const columns = args.schema.columns.filter((column) => {
    return column.dataset_id === args.datasetId;
  });
  if (columns.length === 0) {
    return { sql: args.sql, repaired: false };
  }

  const exact = columns.find((column) => {
    return (
      column.name === missing ||
      column.name.toLowerCase() === missing.toLowerCase()
    );
  });
  if (exact) {
    return { sql: args.sql, repaired: false };
  }

  const fromDictionary = resolveColumnFromAliasDictionary(missing, columns);
  if (fromDictionary) {
    return replaceColumnIdentifier({
      sql: args.sql,
      missing,
      replacement: fromDictionary,
    });
  }

  const fuse = new Fuse(columns, {
    keys: ["name"],
    threshold: 0.42,
    ignoreLocation: true,
  });
  const results = fuse.search(missing);
  const top = results[0];
  if (!top || top.score === undefined || top.score > 0.42) {
    return { sql: args.sql, repaired: false };
  }

  return replaceColumnIdentifier({
    sql: args.sql,
    missing,
    replacement: top.item.name,
  });
}

function replaceColumnIdentifier(args: {
  sql: string;
  missing: string;
  replacement: string;
}): { sql: string; repaired: boolean; repairedColumn?: string } {
  const quotedMissing = `"${args.missing}"`;
  const quotedReplacement = `"${args.replacement}"`;
  let sql = args.sql;
  let repaired = false;

  if (sql.includes(quotedMissing)) {
    sql = sql.split(quotedMissing).join(quotedReplacement);
    repaired = true;
  }

  const unquotedPattern = new RegExp(
    `\\b${args.missing.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    "gi",
  );
  if (unquotedPattern.test(sql)) {
    sql = sql.replace(unquotedPattern, quotedReplacement);
    repaired = true;
  }

  if (!repaired) {
    return { sql: args.sql, repaired: false };
  }

  return {
    sql,
    repaired: true,
    repairedColumn: args.replacement,
  };
}
