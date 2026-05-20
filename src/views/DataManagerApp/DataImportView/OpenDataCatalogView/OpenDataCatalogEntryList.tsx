import { Trans } from "@lingui/react/macro";
import { Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import type { OpenDataCatalogEntryRead } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types";

type Props = {
  /** Entries after optional fuzzy search. */
  displayedEntries: readonly OpenDataCatalogEntryRead[];
  /** Currently highlighted catalog entry id. */
  selectedId: string | undefined;
  /** Called when the user picks a row. */
  onSelect: (id: string) => void;
};

/**
 * Scrollable list of open-data catalog rows with selection styling.
 */
export function OpenDataCatalogEntryList({
  displayedEntries,
  selectedId,
  onSelect,
}: Props): JSX.Element {
  if (displayedEntries.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        <Trans>No datasets match your search.</Trans>
      </Text>
    );
  }

  return (
    <Stack gap={6} mah={480} style={{ overflowY: "auto" }}>
      {displayedEntries.map((entry) => {
        const isSelected = entry.id === selectedId;
        return (
          <UnstyledButton
            key={entry.id}
            onClick={() => {
              onSelect(entry.id);
            }}
            w="100%"
          >
            <Paper
              bg="white"
              p="sm"
              radius="md"
              withBorder
              bd={isSelected ? "1px solid neutral.4" : undefined}
              shadow={isSelected ? "xs" : "none"}
              style={{
                transition: "all 0.2s ease-in-out",
              }}
            >
              <Stack gap={4}>
                <Text fw={600} lineClamp={2} size="sm">
                  {entry.displayName}
                </Text>
                <Text c="dimmed" lineClamp={2} size="xs">
                  {entry.externalOrganizationName}
                  {entry.pipelineName ? ` · ${entry.pipelineName}` : ""}
                </Text>
              </Stack>
            </Paper>
          </UnstyledButton>
        );
      })}
    </Stack>
  );
}
