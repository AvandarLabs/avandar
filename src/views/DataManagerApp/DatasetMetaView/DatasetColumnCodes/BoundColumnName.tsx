import { Group, Text } from "@mantine/core";
import { CodeListPopover } from "@/components/dataDictionaries/CodeListPopover/CodeListPopover";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  name: string;
  codes: ColumnCodes.T;
  datasetId: Dataset.Id;
};

/**
 * A bound column's name in the dataset's column list: the name, at the size
 * an unbound column's name takes, then the tag that opens its code list.
 */
export function BoundColumnName({
  name,
  codes,
  datasetId,
}: Readonly<Props>): ReactNode {
  return (
    <Group gap={4} wrap="nowrap">
      <Text span>{name}</Text>
      {codes.pairs.length > 0 ? (
        <CodeListPopover
          columnName={name}
          codes={codes}
          datasetId={datasetId}
        />
      ) : null}
    </Group>
  );
}
