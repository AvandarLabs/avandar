import { Group } from "@mantine/core";
import { LocalDatasetSelect } from "@/components/common/LocalDatasetSelect";

// TODO(pablo): add dataset column selection.
// TODO(pablo): the dataset selector should only show datasets listed in the
// entity configs dataset source.
// TODO(pablo): if only 1 dataset is available, dont let it be changed.
export function DatasetColumnValueExtractorEditor(): JSX.Element {
  return (
    <Group>
      <LocalDatasetSelect label="Dataset" />
      <LocalDatasetSelect label="Field" />
    </Group>
  );
}
