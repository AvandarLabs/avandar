import "maplibre-gl/dist/maplibre-gl.css";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { ReactNode } from "react";

import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import css from "@/views/GisApp/GisApp.module.css";
import { GisAppMapShell } from "@/views/GisApp/GisAppMapShell";
import { useGisApp } from "@/views/GisApp/useGisApp/useGisApp";

type Props = { avaMap: AvaMap.T };

/** Coordinates the editable map state with the GIS application shell. */
export function GisApp({ avaMap }: Props): ReactNode {
  const app = useGisApp(avaMap);

  return (
    <AppLayout containerProps={{ className: css.canvas }}>
      <GisAppMapShell app={app} />
    </AppLayout>
  );
}
