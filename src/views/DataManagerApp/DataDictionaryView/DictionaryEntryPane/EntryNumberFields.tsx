import { useLingui } from "@lingui/react/macro";
import { Group, NumberInput, Stack, TextInput } from "@mantine/core";
import { findEntryIssue } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntryPane/findEntryIssue";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  entry: DataDictionary.EntryDraft;
  issues: readonly DataDictionary.DraftIssue[];
  canEdit: boolean;
  onChange: (changes: Partial<DataDictionary.EntryDraft>) => void;
};

function _toNumber(value: string | number): number | undefined {
  return typeof value === "number" ? value : undefined;
}

/** The unit and the valid range of a number entry. */
export function EntryNumberFields({
  entry,
  issues,
  canEdit,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const rangeIssue = findEntryIssue({
    issues,
    entryId: entry.id,
    types: ["entry_range_invalid"],
  });

  return (
    <Stack gap="xs">
      <TextInput
        label={t`Unit`}
        placeholder={t`For example, years`}
        value={entry.unit}
        disabled={!canEdit}
        onChange={(event) => {
          onChange({ unit: event.currentTarget.value });
        }}
      />
      <Group grow align="flex-start">
        <NumberInput
          label={t`Lowest valid value`}
          value={entry.validMin ?? ""}
          disabled={!canEdit}
          onChange={(value) => {
            onChange({ validMin: _toNumber(value) });
          }}
        />
        <NumberInput
          label={t`Highest valid value`}
          value={entry.validMax ?? ""}
          disabled={!canEdit}
          error={rangeIssue ? copy.describeIssue(rangeIssue) : undefined}
          onChange={(value) => {
            onChange({ validMax: _toNumber(value) });
          }}
        />
      </Group>
    </Stack>
  );
}
