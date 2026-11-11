import { PluginError } from "@avandar/plugin-sdk";
import { NUMERIC_DATA_TYPES } from "../derivedColumns/getColumnNamesFromColumns/getColumnNamesFromColumns";
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
export type FitRegressionResult = {
  slope: number;
  intercept: number;
  rSquared: number | null;
  n: number;
  isTruncated: boolean;
};

/**
 * The fewest rows, with a number in both columns, the tool fits a line over.
 * With few rows the slope and intercept can give exact row values away: over
 * two rows the line passes through both points.
 */
const MIN_FIT_ROW_COUNT = 10;

function _assertColumnsAreValid(
  avandar: AvandarApi,
  args: FitRegressionArgs,
): void {
  const dataTypesByColumnName = new Map(
    avandar.context.columns.map((column) => {
      return [column.name, column.dataType];
    }),
  );
  for (const columnName of [args.xColumn, args.yColumn]) {
    const dataType = dataTypesByColumnName.get(columnName);
    if (dataType === undefined) {
      throw new PluginError(
        "InvalidToolInput",
        `Column "${columnName}" is not on the result.`,
      );
    }
    if (!NUMERIC_DATA_TYPES.includes(dataType)) {
      throw new PluginError(
        "InvalidToolInput",
        `Column "${columnName}" is not a number column.`,
      );
    }
  }
  if (args.xColumn === args.yColumn) {
    throw new PluginError("InvalidToolInput", "X and Y are the same column.");
  }
}

/**
 * The `fitRegression` AI tool. It fits a least-squares line of `yColumn` on
 * `xColumn` over the result the data agent is working with, the same fit the
 * Linear regression command shows. Column names match case-sensitively. It
 * throws `PluginError` with code `InvalidToolInput`, in words written for the
 * model, when a column is missing or not numeric, both are the same column,
 * or fewer than `MIN_FIT_ROW_COUNT` rows have a number in both columns.
 */
export async function runFitRegression(
  avandar: AvandarApi,
  args: FitRegressionArgs,
): Promise<FitRegressionResult> {
  _assertColumnsAreValid(avandar, args);
  const { xColumn, yColumn } = args;
  const { rows, isTruncated } = await avandar.data.fetchRows(
    avandar.context.queryHandle,
    { columns: [xColumn, yColumn] },
  );
  const fit = fitLinearRegression(
    makeRegressionPointsFromRows({ rows, xColumn, yColumn }),
  );
  if (fit === undefined || fit.n < MIN_FIT_ROW_COUNT) {
    throw new PluginError(
      "InvalidToolInput",
      `At least ${MIN_FIT_ROW_COUNT} rows need a number in both columns to fit a line.`,
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

function _assertIsColumnArgument(
  argumentName: keyof FitRegressionArgs,
  value: unknown,
): asserts value is string {
  if (typeof value !== "string") {
    throw new PluginError(
      "InvalidToolInput",
      `Column "${argumentName}" is not on the result.`,
    );
  }
}

/**
 * Adapts `runFitRegression` to the `AiToolHandler` signature, whose arguments
 * the type system can only describe as strings, numbers, or booleans. It
 * calls `runFitRegression` only when `xColumn` and `yColumn` are both
 * strings. Any other argument is rejected as a column that is not on the
 * result, naming the argument and never echoing its value.
 */
export const runFitRegressionTool: AiToolHandler = async (avandar, args) => {
  const { xColumn, yColumn } = args;
  _assertIsColumnArgument("xColumn", xColumn);
  _assertIsColumnArgument("yColumn", yColumn);
  return runFitRegression(avandar, { xColumn, yColumn });
};
