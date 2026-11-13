import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { ColumnPane } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ColumnPane";
import { MatchColumnsChips } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsChips";
import { MatchColumnsFooter } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsFooter";
import css from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep.module.css";
import { NoDictionaryInUse } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/NoDictionaryInUse";
import { PairingSelectTable } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/PairingSelectTable";
import { PairingTable } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/PairingTable";
import { UnmatchedColumnsToggle } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/UnmatchedColumnsToggle";
import { useConversionCopy } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/useConversionCopy";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  ApplyDictionariesAction,
  ColumnPick,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { ConversionCopy } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/useConversionCopy";
import type {
  ApplyColumnRow,
  ApplyFlow,
} from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { Dispatch, ReactNode } from "react";

/** Past this many dictionaries in use, one Select replaces a column each. */
const MAX_DICTIONARY_COLUMNS = 3;

const PAIRING_TABLE_ID = "apply-dictionaries-pairing-table";

type Props = {
  flow: ApplyFlow;
  dataset: Dataset.T;
  dictionaries: readonly DataDictionary.T[];
  lookups: ApplyLookups;
  summary: string;
  /** The preview drawer, between the body and the footer. */
  preview: ReactNode;
};

function _getDictionariesInUse(props: Readonly<Props>): DataDictionary.T[] {
  return (props.flow.state.dictionaryIds ?? []).flatMap((dictionaryId) => {
    const dictionary = props.dictionaries.find((candidate) => {
      return candidate.id === dictionaryId;
    });
    return dictionary ? [dictionary] : [];
  });
}

/** The rows the table shows: matched ones, then unmatched when shown. */
function _getShownRows(flow: ApplyFlow): readonly ApplyColumnRow[] {
  return flow.state.isShowingUnmatched
    ? [...flow.rows, ...flow.unmatchedRows]
    : flow.rows;
}

/** The pairing table, or the empty state, and the unmatched toggle. */
function PairingColumn(
  props: Readonly<{
    flow: ApplyFlow;
    inUse: readonly DataDictionary.T[];
    rows: readonly ApplyColumnRow[];
    copy: ConversionCopy;
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
          copy={props.copy}
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
    copy: ConversionCopy;
    dispatch: Dispatch<ApplyDictionariesAction>;
  }>,
): ReactNode {
  const { t } = useLingui();
  return (
    <section aria-label={t`Selected column`}>
      <ColumnPane
        row={props.row}
        pick={props.pick}
        lookups={props.lookups}
        copy={props.copy}
        dispatch={props.dispatch}
      />
    </section>
  );
}

/**
 * The Match columns step: the dictionaries in use and Convert all, one row
 * per matched column with its picks and Values chip, and the selected
 * column's pane with how its dictionary is applied.
 */
export function MatchColumnsStep(props: Readonly<Props>): ReactNode {
  const { state, dispatch } = props.flow;
  const inUse = _getDictionariesInUse(props);
  const rows = _getShownRows(props.flow);
  const selected = rows.find((row) => {
    return row.column.id === state.selectedColumnId;
  });
  const copy = useConversionCopy({
    datasetName: props.dataset.name,
    targets: props.flow.targets,
  });
  return (
    <>
      <MatchColumnsChips
        flow={props.flow}
        dictionaries={props.dictionaries}
        copy={copy}
      />
      <AppViewBody
        className={css.matchColumnsBody}
        rail={
          selected ? (
            <SelectedColumnPane
              row={selected}
              pick={state.picks[selected.column.id]}
              lookups={props.lookups}
              copy={copy}
              dispatch={dispatch}
            />
          ) : undefined
        }
      >
        <PairingColumn
          flow={props.flow}
          inUse={inUse}
          rows={rows}
          copy={copy}
        />
      </AppViewBody>
      {props.preview}
      <MatchColumnsFooter summary={props.summary} dispatch={dispatch} />
    </>
  );
}
