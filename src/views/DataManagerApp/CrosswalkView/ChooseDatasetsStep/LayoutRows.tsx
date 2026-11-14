import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { ActionIcon, Badge, Button, Group, Table, Text } from "@mantine/core";
import {
  IconChevronDown,
  IconChevronRight,
  IconTrash,
} from "@tabler/icons-react";
import css from "@/views/DataManagerApp/CrosswalkView/ChooseDatasetsStep/ChooseDatasetsStep.module.css";
import { LayoutName } from "@/views/DataManagerApp/CrosswalkView/layoutLabel/LayoutName";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { ReactNode } from "react";

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
    onToggle: () => void;
  }>,
): ReactNode {
  const Chevron = props.isExpanded ? IconChevronDown : IconChevronRight;
  return (
    <Button
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

/** An opened layout's datasets, each with its own Remove button. */
function LayoutDatasetList(
  props: Readonly<Pick<Props, "layout" | "datasetsById" | "onRemoveDataset">>,
): ReactNode {
  const { t } = useLingui();
  return (
    <ul className={css.layoutDatasetList}>
      {props.layout.datasetIds.map((datasetId) => {
        const datasetName = props.datasetsById.get(datasetId)?.name ?? "";
        return (
          <li key={datasetId} className={css.layoutDataset}>
            <Text size="sm" truncate>
              {datasetName}
            </Text>
            <ActionIcon
              variant="subtle"
              color="neutral"
              size="sm"
              aria-label={t`Remove ${datasetName}`}
              onClick={() => {
                props.onRemoveDataset(datasetId);
              }}
            >
              <IconTrash size={14} aria-hidden />
            </ActionIcon>
          </li>
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
            <LayoutDatasetList {...props} />
          </Table.Td>
        </Table.Tr>
      ) : null}
    </Table.Tbody>
  );
}
