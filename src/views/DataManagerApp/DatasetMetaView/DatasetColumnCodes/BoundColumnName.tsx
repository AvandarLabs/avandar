import { Group } from "@mantine/core";
import { CodeListPopover } from "@/components/dataDictionaries/CodeListPopover/CodeListPopover";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { ReactNode } from "react";

type Props = {
  name: string;
  codes: ColumnCodes.T;
};

/**
 * A bound column's name in the dataset's column list: the name, then the
 * tag that opens its code list.
 */
export function BoundColumnName({ name, codes }: Readonly<Props>): ReactNode {
  return (
    <Group gap={4} wrap="nowrap">
      <span>{name}</span>
      {codes.pairs.length > 0 ? (
        <CodeListPopover columnName={name} codes={codes} />
      ) : null}
    </Group>
  );
}
