import "maplibre-gl/dist/maplibre-gl.css";
import { GisAppMapShell } from "@/views/GisApp/GisAppMapShell";
import { useGisApp } from "@/views/GisApp/useGisApp";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { ReactNode } from "react";

type Props = { avaMap: AvaMap.T };

/** Coordinates the editable map state with the GIS application shell. */
export function GisApp({ avaMap }: Props): ReactNode {
  const app = useGisApp(avaMap);

  return <GisAppMapShell app={app} />;
}
