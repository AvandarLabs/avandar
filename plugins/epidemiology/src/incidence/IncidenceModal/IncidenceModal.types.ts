import type { PopulationSource } from "../makeIncidenceColumnsFromOptions/makeIncidenceColumnsFromOptions";

/**
 * The population fields of the incidence form as the user left them: which
 * source is chosen, the chosen column, and the fixed population as typed (a
 * number, or "" while empty). `useIncidenceForm` turns it into a
 * `PopulationSource` once it is valid.
 */
export type PopulationInput = {
  kind: PopulationSource["kind"];
  columnName: string;
  size: number | string;
};
