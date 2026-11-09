import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Group, Select } from "@mantine/core";
import { IconArrowsLeftRight } from "@tabler/icons-react";
import { GraduatedRamps } from "@/views/GisApp/layers/GraduatedRamps/GraduatedRamps";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { GraduatedRampPresetKey } from "@/views/GisApp/layers/GraduatedRamps/GraduatedRamps";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  color: Extract<MapLayer.Color, { type: "graduated" }>;
  onLayerChange: LayerChangeHandler;
};

function _isPresetKey(value: string | null): value is GraduatedRampPresetKey {
  return value !== null && value in GraduatedRamps.presets;
}

/**
 * Picks a preset color ramp for graduated symbology and reverses the class
 * colors. A ramp that matches no preset, because a class color was edited,
 * shows as custom colors until a preset is picked again.
 */
export function GraduatedRampSelect({
  color,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Group gap="xs" align="flex-end" wrap="nowrap">
      <Select
        flex={1}
        label={t`Color ramp`}
        placeholder={t`Custom colors`}
        data={[
          { value: "blue", label: t`Blue` },
          { value: "orange", label: t`Orange` },
          { value: "red", label: t`Red` },
          { value: "redBlue", label: t`Red to blue` },
          { value: "threshold", label: t`Threshold` },
        ]}
        value={GraduatedRamps.findPreset(color.ramp)?.key ?? null}
        allowDeselect={false}
        onChange={(value) => {
          if (!_isPresetKey(value)) {
            return;
          }
          onLayerChange((current) => {
            return MapLayerUpdates.withRampPreset({
              layer: current,
              presetKey: value,
            });
          });
        }}
      />
      <ActionIcon
        variant="default"
        size="input-sm"
        aria-label={t`Reverse colors`}
        onClick={() => {
          onLayerChange(MapLayerUpdates.withReversedRamp);
        }}
      >
        <IconArrowsLeftRight size={16} aria-hidden />
      </ActionIcon>
    </Group>
  );
}
