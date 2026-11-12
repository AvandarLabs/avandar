import { Trans, useLingui } from "@lingui/react/macro";
import { Group, SegmentedControl, Stack, Text, TextInput } from "@mantine/core";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  list: DataDictionary.CodeListDraft;
  /** The names of the entries that use this list. */
  usedByNames: readonly string[];
  nameIssue: DataDictionary.DraftIssue | undefined;
  canEdit: boolean;
  onListChange: (list: DataDictionary.CodeListDraft) => void;
};

/** A code list's name, its ordered switch, and which entries use it. */
export function CodeListEditorHeader({
  list,
  usedByNames,
  nameIssue,
  canEdit,
  onListChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const usedByText = usedByNames.join(", ");

  return (
    <Stack gap="md">
      <Group align="flex-end" justify="space-between" gap="md">
        <TextInput
          label={t`Name`}
          value={list.name}
          disabled={!canEdit}
          w={320}
          error={nameIssue ? copy.describeIssue(nameIssue) : undefined}
          onChange={(event) => {
            onListChange({ ...list, name: event.currentTarget.value });
          }}
        />
        <SegmentedControl
          aria-label={t`Order`}
          value={list.isOrdered ? "ordered" : "unordered"}
          disabled={!canEdit}
          data={[
            { value: "unordered", label: t`Unordered` },
            { value: "ordered", label: t`Ordered` },
          ]}
          onChange={(value) => {
            onListChange({ ...list, isOrdered: value === "ordered" });
          }}
        />
      </Group>
      <Text size="sm" c="dimmed">
        {usedByNames.length > 0 ? (
          <Trans>Used by {usedByText}.</Trans>
        ) : (
          <Trans>No entry uses this code list yet.</Trans>
        )}
      </Text>
    </Stack>
  );
}
