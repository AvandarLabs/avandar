import { isBoolean } from "@avandar/utils";
import { Text } from "@mantine/core";
import { useI18nMessages } from "@ui/i18n/useI18nMessages";
import { DateValueItem } from "../DateValueItem";
import type {
  GenericRootData,
  PrimitiveValue,
} from "../../ObjectDescriptionList.types";
import type { PrimitiveValueItemProps as Props } from "../PrimitiveValueItem.types";

/** Built-in date conversion used by TypedPrimitiveValueItem. */
export function DatePrimitiveValueItem<
  T extends PrimitiveValue,
  RootData extends GenericRootData | undefined,
>({
  value,
  onChange,
  editMode = false,
  renderNullString,
  renderUndefinedString,
  dateFormat = "YYYY-MM-DDTHH:mm:ssZ",
  dateTimeZone = "local",
}: Readonly<Props<T, RootData>>): JSX.Element {
  const i18n = useI18nMessages();
  if (isBoolean(value)) {
    return (
      <Text span fs="italic">
        {i18n.invalidDate}
      </Text>
    );
  }
  return (
    <DateValueItem
      editMode={editMode}
      value={value}
      onChange={(newValue) => {
        return onChange?.(newValue as T);
      }}
      renderNullString={renderNullString ?? i18n.noValue}
      renderUndefinedString={renderUndefinedString ?? i18n.noValue}
      dateFormat={dateFormat}
      dateTimeZone={dateTimeZone}
    />
  );
}
