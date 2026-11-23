import { isNullish } from "@avandar/utils";
import { useI18nMessages } from "@ui/i18n/useI18nMessages";
import { BooleanValueItem } from "../BooleanValueItem";
import type {
  GenericRootData,
  PrimitiveValue,
} from "../../ObjectDescriptionList.types";
import type { PrimitiveValueItemProps as Props } from "../PrimitiveValueItem.types";

/** Built-in boolean conversion used by TypedPrimitiveValueItem. */
export function BooleanPrimitiveValueItem<
  T extends PrimitiveValue,
  RootData extends GenericRootData | undefined,
>({
  value,
  onChange,
  editMode = false,
  renderNullString,
  renderUndefinedString,
  renderBooleanTrue,
  renderBooleanFalse,
}: Readonly<Props<T, RootData>>): JSX.Element {
  const i18n = useI18nMessages();
  return (
    <BooleanValueItem
      editMode={editMode}
      value={isNullish(value) ? value : Boolean(value)}
      onChange={(newValue) => {
        return onChange?.(newValue as T);
      }}
      renderNullString={renderNullString ?? i18n.noValue}
      renderUndefinedString={renderUndefinedString ?? i18n.noValue}
      renderBooleanTrue={renderBooleanTrue ?? i18n.yes}
      renderBooleanFalse={renderBooleanFalse ?? i18n.no}
    />
  );
}
