import type { ChromePanelId } from "@/views/GisApp/shell/ChromePanelState/ChromePanelState";
import type { ReactNode } from "react";

import { matchLiteral } from "@avandar/utils";
import { Collapse, Paper } from "@mantine/core";
import clsx from "clsx";

import css from "@/views/GisApp/shell/MapChromePanel/MapChromePanel.module.css";
import { MapChromePanelHeader } from "@/views/GisApp/shell/MapChromePanel/MapChromePanelHeader";

type Props = {
  /** Which panel this is, which also picks its width. */
  variant: ChromePanelId;

  /** Stable DOM id prefix for the header and body. */
  id: string;

  title: string;

  /** Shown after the title, for example a layer count. */
  itemCount?: number;

  /** Rendered in the header, to the left of the collapse control. */
  headerActions?: ReactNode;

  isCollapsed: boolean;
  onToggleCollapsed: () => void;

  /** Accessible name for the collapse control while the panel is expanded. */
  collapseLabel: string;

  /** Accessible name for it while the panel is collapsed. */
  expandLabel: string;

  /** Id of the element the skip links jump to, when this panel owns one. */
  bodyId?: string;

  children: ReactNode;
};

/** Renders a collapsible, accessible landmark over the map. */
export function MapChromePanel({
  variant,
  id,
  title,
  itemCount,
  headerActions,
  isCollapsed,
  onToggleCollapsed,
  collapseLabel,
  expandLabel,
  bodyId: providedBodyId,
  children,
}: Props): ReactNode {
  const titleId = `${id}-title`;
  const bodyId = providedBodyId ?? `${id}-body`;
  const variantClassName = matchLiteral(variant, {
    layers: css["mapChromePanel--layers"]!,
    inspector: css["mapChromePanel--inspector"]!,
    legend: css["mapChromePanel--legend"]!,
  });

  return (
    <Paper
      component="section"
      className={clsx(css.mapChromePanel, variantClassName)}
      data-collapsed={isCollapsed}
      aria-labelledby={titleId}
      p={0}
      radius={0}
      withBorder={false}
      shadow="none"
    >
      <MapChromePanelHeader
        title={title}
        itemCount={itemCount}
        headerActions={headerActions}
        isCollapsed={isCollapsed}
        onToggleCollapsed={onToggleCollapsed}
        collapseLabel={collapseLabel}
        expandLabel={expandLabel}
        titleId={titleId}
        bodyId={bodyId}
      />
      <Collapse
        className={css.mapChromePanelBody}
        id={bodyId}
        tabIndex={providedBodyId === undefined ? undefined : -1}
        expanded={!isCollapsed}
      >
        {children}
      </Collapse>
    </Paper>
  );
}
