import { describe, expect, it } from "vitest";

import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import { truncateSchemaForOffline } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/truncateSchemaForOffline/truncateSchemaForOffline";

describe("truncateSchemaForOffline", () => {
  it("keeps dataset labels when there are no columns yet", () => {
    const schema = {
      datasets: [
        { id: "id-deaths", name: "LONG_us_deaths.csv" },
        { id: "id-cases", name: "LONG_us_confirmed_cases.csv" },
      ],
      columns: [],
    };

    const truncated = truncateSchemaForOffline(schema);

    expect(truncated.datasets).toHaveLength(2);
    expect(truncated.columns).toHaveLength(0);
  });

  it("cuts the Phase 0 fixture schema block by at least 60% with aliases", () => {
    const fixture = makePhase0Fixture();
    const truncated = truncateSchemaForOffline(fixture);
    const before = formatUuidSchemaBlock(truncated);
    const after = SqlTableAlias.formatSchemaBlock({
      aliases: SqlTableAlias.fromDatasets(truncated.datasets),
      columns: truncated.columns,
    });

    expect(before.length).toBe(5804);
    expect(after.length).toBe(711);
    expect(after.length).toBeLessThanOrEqual(
      SqlTableAlias.MAX_SCHEMA_BLOCK_CHARS,
    );
    expect(after.length / before.length).toBeLessThanOrEqual(0.4);
    expect(after).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
  });
});

function formatUuidSchemaBlock(schema: {
  datasets: ReadonlyArray<{ id: string; name: string }>;
  columns: ReadonlyArray<{
    dataset_id: string;
    name: string;
    data_type: string;
  }>;
}): string {
  const datasetLines = schema.datasets
    .map((dataset) => {
      return `- table name: "${dataset.id}" | label: ${dataset.name}`;
    })
    .join("\n");
  const columnLines = schema.columns
    .map((column) => {
      return `- "${column.name}" (${column.data_type}) in table "${column.dataset_id}"`;
    })
    .join("\n");
  return `Available datasets (SQL FROM must use table name, never label):\n${datasetLines}\n\nSchema:\n${columnLines}`;
}

function makePhase0Fixture(): {
  datasets: Array<{ id: string; name: string }>;
  columns: Array<{ dataset_id: string; name: string; data_type: string }>;
} {
  const datasets = Array.from({ length: 12 }, (_, datasetIndex) => {
    const id = `00000000-0000-4000-8000-${String(datasetIndex).padStart(12, "0")}`;
    return {
      id,
      name: datasetIndex === 3 ? "Cholera cases" : `Dataset ${datasetIndex}`,
    };
  });
  const columns = datasets.flatMap((dataset) => {
    return Array.from({ length: 24 }, (_, columnIndex) => {
      return {
        dataset_id: dataset.id,
        name: `col_${String(columnIndex).padStart(2, "0")}`,
        data_type: "string",
      };
    });
  });
  return { datasets, columns };
}
