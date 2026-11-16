import { useAvandar } from "@avandar/plugin-sdk";
import { useState } from "react";
import type { DerivedColumn } from "@avandar/plugin-sdk";

/**
 * What `useAddColumns` gives a command's form: whether columns are being
 * added, why the last attempt failed, and the function that adds them.
 */
type AddColumnsState = Readonly<{
  isAdding: boolean;

  /** The reason the last attempt failed, or undefined when it has not. */
  errorMessage: string | undefined;

  /**
   * Adds the columns `makeColumns` returns to the Data Explorer query the
   * command was invoked on, then closes the modal. On a failure, including
   * one thrown by `makeColumns`, it keeps the modal open and sets
   * `errorMessage`.
   */
  addColumns: (makeColumns: () => readonly DerivedColumn[]) => Promise<void>;
}>;

/**
 * Adds computed columns from a command's modal through
 * `avandar.dataExplorer.addColumns`, and closes the modal once they are
 * added. Call it from a form's submit button, for example the incidence
 * command's "Add columns" button.
 */
export function useAddColumns(): AddColumnsState {
  const avandar = useAvandar();
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const addColumns = async (
    makeColumns: () => readonly DerivedColumn[],
  ): Promise<void> => {
    const { dataExplorer } = avandar;
    // The modals render no form without the Data Explorer API.
    if (dataExplorer === undefined) {
      return;
    }
    setIsAdding(true);
    setErrorMessage(undefined);
    try {
      await dataExplorer.addColumns(makeColumns());
      avandar.ui.closeModal();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsAdding(false);
    }
  };
  return { isAdding, errorMessage, addColumns };
}
