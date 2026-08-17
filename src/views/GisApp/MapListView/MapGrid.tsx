import { SimpleGrid } from "@mantine/core";
import { MapCard } from "@/views/GisApp/MapListView/MapCard";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { ReactNode } from "react";

type Props = { avaMaps: readonly AvaMap.T[]; workspaceSlug: string };

/** Renders workspace maps as navigation cards. */
export function MapGrid({ avaMaps, workspaceSlug }: Props): ReactNode {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
      {avaMaps.map((avaMap) => {
        return (
          <MapCard
            key={avaMap.id}
            avaMap={avaMap}
            workspaceSlug={workspaceSlug}
          />
        );
      })}
    </SimpleGrid>
  );
}
