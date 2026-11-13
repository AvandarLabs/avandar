import { Trans, useLingui } from "@lingui/react/macro";
import { Group, Table, VisuallyHidden } from "@mantine/core";
import { IconTag } from "@tabler/icons-react";
import css from "@/views/DataManagerApp/ApplyDictionariesView/PreviewDrawer/ApplyPreviewDrawer.module.css";
import { getPreviewCellStatus } from "@/views/DataManagerApp/ApplyDictionariesView/PreviewDrawer/previewColumns";
import type {
  PreviewCellStatus,
  PreviewColumnPlan,
} from "@/views/DataManagerApp/ApplyDictionariesView/PreviewDrawer/previewColumns";
import type {
  PreviewCell,
  PreviewRow,
} from "@/views/DataManagerApp/ApplyDictionariesView/usePreviewRows";
import type { ReactNode } from "react";

type Props = {
  /** The columns to show, with their index in every row. */
  shown: ReadonlyArray<{ index: number; plan: PreviewColumnPlan }>;
  rows: readonly PreviewRow[];
};

const EMPTY_CELL: PreviewCell = { raw: "", converted: undefined };

function PreviewHeader({
  plan,
}: Readonly<{ plan: PreviewColumnPlan }>): ReactNode {
  return (
    <Table.Th>
      <Group gap={4} wrap="nowrap">
        {plan.column.name}
        {plan.isReference ? (
          <>
            <IconTag size={12} aria-hidden />
            <VisuallyHidden>
              <Trans>attached as reference</Trans>
            </VisuallyHidden>
          </>
        ) : null}
      </Group>
    </Table.Th>
  );
}

function CellValue(
  props: Readonly<{ cell: PreviewCell; status: PreviewCellStatus }>,
): ReactNode {
  const { t } = useLingui();
  const { cell, status } = props;
  if (status === "changed") {
    return (
      <>
        <del className={css.previewOld}>{cell.raw}</del>{" "}
        <ins className={css.previewNew}>
          {cell.converted === "" ? (
            <span className={css.previewEmpty}>{t`empty`}</span>
          ) : (
            cell.converted
          )}
        </ins>
      </>
    );
  }
  if (status === "unmatched") {
    return (
      <>
        {cell.raw}
        <VisuallyHidden>{t`, not in the list`}</VisuallyHidden>
      </>
    );
  }
  return cell.raw;
}

/**
 * The preview's rows: each shown column's stored values, what converted
 * columns turn them into, and which values stay unmatched.
 */
export function PreviewTable({ shown, rows }: Readonly<Props>): ReactNode {
  return (
    <Table stickyHeader fz="xs" verticalSpacing={4} horizontalSpacing="sm">
      <Table.Thead>
        <Table.Tr>
          {shown.map(({ index, plan }) => {
            return <PreviewHeader key={index} plan={plan} />;
          })}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row, rowIndex) => {
          return (
            // The rows have no identity of their own; their order is fixed.
            <Table.Tr key={rowIndex}>
              {shown.map(({ index, plan }) => {
                const cell = row[index] ?? EMPTY_CELL;
                const status = getPreviewCellStatus(cell, plan.unmatchedKeys);
                return (
                  <Table.Td
                    key={index}
                    className={css.previewCell}
                    data-status={status}
                  >
                    <CellValue cell={cell} status={status} />
                  </Table.Td>
                );
              })}
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
