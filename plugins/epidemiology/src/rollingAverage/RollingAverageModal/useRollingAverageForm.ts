import { useState } from "react";
import { useAddColumns } from "../../derivedColumns/useAddColumns";
import { makeRollingAverageColumnFromOptions } from "../makeRollingAverageColumnFromOptions/makeRollingAverageColumnFromOptions";
import type {
  RollingAverageColumnsInput,
  RollingWindowInput,
} from "./RollingAverageModal.types";

/** The rolling average form's values, their setters, and the add action. */
type RollingAverageFormState = Readonly<{
  /**
   * The chosen columns. A group-by column that became the value or date
   * column is dropped.
   */
  columnsInput: RollingAverageColumnsInput;
  setColumnsInput: (columnsInput: RollingAverageColumnsInput) => void;

  /** Every result column except the chosen value and date columns. */
  groupByColumnNames: string[];
  windowInput: RollingWindowInput;
  setWindowInput: (windowInput: RollingWindowInput) => void;

  /** True until the window size is a whole number of at least 1. */
  isAddDisabled: boolean;
  isAdding: boolean;
  errorMessage: string | undefined;
  onAdd: () => void;
}>;

const INITIAL_WINDOW_INPUT: RollingWindowInput = { size: 7, unit: "day" };

/**
 * The columns a group-by column can be, which are all but the chosen value
 * and date columns, and the chosen columns without a group-by column that is
 * no longer one of them.
 */
function _buildGroupByChoices(
  options: Readonly<{
    columnNames: readonly string[];
    chosenColumns: RollingAverageColumnsInput;
  }>,
): Readonly<{
  groupByColumnNames: string[];
  columnsInput: RollingAverageColumnsInput;
}> {
  const { columnNames, chosenColumns } = options;
  const groupByColumnNames = columnNames.filter((columnName) => {
    return (
      columnName !== chosenColumns.valueColumn &&
      columnName !== chosenColumns.dateColumn
    );
  });
  const groupByColumn = groupByColumnNames.find((columnName) => {
    return columnName === chosenColumns.groupByColumn;
  });
  return {
    groupByColumnNames,
    columnsInput: { ...chosenColumns, groupByColumn },
  };
}

/**
 * Holds the rolling average form's values and adds its column. The window
 * starts at 7 days with no group-by column. `RollingAverageForm` is its only
 * caller.
 */
export function useRollingAverageForm(
  options: Readonly<{
    columnNames: readonly string[];
    initialValueColumn: string;
    initialDateColumn: string;
  }>,
): RollingAverageFormState {
  const { isAdding, errorMessage, addColumns } = useAddColumns();
  const [chosenColumns, setColumnsInput] = useState<RollingAverageColumnsInput>(
    {
      valueColumn: options.initialValueColumn,
      dateColumn: options.initialDateColumn,
      groupByColumn: undefined,
    },
  );
  const [windowInput, setWindowInput] = useState(INITIAL_WINDOW_INPUT);
  const { groupByColumnNames, columnsInput } = _buildGroupByChoices({
    columnNames: options.columnNames,
    chosenColumns,
  });
  const size = typeof windowInput.size === "number" ? windowInput.size : 0;
  const onAdd = (): void => {
    void addColumns(() => {
      return [
        makeRollingAverageColumnFromOptions({
          ...columnsInput,
          window: { size, unit: windowInput.unit },
        }),
      ];
    });
  };
  return {
    columnsInput,
    setColumnsInput,
    groupByColumnNames,
    windowInput,
    setWindowInput,
    isAddDisabled: !Number.isInteger(size) || size < 1,
    isAdding,
    errorMessage,
    onAdd,
  };
}
