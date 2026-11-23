import type { StockMessageDescriptor } from "../../contracts/StockContract.types";

/**
 * Inserts exact count or identity values into fixed display prose. Inserted
 * values are used literally and are never read as placeholders.
 */
export function getStockDisplayCopyFromDescriptor({
  descriptor,
  values = {},
}: Readonly<{
  descriptor: Readonly<StockMessageDescriptor>;
  values?: Readonly<Record<string, string | number>>;
}>): string {
  return descriptor.message.replace(
    /\{([a-zA-Z][a-zA-Z0-9]*)\}/g,
    (placeholder, key: string) => {
      if (!Object.hasOwn(values, key)) {
        throw new Error(`Missing display-copy value: ${placeholder}`);
      }
      return String(values[key]);
    },
  );
}
