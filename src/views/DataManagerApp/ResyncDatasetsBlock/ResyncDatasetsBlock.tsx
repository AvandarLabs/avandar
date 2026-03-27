import { Stack, Text } from "@mantine/core";
import { ResyncDatasetCard } from "@/views/DataManagerApp/ResyncDatasetsBlock/ResyncDatasetCard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.types";

type Props = {
  datasets: Dataset[];
};

export function ResyncDatasetsBlock({ datasets }: Props): JSX.Element {
  return (
    <Stack>
      <Text>
        These datasets are listed in your workspace, but their source data could
        not be found in your local storage. In order to continue, you need to
        either re-upload the dataset or delete it from your workspace.
      </Text>
      {datasets.map((dataset) => {
        return <ResyncDatasetCard key={dataset.id} dataset={dataset} />;
      })}
    </Stack>
  );
}
