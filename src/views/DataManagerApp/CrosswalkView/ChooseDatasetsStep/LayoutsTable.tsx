import { Trans } from "@lingui/react/macro";
import { Table } from "@mantine/core";
import { useState } from "react";
import { LayoutRows } from "@/views/DataManagerApp/CrosswalkView/ChooseDatasetsStep/LayoutRows";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { ReactNode } from "react";

type Props = {
  draft: CrosswalkDraft.T;
  datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset>;
  onRemoveDataset: (datasetId: Dataset.Id) => void;
};

/** Which layouts are opened, with a toggle for one. */
function useExpandedLayoutIds(): {
  expandedIds: ReadonlySet<string>;
  toggle: (layoutId: CrosswalkLayout.Id) => void;
} {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => {
    return new Set();
  });
  const toggle = (layoutId: CrosswalkLayout.Id): void => {
    setExpandedIds((current) => {
      const nextIds = new Set(current);
      if (nextIds.has(layoutId)) {
        nextIds.delete(layoutId);
      } else {
        nextIds.add(layoutId);
      }
      return nextIds;
    });
  };
  return { expandedIds, toggle };
}

/**
 * The crosswalk's layouts, the reference first: Layout, Datasets (opens
 * the layout's datasets to remove one), and Columns. One `tbody` per
 * layout keeps an opened layout's dataset row with it.
 */
export function LayoutsTable({
  draft,
  datasetsById,
  onRemoveDataset,
}: Readonly<Props>): ReactNode {
  const { expandedIds, toggle } = useExpandedLayoutIds();
  return (
    <Table layout="fixed" verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>
            <Trans>Layout</Trans>
          </Table.Th>
          <Table.Th w="11rem">
            <Trans>Datasets</Trans>
          </Table.Th>
          <Table.Th w="7rem" ta="right">
            <Trans>Columns</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      {draft.layouts.map((layout) => {
        return (
          <LayoutRows
            key={layout.id}
            layout={layout}
            datasetsById={datasetsById}
            isExpanded={expandedIds.has(layout.id)}
            onToggle={() => {
              toggle(layout.id);
            }}
            onRemoveDataset={onRemoveDataset}
          />
        );
      })}
    </Table>
  );
}
