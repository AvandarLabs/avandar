import { Loader, Stack } from "@mantine/core";
import { ObjectDescriptionList } from "@ui/ObjectDescriptionList/ObjectDescriptionList";
import { DatasetRawDataClient } from "@/clients/datasets/DatasetRawDataClient";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

type Props = {
  datasetId: DatasetId;
};

export function DataSummaryView({ datasetId }: Props): JSX.Element {
  const [summary, isLoadingSummary] = DatasetRawDataClient.useGetSummary({
    datasetId,
    useQueryOptions: {
      staleTime: Infinity,
      refetchOnMount: false,
      retry: false,
      refetchOnWindowFocus: false,
    },
  });

  return (
    <Stack>
      {isLoadingSummary ?
        <Loader />
      : null}
      {summary?.columnSummaries ?
        <>
          <ObjectDescriptionList
            data={{
              "Number of columns": summary.columns,
              "Number of rows": summary.rows,
            }}
          />
          <ObjectDescriptionList
            data={summary.columnSummaries}
            titleKey="name"
            defaultExpanded={true}
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
        </>
      : null}
    </Stack>
  );
}
