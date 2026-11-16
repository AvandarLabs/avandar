import { useCallback, useMemo, useRef, useState } from "react";
import { AppView } from "@/components/layouts/AppView/AppView";
import { ApplyDictionariesHeader } from "@/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesHeader";
import { ApplyDictionariesStepHeading } from "@/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesStepHeading";
import { ApplyDictionariesStepper } from "@/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesStepper";
import { isConvertingPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import { makeApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import { ApplyStepBody } from "@/views/DataManagerApp/ApplyDictionariesView/ApplyStepBody";
import { ApplyPreviewDrawer } from "@/views/DataManagerApp/ApplyDictionariesView/PreviewDrawer/ApplyPreviewDrawer";
import {
  countPicks,
  useApplyFacts,
} from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFacts";
import { useApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import { useApplyStepLabels } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyStepLabels";
import { useApplyTargets } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyTargets";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ApplyStep } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { ApplyDictionariesData } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyDictionariesData";
import type { ApplyCounts } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFacts";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { ReactNode, RefObject } from "react";

type Props = {
  dataset: Dataset.T;
  data: ApplyDictionariesData;
  preselectedDictionaryId: DataDictionary.Id | undefined;
};

/** How many values no pair matches, once they are read. */
function _countUnmatched(flow: ApplyFlow): number | undefined {
  if (flow.unmatched.status !== "ready") {
    return undefined;
  }
  return [...flow.unmatched.result.values()].reduce((total, values) => {
    return total + values.length;
  }, 0);
}

/**
 * The drawer while it is open. It takes focus only when Preview data has
 * just opened it, and closing it returns focus to Preview data.
 */
function usePreview(
  props: Readonly<Props & { flow: ApplyFlow; lookups: ApplyLookups }>,
): {
  preview: ReactNode;
  buttonRef: RefObject<HTMLButtonElement | null>;
  toggle: () => void;
} {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpening, setIsOpening] = useState(false);
  const { flow } = props;
  const isOpen = flow.state.isPreviewOpen;
  const toggle = (): void => {
    setIsOpening(!isOpen);
    flow.dispatch({ type: "set_preview_open", isOpen: !isOpen });
  };
  const close = (): void => {
    flow.dispatch({ type: "set_preview_open", isOpen: false });
    buttonRef.current?.focus();
  };
  const clearOpening = useCallback(() => {
    setIsOpening(false);
  }, []);
  const preview = isOpen ? (
    <ApplyPreviewDrawer
      dataset={props.dataset}
      columns={props.data.columns ?? []}
      flow={flow}
      lookups={props.lookups}
      onClose={close}
      takesFocusOnOpen={isOpening}
      onFocused={clearOpening}
    />
  ) : null;
  return { preview, buttonRef, toggle };
}

/** The labels, facts, and lookups the frame shows. */
function useFrame(props: Readonly<Props & { flow: ApplyFlow }>): {
  counts: ApplyCounts;
  facts: string[];
  labels: Record<ApplyStep, string>;
  lookups: ApplyLookups;
} {
  const { flow, data } = props;
  const counts = countPicks(flow.state.picks);
  const facts = useApplyFacts({
    counts,
    columnCount: data.columns?.length ?? 0,
    dictionaryCount: flow.state.dictionaryIds?.length ?? 0,
  });
  const labels = useApplyStepLabels({
    isConverting: Object.values(flow.state.picks).some(isConvertingPick),
    isLinkedDataset: flow.targets?.isLinkedDataset ?? false,
    unmatchedCount: _countUnmatched(flow),
  });
  const { dictionaries, entries, codeLists } = data;
  const lookups = useMemo(() => {
    return makeApplyLookups({ dictionaries, entries, codeLists });
  }, [dictionaries, entries, codeLists]);
  return { counts, facts, labels, lookups };
}

/**
 * The apply flow once everything it reads has loaded: the header with what
 * the picks add up to and Preview data, the step bar, the current step,
 * and the preview drawer between the step and its footer.
 */
export function ApplyDictionariesFlowView(props: Readonly<Props>): ReactNode {
  const targets = useApplyTargets({
    dataset: props.dataset,
    existingBindings: props.data.existingBindings,
  });
  const flow = useApplyFlow({
    data: props.data,
    preselectedDictionaryId: props.preselectedDictionaryId,
    targets,
  });
  const { counts, facts, labels, lookups } = useFrame({ ...props, flow });
  const { preview, buttonRef, toggle } = usePreview({
    ...props,
    flow,
    lookups,
  });
  return (
    <AppView>
      <ApplyDictionariesHeader
        dataset={props.dataset}
        facts={facts}
        isPreviewOpen={flow.state.isPreviewOpen}
        isPreviewAvailable={!flow.isMatching}
        onTogglePreview={toggle}
        previewButtonRef={buttonRef}
      />
      <ApplyDictionariesStepper
        step={flow.state.step}
        labels={labels}
        dispatch={flow.dispatch}
      />
      <ApplyDictionariesStepHeading step={flow.state.step} labels={labels} />
      <ApplyStepBody
        dataset={props.dataset}
        data={props.data}
        flow={flow}
        counts={counts}
        lookups={lookups}
        summary={facts.join(" · ")}
        preview={preview}
      />
    </AppView>
  );
}
