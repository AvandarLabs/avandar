import { ActionIcon } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import css from "@/views/GisApp/shell/MapChromePanel/MapChromePanel.module.css";
import type { ReactNode } from "react";

type Props = {
  title: string;
  itemCount?: number;
  headerActions?: ReactNode;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  collapseLabel: string;
  expandLabel: string;
  titleId: string;
  bodyId: string;
};

/** Chrome panel title, optional count, actions, and collapse control. */
export function MapChromePanelHeader({
  title,
  itemCount,
  headerActions,
  isCollapsed,
  onToggleCollapsed,
  collapseLabel,
  expandLabel,
  titleId,
  bodyId,
}: Props): ReactNode {
  return (
    <div className={css.mapChromePanelHeader}>
      <h2 className={css.mapChromePanelTitle} id={titleId}>
        {title}
      </h2>
      {itemCount === undefined ? null : (
        <span className={css.mapChromePanelCount}>{itemCount}</span>
      )}
      <span className={css.mapChromePanelSpacer} />
      {headerActions}
      <ActionIcon
        className={css.mapChromePanelHeaderAction}
        variant="subtle"
        color="neutral"
        aria-expanded={!isCollapsed}
        aria-controls={bodyId}
        aria-label={isCollapsed ? expandLabel : collapseLabel}
        onClick={onToggleCollapsed}
      >
        <IconChevronDown size={16} stroke={1.8} />
      </ActionIcon>
    </div>
  );
}
