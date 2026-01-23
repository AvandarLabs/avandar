/**
 * Utilities for extracting DataViz SQL dependencies from a dashboard config.
 *
 * This is shared between the publish flow and the public viewer flow so that
 * they agree on which datasets are required.
 */

import { isPlainObject } from "$/lib/utils/guards/isPlainObject/isPlainObject";
import { traverse } from "$/lib/utils/traverse/traverse";
import { isString } from "@/lib/utils/guards/guards";
import { DatasetId } from "@/models/datasets/Dataset";

type DataVizLikeProps = {
  prompt?: unknown;
  sql?: unknown;
  sqlGeneratedFromPrompt?: unknown;
};

function _toTrimmedString(value: unknown): string {
  if (!isString(value)) {
    return "";
  }

  return value.trim();
}

function _isSQLStale(options: {
  prompt: string;
  sqlGeneratedFromPrompt: string;
}): boolean {
  const { prompt, sqlGeneratedFromPrompt } = options;

  return (
    prompt.length > 0 &&
    sqlGeneratedFromPrompt.length > 0 &&
    prompt.trim() !== sqlGeneratedFromPrompt.trim()
  );
}

/**
 * Extract all non-stale, non-empty SQL strings from any DataViz blocks
 * within a dashboard config.
 *
 * TODO(jpsyx): eventually we should use a zod schema to validate that the
 * `dashConfig` is a valid Puck dashboard config type.
 */
function _extractDataVizSQLStrings(dashConfig: unknown): string[] {
  const sqlStrings: string[] = [];

  traverse(dashConfig, (node) => {
    if (!isPlainObject(node)) {
      return;
    }

    const type: unknown = node["type"];
    const props: unknown = node["props"];
    if (type !== "DataViz" || !isPlainObject(props)) {
      return;
    }

    const dataVizProps: DataVizLikeProps = props as DataVizLikeProps;
    const sql: string = _toTrimmedString(dataVizProps.sql);
    const prompt: string = _toTrimmedString(dataVizProps.prompt);
    const sqlGeneratedFromPrompt: string = _toTrimmedString(
      dataVizProps.sqlGeneratedFromPrompt,
    );

    if (sql.length === 0) {
      return;
    }

    const isStale = _isSQLStale({ prompt, sqlGeneratedFromPrompt });
    if (isStale) {
      return;
    }

    sqlStrings.push(sql);
  });

  return sqlStrings;
}

/**
 * Extract UUID-like dataset IDs from a SQL string.
 *
 * This is intentionally simple: we treat any UUID in the query as a candidate
 * dataset ID and let the caller filter down to real datasets.
 */
function _extractDatasetIdsFromSQL(sql: string): string[] {
  const uuidRegex = new RegExp(
    [
      "\\b",
      "[0-9a-f]{8}-",
      "[0-9a-f]{4}-",
      "[1-5][0-9a-f]{3}-",
      "[89ab][0-9a-f]{3}-",
      "[0-9a-f]{12}",
      "\\b",
    ].join(""),
    "gi",
  );
  const matches: string[] = Array.from(sql.matchAll(uuidRegex)).map((m) => {
    return String(m[0]).toLowerCase();
  });

  return Array.from(new Set(matches));
}

/**
 * Extract all non-stale, non-empty SQL strings from any DataViz blocks
 * within a dashboard config.
 *
 * NOTE: these are **candidates** because we are only looking for UUID-like
 * strings, which means we may be extracting some IDs that are not actual
 * dataset ids. That is why the return type of this function is
 * is Array<DatasetId | string> rather than just `DatasetId[]`.
 *
 * @param dashConfig - The dashboard config to extract dataset IDs from.
 * @returns The dataset ID candidates found in the dashboard config.
 */
export function extractDatasetIdsFromDashboardConfig(
  dashConfig: unknown,
): Array<DatasetId | string> {
  const sqlStrings: string[] = _extractDataVizSQLStrings(dashConfig);
  const candidates = Array.from(
    new Set(sqlStrings.flatMap(_extractDatasetIdsFromSQL)),
  );
  return candidates;
}
