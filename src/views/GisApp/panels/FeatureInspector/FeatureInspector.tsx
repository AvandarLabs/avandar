import { useLingui } from "@lingui/react/macro";
import { Drawer, Stack } from "@mantine/core";
import { FeatureAction } from "@/views/GisApp/panels/FeatureInspector/FeatureAction";
import { FeatureFields } from "@/views/GisApp/panels/FeatureInspector/FeatureFields";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  opened: boolean;
  onClose: () => void;
  feature: GeoJSON.Feature | undefined;

  /** The popup config of the layer the feature came from. */
  popup: MapLayer.Popup | undefined;
};

/** Lists the clicked feature's fields, and its record link when it has one. */
export function FeatureInspector({
  opened,
  onClose,
  feature,
  popup,
}: Props): ReactNode {
  const { t } = useLingui();
  const properties: Readonly<Record<string, unknown>> =
    feature?.properties ?? {};

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={t`Feature`}
      position="right"
      withOverlay={false}
      closeOnClickOutside={false}
      size="xs"
    >
      <Stack gap="sm">
        <FeatureFields properties={properties} />
        <FeatureAction action={popup?.action} properties={properties} />
      </Stack>
    </Drawer>
  );
}
