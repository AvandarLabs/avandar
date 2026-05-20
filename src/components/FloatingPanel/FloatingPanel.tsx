import {
  ActionIcon,
  Box,
  Collapse,
  FloatingWindow,
  Group,
  Text,
  Transition,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconGripVertical,
  IconX,
} from "@tabler/icons-react";
import { Tooltip } from "@ui";
import { useCallback, useRef } from "react";
import { FLOATING_PANEL_Z_INDEX } from "@/config/Theme";
import css from "./FloatingPanel.module.css";
import type { ReactNode } from "react";

type FloatingPanelInitialPosition = {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
};

type FloatingPanelPosition = {
  x: number;
  y: number;
};

type Props = {
  /** Title shown in the draggable header. */
  title: string;

  /** Whether the window is visible. */
  opened: boolean;

  /** Whether the body is collapsed so only the header bar is visible. */
  collapsed: boolean;

  /** Called when the close button is clicked. */
  onClose: () => void;

  /** Called when the collapse toggle is clicked. */
  onToggleCollapse: () => void;

  /** Initial viewport-relative position of the window when first mounted. */
  initialPosition?: FloatingPanelInitialPosition;

  /** Called when the panel is dragged to a new viewport position. */
  onPositionChange?: (position: FloatingPanelPosition) => void;

  /** Width of the window. */
  width?: number | string;

  /** Body content rendered below the header. */
  children: ReactNode;
};

/**
 * A draggable floating window with a header bar, collapse toggle, and close
 * button. Built on Mantine's `FloatingWindow` primitive and wrapped in a
 * `Transition` for animated show/hide. The body is wrapped in `Collapse` so
 * the user can shrink the window to just the header. Double-clicking the drag
 * handle (grip and title) toggles collapse, same as the chevron button.
 */
export function FloatingPanel({
  title,
  opened,
  collapsed,
  onClose,
  onToggleCollapse,
  initialPosition,
  onPositionChange,
  width = 360,
  children,
}: Props): JSX.Element {
  // Mantine's `useFloatingWindow` lists `onPositionChange` and each
  // `initialPosition.*` field in the drag effect's dependency array. If the
  // parent passes a new inline callback or recomputes `initialPosition` (e.g.
  // by persisting the live position to state), the effect tears down its
  // event listeners mid-drag and the window stops being draggable. Stabilize
  // both: forward the latest callback through a ref, and freeze
  // `initialPosition` while the FloatingWindow is mounted.
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;
  const handlePositionChange = useCallback(
    (position: FloatingPanelPosition) => {
      onPositionChangeRef.current?.(position);
    },
    [],
  );

  // Re-capture the latest `initialPosition` each time the window transitions
  // from closed to open. While `opened` stays true the ref is left alone so
  // that the drag effect stays attached during a drag, but reopening the
  // panel picks up the most recently persisted position from localStorage.
  const initialPositionRef = useRef(initialPosition);
  const prevOpenedRef = useRef(opened);
  if (opened && !prevOpenedRef.current) {
    initialPositionRef.current = initialPosition;
  }
  prevOpenedRef.current = opened;

  const onToggleCollapseRef = useRef(onToggleCollapse);
  onToggleCollapseRef.current = onToggleCollapse;
  const handleDragHandleDoubleClick = useCallback(() => {
    onToggleCollapseRef.current();
  }, []);

  return (
    <Transition
      mounted={opened}
      transition="pop"
      duration={200}
      exitDuration={150}
      timingFunction="ease"
    >
      {(transitionStyles) => {
        return (
          <FloatingWindow
            shadow="md"
            radius="md"
            withBorder
            w={width}
            zIndex={FLOATING_PANEL_Z_INDEX}
            initialPosition={initialPositionRef.current}
            onPositionChange={handlePositionChange}
            dragHandleSelector={`.${css.header}`}
            excludeDragHandleSelector={`.${css.actions}`}
            className={css.root}
            style={transitionStyles}
            aria-label={title}
          >
            <Group
              className={css.header}
              px="sm"
              py="xs"
              justify="space-between"
              wrap="nowrap"
              gap="xs"
            >
              <Group
                gap={6}
                wrap="nowrap"
                className={css.titleGroup}
                aria-hidden
                onDoubleClick={handleDragHandleDoubleClick}
              >
                <IconGripVertical size={14} className={css.gripIcon} />
                <Text
                  size="sm"
                  fw={600}
                  c="neutral.9"
                  className={css.titleText}
                >
                  {title}
                </Text>
              </Group>
              <Group gap={2} wrap="nowrap" className={css.actions}>
                <Tooltip
                  label={collapsed ? "Expand" : "Collapse"}
                  openDelay={400}
                >
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color="neutral"
                    onClick={onToggleCollapse}
                    aria-label={collapsed ? "Expand panel" : "Collapse panel"}
                  >
                    {collapsed ?
                      <IconChevronDown size={14} />
                    : <IconChevronUp size={14} />}
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Close" openDelay={400}>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color="neutral"
                    onClick={onClose}
                    aria-label={`Close ${title}`}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
            <Collapse expanded={!collapsed} transitionDuration={180}>
              <Box className={css.body}>{children}</Box>
            </Collapse>
          </FloatingWindow>
        );
      }}
    </Transition>
  );
}
