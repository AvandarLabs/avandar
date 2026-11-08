import { quoteSqlIdentifier } from "@avandar/utils/sql";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";

/** A text column holding this many values or fewer is listed in full. */
const MAX_FULLY_LISTED_VALUES = 12;

const TEXT_TYPES = new Set(["varchar", "text", "string"]);
const DATE_TYPES = new Set(["date", "timestamp", "timestamp_s", "datetime"]);

/** What an offline model is told about one column. */
export type OfflineColumnProfile = {
  name: string;
  dataType: string;
  /** Distinct values, approximate, for text columns. */
  distinctCount?: number;
  /** Every value, for a text column with 12 values or fewer. */
  values?: string[];
  /** First and last value, for date columns. */
  range?: { min: string; max: string };
};

/** What an offline model is told about one dataset. */
export type OfflineDatasetProfile = {
  datasetId: string;
  rowCount: number;
  columns: OfflineColumnProfile[];
};

/** True for a column whose values the profile lists. */
export function isTextColumn(column: Readonly<{ dataType: string }>): boolean {
  return TEXT_TYPES.has(column.dataType.toLowerCase());
}

function _isDateColumn(column: Readonly<{ dataType: string }>): boolean {
  return DATE_TYPES.has(column.dataType.toLowerCase());
}

/**
 * One query for a dataset's row count, text columns' distinct counts, and
 * date columns' ranges, joined into one `|`-separated text value so it fits
 * the host's one-column reader.
 */
function _buildSummarySql(dataset: Readonly<DataAgentDataset>): string {
  const parts = ["count(*)"];
  for (const column of dataset.columns) {
    const name = quoteSqlIdentifier(column.name);
    if (isTextColumn(column)) {
      parts.push(`approx_count_distinct(${name})`);
    } else if (_isDateColumn(column)) {
      parts.push(`min(${name})::DATE`, `max(${name})::DATE`);
    }
  }
  const fields = parts.map((part) => {
    return `coalesce(CAST(${part} AS VARCHAR), '')`;
  });
  return `SELECT concat_ws('|', ${fields.join(", ")}) FROM ${quoteSqlIdentifier(dataset.id)}`;
}

function _buildValuesSql(
  dataset: Readonly<DataAgentDataset>,
  columnName: string,
  limit: number,
): string {
  const name = quoteSqlIdentifier(columnName);
  return `SELECT ${name} FROM ${quoteSqlIdentifier(dataset.id)} WHERE ${name} IS NOT NULL GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT ${limit}`;
}

function _parseSummary(
  dataset: Readonly<DataAgentDataset>,
  summary: string,
): OfflineDatasetProfile {
  const fields = summary.split("|");
  let index = 1;
  const columns = dataset.columns.map((column): OfflineColumnProfile => {
    const profile: OfflineColumnProfile = {
      name: column.name,
      dataType: column.dataType,
    };
    if (isTextColumn(column)) {
      profile.distinctCount = Number(fields[index++] ?? 0);
    } else if (_isDateColumn(column)) {
      profile.range = {
        min: fields[index++] ?? "",
        max: fields[index++] ?? "",
      };
    }
    return profile;
  });
  return { datasetId: dataset.id, rowCount: Number(fields[0] ?? 0), columns };
}

async function _profileDataset(
  host: DataAgentHost,
  dataset: Readonly<DataAgentDataset>,
): Promise<OfflineDatasetProfile> {
  const summary = await host.readColumnValues(_buildSummarySql(dataset));
  const profile = _parseSummary(
    dataset,
    Array.isArray(summary) ? (summary[0] ?? "") : "",
  );
  for (const column of profile.columns) {
    // Example values of a many-valued column are left out: small models
    // copy them into filters. The question's own values are looked up.
    if (
      column.distinctCount === undefined ||
      column.distinctCount > MAX_FULLY_LISTED_VALUES
    ) {
      continue;
    }
    const values = await host.readColumnValues(
      _buildValuesSql(dataset, column.name, MAX_FULLY_LISTED_VALUES),
    );
    column.values = Array.isArray(values) ? values : [];
  }
  return profile;
}

/**
 * Profiles each dataset on the device for an offline model: row count, date
 * ranges, each text column's number of values, and all of its values when
 * there are 12 or fewer. The model runs on the device too, so nothing here
 * leaves it.
 */
export async function profileOfflineDatasets(
  host: DataAgentHost,
  datasets: readonly DataAgentDataset[],
): Promise<OfflineDatasetProfile[]> {
  const profiles: OfflineDatasetProfile[] = [];
  for (const dataset of datasets) {
    profiles.push(await _profileDataset(host, dataset));
  }
  return profiles;
}
