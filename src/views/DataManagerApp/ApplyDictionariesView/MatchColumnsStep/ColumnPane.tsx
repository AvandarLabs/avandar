import { Trans, useLingui } from "@lingui/react/macro";
import { Stack, Text, Title } from "@mantine/core";
import { avaDataTypeLabel } from "$/copy/avaDataTypeLabel";
import { PickedEntryDetails } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/PickedEntryDetails";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { ApplyColumnRow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { ReactNode } from "react";

type Props = {
  row: ApplyColumnRow;
  pick: ColumnPick | undefined;
  lookups: ApplyLookups;
};

function OtherMatchesNote(props: Readonly<Props>): ReactNode {
  const others = props.row.matches.filter((match) => {
    return match.entryId !== props.pick?.entryId;
  });
  if (others.length === 0) {
    return null;
  }
  const names = others
    .map((match) => {
      const dictionaryName = props.lookups.dictionaryNames.get(
        match.dictionaryId,
      );
      return `${dictionaryName ?? ""} › ${match.entryName}`;
    })
    .join(", ");
  return (
    <Text size="xs" c="dimmed">
      <Trans>Also matches {names}.</Trans>
    </Text>
  );
}

/**
 * The selected column: its type and values, the entry applied to it, and
 * what that does. Sits beside the pairing table.
 */
export function ColumnPane(props: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  const { column, profile } = props.row;
  const typeLabel = avaDataTypeLabel(column.dataType);
  const distinctText = profile ? i18n.number(profile.distinctCount) : undefined;
  return (
    <Stack gap="md">
      <Stack gap={2}>
        <Title order={3} size="h5">
          {column.name}
        </Title>
        <Text size="xs" c="dimmed">
          {distinctText ? (
            <Trans>
              {typeLabel} · {distinctText} different values
            </Trans>
          ) : (
            typeLabel
          )}
        </Text>
      </Stack>
      {props.pick ? (
        <PickedEntryDetails
          row={props.row}
          pick={props.pick}
          lookups={props.lookups}
        />
      ) : (
        <Text size="sm" c="dimmed">
          {props.row.matches.length > 0 ? (
            <Trans>
              Nothing is applied to this column. Pick a match in the table to
              apply it.
            </Trans>
          ) : (
            <Trans>
              No entry in the dictionaries you are using matches this column.
            </Trans>
          )}
        </Text>
      )}
      <OtherMatchesNote {...props} />
    </Stack>
  );
}
