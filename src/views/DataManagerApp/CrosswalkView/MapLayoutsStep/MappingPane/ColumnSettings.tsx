import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Select, Stack, TextInput } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { ColumnTypeSelect } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/ColumnTypeSelect";
import { getColumnNameProblem } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/getColumnNameProblem/getColumnNameProblem";
import { useColumnNameError } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/useColumnNameError";
import { useDictionaryNames } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/useDictionaryNames";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type {
  CrosswalkAction,
  CrosswalkContext,
} from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { ComboboxData } from "@mantine/core";
import type { Dispatch, ReactNode } from "react";

type Props = {
  draft: CrosswalkDraft.T;
  column: CrosswalkDraft.Column;
  context: CrosswalkContext;
  dispatch: Dispatch<CrosswalkAction>;
};

/** The entry Select's value for "No code list". */
const NO_ENTRY = "";

/** Renames the column when the field is left, if the name is usable. */
function ColumnNameInput({
  draft,
  column,
  context,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const toError = useColumnNameError();
  const [name, setName] = useState(column.name);
  const problem = getColumnNameProblem({
    name,
    draft,
    exceptColumnId: column.id,
  });
  const commit = (): void => {
    if (problem === undefined && name.trim() !== column.name) {
      dispatch({
        type: "column_changed",
        columnId: column.id,
        changes: { name: name.trim() },
        context,
      });
    }
  };
  return (
    <TextInput
      size="xs"
      label={t`Name`}
      value={name}
      error={toError(problem, name)}
      onChange={(event) => {
        setName(event.currentTarget.value);
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          commit();
        }
      }}
    />
  );
}

/**
 * The entry Select's options: "No code list", then every entry with a code
 * list, grouped by dictionary in the user's dictionary order.
 */
function useEntryOptions(context: CrosswalkContext): ComboboxData {
  const { t } = useLingui();
  const dictionaryNames = useDictionaryNames();
  const entries = [...context.entriesById.values()]
    .filter((entry) => {
      return entry.codeLists.length > 0;
    })
    .sort((entryA, entryB) => {
      return (
        entryA.dictionaryRank - entryB.dictionaryRank ||
        entryA.position - entryB.position
      );
    });
  const dictionaryIds = [
    ...new Set(
      entries.map((entry) => {
        return entry.dictionaryId;
      }),
    ),
  ];
  const groups = dictionaryIds.map((dictionaryId) => {
    return {
      group: dictionaryNames.get(dictionaryId) ?? "",
      items: entries
        .filter((entry) => {
          return entry.dictionaryId === dictionaryId;
        })
        .map((entry) => {
          return { value: entry.entryId, label: entry.entryName };
        }),
    };
  });
  return [{ value: NO_ENTRY, label: t`No code list` }, ...groups];
}

function EntrySelect({
  column,
  context,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const options = useEntryOptions(context);
  return (
    <Select
      size="xs"
      label={t`Dictionary entry`}
      searchable
      allowDeselect={false}
      value={column.entryId ?? NO_ENTRY}
      data={options}
      onChange={(value) => {
        const entryId = value ? (value as DataDictionaryEntry.Id) : null;
        if (entryId !== (column.entryId ?? null)) {
          dispatch({
            type: "column_changed",
            columnId: column.id,
            changes: { entryId },
            context,
          });
        }
      }}
    />
  );
}

/**
 * The selected column of the combined dataset itself: its name, the type
 * of an ungoverned column (a governed column's type follows its code list
 * and Labels or Codes), the dictionary entry that governs it, and Remove
 * column, unless it is the only column.
 */
export function ColumnSettings(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { draft, column, context, dispatch } = props;
  const columnName = column.name;
  return (
    <Stack gap="sm">
      <ColumnNameInput {...props} />
      {column.entryId ? null : (
        <ColumnTypeSelect
          value={column.dataType}
          onChange={(dataType) => {
            dispatch({
              type: "column_changed",
              columnId: column.id,
              changes: { dataType },
              context,
            });
          }}
        />
      )}
      <EntrySelect {...props} />
      <Button
        variant="subtle"
        color="danger"
        size="compact-xs"
        justify="flex-start"
        leftSection={<IconTrash size={14} aria-hidden />}
        disabled={draft.columns.length <= 1}
        aria-label={t`Remove column ${columnName}`}
        onClick={() => {
          dispatch({ type: "column_removed", columnId: column.id });
        }}
      >
        <Trans>Remove column</Trans>
      </Button>
    </Stack>
  );
}
