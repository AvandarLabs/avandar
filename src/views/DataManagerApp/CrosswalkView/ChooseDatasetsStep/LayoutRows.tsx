import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { ActionIcon, Badge, Button, Group, Table, Text } from "@mantine/core";
import {
  IconChevronDown,
  IconChevronRight,
  IconTrash,
} from "@tabler/icons-react";
import { useRef } from "react";
import css from "@/views/DataManagerApp/CrosswalkView/ChooseDatasetsStep/ChooseDatasetsStep.module.css";
import { LayoutName } from "@/views/DataManagerApp/CrosswalkView/layoutLabel/LayoutName";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { ReactNode, RefObject } from "react";

type Props = {
  layout: CrosswalkDraft.Layout;
  datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset>;
  isExpanded: boolean;
  onToggle: () => void;
  onRemoveDataset: (datasetId: Dataset.Id) => void;
};

/** A layout's name cell: the name, and the Reference tag on the reference. */
function LayoutNameCell(
  props: Readonly<Pick<Props, "layout" | "datasetsById"> & { nameId: string }>,
): ReactNode {
  return (
    <Group gap="xs" wrap="nowrap">
      <LayoutName
        layout={props.layout}
        datasetsById={props.datasetsById}
        nameId={props.nameId}
      />
      {props.layout.isReference ? (
        <Badge size="sm" variant="light" color="primary" tt="none">
          <Trans>Reference</Trans>
        </Badge>
      ) : null}
    </Group>
  );
}

/** The dataset count, as the button that opens the layout's datasets. */
function DatasetsToggle(
  props: Readonly<{
    count: number;
    isExpanded: boolean;
    nameId: string;
    detailsId: string;
    buttonRef: RefObject<HTMLButtonElement | null>;
    onToggle: () => void;
  }>,
): ReactNode {
  const Chevron = props.isExpanded ? IconChevronDown : IconChevronRight;
  return (
    <Button
      ref={props.buttonRef}
      variant="subtle"
      color="neutral"
      size="compact-sm"
      leftSection={<Chevron size={14} aria-hidden />}
      aria-expanded={props.isExpanded}
      aria-controls={props.isExpanded ? props.detailsId : undefined}
      aria-describedby={props.nameId}
      onClick={props.onToggle}
    >
      <Plural value={props.count} one="# dataset" other="# datasets" />
    </Button>
  );
}

/**
 * Where focus goes when a dataset is removed: the next dataset's Remove
 * button, else the previous one's, else the layout's Datasets toggle.
 */
function _getFocusTarget(
  options: Readonly<{
    datasetIds: readonly Dataset.Id[];
    removedId: Dataset.Id;
    removeButtons: ReadonlyMap<string, HTMLButtonElement>;
    toggleButton: HTMLButtonElement | null;
  }>,
): HTMLElement | null {
  const index = options.datasetIds.indexOf(options.removedId);
  const neighborId =
    options.datasetIds[index + 1] ?? options.datasetIds[index - 1];
  return (
    (neighborId ? options.removeButtons.get(neighborId) : undefined) ??
    options.toggleButton
  );
}

/** One dataset of an opened layout, with its Remove button. */
function LayoutDatasetItem(
  props: Readonly<{
    datasetName: string;
    registerButton: (button: HTMLButtonElement | null) => void;
    onRemove: () => void;
  }>,
): ReactNode {
  const { t } = useLingui();
  const { datasetName } = props;
  return (
    <li className={css.layoutDataset}>
      <Text size="sm" truncate>
        {datasetName}
      </Text>
      <ActionIcon
        ref={props.registerButton}
        variant="subtle"
        color="neutral"
        size="sm"
        aria-label={t`Remove ${datasetName}`}
        onClick={props.onRemove}
      >
        <IconTrash size={14} aria-hidden />
      </ActionIcon>
    </li>
  );
}

/** An opened layout's datasets, each with its own Remove button. */
function LayoutDatasetList(
  props: Readonly<
    Pick<Props, "layout" | "datasetsById" | "onRemoveDataset"> & {
      toggleRef: RefObject<HTMLButtonElement | null>;
    }
  >,
): ReactNode {
  const removeButtonsRef = useRef(new Map<string, HTMLButtonElement>());
  const remove = (datasetId: Dataset.Id): void => {
    // Focus moves before the dataset leaves, so it never falls to the page.
    _getFocusTarget({
      datasetIds: props.layout.datasetIds,
      removedId: datasetId,
      removeButtons: removeButtonsRef.current,
      toggleButton: props.toggleRef.current,
    })?.focus();
    props.onRemoveDataset(datasetId);
  };
  return (
    <ul className={css.layoutDatasetList}>
      {props.layout.datasetIds.map((datasetId) => {
        return (
          <LayoutDatasetItem
            key={datasetId}
            datasetName={props.datasetsById.get(datasetId)?.name ?? ""}
            registerButton={(button) => {
              if (button) {
                removeButtonsRef.current.set(datasetId, button);
              } else {
                removeButtonsRef.current.delete(datasetId);
              }
            }}
            onRemove={() => {
              remove(datasetId);
            }}
          />
        );
      })}
    </ul>
  );
}

/**
 * One layout in the Choose datasets table: its name and Reference tag,
 * its dataset count as a disclosure button, and its column count. Opened,
 * a full-width row under it lists its datasets.
 */
export function LayoutRows(props: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  const { layout, isExpanded } = props;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const nameId = `crosswalk-layout-name-${layout.id}`;
  const detailsId = `crosswalk-layout-datasets-${layout.id}`;
  return (
    <Table.Tbody>
      <Table.Tr>
        <Table.Td>
          <LayoutNameCell
            layout={layout}
            datasetsById={props.datasetsById}
            nameId={nameId}
          />
        </Table.Td>
        <Table.Td>
          <DatasetsToggle
            count={layout.datasetIds.length}
            isExpanded={isExpanded}
            nameId={nameId}
            detailsId={detailsId}
            buttonRef={toggleRef}
            onToggle={props.onToggle}
          />
        </Table.Td>
        <Table.Td ta="right">
          <Text size="sm">{i18n.number(layout.columnNames.length)}</Text>
        </Table.Td>
      </Table.Tr>
      {isExpanded ? (
        <Table.Tr id={detailsId}>
          <Table.Td colSpan={3} className={css.layoutDatasets}>
            <LayoutDatasetList
              layout={layout}
              datasetsById={props.datasetsById}
              onRemoveDataset={props.onRemoveDataset}
              toggleRef={toggleRef}
            />
          </Table.Td>
        </Table.Tr>
      ) : null}
    </Table.Tbody>
  );
}
