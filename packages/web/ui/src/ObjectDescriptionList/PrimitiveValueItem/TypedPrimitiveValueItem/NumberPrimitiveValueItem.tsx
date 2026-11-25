import { isNullish } from "@avandar/utils";
import { useI18nMessages } from "@ui/i18n/useI18nMessages";
import { isStringOrNumber } from "../../guards";
import { NumberValueItem } from "../NumberValueItem";
import type {
  GenericRootData,
  PrimitiveValue,
} from "../../ObjectDescriptionList.types";
import type { PrimitiveValueItemProps as Props } from "../PrimitiveValueItem.types";

/** Built-in number conversion used by TypedPrimitiveValueItem. */
export function NumberPrimitiveValueItem<
  T extends PrimitiveValue,
  RootData extends GenericRootData | undefined,
>({
  value,
  onChange,
  editMode = false,
  renderNullString,
  renderUndefinedString,
}: Readonly<Props<T, RootData>>): JSX.Element {
  const i18n = useI18nMessages();
  return (
    <NumberValueItem
      editMode={editMode}
      value={
        isNullish(value)
          ? value
          : isStringOrNumber(value)
            ? value
            : String(value)
      }
      onChange={(newValue) => {
        return onChange?.(newValue as T);
      }}
      renderNullString={renderNullString ?? i18n.noValue}
      renderUndefinedString={renderUndefinedString ?? i18n.noValue}
    />
  );
}
