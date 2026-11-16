import { useState } from "react";
import { useAddColumns } from "../../derivedColumns/useAddColumns";
import { makeIncidenceColumnsFromOptions } from "../makeIncidenceColumnsFromOptions/makeIncidenceColumnsFromOptions";
import type {
  IncidenceBase,
  PopulationSource,
} from "../makeIncidenceColumnsFromOptions/makeIncidenceColumnsFromOptions";
import type { PopulationInput } from "./IncidenceModal.types";

/** The incidence form's values, their setters, and the add action. */
type IncidenceFormState = Readonly<{
  casesColumn: string;
  setCasesColumn: (columnName: string) => void;
  populationInput: PopulationInput;
  setPopulationInput: (populationInput: PopulationInput) => void;
  base: IncidenceBase;
  setBase: (base: IncidenceBase) => void;

  /** True while the population is invalid, such as an empty fixed number. */
  isAddDisabled: boolean;
  isAdding: boolean;
  errorMessage: string | undefined;
  onAdd: () => void;
}>;

function _getPopulationSourceFromInput(
  populationInput: PopulationInput,
): PopulationSource | undefined {
  const { kind, columnName, size } = populationInput;
  if (kind === "column") {
    return { kind, columnName };
  }
  return typeof size === "number" && Number.isFinite(size) && size >= 1
    ? { kind, value: size }
    : undefined;
}

/**
 * Holds the incidence form's values and adds its columns. A population
 * column is chosen by default when the result has a second numeric column,
 * and a fixed number otherwise. `IncidenceForm` is its only caller.
 */
export function useIncidenceForm(
  options: Readonly<{
    initialCasesColumn: string;
    initialPopulationColumn: string | undefined;
  }>,
): IncidenceFormState {
  const { initialCasesColumn, initialPopulationColumn } = options;
  const { isAdding, errorMessage, addColumns } = useAddColumns();
  const [casesColumn, setCasesColumn] = useState(initialCasesColumn);
  const [populationInput, setPopulationInput] = useState<PopulationInput>({
    kind: initialPopulationColumn === undefined ? "fixed" : "column",
    columnName: initialPopulationColumn ?? initialCasesColumn,
    size: "",
  });
  const [base, setBase] = useState<IncidenceBase>(100_000);
  const population = _getPopulationSourceFromInput(populationInput);
  const onAdd = (): void => {
    if (population === undefined) {
      return;
    }
    void addColumns(() => {
      return makeIncidenceColumnsFromOptions({ casesColumn, population, base });
    });
  };
  return {
    casesColumn,
    setCasesColumn,
    populationInput,
    setPopulationInput,
    base,
    setBase,
    isAddDisabled: population === undefined,
    isAdding,
    errorMessage,
    onAdd,
  };
}
