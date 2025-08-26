import { Loader, Stack, Title } from "@mantine/core";
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

  /*
  const summary = useMemo(() => {
    return getSummary({
      dataRows: rawDatasetRows,
      columns,
    });
  }, [rawDatasetRows, columns]);
  */

  return (
    <Stack>
      {isLoadingSummary ?
        <Loader />
      : null}
      {summary ?
        <>
          <ObjectDescriptionList
            data={summary}
            excludeKeys={["columnSummaries"]}
          />

          {summary.columnSummaries ?
            <Stack>
              <Title order={4}>Column Summaries</Title>
              <ObjectDescriptionList
                data={summary.columnSummaries}
                titleKey="name"
                itemRenderOptions={{
                  maxHeight: 400,
                  excludeKeys: ["name"],
                  childRenderOptions: {
                    mostCommonValue: {
                      childRenderOptions: {
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
        </>
      : null}
    </Stack>
  );
}
