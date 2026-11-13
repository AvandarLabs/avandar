import { Trans } from "@lingui/react/macro";
import { Stack, Table, Text } from "@mantine/core";
import css from "@/components/dataDictionaries/CodeListPopover/CodeListPopover.module.css";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { ReactNode } from "react";

type Props = {
  codes: ColumnCodes.T;
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
 * What a column's code list says: its name, every pair, and where it came
 * from. The body of `CodeListPopover`.
 */
export function CodeListPopoverContent({ codes }: Readonly<Props>): ReactNode {
  const { dictionaryName, entryName } = codes;
  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">
        {codes.codeListName ?? entryName}
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
      <Text size="xs" c="dimmed">
        <Trans>
          From {dictionaryName} › {entryName}. Attached as reference. The values
          in the data are unchanged.
        </Trans>
      </Text>
    </Stack>
  );
}
