import { Modal } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { CustomBasemapActions } from "@/views/GisApp/shell/MapTopBar/BasemapControl/CustomBasemapActions";
import { CustomBasemapFields } from "@/views/GisApp/shell/MapTopBar/BasemapControl/CustomBasemapFields";
import { useCustomBasemapDraft } from "@/views/GisApp/shell/MapTopBar/BasemapControl/useCustomBasemapDraft";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = {
  opened: boolean;
  basemap: AvaMapConfig.Basemap;
  onClose: () => void;
  onSubmit: (basemap: AvaMapConfig.Basemap) => void;
};

/** Edits a custom tile service and requires its URL and attribution. */
export function CustomBasemapForm({
  opened,
  basemap,
  onClose,
  onSubmit,
}: Props): ReactNode {
  const { t } = useLingui();
  const draft = useCustomBasemapDraft({ opened, basemap });
  const { kind, url, attribution } = draft;
  const isSubmittable = url.trim() !== "" && attribution.trim() !== "";

  return (
    <Modal opened={opened} onClose={onClose} title={t`Add a tile service`}>
      <Stack gap="sm">
        <CustomBasemapFields {...draft} />
        <CustomBasemapActions
          isSubmittable={isSubmittable}
          onClose={onClose}
          onSubmit={() => {
            onSubmit({
              type: "custom",
              kind,
              url: url.trim(),
              attribution: attribution.trim(),
            });
          }}
        />
      </Stack>
    </Modal>
  );
}
