import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";

type Props = {
  datasets: ReadonlyArray<{ id: string; name: string }>;
  usedDatasetIds: ReadonlySet<string>;
  /**
   * True when the draft has no datasets yet, so this picker is how the
   * first one is chosen rather than how another is joined.
   */
  isEmpty: boolean;
  onPick: (datasetId: string) => void;
};

/**
 * Picks a workspace dataset that the draft does not already use. Shown under
 * the source sections, and as the only control when every dataset was removed.
 */
export function CaseTypeDraftDatasetPicker({
  datasets,
  usedDatasetIds,
  isEmpty,
  onPick,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  const options = datasets
    .filter((dataset) => {
      return !usedDatasetIds.has(dataset.id);
    })
    .map((dataset) => {
      return { value: dataset.id, label: dataset.name };
    });
  if (options.length === 0) {
    return null;
  }

  return (
    <Select
      size="xs"
      label={isEmpty ? t`Dataset` : t`Add a dataset`}
      placeholder={isEmpty ? t`Choose a dataset` : t`Choose a dataset to join`}
      data={options}
      value={null}
      searchable
      onChange={(datasetId) => {
        if (datasetId) {
          onPick(datasetId);
        }
      }}
    />
  );
}
