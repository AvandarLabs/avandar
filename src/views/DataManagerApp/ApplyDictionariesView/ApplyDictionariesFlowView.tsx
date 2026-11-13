import { useMemo } from "react";
import { AppView } from "@/components/layouts/AppView/AppView";
import { ApplyDictionariesHeader } from "@/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesHeader";
import { ApplyDictionariesStepHeading } from "@/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesStepHeading";
import { ApplyDictionariesStepper } from "@/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesStepper";
import { makeApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import { ApplyStepBody } from "@/views/DataManagerApp/ApplyDictionariesView/ApplyStepBody";
import {
  countPicks,
  useApplyFacts,
} from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFacts";
import { useApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ApplyDictionariesData } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyDictionariesData";
import type { ReactNode } from "react";

type Props = {
  dataset: Dataset.T;
  data: ApplyDictionariesData;
  preselectedDictionaryId: DataDictionary.Id | undefined;
};

/**
 * The apply flow once everything it reads has loaded: the header with what
 * the picks add up to, the step bar, and the current step.
 */
export function ApplyDictionariesFlowView({
  dataset,
  data,
  preselectedDictionaryId,
}: Readonly<Props>): ReactNode {
  const flow = useApplyFlow({ data, preselectedDictionaryId });
  const counts = countPicks(flow.state.picks);
  const facts = useApplyFacts({
    counts,
    columnCount: data.columns?.length ?? 0,
    dictionaryCount: flow.state.dictionaryIds?.length ?? 0,
  });
  const { dictionaries, entries, codeLists } = data;
  const lookups = useMemo(() => {
    return makeApplyLookups({ dictionaries, entries, codeLists });
  }, [dictionaries, entries, codeLists]);
  return (
    <AppView>
      <ApplyDictionariesHeader dataset={dataset} facts={facts} />
      <ApplyDictionariesStepper
        step={flow.state.step}
        dispatch={flow.dispatch}
      />
      <ApplyDictionariesStepHeading step={flow.state.step} />
      <ApplyStepBody
        dataset={dataset}
        data={data}
        flow={flow}
        counts={counts}
        lookups={lookups}
        summary={facts.join(" · ")}
      />
    </AppView>
  );
}
