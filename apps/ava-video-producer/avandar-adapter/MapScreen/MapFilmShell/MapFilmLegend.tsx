import { prop } from "@avandar/utils";
import { MapLegend } from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegend";
import type { useMapScreen } from "../useMapScreen";
import type { ReactNode } from "react";

type Props = Pick<ReturnType<typeof useMapScreen>, "layers">;
const _noop = () => {
  return undefined;
};
/** Show visible layers in the same reverse stack order as the native legend. */
export function MapFilmLegend({ layers }: Readonly<Props>): ReactNode {
  return (
    <MapLegend
      layers={[...layers].reverse().filter(prop("isVisible"))}
      hasDrawnDisputedFeature={false}
      isCollapsed={false}
      onToggleCollapsed={_noop}
    />
  );
}
