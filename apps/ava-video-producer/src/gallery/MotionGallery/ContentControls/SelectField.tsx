import { propEq } from "@avandar/utils";
import { getStockValueFromPath } from "../../../stock/data/getStockValueFromPath";
import { ContentFields } from "./ContentFields/ContentFields";
import { SelectOptions } from "./SelectOptions";
import type { StockControl } from "../../../stock/contracts/StockContract.types";
import type { Props as ContentFieldProps } from "./ContentField/ContentField";
import type { ContentFieldContext } from "./useContentField";
import type { ReactNode } from "react";

type Props = ContentFieldProps & {
  control: Extract<
    StockControl,
    {
      kind: "select";
    }
  >;
  context: ContentFieldContext;
};
/**
 * Reference options use authored labels and the declared root or item scope.
 */
export function SelectField({
  control,
  context,
  state,
  itemPath,
}: Readonly<Props>): ReactNode {
  const options = _getFieldOptions({ control, state, itemPath });
  const selectedIndex = options.findIndex(
    propEq<{ value: unknown }, "value", unknown>("value", context.value),
  );
  const selectValue = (value: string) => {
    const option = options.find((_, index) => {
      return `option:${index}` === value;
    });
    if (option) {
      context.update(option.value);
    }
  };
  return (
    <select
      {...context.field}
      value={selectedIndex < 0 ? "" : `option:${selectedIndex}`}
      onChange={(event) => {
        return selectValue(event.target.value);
      }}
    >
      <option value="" disabled>
        {"Choose a value"}
      </option>
      <SelectOptions options={options} />
    </select>
  );
}

function _getFieldOptions({
  control,
  state,
  itemPath,
}: Readonly<Pick<Props, "control" | "state" | "itemPath">>): ReturnType<
  typeof ContentFields.getOptionsFromControl
> {
  return ContentFields.getOptionsFromControl({
    control,
    root: state.draft,
    item: getStockValueFromPath({
      value: state.draft,
      path: itemPath,
    }),
  });
}
