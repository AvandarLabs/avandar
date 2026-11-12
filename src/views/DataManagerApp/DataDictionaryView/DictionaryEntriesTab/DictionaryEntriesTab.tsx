import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { useMemo, useState } from "react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { DictionaryEntriesEmptyNote } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab/DictionaryEntriesEmptyNote";
import css from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab/DictionaryEntriesTab.module.css";
import { DictionaryEntriesTable } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab/DictionaryEntriesTable";
import { DictionaryEntriesToolbar } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab/DictionaryEntriesToolbar";
import { DictionaryEntryPane } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntryPane/DictionaryEntryPane";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { ReactNode } from "react";

type Props = {
  draft: DataDictionary.Draft;
  issues: readonly DataDictionary.DraftIssue[];
  canEdit: boolean;
  onDraftChange: (draft: DataDictionary.Draft) => void;
  onOpenCodeList: (codeListId: DataDictionaryCodeList.Id) => void;
};

function _matchesFilter(
  entry: DataDictionary.EntryDraft,
  query: string,
): boolean {
  return (
    query === "" ||
    [entry.name, ...entry.columnNames].some((name) => {
      return DataDictionary.normalizeKey(name).includes(query);
    })
  );
}

/** The filter, the selected entry, and adding an entry for the tab. */
function useEntriesTabState(
  options: Readonly<{
    draft: DataDictionary.Draft;
    onDraftChange: (draft: DataDictionary.Draft) => void;
  }>,
): {
  filter: string;
  setFilter: (filter: string) => void;
  rows: DataDictionary.EntryDraft[];
  selected: DataDictionary.EntryDraft | undefined;
  setSelectedId: (entryId: DataDictionaryEntry.Id) => void;
  addEntry: () => void;
} {
  const { draft, onDraftChange } = options;
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<
    DataDictionaryEntry.Id | undefined
  >(draft.entries[0]?.id);
  const query = DataDictionary.normalizeKey(filter);
  const rows = useMemo(() => {
    return draft.entries.filter((entry) => {
      return _matchesFilter(entry, query);
    });
  }, [draft.entries, query]);
  const selected =
    draft.entries.find((entry) => {
      return entry.id === selectedId;
    }) ?? draft.entries[0];
  const addEntry = (): void => {
    const entry = DataDictionary.makeNewEntry(
      draft.entries.map((current) => {
        return current.name;
      }),
    );
    onDraftChange({ ...draft, entries: [...draft.entries, entry] });
    setSelectedId(entry.id);
  };

  return { filter, setFilter, rows, selected, setSelectedId, addEntry };
}

/**
 * Every entry in the dictionary beside the selected entry's pane. The filter
 * matches an entry's own name and every column name it also matches.
 */
export function DictionaryEntriesTab(props: Readonly<Props>): ReactNode {
  const { draft, issues, canEdit, onDraftChange, onOpenCodeList } = props;
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const { filter, setFilter, rows, selected, setSelectedId, addEntry } =
    useEntriesTabState({ draft, onDraftChange });
  const listNames = new Map(
    draft.codeLists.map((list) => {
      return [list.id, list.name] as const;
    }),
  );
  const selectedName = selected?.name || t`entry`;

  return (
    <div className={css.dictionaryEntriesTab}>
      <Stack gap="sm" miw={0}>
        <DictionaryEntriesToolbar
          filter={filter}
          canEdit={canEdit}
          onFilterChange={setFilter}
          onAddEntry={addEntry}
        />
        <DictionaryEntriesTable
          rows={rows}
          selectedId={selected?.id}
          listNames={listNames}
          kindLabels={copy.kindLabels}
          onSelect={setSelectedId}
        />
        {rows.length === 0 ? (
          <DictionaryEntriesEmptyNote
            hasEntries={draft.entries.length > 0}
            filter={filter}
          />
        ) : null}
      </Stack>
      {selected ? (
        <aside
          className={css.dictionaryEntriesTabPane}
          aria-label={t`Edit ${selectedName}`}
        >
          <DictionaryEntryPane
            draft={draft}
            entry={selected}
            issues={issues}
            canEdit={canEdit}
            onDraftChange={onDraftChange}
            onOpenCodeList={onOpenCodeList}
          />
        </aside>
      ) : null}
    </div>
  );
}
