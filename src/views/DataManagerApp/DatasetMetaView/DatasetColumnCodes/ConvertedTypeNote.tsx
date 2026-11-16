import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { avaDataTypeLabel } from "$/copy/avaDataTypeLabel";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ReactNode } from "react";

type Props = {
  dataType: AvaDataType.T;
  codes: ColumnCodes.T;
};

/**
 * A converted column's type, which follows its conversion and cannot be
 * edited, captioned with the dictionary that set it. Shown in the dataset's
 * column list in place of the type select.
 */
export function ConvertedTypeNote({
  dataType,
  codes,
}: Readonly<Props>): ReactNode {
  const { dictionaryName } = codes;
  return (
    <Stack gap={0}>
      <Text size="sm">{avaDataTypeLabel(dataType)}</Text>
      <Text size="xs" c="dimmed">
        {codes.isSourceDeleted ? (
          <Trans>Set by a conversion</Trans>
        ) : (
          <Trans>Set by {dictionaryName}</Trans>
        )}
      </Text>
    </Stack>
  );
}
