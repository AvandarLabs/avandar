import { type Props as ContentFieldProps } from "../../ContentField/ContentField";
import { ScalarField } from "../../ScalarField/ScalarField";
import type { StockControl } from "../../../../../stock/contracts/StockContract.types";
import type { ContentFieldContext } from "../../useContentField";
import type { ReactNode } from "react";

type Props = {
  matchedControl: Extract<
    StockControl,
    { kind: "text" | "number" | "boolean" | "select" }
  >;
  context: ContentFieldContext;
  remainingProps: Omit<ContentFieldProps, "control">;
};
/** Pairs a native label with the scalar editor chosen by ContentFieldBody. */
export function LabeledScalarField({
  matchedControl,
  context,
  remainingProps,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <label htmlFor={context.field.id}>{context.label}</label>
      <ScalarField
        {...{ ...remainingProps, control: matchedControl, context }}
        control={matchedControl}
      />
    </>
  );
}
