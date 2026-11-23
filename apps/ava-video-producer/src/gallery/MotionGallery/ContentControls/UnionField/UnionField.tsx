import { propEq } from "@avandar/utils";
import { useState } from "react";
import { ContentField } from "../ContentField/ContentField";
import { ContentFields } from "../ContentFields/ContentFields";
import { UnionVariantSelector } from "./UnionVariantSelector/UnionVariantSelector";
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
}: Readonly<Props>): ReactNode {
  const [selectedType, setSelectedType] = useState(() => {
    return ContentFields.getVariantFromValue({ control, value: context.value })
      .valueType;
  });
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
      <UnionVariantSelector {...{ context, control, activeType, selectType }} />
      <ContentField
        {...{ ...remainingProps, control, context }}
        control={variant.control}
        parentPath={context.path}
      />
    </>
  );
}
