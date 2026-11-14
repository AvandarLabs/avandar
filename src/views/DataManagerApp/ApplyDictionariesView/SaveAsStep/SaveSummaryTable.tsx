import { Trans, useLingui } from "@lingui/react/macro";
import { Group, Stack, Table, Text } from "@mantine/core";
import { IconTag } from "@tabler/icons-react";
import { getWhatHappens } from "@/views/DataManagerApp/ApplyDictionariesView/SaveAsStep/saveRequest";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { WhatHappens } from "@/views/DataManagerApp/ApplyDictionariesView/SaveAsStep/saveRequest";
import type { ReactNode } from "react";

type Props = {
  datasetName: string;
  columns: readonly DatasetColumn.T[];
  picks: Readonly<Record<string, ColumnPick>>;
  existingBindings: readonly DictionaryBinding.T[];
  lookups: ApplyLookups;
  /** Whether the conversions go to a new linked dataset. */
  isLinkedTarget: boolean;
};

function useConversionText(
  happens: Extract<WhatHappens, { kind: "decode" | "encode" }>,
  isLinkedTarget: boolean,
): string {
  const { t } = useLingui();
  if (happens.kind === "decode") {
    return isLinkedTarget
      ? t`Codes become labels in the linked dataset`
      : t`Codes become labels`;
  }
  return isLinkedTarget
    ? t`Labels become codes in the linked dataset`
    : t`Labels become codes`;
}

function ConversionCell(
  props: Readonly<{
    happens: Extract<WhatHappens, { kind: "decode" | "encode" }>;
    pick: ColumnPick;
    columnName: string;
    datasetName: string;
    isLinkedTarget: boolean;
  }>,
): ReactNode {
  const { t } = useLingui();
  const text = useConversionText(props.happens, props.isLinkedTarget);
  const originalName = `${props.columnName}_original`;
  const datasetName = props.datasetName;
  return (
    <Stack gap={2}>
      <Text size="sm">{text}</Text>
      {props.pick.keepsOriginal ? (
        <Text
          size="xs"
          c="dimmed"
        >{t`Keeps the original values in ${originalName}`}</Text>
      ) : null}
      {props.isLinkedTarget && props.happens.restoresSource ? (
        <Text
          size="xs"
          c="dimmed"
        >{t`Back to the original values in ${datasetName}`}</Text>
      ) : null}
    </Stack>
  );
}

function WhatHappensCell(
  props: Readonly<{
    happens: WhatHappens;
    pick: ColumnPick | undefined;
    columnName: string;
    datasetName: string;
    isLinkedTarget: boolean;
  }>,
): ReactNode {
  const { happens } = props;
  switch (happens.kind) {
    case "decode":
    case "encode":
      return props.pick ? (
        <ConversionCell {...props} happens={happens} pick={props.pick} />
      ) : null;
    case "reference":
      return (
        <Group gap={6} wrap="nowrap">
          <IconTag size={14} aria-hidden />
          <Trans>Attached as reference, values unchanged</Trans>
        </Group>
      );
    case "restored":
      return <Trans>Back to the original values</Trans>;
    case "described":
      return <Trans>Description added</Trans>;
    case "removed":
      return happens.restoresValues ? (
        <Trans>Removed, back to the original values</Trans>
      ) : (
        <Trans>Removed</Trans>
      );
  }
}

function SummaryRow(
  props: Readonly<
    Pick<Props, "datasetName" | "lookups" | "isLinkedTarget"> & {
      column: DatasetColumn.T;
      pick: ColumnPick | undefined;
      existing: DictionaryBinding.T | undefined;
    }
  >,
): ReactNode {
  const { column, pick, existing, lookups } = props;
  const dictionaryId = pick?.dictionaryId ?? existing?.dictionaryId;
  const entryId = pick?.entryId ?? existing?.entryId;
  const dictionaryName = dictionaryId
    ? (lookups.dictionaryNames.get(dictionaryId) ?? "")
    : "";
  const entryName = entryId ? (lookups.entries.get(entryId)?.name ?? "") : "";
  return (
    <Table.Tr>
      <Table.Td fw={500}>{column.name}</Table.Td>
      <Table.Td>
        <Trans>
          {dictionaryName} › {entryName}
        </Trans>
      </Table.Td>
      <Table.Td>
        <WhatHappensCell
          happens={getWhatHappens({ pick, existing })}
          pick={pick}
          columnName={column.name}
          datasetName={props.datasetName}
          isLinkedTarget={props.isLinkedTarget}
        />
      </Table.Td>
    </Table.Tr>
  );
}

/**
 * One row per column the save touches, in the dataset's order: where its
 * entry comes from and what happens to it. A column losing its dictionary
 * is listed too.
 */
export function SaveSummaryTable(props: Readonly<Props>): ReactNode {
  const existingByColumnId = new Map(
    props.existingBindings.map((binding) => {
      return [binding.datasetColumnId, binding] as const;
    }),
  );
  const touched = props.columns.filter((column) => {
    return (
      props.picks[column.id] !== undefined || existingByColumnId.has(column.id)
    );
  });
  return (
    <Table layout="fixed" verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w="24%">
            <Trans>Column</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>From</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>What happens</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {touched.map((column) => {
          return (
            <SummaryRow
              key={column.id}
              {...props}
              column={column}
              pick={props.picks[column.id]}
              existing={existingByColumnId.get(column.id)}
            />
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
