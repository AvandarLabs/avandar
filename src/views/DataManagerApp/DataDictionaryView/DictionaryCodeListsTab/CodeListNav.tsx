import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, NavLink, Stack } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import css from "@/views/DataManagerApp/DataDictionaryView/DictionaryCodeListsTab/DictionaryCodeListsTab.module.css";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

type Props = {
  draft: DataDictionary.Draft;
  selectedCodeListId: DataDictionaryCodeList.Id | undefined;
  canEdit: boolean;
  onSelectCodeList: (codeListId: DataDictionaryCodeList.Id) => void;
  onDraftChange: (draft: DataDictionary.Draft) => void;
};

/** Every code list in the dictionary, and the New code list button. */
export function CodeListNav({
  draft,
  selectedCodeListId,
  canEdit,
  onSelectCodeList,
  onDraftChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();

  return (
    <Stack gap="xs" className={css.dictionaryCodeListsTabList}>
      {draft.codeLists.map((list) => {
        const valueCount = list.pairs.length;
        const entryCount = DataDictionary.getEntriesUsingCodeList(
          draft,
          list.id,
        ).length;
        return (
          <NavLink
            key={list.id}
            active={list.id === selectedCodeListId}
            label={list.name}
            description={t`${plural(valueCount, {
              one: "# value",
              other: "# values",
            })} · ${plural(entryCount, {
              one: "used by # entry",
              other: "used by # entries",
            })}`}
            onClick={() => {
              onSelectCodeList(list.id);
            }}
          />
        );
      })}
      {canEdit ? (
        <Button
          variant="subtle"
          size="compact-sm"
          leftSection={<IconPlus size={14} aria-hidden />}
          onClick={() => {
            const list = DataDictionary.makeNewCodeList(
              draft.codeLists.map((current) => {
                return current.name;
              }),
            );
            onDraftChange({ ...draft, codeLists: [...draft.codeLists, list] });
            onSelectCodeList(list.id);
          }}
        >
          <Trans>New code list</Trans>
        </Button>
      ) : null}
    </Stack>
  );
}
