import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Button, Menu } from "@mantine/core";
import { IconStack2 } from "@tabler/icons-react";
import { useState } from "react";

import css from "@/views/GisApp/shell/MapTopBar/BasemapControl/BasemapControl.module.css";
import { BasemapMenuDropdown } from "@/views/GisApp/shell/MapTopBar/BasemapControl/BasemapMenuDropdown";
import { CustomBasemapForm } from "@/views/GisApp/shell/MapTopBar/BasemapControl/CustomBasemapForm";

type Props = {
  basemap: AvaMapConfig.Basemap;
  onBasemapChange: (basemap: AvaMapConfig.Basemap) => void;
};

/** Chooses a built-in, custom, or tile-free basemap for the map. */
export function BasemapControl({ basemap, onBasemapChange }: Props): ReactNode {
  const { t } = useLingui();
  const [isCustomFormOpen, setIsCustomFormOpen] = useState(false);

  return (
    <>
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <Button
            variant="subtle"
            color="neutral"
            size="compact-sm"
            leftSection={<IconStack2 size={15} stroke={1.5} />}
          >
            <span className={css.basemapControlActionLabel}>{t`Basemap`}</span>
          </Button>
        </Menu.Target>
        <BasemapMenuDropdown
          basemap={basemap}
          onBasemapChange={onBasemapChange}
          onOpenCustomForm={() => {
            setIsCustomFormOpen(true);
          }}
        />
      </Menu>
      <CustomBasemapForm
        opened={isCustomFormOpen}
        basemap={basemap}
        onClose={() => {
          setIsCustomFormOpen(false);
        }}
        onSubmit={(customBasemap) => {
          onBasemapChange(customBasemap);
          setIsCustomFormOpen(false);
        }}
      />
    </>
  );
}
