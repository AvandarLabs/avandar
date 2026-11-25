import { ConvertAllControls } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ConvertAllControls";
import { DictionaryChips } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/DictionaryChips";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ConversionCopy } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/useConversionCopy";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { ReactNode } from "react";

type Props = {
  flow: ApplyFlow;
  /** Every dictionary in the workspace. */
  dictionaries: readonly DataDictionary.T[];
  copy: ConversionCopy;
};

/**
 * The band above the pairing table: the dictionaries in use, and "For
 * every column" on its trailing edge.
 */
export function MatchColumnsChips({
  flow,
  dictionaries,
  copy,
}: Readonly<Props>): ReactNode {
  const { state, dispatch } = flow;
  return (
    <DictionaryChips
      dictionaryIds={state.dictionaryIds ?? []}
      dictionaries={dictionaries}
      onAdd={flow.addDictionary}
      onRemove={(dictionaryId) => {
        dispatch({ type: "remove_dictionary", dictionaryId });
      }}
      end={
        <ConvertAllControls
          picks={state.picks}
          copy={copy}
          dispatch={dispatch}
        />
      }
    />
  );
}
