import { Trans } from "@lingui/react/macro";
import { Stack, Text, UnstyledButton } from "@mantine/core";
import clsx from "clsx";
import css from "@/views/DataManagerApp/DataImportView/OpenDataCatalogView/OpenDataCatalogView.module.css";
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
 * Each row used to be its own bordered, shadowed card inside a bordered
 * panel inside a bordered card. Selection is a fill and a weight change,
 * which is both quieter and easier to spot than a border that only appears
 * on one of thirty identical boxes.
 */
export function OpenDataCatalogEntryList({
  displayedEntries,
  selectedId,
  onSelect,
}: Props): ReactNode {
  if (displayedEntries.length === 0) {
    return (
      <Text c="dimmed" size="sm" p="sm">
        <Trans>No datasets match your search.</Trans>
      </Text>
    );
  }

  return (
    <Stack gap={2} role="listbox" aria-orientation="vertical">
      {displayedEntries.map((entry) => {
        const isSelected = entry.id === selectedId;
        return (
          <UnstyledButton
            key={entry.id}
            role="option"
            aria-selected={isSelected}
            className={clsx(css.entryRow, isSelected && css.entryRowSelected)}
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
