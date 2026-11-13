import { Trans } from "@lingui/react/macro";
import { Stack, Table, Text } from "@mantine/core";
import css from "@/components/dataDictionaries/CodeListPopover/CodeListPopover.module.css";
import { CodeListPopoverFooter } from "@/components/dataDictionaries/CodeListPopover/CodeListPopoverFooter";
import { UnlabeledValuesNote } from "@/components/dataDictionaries/CodeListPopover/UnlabeledValuesNote";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  codes: ColumnCodes.T;
  /** The column's name in the dataset, for the count of unlabeled values. */
  columnName: string;
  /** Set where the count of unlabeled values can be read. */
  datasetId: Dataset.Id | undefined;
};

function PairLabel({ pair }: Readonly<{ pair: ColumnCodes.Pair }>): ReactNode {
  const label = pair.label.trim();
  return (
    <>
      {label === "" ? (
        <Text span c="dimmed" fs="italic" size="sm">
          <Trans>No label yet</Trans>
        </Text>
      ) : (
        label
      )}
      {pair.isMissing ? (
        <Text span c="dimmed" size="sm">
          {" "}
          <Trans>(missing value)</Trans>
        </Text>
      ) : null}
    </>
  );
}

/**
 * What a column's code list says: its name, every pair, where it came from,
 * what it did to the values, and, for a converted column, how many values
 * have no label. The body of `CodeListPopover`.
 */
export function CodeListPopoverContent({
  codes,
  columnName,
  datasetId,
}: Readonly<Props>): ReactNode {
  const { entryName } = codes;
  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">
        {codes.codeListName || entryName || <Trans>Code list</Trans>}
      </Text>
      <Table className={css.codeListPopoverTable} verticalSpacing={2}>
        <Table.Tbody>
          {codes.pairs.map((pair) => {
            return (
              <Table.Tr key={pair.code}>
                <Table.Td className={css.codeListPopoverCode}>
                  {pair.code}
                </Table.Td>
                <Table.Td>
                  <PairLabel pair={pair} />
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
      <CodeListPopoverFooter codes={codes} />
      {codes.mode === "convert" && datasetId ? (
        <UnlabeledValuesNote
          datasetId={datasetId}
          columnName={columnName}
          codes={codes}
        />
      ) : null}
    </Stack>
  );
}
