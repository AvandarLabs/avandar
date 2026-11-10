import { PluginError } from "@avandar/plugin-sdk";
import { fitLinearRegression } from "../fitLinearRegression/fitLinearRegression";
import { makeRegressionPointsFromRows } from "../makeRegressionPointsFromRows/makeRegressionPointsFromRows";
import type { AiToolHandler, AvandarApi } from "@avandar/plugin-sdk";

type FitRegressionArgs = Readonly<{ xColumn: string; yColumn: string }>;

/**
 * What the `fitRegression` AI tool returns to the model: the fitted line, its
 * fit, how many rows it used, and whether the result was cut at the row cap.
 * It holds no row values. `rSquared` is null when it has no value, as when Y
 * never varies.
 */
export type FitRegressionResult = Readonly<{
  slope: number;
  intercept: number;
  rSquared: number | null;
  n: number;
  isTruncated: boolean;
}>;

function _assertColumnsAreValid(
  avandar: AvandarApi,
  args: FitRegressionArgs,
): void {
  const columnNames = new Set(
    avandar.context.columns.map((column) => {
      return column.name;
    }),
  );
  for (const columnName of [args.xColumn, args.yColumn]) {
    if (!columnNames.has(columnName)) {
      throw new PluginError(
        "InvalidToolInput",
        `Column "${columnName}" is not on the result.`,
      );
    }
  }
  if (args.xColumn === args.yColumn) {
    throw new PluginError(
      "InvalidToolInput",
      "X and Y are the same column.",
    );
  }
}

/**
 * The `fitRegression` AI tool. It fits a least-squares line of `yColumn` on
 * `xColumn` over the result the data agent is working with, the same fit the
 * Linear regression command shows. Column names match case-sensitively. It
 * throws `PluginError` with code `InvalidToolInput`, in words written for the
 * model, when a column is missing, both are the same column, or fewer than
 * two rows have a number in both columns. An argument the model left out, or
 * gave as a number or boolean, counts as a column that is not on the result.
 */
export async function runFitRegression(
  avandar: AvandarApi,
  toolArgs: Parameters<AiToolHandler>[1],
): Promise<FitRegressionResult> {
  const args = {
    xColumn: String(toolArgs.xColumn),
    yColumn: String(toolArgs.yColumn),
  };
  _assertColumnsAreValid(avandar, args);
  const { xColumn, yColumn } = args;
  const { rows, isTruncated } = await avandar.data.fetchRows(
    avandar.context.queryHandle,
    { columns: [xColumn, yColumn] },
  );
  const fit = fitLinearRegression(
    makeRegressionPointsFromRows({ rows, xColumn, yColumn }),
  );
  if (fit === undefined) {
    throw new PluginError(
      "InvalidToolInput",
      "Not enough numeric rows to fit a line.",
    );
  }
  return {
    slope: fit.slope,
    intercept: fit.intercept,
    rSquared: fit.rSquared ?? null,
    n: fit.n,
    isTruncated,
  };
}
