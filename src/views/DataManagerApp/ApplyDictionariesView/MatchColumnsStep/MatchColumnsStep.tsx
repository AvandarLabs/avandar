import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { ColumnPane } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ColumnPane";
import { DictionaryChips } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/DictionaryChips";
import { MatchColumnsFooter } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsFooter";
import css from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep.module.css";
import { NoDictionaryInUse } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/NoDictionaryInUse";
import { PairingSelectTable } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/PairingSelectTable";
import { PairingTable } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/PairingTable";
import { UnmatchedColumnsToggle } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/UnmatchedColumnsToggle";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type {
  ApplyColumnRow,
  ApplyFlow,
} from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { ReactNode } from "react";

/** Past this many dictionaries in use, one Select replaces a column each. */
const MAX_DICTIONARY_COLUMNS = 3;

const PAIRING_TABLE_ID = "apply-dictionaries-pairing-table";

type Props = {
  flow: ApplyFlow;
  dictionaries: readonly DataDictionary.T[];
  lookups: ApplyLookups;
  summary: string;
};

function _getDictionariesInUse(props: Readonly<Props>): DataDictionary.T[] {
  return (props.flow.state.dictionaryIds ?? []).flatMap((dictionaryId) => {
    const dictionary = props.dictionaries.find((candidate) => {
      return candidate.id === dictionaryId;
    });
    return dictionary ? [dictionary] : [];
  });
}

/** The pairing table, or the empty state, and the unmatched toggle. */
function PairingColumn(
  props: Readonly<{
    flow: ApplyFlow;
    inUse: readonly DataDictionary.T[];
    rows: readonly ApplyColumnRow[];
  }>,
): ReactNode {
  const { state, dispatch } = props.flow;
  const Pairing =
    props.inUse.length > MAX_DICTIONARY_COLUMNS
      ? PairingSelectTable
      : PairingTable;
  return (
    <Stack gap="sm" id={PAIRING_TABLE_ID}>
      {props.inUse.length === 0 && props.rows.length === 0 ? (
        <NoDictionaryInUse />
      ) : (
        <Pairing
          rows={props.rows}
          dictionaries={props.inUse}
          state={state}
          dispatch={dispatch}
        />
      )}
      <UnmatchedColumnsToggle
        count={props.flow.unmatchedRows.length}
        isShowing={state.isShowingUnmatched}
        tableId={PAIRING_TABLE_ID}
        onToggle={() => {
          dispatch({ type: "toggle_unmatched" });
        }}
      />
    </Stack>
  );
}

/** The selected column's pane, in the view's side panel. */
function SelectedColumnPane(
  props: Readonly<{
    row: ApplyColumnRow;
    pick: ColumnPick | undefined;
    lookups: ApplyLookups;
  }>,
): ReactNode {
  const { t } = useLingui();
  return (
    <section aria-label={t`Selected column`}>
      <ColumnPane row={props.row} pick={props.pick} lookups={props.lookups} />
    </section>
  );
}

/**
 * The Match columns step: the dictionaries in use, one row per matched
 * column with its picks, and the selected column's pane.
 */
export function MatchColumnsStep(props: Readonly<Props>): ReactNode {
  const { state, dispatch } = props.flow;
  const inUse = _getDictionariesInUse(props);
  const rows = state.isShowingUnmatched
    ? [...props.flow.rows, ...props.flow.unmatchedRows]
    : props.flow.rows;
  const selected = rows.find((row) => {
    return row.column.id === state.selectedColumnId;
  });
  return (
    <>
      <DictionaryChips
        dictionaryIds={state.dictionaryIds ?? []}
        dictionaries={props.dictionaries}
        onAdd={props.flow.addDictionary}
        onRemove={(dictionaryId) => {
          dispatch({ type: "remove_dictionary", dictionaryId });
        }}
      />
      <AppViewBody
        className={css.matchColumnsBody}
        rail={
          selected ? (
            <SelectedColumnPane
              row={selected}
              pick={state.picks[selected.column.id]}
              lookups={props.lookups}
            />
          ) : undefined
        }
      >
        <PairingColumn flow={props.flow} inUse={inUse} rows={rows} />
      </AppViewBody>
      <MatchColumnsFooter summary={props.summary} dispatch={dispatch} />
    </>
  );
}
