import { useBoolean } from "@avandar/hooks";
import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Flex, Popover } from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
import { LayerFields } from "@/views/GisApp/panels/LayerFormPanel/LayerFields";
import css from "@/views/GisApp/panels/LayerFormPanel/LayerFormPopover/LayerFormPopover.module.css";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerFormPanel/LayerFormPanel.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

/** Animation used when the layer form opens beneath its control. */
const LAYER_FORM_TRANSITION = {
  transition: "pop-top-left",
  duration: 200,
  timingFunction: "ease-out",
} as const;

type Props = {
  layer: MapLayer.T;
  onLayerChange: LayerChangeHandler;
};

/** Popover control that opens the active layer's query and style fields. */
export function LayerFormPopover({ layer, onLayerChange }: Props): ReactNode {
  const { t } = useLingui();
  const [isPopoverOpen, , close, toggle] = useBoolean(false);
  return (
    <Flex pos="relative" align="center" mt="xs">
      <Popover
        opened={isPopoverOpen}
        onChange={toggle}
        onDismiss={close}
        position="bottom-start"
        offset={8}
        withinPortal={false}
        transitionProps={LAYER_FORM_TRANSITION}
        shadow="md"
      >
        <Popover.Target>
          <Tooltip label={t`Filter`} position="right">
            <ActionIcon
              size="lg"
              variant="white"
              color="neutral"
              onClick={toggle}
              className={css.layerFormPopoverFilterButton}
              data-active={isPopoverOpen}
              aria-label={t`Query form`}
            >
              <IconFilter size={20} />
            </ActionIcon>
          </Tooltip>
        </Popover.Target>
        <Popover.Dropdown p="xs">
          <LayerFields layer={layer} onLayerChange={onLayerChange} />
        </Popover.Dropdown>
      </Popover>
    </Flex>
  );
}
