import { PlaceDatasetStep } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceDatasetStep";
import { PlaceForm } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceForm/PlaceForm";
import { PlaceLocationStep } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceLocationStep";
import type { PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";
import type { ReactNode } from "react";

type Props = { controller: PlaceToolController };

/**
 * The place popover's current step: a places dataset first (unless the draft
 * edits one already), then a location, then the form.
 */
export function PlaceToolSteps({ controller }: Props): ReactNode {
  const draft = controller.state.draft;
  if (!draft) {
    return null;
  }
  if (!draft.datasetId && !controller.targetDatasetId) {
    return <PlaceDatasetStep controller={controller} />;
  }
  if (!draft.coordinate) {
    return <PlaceLocationStep controller={controller} />;
  }
  return (
    <PlaceForm
      key={draft.placeId ?? "new"}
      draft={draft}
      coordinate={draft.coordinate}
      isSaving={controller.isSaving}
      onChangeLocation={controller.state.clearCoordinate}
      onSubmit={controller.savePlace}
    />
  );
}
