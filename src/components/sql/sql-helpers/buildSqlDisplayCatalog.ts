import { propEq } from "@utils";
import type { SqlDisplayCatalog } from "@/components/sql/sql-helpers/sqlDisplay.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

/**
 * Builds a {@link SqlDisplayCatalog} from workspace dataset and column lists.
 */
export function buildSqlDisplayCatalog(options: {
  datasets: ReadonlyArray<{ id: DatasetId; name: string }>;
  columns: ReadonlyArray<{ datasetId: DatasetId; name: string }>;
}): SqlDisplayCatalog {
  return {
    datasets: options.datasets.map((dataset) => {
      const columns = options.columns
        .filter(propEq("datasetId", dataset.id))
        .map((col) => {
          return { name: col.name };
        });
      return {
        id: dataset.id,
        name: dataset.name,
        columns,
      };
    }),
  };
}
