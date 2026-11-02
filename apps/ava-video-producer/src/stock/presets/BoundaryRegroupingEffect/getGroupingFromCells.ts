import type { Input } from "./BoundaryRegroupingEffect.schema";
/** Data for getGroupingFromCells. */
type GetGroupingFromCellsResult = {
  zoneIndex: number;
  cells: Array<{
    id: string;
    label: string;
    column: number;
    row: number;
    records: number;
    population: number;
  }>;
  records: number;
  population: number;
  value: number;
  id: string;
  label: string;
  cellIds: string[];
};

/** Aggregate numerators and denominators before a single division. */
export function getGroupingFromCells({
  input,
  index,
}: Readonly<{ input: Input; index: number }>): GetGroupingFromCellsResult[] {
  return input.groupings[index].zones.map((zone, zoneIndex) => {
    const cells = input.cells.filter((cell) => zone.cellIds.includes(cell.id));
    const records = cells.reduce((total, cell) => total + cell.records, 0);
    const population = cells.reduce(
      (total, cell) => total + cell.population,
      0,
    );
    return {
      ...zone,
      zoneIndex,
      cells,
      records,
      population,
      value:
        input.measure === "count"
          ? records
          : (records * input.rateBase) / population,
    };
  });
}
