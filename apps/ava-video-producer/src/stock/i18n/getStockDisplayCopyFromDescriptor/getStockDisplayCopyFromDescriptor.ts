import { sourceMessages } from "../messages.en.generated";
import { stockI18n } from "../stockI18n/stockI18n";
import type { StockMessageDescriptor } from "../../contracts/StockContract.types";

/**
 * Resolves fixed display prose before inserting exact count or identity values.
 */
export function getStockDisplayCopyFromDescriptor({
  descriptor,
  values = {},
}: Readonly<{
  descriptor: Readonly<StockMessageDescriptor>;
  values?: Readonly<Record<string, string | number>>;
}>): string {
  const message =
    stockI18n.locale === "en" &&
    sourceMessages[descriptor.id] !== descriptor.message
      ? descriptor.message
      : stockI18n._(descriptor);
  return message.replace(
    /\{([a-zA-Z][a-zA-Z0-9]*)\}/g,
    (placeholder, key: string) => {
      if (!Object.hasOwn(values, key)) {
        throw new Error(`Missing display-copy value: ${placeholder}`);
      }
      return String(values[key]);
    },
  );
}
