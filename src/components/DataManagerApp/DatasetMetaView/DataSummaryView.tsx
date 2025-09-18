import { Loader, Stack } from "@mantine/core";
import { DatasetRawDataClient } from "@/clients/datasets/DatasetRawDataClient";
import { ObjectDescriptionList } from "@/lib/ui/ObjectDescriptionList";
import { DatasetId } from "@/models/datasets/Dataset";

type Props = {
  datasetId: DatasetId;
};

export function DataSummaryView({ datasetId }: Props): JSX.Element {
  const [summary, isLoadingSummary] =
    DatasetRawDataClient.withLogger().useGetSummary({
      datasetId,
    });

  return (
    <Stack>
      {isLoadingSummary ?
        <Loader />
      : null}
      {summary?.columnSummaries ?
        <>
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
        </>
      : null}
    </Stack>
  );
}
