import { Stack, Text } from "@mantine/core";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { ResyncDatasetCard } from "@/views/DataManagerApp/ResyncDatasetsBlock/ResyncDatasetCard";

type Props = {
  datasets: Dataset.T[];
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
