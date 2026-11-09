import { useLingui } from "@lingui/react/macro";
import { Button, Group, Select, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { getBufferFilterTargetsFromLayers } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/getBufferFilterTargetsFromLayers/getBufferFilterTargetsFromLayers";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layers: readonly MapLayer.T[];
  bufferLayerId: MapLayer.Id;
  onFilter: (targetLayerId: MapLayer.Id) => void;
  onDone: () => void;
};

/**
 * The buffer tool's second step: offers to filter a point layer by the
 * buffer just added and open that layer's feature list. Rendered by
 * `BufferMapToolPopover` after a confirm.
 */
export function BufferFilterStep({
  layers,
  bufferLayerId,
  onFilter,
  onDone,
}: Props): ReactNode {
  const { t } = useLingui();
  const [targetLayerId, setTargetLayerId] = useState<MapLayer.Id>();
  const targets = getBufferFilterTargetsFromLayers({ layers, bufferLayerId });
  return (
    <Stack gap="xs" maw={280}>
      <Text size="sm">{t`Buffer added.`}</Text>
      <Select<MapLayer.Id>
        label={t`Filter another layer by this buffer`}
        placeholder={t`Pick a point layer`}
        data={targets.map((target) => {
          return { value: target.id, label: target.name };
        })}
        value={targetLayerId ?? null}
        onChange={(value) => {
          setTargetLayerId(value ?? undefined);
        }}
      />
      <Group gap="xs">
        <Button
          size="compact-sm"
          disabled={!targetLayerId}
          onClick={() => {
            if (targetLayerId) {
              onFilter(targetLayerId);
            }
          }}
        >
          {t`Filter and show list`}
        </Button>
        <Button
          size="compact-sm"
          variant="subtle"
          color="neutral"
          onClick={onDone}
        >
          {t`Done`}
        </Button>
      </Group>
    </Stack>
  );
}
