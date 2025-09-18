import { Stack, Title } from "@mantine/core";
import { useMemo } from "react";
import { RawDataRow } from "@/lib/types/common";
import { ObjectDescriptionList } from "@/lib/ui/ObjectDescriptionList";
import { DatasetColumn } from "@/models/datasets/DatasetColumn";
import { getSummary } from "@/models/datasets/DatasetRawData/getSummary";

type Props = {
  rawDatasetRows: RawDataRow[];
  columns: DatasetColumn[];
};

export function DataSummaryView({
  rawDatasetRows,
  columns,
}: Props): JSX.Element {
  const summary = useMemo(() => {
    return getSummary({
      dataRows: rawDatasetRows,
      columns,
    });
  }, [rawDatasetRows, columns]);

  return (
    <Stack>
      <ObjectDescriptionList data={summary} excludeKeys={["columnSummaries"]} />

      {summary.columnSummaries ?
        <Stack>
          <Title order={4}>Column Summaries</Title>
          <ObjectDescriptionList
            data={summary.columnSummaries}
            titleKey="name"
            itemRenderOptions={{
              maxHeight: 400,
              excludeKeys: ["name"],
              keyRenderOptions: {
                mostCommonValue: {
                  keyRenderOptions: {
                    value: {
                      maxItemsCount: 4,
                    },
                  },
                },
              },
            }}
          />
        </Stack>
      : null}
    </Stack>
  );
}
