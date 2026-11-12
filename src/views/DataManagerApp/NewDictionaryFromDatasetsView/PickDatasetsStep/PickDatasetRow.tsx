import { useLingui } from "@lingui/react/macro";
import { Checkbox, Group, Table, Text } from "@mantine/core";
import { useDatasetSourceLabels } from "@/hooks/datasets/useDatasetSourceLabels";
import { DatasetSourceIcon } from "@/views/DataManagerApp/DatasetSourceIcon";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/PickDatasetsStep/PickDatasetsStep.module.css";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  dataset: Dataset.T;
  columnCount: number;
  isPicked: boolean;
  onToggle: (datasetId: Dataset.Id) => void;
};

/**
 * One dataset on the Pick step. Clicking anywhere on the row picks it. The
 * checkbox stays the keyboard and screen reader control, and its own click
 * does not reach the row, so one click is one toggle.
 */
export function PickDatasetRow({
  dataset,
  columnCount,
  isPicked,
  onToggle,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const sourceLabels = useDatasetSourceLabels();
  const datasetName = dataset.name;

  return (
    <Table.Tr
      className={css.pickDatasetRow}
      onClick={() => {
        onToggle(dataset.id);
      }}
    >
      <Table.Td>
        <Checkbox
          aria-label={t`Pick ${datasetName}`}
          checked={isPicked}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onChange={() => {
            onToggle(dataset.id);
          }}
        />
      </Table.Td>
      <Table.Td>
        <Text size="sm" fw={500}>
          {datasetName}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <DatasetSourceIcon sourceType={dataset.sourceType} />
          <Text size="sm">{sourceLabels[dataset.sourceType]}</Text>
        </Group>
      </Table.Td>
      <Table.Td ta="right">
        <Text size="sm">{columnCount}</Text>
      </Table.Td>
    </Table.Tr>
  );
}
