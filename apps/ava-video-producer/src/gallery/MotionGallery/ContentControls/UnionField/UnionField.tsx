import { propEq } from "@avandar/utils";
import { useLingui } from "@lingui/react";
import { useLingui as useLinguiMacro } from "@lingui/react/macro";
import { useState } from "react";
import { ContentField } from "../ContentField/ContentField";
import { ContentFields } from "../ContentFields/ContentFields";
import styles from "./UnionField.module.css";
import type { StockControl } from "../../../../stock/contracts/StockContract.types";
import type { Props as ContentFieldProps } from "../ContentField/ContentField";
import type { ContentFieldContext } from "../useContentField";
import type { ReactNode } from "react";
type Props = ContentFieldProps & {
  control: Extract<
    StockControl,
    {
      kind: "union";
    }
  >;
  context: ContentFieldContext;
};
/**
 * Type selection is editor state. Numeric-looking authored strings stay
 * strings.
 */
export function UnionField({
  control,
  context,
  ...remainingProps
}: Props): ReactNode {
  const { i18n } = useLingui();
  const { t } = useLinguiMacro();
  const [selectedType, setSelectedType] = useState(
    () =>
      ContentFields.getVariantFromValue({ control, value: context.value })
        .valueType,
  );
  const activeType =
    context.value === ""
      ? selectedType
      : ContentFields.getVariantFromValue({ control, value: context.value })
          .valueType;
  const variant = control.variants.find(propEq("valueType", activeType))!;
  const selectType = (value: string) => {
    const chosen = control.variants.find(
      propEq<{ valueType: unknown }, "valueType", unknown>("valueType", value),
    )!;
    setSelectedType(chosen.valueType);
    context.update(ContentFields.getBlankValueFromControl(chosen.control));
  };
  return (
    <>
      <label>
        <span>{t`Value type for ${context.label}`}</span>
        <select
          className={styles.unionFieldVariant}
          value={activeType}
          onChange={(event) => selectType(event.target.value)}
        >
          {control.variants.map((item) => (
            <option key={item.valueType} value={item.valueType}>
              {i18n._(item.label)}
            </option>
          ))}
        </select>
      </label>
      <ContentField
        {...{ ...remainingProps, control, context }}
        control={variant.control}
        parentPath={context.path}
      />
    </>
  );
}
