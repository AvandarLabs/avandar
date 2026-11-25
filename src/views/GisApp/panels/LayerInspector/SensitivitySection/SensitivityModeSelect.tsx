import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { modals } from "@mantine/modals";
import { match } from "ts-pattern";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ComboboxItem } from "@mantine/core";
import type { ReactNode } from "react";

const DEFAULT_JITTER_RADIUS_METERS = 500;
const DEFAULT_MIN_CELL_COUNT = 5;

type Props = {
  sensitivity: MapLayer.Sensitivity;

  /**
   * False when the layer draws lines or polygons, which Displace cannot move
   * point by point. The option is then disabled and the reason shown.
   */
  isDisplaceAvailable: boolean;
  onLayerChange: LayerChangeHandler;
};

function _getSensitivityFromMode(mode: string): MapLayer.Sensitivity {
  return match(mode)
    .with("jitter", () => {
      return {
        mode: "jitter" as const,
        radiusMeters: DEFAULT_JITTER_RADIUS_METERS,
      };
    })
    .with("aggregateOnly", () => {
      return {
        mode: "aggregateOnly" as const,
        minCellCount: DEFAULT_MIN_CELL_COUNT,
        minGeoLevel: "",
      };
    })
    .otherwise(() => {
      return { mode: "exact" as const };
    });
}

/**
 * The handling choices and the guidance under them. Displace is disabled, with
 * the reason in the guidance, when the layer cannot be displaced.
 */
function useSensitivityModeOptions(isDisplaceAvailable: boolean): {
  modeOptions: ComboboxItem[];
  description: string;
} {
  const { t } = useLingui();
  return {
    modeOptions: [
      { value: "exact", label: t`Show exact locations` },
      { value: "jitter", label: t`Displace`, disabled: !isDisplaceAvailable },
      { value: "aggregateOnly", label: t`Aggregate only` },
    ],
    description: isDisplaceAvailable
      ? t`Choose Displace or Aggregate only when the layer holds protection or health data that must not be mapped to a household.`
      : t`Choose Aggregate only when the layer holds protection or health data that must not be mapped to a household. Displace is unavailable because it only works for layers that show points.`,
  };
}

/** Chooses how precisely the layer exposes sensitive locations. */
export function SensitivityModeSelect({
  sensitivity,
  isDisplaceAvailable,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const { modeOptions, description } =
    useSensitivityModeOptions(isDisplaceAvailable);
  const update = (value: MapLayer.Sensitivity): void => {
    onLayerChange((current) => {
      return MapLayerUpdates.withSensitivity({
        layer: current,
        sensitivity: value,
      });
    });
  };
  return (
    <Select
      label={t`Handling`}
      data={modeOptions}
      value={sensitivity.mode}
      allowDeselect={false}
      description={description}
      onChange={(mode) => {
        if (!mode) {
          return;
        }
        if (sensitivity.mode !== "aggregateOnly" || mode === "aggregateOnly") {
          update(_getSensitivityFromMode(mode));
          return;
        }
        modals.openConfirmModal({
          title: t`Show exact locations?`,
          children: t`Individual locations will be drawn on the map, and suppressed areas will show their real counts. Continue?`,
          labels: { confirm: t`Continue`, cancel: t`Cancel` },
          onConfirm: () => {
            update(_getSensitivityFromMode(mode));
          },
        });
      }}
    />
  );
}
