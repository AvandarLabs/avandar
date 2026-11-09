import type { RollingWindow } from "../makeRollingAverageColumnFromOptions/makeRollingAverageColumnFromOptions";

/**
 * The rolling average form's column pickers as the user left them.
 * `valueColumn` is undefined when none is chosen, so each row counts as 1.
 * `groupByColumn` is undefined when no group-by column is chosen.
 */
export type RollingAverageColumnsInput = {
  valueColumn: string | undefined;
  dateColumn: string;
  groupByColumn: string | undefined;
};

/**
 * The rolling average form's window fields as the user left them: the size
 * as typed (a number, or "" while empty) and the unit.
 */
export type RollingWindowInput = {
  size: number | string;
  unit: RollingWindow["unit"];
};
