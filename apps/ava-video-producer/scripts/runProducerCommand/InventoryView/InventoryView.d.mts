/** Public inventory fields shared by capture flows and motion presets. */
type InventoryRow = Readonly<{
  id: string;
  name: string;
  group?: string;
  description?: string;
}>;
/** Searchable shared inventories with details-only Return behavior. */
export const InventoryView: Readonly<{
  filter(
    input: Readonly<{
      rows: readonly InventoryRow[];
      words: readonly string[];
    }>,
  ): readonly InventoryRow[];
  page(
    input: Readonly<{
      rows: readonly InventoryRow[];
      index?: number;
      pageSize?: number;
    }>,
  ): Readonly<{
    rows: readonly InventoryRow[];
    index: number;
    page: number;
    pages: number;
  }>;
  show(
    input: Readonly<{
      rows: readonly InventoryRow[];
      words?: readonly string[];
    }>,
  ): Promise<number>;
}>;
