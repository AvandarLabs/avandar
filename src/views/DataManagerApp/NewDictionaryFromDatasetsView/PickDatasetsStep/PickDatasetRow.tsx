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
  /** Why the dataset is locked, shown under its name when it is. */
  lockedReason?: ReactNode;
  /**
   * Why the dataset cannot be picked. When set, the row shows unpicked and
   * disabled, with this under the name.
   */
  unavailableReason?: ReactNode;
  onToggle: (datasetId: Dataset.Id) => void;
};

/** The row's checkbox, described by the name's note when there is one. */
function PickDatasetCheckbox(
  props: Readonly<{
    datasetName: string;
    isChecked: boolean;
    isDisabled: boolean;
    noteId: string | undefined;
    onToggle: () => void;
  }>,
): ReactNode {
  const { t } = useLingui();
  const { datasetName } = props;
  return (
    <Checkbox
      aria-label={t`Pick ${datasetName}`}
      aria-describedby={props.noteId}
      checked={props.isChecked}
      disabled={props.isDisabled}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onChange={props.onToggle}
    />
  );
}

/** The dataset's name, with a dimmed note under it when there is one. */
function PickDatasetNameCell(
  props: Readonly<{
    name: string;
    isDimmed: boolean;
    noteId: string;
    note: ReactNode;
  }>,
): ReactNode {
  return (
    <Table.Td>
      <Text size="sm" fw={500} c={props.isDimmed ? "dimmed" : undefined}>
        {props.name}
      </Text>
      {props.note ? (
        <Text id={props.noteId} size="xs" c="dimmed">
          {props.note}
        </Text>
      ) : null}
    </Table.Td>
  );
}

/** The dataset's source, and how many columns it has. */
function PickDatasetDetailCells(
  props: Readonly<Pick<Props, "dataset" | "columnCount">>,
): ReactNode {
  const { i18n } = useLingui();
  const sourceLabels = useDatasetSourceLabels();
  const { dataset } = props;
  return (
    <>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <DatasetSourceIcon sourceType={dataset.sourceType} />
          <Text size="sm">{sourceLabels[dataset.sourceType]}</Text>
        </Group>
      </Table.Td>
      <Table.Td ta="right">
        <Text size="sm">{i18n.number(props.columnCount)}</Text>
      </Table.Td>
    </>
  );
}

/**
 * One dataset on the Pick step. Clicking anywhere on the row picks it. The
 * checkbox stays the keyboard and screen reader control, and its own click
 * does not reach the row, so one click is one toggle. A locked row shows as
 * picked and does nothing on click. An unavailable row shows its reason and
 * does nothing on click. Either reason, when given, is shown under the name
 * and describes the checkbox.
 */
export function PickDatasetRow({
  dataset,
  columnCount,
  isPicked,
  isLocked = false,
  lockedReason,
  unavailableReason,
  onToggle,
}: Readonly<Props>): ReactNode {
  const noteId = useId();
  const isUnavailable = unavailableReason !== undefined;
  const isDisabled = isLocked || isUnavailable;
  const note = isUnavailable ? unavailableReason : lockedReason;
  const toggle = (): void => {
    onToggle(dataset.id);
  };
  return (
    <Table.Tr
      className={css.pickDatasetRow}
      data-locked={isDisabled || undefined}
      onClick={() => {
        if (!isDisabled) {
          toggle();
        }
      }}
    >
      <Table.Td>
        <PickDatasetCheckbox
          datasetName={dataset.name}
          isChecked={!isUnavailable && (isPicked || isLocked)}
          isDisabled={isDisabled}
          noteId={note ? noteId : undefined}
          onToggle={toggle}
        />
      </Table.Td>
      <PickDatasetNameCell
        name={dataset.name}
        isDimmed={isUnavailable}
        noteId={noteId}
        note={note}
      />
      <PickDatasetDetailCells dataset={dataset} columnCount={columnCount} />
    </Table.Tr>
  );
}
