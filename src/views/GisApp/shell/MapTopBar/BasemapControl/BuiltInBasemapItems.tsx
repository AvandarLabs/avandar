import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Menu } from "@mantine/core";

import { MapStyleKeys } from "@/views/GisApp/basemap/MapStyles";

type Props = {
  basemap: AvaMapConfig.Basemap;
  onBasemapChange: (basemap: AvaMapConfig.Basemap) => void;
};

/** Renders the built-in basemap style choices. */
export function BuiltInBasemapItems({
  basemap,
  onBasemapChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const labels = {
    avandar: t`Avandar`,
    positron: t`Positron`,
    bright: t`Bright`,
    liberty: t`Liberty`,
    dark: t`Dark`,
    fiord: t`Fiord`,
  };
  return MapStyleKeys.map((styleKey) => {
    return (
      <Menu.Item
        key={styleKey}
        aria-current={basemap.type === "builtIn" && basemap.style === styleKey}
        onClick={() => {
          onBasemapChange({ type: "builtIn", style: styleKey });
        }}
      >
        {matchLiteral(styleKey, labels)}
      </Menu.Item>
    );
  });
}
