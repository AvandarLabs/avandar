import { matchLiteral } from "@avandar/utils";
import { ActionIcon, Collapse, Paper } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import clsx from "clsx";
import css from "@/views/GisApp/shell/MapChromePanel/MapChromePanel.module.css";
import type { ChromePanelId } from "@/views/GisApp/shell/ChromePanelState/ChromePanelState";
import type { ReactNode } from "react";

type Props = {
  /** Which panel this is, which also picks its width. */
  variant: ChromePanelId;

  /** Stable DOM id prefix for the header and body. */
  id: string;

  title: string;

  /** Shown after the title, for example a layer count. */
  count?: number;

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

function _renderHeader(
  props: Props,
  titleId: string,
  bodyId: string,
): ReactNode {
  return (
    <div className={css.mapChromePanelHeader}>
      <h2 className={css.mapChromePanelTitle} id={titleId}>
        {props.title}
      </h2>
      {props.count === undefined ? null : (
        <span className={css.mapChromePanelCount}>{props.count}</span>
      )}
      <span className={css.mapChromePanelSpacer} />
      {props.headerActions}
      <ActionIcon
        className={css.mapChromePanelHeaderAction}
        variant="subtle"
        color="neutral"
        aria-expanded={!props.isCollapsed}
        aria-controls={bodyId}
        aria-label={props.isCollapsed ? props.expandLabel : props.collapseLabel}
        onClick={props.onToggleCollapsed}
      >
        <IconChevronDown size={16} stroke={1.8} />
      </ActionIcon>
    </div>
  );
}

/** Renders a collapsible, accessible landmark over the map. */
export function MapChromePanel(props: Props): ReactNode {
  const titleId = `${props.id}-title`;
  const bodyId = props.bodyId ?? `${props.id}-body`;
  const variantClassName = matchLiteral(props.variant, {
    layers: css["mapChromePanel--layers"]!,
    inspector: css["mapChromePanel--inspector"]!,
    legend: css["mapChromePanel--legend"]!,
  });

  return (
    <Paper
      component="section"
      className={clsx(css.mapChromePanel, variantClassName)}
      data-collapsed={props.isCollapsed}
      aria-labelledby={titleId}
      p={0}
      radius={0}
      withBorder={false}
      shadow="none"
    >
      {_renderHeader(props, titleId, bodyId)}
      <Collapse
        className={css.mapChromePanelBody}
        id={bodyId}
        tabIndex={props.bodyId === undefined ? undefined : -1}
        expanded={!props.isCollapsed}
      >
        {props.children}
      </Collapse>
    </Paper>
  );
}
