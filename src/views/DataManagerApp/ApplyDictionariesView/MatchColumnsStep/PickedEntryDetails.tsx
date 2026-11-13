import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { ColumnValuesTable } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ColumnValuesTable";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { ApplyColumnRow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { ReactNode } from "react";

type Props = {
  row: ApplyColumnRow;
  pick: ColumnPick;
  lookups: ApplyLookups;
};

function AppliedFrom(
  props: Readonly<{
    dictionaryName: string;
    entryName: string;
    codeListName: string | undefined;
  }>,
): ReactNode {
  const { dictionaryName, entryName, codeListName } = props;
  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed">
        <Trans>Applying</Trans>
      </Text>
      <Text size="sm" fw={500}>
        <Trans>
          {dictionaryName} › {entryName}
        </Trans>
      </Text>
      {codeListName ? (
        <Text size="xs" c="dimmed">
          <Trans>Code list: {codeListName}</Trans>
        </Text>
      ) : null}
    </Stack>
  );
}

function ReferenceExplanation({
  direction,
}: Readonly<Pick<ColumnPick, "direction">>): ReactNode {
  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed">
        <Trans>How to apply the dictionary</Trans>
      </Text>
      <Text size="sm" fw={500}>
        <Trans>Attached as reference</Trans>
      </Text>
      <Text size="xs" c="dimmed">
        <Trans>
          Your data stays the same, which is what you want for models and
          exports that need the original values. Hover the column to see the
          labels.
        </Trans>
      </Text>
      <Text size="xs" c="dimmed">
        {direction === "decode" ? (
          <Trans>Chosen from the data: these values are codes.</Trans>
        ) : (
          <Trans>Chosen from the data: these values are labels.</Trans>
        )}
      </Text>
    </Stack>
  );
}

function DescriptionOnly({
  description,
}: Readonly<{ description: string | undefined }>): ReactNode {
  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed">
        <Trans>Description added to the column</Trans>
      </Text>
      <Text size="sm">{description || <Trans>No description yet</Trans>}</Text>
      <Text size="xs" c="dimmed">
        <Trans>
          This entry has no codes, so only its description is attached.
        </Trans>
      </Text>
    </Stack>
  );
}

function CodedDetails(
  props: Readonly<{
    row: ApplyColumnRow;
    pick: ColumnPick;
    codeList: DataDictionaryCodeList.T;
  }>,
): ReactNode {
  const values = props.row.profile?.values;
  return (
    <>
      <ReferenceExplanation direction={props.pick.direction} />
      {values ? (
        <ColumnValuesTable
          values={values}
          pairs={props.codeList.pairs}
          direction={props.pick.direction}
        />
      ) : null}
    </>
  );
}

/**
 * What applying the picked entry does to a column: where it comes from,
 * that the data stays the same, and what each value in the column means.
 */
export function PickedEntryDetails({
  row,
  pick,
  lookups,
}: Readonly<Props>): ReactNode {
  const entry = lookups.entries.get(pick.entryId);
  const codeList = pick.codeListId
    ? lookups.codeLists.get(pick.codeListId)
    : undefined;
  return (
    <Stack gap="md">
      <AppliedFrom
        dictionaryName={lookups.dictionaryNames.get(pick.dictionaryId) ?? ""}
        entryName={entry?.name ?? ""}
        codeListName={codeList?.name}
      />
      {codeList ? (
        <CodedDetails row={row} pick={pick} codeList={codeList} />
      ) : (
        <DescriptionOnly description={entry?.description} />
      )}
    </Stack>
  );
}
