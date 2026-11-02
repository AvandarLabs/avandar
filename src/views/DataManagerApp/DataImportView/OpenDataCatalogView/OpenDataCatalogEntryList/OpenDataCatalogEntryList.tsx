import { Stack, Text, UnstyledButton } from "@mantine/core";
import clsx from "clsx";
import css from "@/views/DataManagerApp/DataImportView/OpenDataCatalogView/OpenDataCatalogEntryList/OpenDataCatalogEntryList.module.css";
import type { OpenDataCatalogEntryRead } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types";
import type { ReactNode } from "react";

type Props = {
  /** Entries after optional fuzzy search. */
  displayedEntries: readonly OpenDataCatalogEntryRead[];
  /** Currently highlighted catalog entry id. */
  selectedId: string | undefined;
  /** Called when the user picks a row. */
  onSelect: (id: string) => void;
};

/**
 * The catalog as a list of rows.
 *
 * Selection is a fill and a weight change, which is both quieter and easier
 * to spot than a border that appears on one of thirty identical boxes. The
 * rows are plain, not bordered, shadowed cards.
 *
 * Only rendered when there is something to list. Which of the two empty
 * situations applies, an unpublished catalog or a query that matched nothing,
 * is the parent's to tell apart, and each wants a different answer.
 */
export function OpenDataCatalogEntryList({
  displayedEntries,
  selectedId,
  onSelect,
}: Props): ReactNode {
  return (
    <Stack gap={2} role="listbox" aria-orientation="vertical">
      {displayedEntries.map((entry) => {
        const isSelected = entry.id === selectedId;
        return (
          <UnstyledButton
            key={entry.id}
            role="option"
            aria-selected={isSelected}
            className={clsx(
              css.openDataCatalogEntryListRow,
              isSelected && css.openDataCatalogEntryListRowSelected,
            )}
            onClick={() => {
              onSelect(entry.id);
            }}
          >
            <Text size="sm" fw={isSelected ? 600 : 500} lineClamp={2}>
              {entry.displayName}
            </Text>
            <Text c="dimmed" lineClamp={1} size="xs">
              {entry.externalOrganizationName}
              {entry.pipelineName ? ` · ${entry.pipelineName}` : ""}
            </Text>
          </UnstyledButton>
        );
      })}
    </Stack>
  );
}
