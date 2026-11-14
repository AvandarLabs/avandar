import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { CrosswalkActionsMenu } from "@/views/DataManagerApp/CrosswalkView/CrosswalkHeader/CrosswalkActionsMenu/CrosswalkActionsMenu";
import { CrosswalkNameField } from "@/views/DataManagerApp/CrosswalkView/CrosswalkHeader/CrosswalkNameField/CrosswalkNameField";
import { ExportMappingButton } from "@/views/DataManagerApp/CrosswalkView/CrosswalkHeader/ExportMapping/ExportMappingButton";
import { useCrosswalkFacts } from "@/views/DataManagerApp/CrosswalkView/CrosswalkHeader/useCrosswalkFacts";
import { useCanDeleteCrosswalk } from "@/views/DataManagerApp/CrosswalkView/useCanDeleteCrosswalk";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { CrosswalkContext } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { CrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkFlow/useCrosswalkFlow";
import type { ReactNode } from "react";

type Props = {
  /** The saved crosswalk row; undefined before the first save. */
  crosswalk: Crosswalk.T | undefined;
  flow: CrosswalkFlow;
  context: CrosswalkContext;
};

/**
 * The crosswalk's header band: its editable name, the facts that identify
 * it, and the actions on the whole crosswalk. Export mapping downloads the
 * mapping as a CSV. Deleting is offered to the owner and to Data Sources
 * admins, once there is a crosswalk to delete.
 */
export function CrosswalkHeader({
  crosswalk,
  flow,
  context,
}: Readonly<Props>): ReactNode {
  const facts = useCrosswalkFacts({ draft: flow.state.draft, context });
  const canDelete = useCanDeleteCrosswalk(crosswalk);
  const outputDatasetId = crosswalk?.outputDatasetId;
  const combinedDatasetName = outputDatasetId
    ? context.datasetsById.get(outputDatasetId)?.name
    : undefined;
  return (
    <AppViewHeader
      title={<CrosswalkNameField flow={flow} />}
      facts={facts}
      actions={
        <>
          <ExportMappingButton draft={flow.state.draft} context={context} />
          {crosswalk && canDelete ? (
            <CrosswalkActionsMenu
              crosswalk={crosswalk}
              combinedDatasetName={combinedDatasetName}
            />
          ) : null}
        </>
      }
    />
  );
}
