import { createContext } from "react";

/** Sets the column highlighted in the dataset outline. */
export type SetColumnName = (columnName: string) => void;

/** Updates the column highlighted in the dataset outline. */
export const ActiveColumnContext = createContext<SetColumnName>(() => {
  return undefined;
});
