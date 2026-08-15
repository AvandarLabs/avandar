import { useLingui } from "@lingui/react/macro";
import { Select, TextInput } from "@mantine/core";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = {
  kind: AvaMapConfig.CustomBasemapKind;
  url: string;
  attribution: string;
  onKindChange: (kind: AvaMapConfig.CustomBasemapKind) => void;
  onUrlChange: (url: string) => void;
  onAttributionChange: (attribution: string) => void;
};

/** Edits a custom basemap's protocol, URL, and attribution. */
export function CustomBasemapFields(props: Props): ReactNode {
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
        value={props.kind}
        allowDeselect={false}
        onChange={(value) => {
          if (value === "xyz" || value === "wms" || value === "wmts") {
            props.onKindChange(value);
          }
        }}
      />
      <TextInput
        label={t`URL template`}
        description={
          props.kind === "wms" ?
            t`Include the bbox-epsg-3857 placeholder where the server expects the bounding box.`
          : t`Include the z, x and y placeholders where the server expects the tile index.`
        }
        value={props.url}
        onChange={(event) => {
          props.onUrlChange(event.currentTarget.value);
        }}
      />
      <TextInput
        label={t`Attribution`}
        description={t`Shown under the map and in every export. Required.`}
        value={props.attribution}
        onChange={(event) => {
          props.onAttributionChange(event.currentTarget.value);
        }}
      />
    </>
  );
}
