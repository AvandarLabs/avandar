import { MapFirstRunCard } from "@/views/GisApp/panels/MapFirstRunCard/MapFirstRunCard";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { GisAppLayerActions } from "@/views/GisApp/useGisAppLayerActions";
import type { ReactNode } from "react";

type Props = {
  app: GisAppState;
  onAddLayerFromSource: GisAppLayerActions["onAddLayerFromSource"];
};

/** Shows the first-run card only while the map has no layers. */
export function GisAppFirstRunCard({
  app,
  onAddLayerFromSource,
}: Props): ReactNode {
  return app.mapConfig.layers.length === 0 ? (
    <MapFirstRunCard onAddLayerFromSource={onAddLayerFromSource} />
  ) : null;
}
