import { Trans, useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { AttachFooter } from "@/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachFooter";
import { AttachSummaryTable } from "@/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachSummaryTable";
import { AttachSummaryText } from "@/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachSummaryText";
import { useAttachDictionaries } from "@/views/DataManagerApp/ApplyDictionariesView/useAttachDictionaries";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { ApplyCounts } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFacts";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { ReactNode } from "react";

type Props = {
  dataset: Dataset.T;
  columns: readonly DatasetColumn.T[];
  existingBindings: readonly DictionaryBinding.T[];
  flow: ApplyFlow;
  counts: ApplyCounts;
  lookups: ApplyLookups;
  summary: string;
};

function _getPicked(
  props: Readonly<Props>,
): Array<{ column: DatasetColumn.T; pick: ColumnPick }> {
  return props.columns.flatMap((column) => {
    const pick = props.flow.state.picks[column.id];
    return pick ? [{ column, pick }] : [];
  });
}

/**
 * The Attach step: what attaching does, one row per picked column, and the
 * button that writes every binding at once. Attaching needs a connection.
 */
export function AttachStep(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const datasetName = props.dataset.name;
  const picked = _getPicked(props);
  const [attach, isAttaching] = useAttachDictionaries(props.dataset);
  const removedCount = props.existingBindings.filter((binding) => {
    return props.flow.state.picks[binding.datasetColumnId] === undefined;
  }).length;
  const bindings = picked.map(({ column, pick }) => {
    return {
      datasetColumnId: column.id,
      ...pick,
      mode: "reference" as const,
      keepsOriginal: false,
      valueOverrides: [],
      isPinned: false,
    };
  });
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
      <AttachFooter
        datasetName={datasetName}
        pickedCount={picked.length}
        removedCount={removedCount}
        isAttaching={isAttaching}
        onBack={() => {
          props.flow.dispatch({ type: "go_to_step", step: "match" });
        }}
        onAttach={() => {
          attach(bindings);
        }}
      />
    </>
  );
}
