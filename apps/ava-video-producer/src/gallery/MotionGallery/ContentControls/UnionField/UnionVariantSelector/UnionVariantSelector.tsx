import css from "./UnionVariantSelector.module.css";
import type { StockControl } from "../../../../../stock/contracts/StockContract.types";
import type { ContentFieldContext } from "../../useContentField";
import type { ReactNode } from "react";

type Props = {
  context: ContentFieldContext;
  control: Extract<StockControl, { kind: "union" }>;
  activeType: string;
  selectType: (value: string) => void;
};
/** Selects an authored JSON variant without coercion for UnionField. */
export function UnionVariantSelector({
  context,
  control,
  activeType,
  selectType,
}: Readonly<Props>): ReactNode {
  return (
    <label>
      <span>{`Value type for ${context.label}`}</span>
      <select
        className={css.unionVariantSelectorUnionFieldVariant}
        value={activeType}
        onChange={(event) => {
          return selectType(event.target.value);
        }}
      >
        {control.variants.map((item) => {
          return (
            <option key={item.valueType} value={item.valueType}>
              {item.label.message}
            </option>
          );
        })}
      </select>
    </label>
  );
}
