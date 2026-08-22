import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import css from "@/views/GisApp/shell/ClearAoiButton/ClearAoiButton.module.css";
import type { ReactNode } from "react";

type Props = {
  aoi: AvaMapConfig.AoiPolygon | undefined;
  updateConfig: (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

/** Map-level control that unsets the area-of-interest polygon. */
export function ClearAoiButton({ aoi, updateConfig }: Props): ReactNode {
  const { t } = useLingui();
  if (!aoi) {
    return null;
  }
  const label = t`Clear area filter`;
  return (
    <Button
      className={css.clearAoiButton}
      size="compact-sm"
      variant="default"
      aria-label={label}
      onClick={() => {
        updateConfig((current) => {
          return AvaMapConfig.withAoi({ config: current, aoi: undefined });
        });
      }}
    >
      {label}
    </Button>
  );
}
