import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { modals } from "@mantine/modals";
import { match } from "ts-pattern";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

const DEFAULT_JITTER_RADIUS_METERS = 500;
const DEFAULT_MIN_CELL_COUNT = 5;

type Props = {
  sensitivity: MapLayer.Sensitivity;
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

/** Chooses how precisely the layer exposes sensitive locations. */
export function SensitivityModeSelect(props: Props): ReactNode {
  const { t } = useLingui();
  const { sensitivity, onLayerChange } = props;
  const update = (value: MapLayer.Sensitivity): void => {
    onLayerChange((current) => {
      return MapLayerUpdates.withSensitivity(current, value);
    });
  };
  return (
    <Select
      label={t`Handling`}
      data={[
        { value: "exact", label: t`Show exact locations` },
        { value: "jitter", label: t`Displace` },
        { value: "aggregateOnly", label: t`Aggregate only` },
      ]}
      value={sensitivity.mode}
      allowDeselect={false}
      description={t`Choose Displace or Aggregate only when the layer holds protection or health data that must not be mapped to a household.`}
      onChange={(mode) => {
        if (!mode) {
          return;
        }
        if (mode !== "exact" || sensitivity.mode !== "aggregateOnly") {
          update(_getSensitivityFromMode(mode));
          return;
        }
        modals.openConfirmModal({
          title: t`Show exact locations?`,
          children: t`Individual locations will be drawn on the map, and suppressed areas will show their real counts. Continue?`,
          labels: { confirm: t`Continue`, cancel: t`Cancel` },
          onConfirm: () => {
            update({ mode: "exact" });
          },
        });
      }}
    />
  );
}
