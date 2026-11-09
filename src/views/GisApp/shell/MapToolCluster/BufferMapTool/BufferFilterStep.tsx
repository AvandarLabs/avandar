import { propEq } from "@avandar/utils";
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

type TargetPickerProps = {
  targets: readonly MapLayer.T[];
  onFilter: (targetLayerId: MapLayer.Id) => void;
  onDone: () => void;
};

type DoneButtonProps = { onDone: () => void; autoFocus?: boolean };

/** Closes the step without filtering anything. */
function BufferFilterDoneButton({
  onDone,
  autoFocus = false,
}: DoneButtonProps): ReactNode {
  const { t } = useLingui();
  return (
    <Button
      size="compact-sm"
      variant="subtle"
      color="neutral"
      autoFocus={autoFocus}
      onClick={onDone}
    >
      {t`Done`}
    </Button>
  );
}

/** The point layer picker and the button that filters the picked layer. */
function BufferFilterTargetPicker({
  targets,
  onFilter,
  onDone,
}: TargetPickerProps): ReactNode {
  const { t } = useLingui();
  const [targetLayerId, setTargetLayerId] = useState<MapLayer.Id>();
  return (
    <>
      <Select<MapLayer.Id>
        label={t`Filter another layer by this buffer`}
        // The confirm button that held focus is gone once this step shows.
        autoFocus
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
        <BufferFilterDoneButton onDone={onDone} />
      </Group>
    </>
  );
}

/**
 * The buffer tool's second step: offers to filter a point layer by the
 * buffer just added and open that layer's feature list. Rendered by
 * `BufferMapToolPopover` after a confirm. When every point layer would form
 * a dependency loop, it says so instead of showing an empty picker.
 */
export function BufferFilterStep({
  layers,
  bufferLayerId,
  onFilter,
  onDone,
}: Props): ReactNode {
  const { t } = useLingui();
  const targets = getBufferFilterTargetsFromLayers({ layers, bufferLayerId });
  const hasNoTargets =
    targets.length === 0 && layers.some(propEq("id", bufferLayerId));
  return (
    <Stack gap="xs" maw={280}>
      <Text size="sm" role="status">{t`Buffer added.`}</Text>
      {hasNoTargets ? (
        <>
          <Text size="sm" c="dimmed">
            {t`No layer can be filtered by this buffer.`}
          </Text>
          <BufferFilterDoneButton onDone={onDone} autoFocus />
        </>
      ) : (
        <BufferFilterTargetPicker
          targets={targets}
          onFilter={onFilter}
          onDone={onDone}
        />
      )}
    </Stack>
  );
}
