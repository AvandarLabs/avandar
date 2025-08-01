import { Stack, Title } from "@mantine/core";
import { useMemo } from "react";
import { ObjectDescriptionList } from "@/lib/ui/ObjectDescriptionList";
import { getSummary } from "@/models/LocalDataset/getSummary";
import { ParsedLocalDataset } from "@/models/LocalDataset/types";

type Props = {
  parsedDataset: ParsedLocalDataset;
};

export function DataSummaryView({ parsedDataset }: Props): JSX.Element {
  const summary = useMemo(() => {
    return getSummary(parsedDataset);
  }, [parsedDataset]);
  console.log(summary);
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
    </Stack>
  );
}
