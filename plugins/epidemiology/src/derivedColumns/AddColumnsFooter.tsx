import { Alert, Button } from "@avandar/plugin-ui";
import type { ReactNode } from "react";

type Props = {
  buttonLabel: string;

  /** Why the last attempt failed, translated, or undefined when it has not. */
  errorText: string | undefined;
  isAdding: boolean;
  isDisabled: boolean;
  onAdd: () => void;
};

/**
 * The end of a form that adds columns to the Data Explorer query: why the
 * last attempt failed, if it did, and the button that adds the columns. Use
 * it under a command's fields, for example the incidence command's.
 */
export function AddColumnsFooter(props: Readonly<Props>): ReactNode {
  return (
    <>
      {props.errorText === undefined ? null : (
        <Alert color="red">{props.errorText}</Alert>
      )}
      <Button
        loading={props.isAdding}
        disabled={props.isDisabled}
        onClick={props.onAdd}
      >
        {props.buttonLabel}
      </Button>
    </>
  );
}
