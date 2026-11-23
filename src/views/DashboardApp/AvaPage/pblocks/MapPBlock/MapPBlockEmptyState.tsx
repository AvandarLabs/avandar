import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import css from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/MapPBlock.module.css";
import type { ReactNode } from "react";

type Props = { heightPx: number };

/** A Map block whose author has not picked a map yet. */
export function MapPBlockEmptyState({ heightPx }: Props): ReactNode {
  return (
    <div className={css.mapPBlockEmptyState} style={{ minBlockSize: heightPx }}>
      <Text size="sm" c="dimmed">
        <Trans>Pick a map in this block's settings.</Trans>
      </Text>
    </div>
  );
}
