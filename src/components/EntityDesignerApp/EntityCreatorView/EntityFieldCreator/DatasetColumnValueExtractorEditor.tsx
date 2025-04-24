import { Group } from "@mantine/core";
import { LocalDatasetSelect } from "@/components/common/LocalDatasetSelect";

export function DatasetColumnValueExtractorEditor(): JSX.Element {
  // TODO(pablo): add dataset column selection.
  return (
    <Group>
      <LocalDatasetSelect label="okay" />
      <LocalDatasetSelect label="TBD" />
    </Group>
  );
}
