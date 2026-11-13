import { Trans, useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import {
  buildAddedPairs,
  buildBindingInputs,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import { AttachFooter } from "@/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachFooter";
import { AttachSummaryTable } from "@/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachSummaryTable";
import { AttachSummaryText } from "@/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachSummaryText";
import { useSaveApply } from "@/views/DataManagerApp/ApplyDictionariesView/useSaveApply";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { ApplyCounts } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFacts";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { ApplySaveRequest } from "@/views/DataManagerApp/ApplyDictionariesView/useSaveApply";
import type { ReactNode } from "react";

type Props = {
  dataset: Dataset.T;
  columns: readonly DatasetColumn.T[];
  existingBindings: readonly DictionaryBinding.T[];
  flow: ApplyFlow;
  counts: ApplyCounts;
  lookups: ApplyLookups;
  summary: string;
  /** The preview drawer, between the body and the footer. */
  preview: ReactNode;
};

/**
 * The picked columns, how many bound columns lose their dictionary, and the
 * save.
 */
function useAttachRequest(props: Readonly<Props>): {
  picked: Array<{ column: DatasetColumn.T; pick: ColumnPick }>;
  removedCount: number;
  request: ApplySaveRequest;
} {
  const { state, unmatched } = props.flow;
  const picked = props.columns.flatMap((column) => {
    const pick = state.picks[column.id];
    return pick ? [{ column, pick }] : [];
  });
  const removedCount = props.existingBindings.filter((binding) => {
    return state.picks[binding.datasetColumnId] === undefined;
  }).length;
  const unmatchedByColumnId =
    unmatched.status === "ready" ? unmatched.result : new Map();
  const shared = {
    picks: state.picks,
    resolutions: state.resolutions,
    unmatchedByColumnId,
  };
  const request: ApplySaveRequest = {
    kind: "attach",
    bindings: buildBindingInputs({
      ...shared,
      columns: props.columns,
      codeLists: props.lookups.codeLists,
      isPinned: false,
    }),
    addedPairs: buildAddedPairs(shared),
  };
  return { picked, removedCount, request };
}

/**
 * The Attach step, when nothing converts: what attaching does, one row per
 * picked column, and the button that writes every binding, and any value
 * added to a code list, at once. Attaching needs a connection.
 */
export function AttachStep(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const datasetName = props.dataset.name;
  const { picked, removedCount, request } = useAttachRequest(props);
  const [save, isAttaching] = useSaveApply(props.dataset);
  return (
    <>
      <AppViewBody>
        <Stack gap="xl">
          <AppViewSection title={t`Attach to ${datasetName}`}>
            <AttachSummaryText
              counts={props.counts}
              removedCount={removedCount}
            />
          </AppViewSection>
          {picked.length > 0 ? (
            <AppViewSection title={<Trans>Summary</Trans>} meta={props.summary}>
              <AttachSummaryTable picked={picked} lookups={props.lookups} />
            </AppViewSection>
          ) : null}
        </Stack>
      </AppViewBody>
      {props.preview}
      <AttachFooter
        datasetName={datasetName}
        pickedCount={picked.length}
        removedCount={removedCount}
        isAttaching={isAttaching}
        onBack={() => {
          props.flow.dispatch({ type: "go_to_step", step: "unmatched" });
        }}
        onAttach={() => {
          save(request);
        }}
      />
    </>
  );
}
