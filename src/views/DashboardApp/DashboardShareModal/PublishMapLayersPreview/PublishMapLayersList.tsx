import { Plural } from "@lingui/react/macro";
import { List, Stack, Text } from "@mantine/core";
import { getMapSnapshotLayerSummaries } from "@/clients/maps/MapSnapshot/getMapSnapshotLayerSummaries/getMapSnapshotLayerSummaries";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";
import type { ReactNode } from "react";

type Props = { snapshot: MapSnapshot };

/** One map's published layers and their feature counts. */
export function PublishMapLayersList({ snapshot }: Readonly<Props>): ReactNode {
  return (
    <Stack gap={2}>
      <Text size="sm" fw={500}>
        {snapshot.mapName}
      </Text>
      <List size="xs" spacing={2}>
        {getMapSnapshotLayerSummaries(snapshot).map((summary) => {
          return (
            <List.Item key={summary.layerId}>
              {summary.layerName}:{" "}
              <Plural
                value={summary.featureCount}
                one="# feature"
                other="# features"
              />
            </List.Item>
          );
        })}
      </List>
    </Stack>
  );
}
