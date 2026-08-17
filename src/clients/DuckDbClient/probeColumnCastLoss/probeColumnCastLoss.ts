import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { buildCastProbeSql } from "@/clients/DuckDbClient/probeColumnCastLoss/buildCastProbeSql/buildCastProbeSql";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";

type ProbeColumnCastLossOptions = {
  /** Sampled values from the column, as the import preview read them. */
  values: readonly unknown[];
  /** The type the user wants the column to be queryable as. */
  targetDataType: AvaDataType.T;
};

/** How much of a sample a proposed cast would discard. */
export type ColumnCastLoss = {
  /** Sampled values that currently hold something. */
  numValues: number;
  /** How many of those the cast would turn into null. */
  numUncastable: number;
};

const NO_LOSS: ColumnCastLoss = { numValues: 0, numUncastable: 0 };

/**
 * Measures how many of a column's sampled values a proposed type change would
 * silently null out.
 *
 * Query time applies a user-chosen type as `TRY_CAST`, which never errors: a
 * value it cannot convert simply becomes null. Without this the user picks a
 * type on the import form and only discovers it emptied a column later, with no
 * indication of why. The count is drawn from the preview sample rather than the
 * whole file, so treat it as evidence the choice is wrong rather than a
 * guarantee that it is right.
 */
export async function probeColumnCastLoss(
  options: Readonly<ProbeColumnCastLossOptions>,
): Promise<ColumnCastLoss> {
  const sql = buildCastProbeSql({
    values: options.values,
    targetDataType: DuckDbDataTypeUtils.fromDatasetColumnType(
      options.targetDataType,
    ),
  });
  if (sql === undefined) {
    return NO_LOSS;
  }
  const { data } = await DuckDbClient.runRawQuery<{
    num_values: bigint;
    num_uncastable: bigint;
  }>(sql, { [TRUSTED_INTERNAL_SQL]: true });
  const row = data[0];
  return row ?
      {
        numValues: Number(row.num_values),
        numUncastable: Number(row.num_uncastable),
      }
    : NO_LOSS;
}
