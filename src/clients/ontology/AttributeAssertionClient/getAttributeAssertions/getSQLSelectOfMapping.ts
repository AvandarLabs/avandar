import { match } from "ts-pattern";
import { getRowNumberedViewName } from "@/clients/DuckDbClient/duckDbSqlText";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";

/**
 * Generate the nested SQL 'SELECT' statement to extract values using
 * a dataset column mapping's `ruleType`.
 *
 * The output SQL of this function will only work if it is included as a
 * subquery of a larger query that has a table called `external_ids` with
 * a column called `external_id`. The names of these identifiers can be
 * changed in `externalIdsTable` and `externalIdsColumn`, but it is still
 * a requirement that the outer query be a table of external IDs.
 */
export function getSQLSelectOfMapping({
  selectColumnName,
  primaryKeyColumnName,
  datasetId,
  ruleType,
  outputColumnName,
  externalIdsTable = "external_ids",
  externalIdColumn = "external_id",
}: {
  selectColumnName: string;
  primaryKeyColumnName: string;
  datasetId: string;
  ruleType: DatasetColumnMapping["valuePickerRuleType"];
  outputColumnName: string;
  externalIdsTable?: string;
  externalIdColumn?: string;
}): string {
  return match(ruleType)
    .with("first", () => {
      // Reads the auxiliary row-numbered view rather than the dataset's public
      // view, because `file_row_number` is not visible through the latter.
      //
      // The `ORDER BY` is not a preference, it is the correctness fix. Without
      // it this is `LIMIT 1` over an unordered scan, which returned four
      // different values in six runs of the same unchanged data, so every
      // aggregate built on `first` was unreproducible. `file_row_number` is
      // unique within a file, so ordering by it is a **total** order per
      // dataset, and the caller supplies one subquery per contributing dataset,
      // which completes the "dataset, then row" order the rule needs.
      //
      // `row_number() OVER ()` is not an alternative: DuckDB's scan order under
      // parallelism is unspecified, so it is an order but not a stable one.
      return `
        -- Get the first value, in a deterministic total order
        (
          SELECT "${selectColumnName}"
          FROM "${getRowNumberedViewName(datasetId)}" dataset
          WHERE
            "${externalIdsTable}"."${externalIdColumn}" = dataset."${primaryKeyColumnName}"
          ORDER BY dataset.file_row_number
          LIMIT 1
        ) AS "${outputColumnName}"
      `;
    })
    .with("most_frequent", () => {
      return `
        -- Get the most frequent value
        (
          SELECT "${selectColumnName}"
          FROM "${datasetId}" dataset
          WHERE
            "${externalIdsTable}"."${externalIdColumn}" = dataset."${primaryKeyColumnName}"
          GROUP BY "${selectColumnName}"
          ORDER BY COUNT(*) DESC, "${selectColumnName}"
          LIMIT 1
        ) AS "${outputColumnName}"
      `;
    })
    .with("sum", () => {
      return `
        -- Get the sum of the values
        (
          SELECT CAST(SUM("${selectColumnName}") AS DOUBLE)
          FROM "${datasetId}" dataset
          WHERE
            "${externalIdsTable}"."${externalIdColumn}" = dataset."${primaryKeyColumnName}"
        ) AS "${outputColumnName}"
      `;
    })
    .with("avg", () => {
      return `
        -- Get the average of the values
        (
          SELECT CAST(AVG("${selectColumnName}") AS DOUBLE)
          FROM "${datasetId}" dataset
          WHERE
            "${externalIdsTable}"."${externalIdColumn}" = dataset."${primaryKeyColumnName}"
        ) AS "${outputColumnName}"
      `;
    })
    .with("count", () => {
      return `
        -- Get the count of the values
        (
          SELECT CAST(COUNT("${selectColumnName}") AS DOUBLE)
          FROM "${datasetId}" dataset
          WHERE
            "${externalIdsTable}"."${externalIdColumn}" = dataset."${primaryKeyColumnName}"
        ) AS "${outputColumnName}"
      `;
    })
    .with("max", () => {
      return `
        -- Get the maximum value
        (
          SELECT CAST(MAX("${selectColumnName}") AS DOUBLE)
          FROM "${datasetId}" dataset
          WHERE
            "${externalIdsTable}"."${externalIdColumn}" = dataset."${primaryKeyColumnName}"
        ) AS "${outputColumnName}"
      `;
    })
    .with("min", () => {
      return `
        -- Get the minimum value
        (
          SELECT CAST(MIN("${selectColumnName}") AS DOUBLE)
          FROM "${datasetId}" dataset
          WHERE
            "${externalIdsTable}"."${externalIdColumn}" = dataset."${primaryKeyColumnName}"
        ) AS "${outputColumnName}"
      `;
    })
    .exhaustive(() => {
      throw new Error(`Invalid rule type: "${ruleType}"`);
    });
}
