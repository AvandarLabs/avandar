import { useLingui } from "@lingui/react/macro";
import { Menu } from "@mantine/core";
import { BuiltInBasemapItems } from "@/views/GisApp/shell/MapTopBar/BasemapControl/BuiltInBasemapItems";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

const NO_BASEMAP_BACKGROUND = "#eaeef2";

type Props = {
  basemap: AvaMapConfig.Basemap;
  onBasemapChange: (basemap: AvaMapConfig.Basemap) => void;
  onOpenCustomForm: () => void;
};

/** Renders the built-in, tile-free, and custom basemap choices. */
export function BasemapMenuDropdown(props: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Menu.Dropdown>
      <Menu.Label>{t`Built in`}</Menu.Label>
      <BuiltInBasemapItems {...props} />
      <Menu.Divider />
      <Menu.Item
        aria-current={props.basemap.type === "none"}
        onClick={() => {
          props.onBasemapChange({
            type: "none",
            background: NO_BASEMAP_BACKGROUND,
          });
        }}
      >
        {t`No basemap`}
      </Menu.Item>
      <Menu.Item
        aria-current={props.basemap.type === "custom"}
        onClick={props.onOpenCustomForm}
      >
        {t`Add a tile service`}
      </Menu.Item>
    </Menu.Dropdown>
  );
}
