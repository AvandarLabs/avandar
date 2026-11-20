import { isNullish } from "@avandar/utils";
import { useI18nMessages } from "@ui/i18n/useI18nMessages";
import { TextValueItem } from "../TextValueItem";
import type {
  GenericRootData,
  PrimitiveValue,
} from "../../ObjectDescriptionList.types";
import type { PrimitiveValueItemProps as Props } from "../PrimitiveValueItem.types";

/** Built-in text conversion used by TypedPrimitiveValueItem. */
export function TextPrimitiveValueItem<
  T extends PrimitiveValue,
  RootData extends GenericRootData | undefined,
>({
  value,
  onChange,
  editMode = false,
  renderAsType,
  renderNullString,
  renderUndefinedString,
  renderEmptyString,
}: Readonly<Props<T, RootData>>): JSX.Element {
  const i18n = useI18nMessages();
  return (
    <TextValueItem
      editMode={editMode}
      value={isNullish(value) ? value : String(value)}
      onChange={(newValue) => {
        return onChange?.(newValue as T);
      }}
      choices={
        typeof renderAsType === "object" ? renderAsType.choices : undefined
      }
      renderNullString={renderNullString ?? i18n.noValue}
      renderUndefinedString={renderUndefinedString ?? i18n.noValue}
      renderEmptyString={renderEmptyString ?? i18n.emptyText}
    />
  );
}
