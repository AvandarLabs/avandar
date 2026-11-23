import { ContentFields } from "../ContentFields/ContentFields";
import styles from "./NullableField.module.css";
import type { StockControl } from "../../../../stock/contracts/StockContract.types";
import type { ContentFieldContext } from "../useContentField";
import type { ReactNode } from "react";
/** Inputs for NullableField. */
type Props = {
  control: StockControl;
  context: ContentFieldContext;
};

/** Explicit null is separate from an enabled but incomplete authored field. */
export function NullableField({
  control,
  context,
}: Readonly<Props>): ReactNode {
  return (
    <label className={styles.nullableFieldNullToggle}>
      <input
        type="checkbox"
        checked={context.value === null}
        aria-describedby={context.field["aria-describedby"]}
        onChange={(event) => {
          return context.update(
            event.target.checked
              ? null
              : ContentFields.getBlankValueFromControl(control),
          );
        }}
      />
      Empty value for {context.label}
    </label>
  );
}
