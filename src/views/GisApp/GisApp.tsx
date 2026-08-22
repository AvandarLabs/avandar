import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import css from "@/views/GisApp/GisApp.module.css";
import { GisAppMapShell } from "@/views/GisApp/GisAppMapShell";
import { useDetectedSpatialAvailability } from "@/views/GisApp/useDuckDbSpatialAvailability/useDuckDbSpatialAvailability";
import { useGisApp } from "@/views/GisApp/useGisApp/useGisApp";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ReactNode } from "react";

type Props = { avaMap: AvaMap.T };

/** Coordinates the editable map state with the GIS application shell. */
export function GisApp({ avaMap }: Props): ReactNode {
  const app = useGisApp(avaMap);
  // Starts the Spatial fetch as the map opens rather than when the geometry
  // picker first renders. DuckDB loads Spatial only when something asks, so
  // this screen has to ask. The extension is ~6MB over the wire (~22MB
  // decompressed) so it's best to start loading when the GIS app loads,
  // instead of waiting until the user first attempts to add a layer which
  // would leave the layer picker controls disabled while the extension loads.
  //
  // This is the only trigger in the GIS view, and everything downstream reads
  // the capability passively: `useMapLayersData` gates spatial layer queries
  // on it, and the Area and Buffer map tools gate themselves on it. Removing
  // this line leaves all three waiting on "loading" forever, and none of them
  // would look wrong.
  useDetectedSpatialAvailability();

  return (
    <AppLayout containerProps={{ className: css.canvas }}>
      <GisAppMapShell app={app} />
    </AppLayout>
  );
}
