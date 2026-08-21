import "maplibre-gl/dist/maplibre-gl.css";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import css from "@/views/GisApp/GisApp.module.css";
import { GisAppMapShell } from "@/views/GisApp/GisAppMapShell";
import { useDetectedSpatialAvailability } from "@/views/GisApp/useDuckDbSpatialAvailability/useDuckDbSpatialAvailability";
import { useGisApp } from "@/views/GisApp/useGisApp/useGisApp";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { ReactNode } from "react";

type Props = { avaMap: AvaMap.T };

/** Coordinates the editable map state with the GIS application shell. */
export function GisApp({ avaMap }: Props): ReactNode {
  const app = useGisApp(avaMap);
  // Starts the Spatial fetch as the map opens rather than when the geometry
  // picker first renders. DuckDB loads Spatial only when something asks, so
  // this screen has to ask, and asking here gives the ~23MB extension the
  // whole time the user spends adding a layer to arrive. Do not ask only from
  // the picker instead: that leaves the control disabled for seconds after the
  // inspector opens, which reads as broken rather than loading.
  useDetectedSpatialAvailability();

  return (
    <AppLayout containerProps={{ className: css.canvas }}>
      <GisAppMapShell app={app} />
    </AppLayout>
  );
}
