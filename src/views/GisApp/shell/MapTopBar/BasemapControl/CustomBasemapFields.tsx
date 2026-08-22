import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Select, TextInput } from "@mantine/core";

type Props = {
  kind: AvaMapConfig.CustomBasemapKind;
  url: string;
  attribution: string;
  onKindChange: (kind: AvaMapConfig.CustomBasemapKind) => void;
  onUrlChange: (url: string) => void;
  onAttributionChange: (attribution: string) => void;
};

/** Edits a custom basemap's protocol, URL, and attribution. */
export function CustomBasemapFields({
  kind,
  url,
  attribution,
  onKindChange,
  onUrlChange,
  onAttributionChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <Select
        label={t`Protocol`}
        data={[
          { value: "xyz", label: t`XYZ tiles` },
          { value: "wms", label: t`WMS` },
          { value: "wmts", label: t`WMTS` },
        ]}
        value={kind}
        allowDeselect={false}
        onChange={(value) => {
          if (value === "xyz" || value === "wms" || value === "wmts") {
            onKindChange(value);
          }
        }}
      />
      <TextInput
        label={t`URL template`}
        description={
          kind === "wms"
            ? t`Include the bbox-epsg-3857 placeholder where the server expects the bounding box.`
            : t`Include the z, x and y placeholders where the server expects the tile index.`
        }
        value={url}
        onChange={(event) => {
          onUrlChange(event.currentTarget.value);
        }}
      />
      <TextInput
        label={t`Attribution`}
        description={t`Shown under the map and in every export. Required.`}
        value={attribution}
        onChange={(event) => {
          onAttributionChange(event.currentTarget.value);
        }}
      />
    </>
  );
}
