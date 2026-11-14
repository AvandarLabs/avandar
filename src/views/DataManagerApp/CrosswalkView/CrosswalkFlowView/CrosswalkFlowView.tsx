import { AppView } from "@/components/layouts/AppView/AppView";
import { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import { CrosswalkHeader } from "@/views/DataManagerApp/CrosswalkView/CrosswalkHeader/CrosswalkHeader";
import { CrosswalkStaleBanner } from "@/views/DataManagerApp/CrosswalkView/CrosswalkHeader/CrosswalkStaleBanner/CrosswalkStaleBanner";
import { CrosswalkStepBody } from "@/views/DataManagerApp/CrosswalkView/CrosswalkStepBody";
import { CrosswalkStepHeading } from "@/views/DataManagerApp/CrosswalkView/CrosswalkStepHeading/CrosswalkStepHeading";
import { CrosswalkStepper } from "@/views/DataManagerApp/CrosswalkView/CrosswalkStepper/CrosswalkStepper";
import { useCrosswalkCatalog } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkCatalog/useCrosswalkCatalog";
import { useCrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkFlow/useCrosswalkFlow";
import { useCrosswalkStepLabels } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkStepLabels/useCrosswalkStepLabels";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { ReactNode } from "react";

type Props = {
  /** The saved crosswalk row; undefined for a new crosswalk. */
  crosswalk: Crosswalk.T | undefined;
  /** The draft the view starts from. Later changes to it are ignored. */
  initialDraft: CrosswalkDraft.T;
  isSaved: boolean;
};

/**
 * The crosswalk once everything it reads has loaded: the header with its
 * facts and actions, the stale banner when a code list its combined
 * dataset embedded has changed, the step bar, and the current step.
 * Opening Map each dataset from the step bar keeps the layout in the URL.
 */
export function CrosswalkFlowView({
  crosswalk,
  initialDraft,
  isSaved,
}: Readonly<Props>): ReactNode {
  const flow = useCrosswalkFlow({
    crosswalkId: initialDraft.crosswalkId,
    initialDraft,
    isSaved,
  });
  const { draft } = flow.state;
  const catalog = useCrosswalkCatalog(CrosswalkDraft.getDatasetIds(draft));
  const labels = useCrosswalkStepLabels({
    hasCombinedDataset:
      (crosswalk?.outputDatasetId ?? draft.outputDatasetId) !== undefined,
  });
  return (
    <AppView>
      <CrosswalkHeader
        crosswalk={crosswalk}
        flow={flow}
        context={catalog.context}
      />
      <CrosswalkStaleBanner
        crosswalk={crosswalk}
        isOnCombineStep={flow.step === "combine"}
        onUpdate={() => {
          flow.goToStepSaving("combine");
        }}
      />
      <CrosswalkStepper
        step={flow.step}
        labels={labels}
        reachableSteps={flow.reachableSteps}
        onStepClick={(step) => {
          flow.goToStepSaving(step, step === "map" ? flow.layoutId : undefined);
        }}
      />
      <CrosswalkStepHeading step={flow.step} labels={labels} />
      <CrosswalkStepBody flow={flow} catalog={catalog} crosswalk={crosswalk} />
    </AppView>
  );
}
