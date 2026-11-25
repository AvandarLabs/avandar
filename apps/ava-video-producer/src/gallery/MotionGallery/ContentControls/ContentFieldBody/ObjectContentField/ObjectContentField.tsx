import {
  ContentField,
  type Props as ContentFieldProps,
} from "../../ContentField/ContentField";
import css from "./ObjectContentField.module.css";
import type { StockControl } from "../../../../../stock/contracts/StockContract.types";
import type { ContentFieldContext } from "../../useContentField";
import type { ReactNode } from "react";

type Props = {
  matchedControl: Extract<StockControl, { kind: "object" }>;
  context: ContentFieldContext;
  remainingProps: Omit<ContentFieldProps, "control">;
};
/** Groups an authored object and its child fields for ContentFieldBody. */
export function ObjectContentField({
  matchedControl,
  context,
  remainingProps,
}: Readonly<Props>): ReactNode {
  return (
    <fieldset
      className={css.objectContentFieldContentFieldBodyObject}
      aria-describedby={context.field["aria-describedby"]}
    >
      <legend>{context.label}</legend>
      {matchedControl.controls.map((child) => {
        return (
          <ContentField
            {...{ ...remainingProps, control: matchedControl, context }}
            key={child.path}
            control={child}
            parentPath={context.path}
          />
        );
      })}
    </fieldset>
  );
}
