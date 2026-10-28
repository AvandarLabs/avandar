import { propEq } from "@avandar/utils";
import { useLingui } from "@lingui/react";
import { useLingui as useLinguiMacro } from "@lingui/react/macro";
import { StockCopyMessages } from "../../../stock/i18n/StockCopyMessages";
import { ContentFields } from "./ContentFields/ContentFields";
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
}: Props): ReactNode {
  const { i18n } = useLingui();
  const { t } = useLinguiMacro();
  const options = ContentFields.getOptionsFromControl({
    control,
    root: state.draft,
    item: StockCopyMessages.getValueFromPath({
      value: state.draft,
      path: itemPath,
    }),
  });
  const selectedIndex = options.findIndex(
    propEq<{ value: unknown }, "value", unknown>("value", context.value),
  );
  const selectValue = (value: string) => {
    const option = options.find((_, index) => `option:${index}` === value);
    if (option) {
      context.update(option.value);
    }
  };
  return (
    <select
      {...context.field}
      value={selectedIndex < 0 ? "" : `option:${selectedIndex}`}
      onChange={(event) => selectValue(event.target.value)}
    >
      <option value="" disabled>{t`Choose a value`}</option>
      {options.map((option, index) => (
        <option key={`${option.value}-${index}`} value={`option:${index}`}>
          {typeof option.label === "string"
            ? option.label
            : i18n._(option.label)}
        </option>
      ))}
    </select>
  );
}
