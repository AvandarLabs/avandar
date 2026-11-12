import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, TextInput } from "@mantine/core";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = {
  filter: string;
  canEdit: boolean;
  onFilterChange: (filter: string) => void;
  onAddEntry: () => void;
};

/** The entries filter and the Add entry button. */
export function DictionaryEntriesToolbar({
  filter,
  canEdit,
  onFilterChange,
  onAddEntry,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();

  return (
    <Group justify="space-between" gap="sm">
      <TextInput
        aria-label={t`Filter entries`}
        placeholder={t`Filter entries or column names`}
        leftSection={<IconSearch size={14} stroke={1.6} />}
        value={filter}
        onChange={(event) => {
          onFilterChange(event.currentTarget.value);
        }}
        w={280}
      />
      {canEdit ? (
        <Button
          variant="default"
          leftSection={<IconPlus size={14} aria-hidden />}
          onClick={onAddEntry}
        >
          <Trans>Add entry</Trans>
        </Button>
      ) : null}
    </Group>
  );
}
