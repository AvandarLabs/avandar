import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Checkbox,
  Group,
  Table,
  Tooltip,
  VisuallyHidden,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useId } from "react";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  includedCount: number;
  entryCount: number;
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * The header of the include column: a checkbox that is checked when every
 * entry is included and indeterminate when only some are. Clicking it
 * includes every entry, or leaves every entry out when all are included.
 */
function SelectAllCheckbox({
  includedCount,
  entryCount,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const isAllIncluded = entryCount > 0 && includedCount === entryCount;
  const isSomeIncluded = includedCount > 0 && !isAllIncluded;
  return (
    <Checkbox
      aria-label={
        isAllIncluded ? t`Deselect all columns` : t`Select all columns`
      }
      checked={isAllIncluded}
      indeterminate={isSomeIncluded}
      onChange={() => {
        dispatch({
          type: "set_all_entries_included",
          isIncluded: !isAllIncluded,
        });
      }}
    />
  );
}

/** The Entry name heading, with a hover and focus note on renaming. */
function EntryNameHeading(): ReactNode {
  const { t } = useLingui();
  const explanationId = useId();
  const explanation = t`The name this entry is shown under in the dictionary. Changing it doesn't rename any column in your data.`;
  return (
    <Group gap={4} wrap="nowrap">
      <Trans>Entry name</Trans>
      <Tooltip
        label={explanation}
        multiline
        w={260}
        events={{ hover: true, focus: true, touch: true }}
      >
        <ActionIcon
          variant="transparent"
          color="neutral"
          size="xs"
          aria-label={t`About entry names`}
          aria-describedby={explanationId}
        >
          <IconInfoCircle size={14} aria-hidden />
        </ActionIcon>
      </Tooltip>
      <VisuallyHidden id={explanationId}>{explanation}</VisuallyHidden>
    </Group>
  );
}

/** The column headings of the proposed entries table. */
export function ReviewEntriesTableHead(props: Readonly<Props>): ReactNode {
  return (
    <Table.Thead>
      <Table.Tr>
        <Table.Th w={44}>
          <SelectAllCheckbox {...props} />
        </Table.Th>
        <Table.Th>
          <EntryNameHeading />
        </Table.Th>
        <Table.Th>
          <Trans>Column source</Trans>
        </Table.Th>
        <Table.Th w={160}>
          <Trans>Kind</Trans>
        </Table.Th>
        <Table.Th>
          <Trans>Values seen</Trans>
        </Table.Th>
        <Table.Th w={140}>
          <Trans>What comes next</Trans>
        </Table.Th>
      </Table.Tr>
    </Table.Thead>
  );
}
