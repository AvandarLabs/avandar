import { Trans, useLingui } from "@lingui/react/macro";
import { Checkbox, Stack, Text } from "@mantine/core";
import { ColumnValuesTable } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ColumnValuesTable";
import { DirectionSwitch } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/DirectionSwitch";
import { ModeSwitch } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ModeSwitch";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type {
  ApplyDictionariesAction,
  ColumnPick,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { ConversionCopy } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/useConversionCopy";
import type { ApplyColumnRow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { Dispatch, ReactNode } from "react";

type Props = {
  row: ApplyColumnRow;
  pick: ColumnPick;
  lookups: ApplyLookups;
  copy: ConversionCopy;
  dispatch: Dispatch<ApplyDictionariesAction>;
};

function AppliedFrom(
  props: Readonly<{
    dictionaryName: string;
    entryName: string;
    codeListName: string | undefined;
  }>,
): ReactNode {
  const { dictionaryName, entryName, codeListName } = props;
  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed">
        <Trans>Applying</Trans>
      </Text>
      <Text size="sm" fw={500}>
        <Trans>
          {dictionaryName} › {entryName}
        </Trans>
      </Text>
      {codeListName ? (
        <Text size="xs" c="dimmed">
          <Trans>Code list: {codeListName}</Trans>
        </Text>
      ) : null}
    </Stack>
  );
}

function DirectionNote({
  direction,
}: Readonly<Pick<ColumnPick, "direction">>): ReactNode {
  return (
    <Text size="xs" c="dimmed">
      {direction === "decode" ? (
        <Trans>Chosen from the data: these values are codes.</Trans>
      ) : (
        <Trans>Chosen from the data: these values are labels.</Trans>
      )}
    </Text>
  );
}

function DescriptionOnly({
  description,
}: Readonly<{ description: string | undefined }>): ReactNode {
  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed">
        <Trans>Description added to the column</Trans>
      </Text>
      <Text size="sm">{description || <Trans>No description yet</Trans>}</Text>
      <Text size="xs" c="dimmed">
        <Trans>
          This entry has no codes, so only its description is attached.
        </Trans>
      </Text>
    </Stack>
  );
}

function KeepOriginalCheckbox(
  props: Readonly<{
    columnName: string;
    isChecked: boolean;
    onChange: (isChecked: boolean) => void;
  }>,
): ReactNode {
  const { t } = useLingui();
  const originalName = `${props.columnName}_original`;
  return (
    <Checkbox
      size="xs"
      label={t`Also keep the original values in a new column, ${originalName}`}
      checked={props.isChecked}
      onChange={(event) => {
        props.onChange(event.currentTarget.checked);
      }}
    />
  );
}

function CodedDetails(
  props: Readonly<
    Omit<Props, "lookups"> & { codeList: DataDictionaryCodeList.T }
  >,
): ReactNode {
  const { row, pick, dispatch } = props;
  const columnId = row.column.id;
  const isConverting = pick.mode === "convert";
  const values = row.profile?.values;
  return (
    <>
      <ModeSwitch
        mode={pick.mode}
        copy={props.copy}
        onChange={(mode) => {
          dispatch({ type: "set_mode", columnId, mode });
        }}
      />
      {isConverting ? (
        <DirectionSwitch
          direction={pick.direction}
          isFromData={pick.isDirectionFromData}
          onChange={(direction) => {
            dispatch({ type: "set_direction", columnId, direction });
          }}
        />
      ) : (
        <DirectionNote direction={pick.direction} />
      )}
      {values ? (
        <ColumnValuesTable
          values={values}
          pairs={props.codeList.pairs}
          direction={pick.direction}
          mode={pick.mode}
        />
      ) : null}
      {isConverting ? (
        <KeepOriginalCheckbox
          columnName={row.column.name}
          isChecked={pick.keepsOriginal}
          onChange={(keepsOriginal) => {
            dispatch({ type: "set_keeps_original", columnId, keepsOriginal });
          }}
        />
      ) : null}
    </>
  );
}

/**
 * What applying the picked entry does to a column: where it comes from,
 * whether its values convert or stay as they are, and what each value in
 * the column means or becomes.
 */
export function PickedEntryDetails(props: Readonly<Props>): ReactNode {
  const { pick, lookups } = props;
  const entry = lookups.entries.get(pick.entryId);
  const codeList = pick.codeListId
    ? lookups.codeLists.get(pick.codeListId)
    : undefined;
  return (
    <Stack gap="md">
      <AppliedFrom
        dictionaryName={lookups.dictionaryNames.get(pick.dictionaryId) ?? ""}
        entryName={entry?.name ?? ""}
        codeListName={codeList?.name}
      />
      {codeList ? (
        <CodedDetails {...props} codeList={codeList} />
      ) : (
        <DescriptionOnly description={entry?.description} />
      )}
    </Stack>
  );
}
