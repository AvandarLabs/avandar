import { Trans } from "@lingui/react/macro";
import { Badge, Group, Table, Text, UnstyledButton } from "@mantine/core";
import { avaDataTypeLabel } from "$/copy/avaDataTypeLabel";
import { ConnectorLine } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingTable/ConnectorLine";
import { FilledFromCell } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingTable/FilledFromCell";
import { getConnectorVariant } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingTable/getConnectorVariant";
import css from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingTable/MappingTable.module.css";
import { MatchCell } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingTable/MatchCell";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { FillSummary } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingTable/useFillSummary";
import type { ReactNode } from "react";

type Props = {
  column: CrosswalkDraft.Column;
  mapping: CrosswalkDraft.Mapping | undefined;
  isSelected: boolean;
  describeFill: (fill: CrosswalkMapping.Fill) => FillSummary;
  onSelect: () => void;
};

/**
 * A column of the combined dataset: its name, which selects the row, its
 * type, and the Code list tag when a dictionary entry governs it.
 */
function CombinedColumnCell(
  props: Readonly<Pick<Props, "column" | "isSelected" | "onSelect">>,
): ReactNode {
  const { column } = props;
  return (
    <>
      <Group gap="xs" wrap="nowrap">
        <UnstyledButton
          fw={500}
          fz="sm"
          aria-current={props.isSelected || undefined}
          onClick={(event) => {
            // The row selects on click too. One click is one selection.
            event.stopPropagation();
            props.onSelect();
          }}
        >
          {column.name}
        </UnstyledButton>
        {column.entryId ? (
          <Badge size="xs" variant="light" color="neutral" tt="none">
            <Trans>Code list</Trans>
          </Badge>
        ) : null}
      </Group>
      <Text size="xs" c="dimmed">
        {avaDataTypeLabel(column.dataType)}
      </Text>
    </>
  );
}

/**
 * One row of the mapping table: the combined dataset's column, the line to
 * its fill, what fills it for this layout, and why. Clicking anywhere on
 * the row selects it. The column's name is the keyboard control.
 */
export function MappingRow(props: Readonly<Props>): ReactNode {
  const { mapping } = props;
  return (
    <Table.Tr
      className={css.mappingRow}
      data-selected={props.isSelected}
      onClick={props.onSelect}
    >
      <Table.Td>
        <CombinedColumnCell
          column={props.column}
          isSelected={props.isSelected}
          onSelect={props.onSelect}
        />
      </Table.Td>
      <Table.Td className={css.filledFrom}>
        <ConnectorLine variant={getConnectorVariant(mapping)} />
        <FilledFromCell
          summary={mapping ? props.describeFill(mapping.fill) : undefined}
        />
      </Table.Td>
      <Table.Td>
        <MatchCell mapping={mapping} />
      </Table.Td>
    </Table.Tr>
  );
}
