import { match, P } from "ts-pattern";
import { SelectField } from "../SelectField";
import styles from "./ScalarField.module.css";
import type { StockControl } from "../../../../stock/contracts/StockContract.types";
import type { Props as ContentFieldProps } from "../ContentField/ContentField";
import type { ContentFieldContext } from "../useContentField";
import type { ReactNode } from "react";

type ScalarControl = Extract<
  StockControl,
  {
    kind: "text" | "number" | "boolean" | "select";
  }
>;
type Props = ContentFieldProps & {
  control: ScalarControl;
  context: ContentFieldContext;
};
function _inputProps({
  control,
  value,
}: {
  control: Exclude<
    ScalarControl,
    {
      kind: "select" | "text";
    }
  >;
  value: unknown;
}) {
  return {
    type: control.kind === "boolean" ? "checkbox" : "number",
    value: control.kind === "boolean" ? undefined : String(value ?? ""),
    checked: control.kind === "boolean" ? value === true : undefined,
    min: control.kind === "number" ? control.min : undefined,
    max: control.kind === "number" ? control.max : undefined,
    step: control.kind === "number" ? (control.step ?? "any") : undefined,
  };
}

/** Native textareas retain line breaks. Other scalars preserve JSON types. */
export function ScalarField({
  control,
  context,
  ...remainingProps
}: Props): ReactNode {
  return match(control)
    .with({ kind: "select" }, (matchedControl) => {
      return (
        <SelectField
          {...{ ...remainingProps, control: matchedControl, context }}
          control={matchedControl}
        />
      );
    })
    .with({ kind: "text" }, (matchedControl) => {
      return (
        <textarea
          {...context.field}
          className={styles.scalarFieldText}
          value={String(context.value ?? "")}
          maxLength={matchedControl.maxLength}
          rows={matchedControl.multiline ? undefined : 1}
          wrap={matchedControl.multiline ? "soft" : "off"}
          onChange={(event) => context.update(event.target.value)}
        />
      );
    })
    .with({ kind: P.union("number", "boolean") }, (matchedControl) => {
      return (
        <input
          {...context.field}
          {..._inputProps({ control: matchedControl, value: context.value })}
          onChange={(event) =>
            context.update(
              matchedControl.kind === "boolean"
                ? event.target.checked
                : matchedControl.kind === "number" && event.target.value !== ""
                  ? event.target.valueAsNumber
                  : event.target.value,
            )
          }
        />
      );
    })
    .exhaustive();
}
