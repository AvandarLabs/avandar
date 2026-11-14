import { useLingui } from "@lingui/react/macro";
import { Checkbox, Group, Table, Text } from "@mantine/core";
import { useId } from "react";
import { useDatasetSourceLabels } from "@/hooks/datasets/useDatasetSourceLabels";
import { DatasetSourceIcon } from "@/views/DataManagerApp/DatasetSourceIcon";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/PickDatasetsStep/PickDatasetsStep.module.css";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  dataset: Dataset.T;
  columnCount: number;
  isPicked: boolean;
  /**
   * Shown picked and cannot be unpicked, such as a dataset a crosswalk
   * already holds.
   */
  isLocked?: boolean;
  /**
   * Why the dataset cannot be picked. When set, the row shows unpicked and
   * disabled, with this under the name.
   */
  unavailableReason?: ReactNode;
  onToggle: (datasetId: Dataset.Id) => void;
};

/**
 * One dataset on the Pick step. Clicking anywhere on the row picks it. The
 * checkbox stays the keyboard and screen reader control, and its own click
 * does not reach the row, so one click is one toggle. A locked row shows as
 * picked and does nothing on click; an unavailable row shows its reason and
 * does nothing on click.
 */
export function PickDatasetRow({
  dataset,
  columnCount,
  isPicked,
  isLocked = false,
  unavailableReason,
  onToggle,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();
  const sourceLabels = useDatasetSourceLabels();
  const reasonId = useId();
  const datasetName = dataset.name;
  const isUnavailable = unavailableReason !== undefined;
  const isDisabled = isLocked || isUnavailable;

  return (
    <Table.Tr
      className={css.pickDatasetRow}
      data-locked={isDisabled || undefined}
      onClick={() => {
        if (!isDisabled) {
          onToggle(dataset.id);
        }
      }}
    >
      <Table.Td>
        <Checkbox
          aria-label={t`Pick ${datasetName}`}
          aria-describedby={isUnavailable ? reasonId : undefined}
          checked={!isUnavailable && (isPicked || isLocked)}
          disabled={isDisabled}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onChange={() => {
            onToggle(dataset.id);
          }}
        />
      </Table.Td>
      <Table.Td>
        <Text size="sm" fw={500} c={isUnavailable ? "dimmed" : undefined}>
          {datasetName}
        </Text>
        {isUnavailable ? (
          <Text id={reasonId} size="xs" c="dimmed">
            {unavailableReason}
          </Text>
        ) : null}
      </Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <DatasetSourceIcon sourceType={dataset.sourceType} />
          <Text size="sm">{sourceLabels[dataset.sourceType]}</Text>
        </Group>
      </Table.Td>
      <Table.Td ta="right">
        <Text size="sm">{i18n.number(columnCount)}</Text>
      </Table.Td>
    </Table.Tr>
  );
}
