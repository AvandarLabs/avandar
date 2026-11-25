import type { LinearRegressionFit } from "../fitLinearRegression/fitLinearRegression";

/**
 * What the last attempt to fit the chosen columns produced, as kept by
 * `RegressionForm` and shown by `FitOutcome`.
 *
 * - `idle`: no fit has run yet, or a column change cleared the last one.
 * - `fitted`: the line and how many rows it used. `isTruncated` is true when
 *   the query result had more rows than the fit read.
 * - `error`: no fit was made, with the translated reason to show the user.
 */
export type FitState =
  | Readonly<{ kind: "idle" }>
  | Readonly<{
      kind: "fitted";
      fit: LinearRegressionFit;
      isTruncated: boolean;
      rowCount: number;
    }>
  | Readonly<{ kind: "error"; message: string }>;
