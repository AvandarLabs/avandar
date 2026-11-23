import css from "./ScalarTextField.module.css";
import type { StockControl } from "../../../../../stock/contracts/StockContract.types";
import type { ContentFieldContext } from "../../useContentField";
import type { ReactNode } from "react";

type Props = {
  context: ContentFieldContext;
  matchedControl: Extract<StockControl, { kind: "text" }>;
};
/** Preserves authored text and line breaks for ScalarField. */
export function ScalarTextField({
  context,
  matchedControl,
}: Readonly<Props>): ReactNode {
  return (
    <textarea
      {...context.field}
      className={css.scalarTextFieldScalarFieldText}
      value={String(context.value ?? "")}
      maxLength={matchedControl.maxLength}
      rows={matchedControl.multiline ? undefined : 1}
      wrap={matchedControl.multiline ? "soft" : "off"}
      onChange={(event) => {
        return context.update(event.target.value);
      }}
    />
  );
}
