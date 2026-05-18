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
import css from "./FloatingPanel.module.css";

type FloatingPanelInitialPosition = {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
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

  /** Width of the window. */
  width?: number | string;

  /** Body content rendered below the header. */
  children: React.ReactNode;
};

/**
 * A draggable floating window with a header bar, collapse toggle, and close
 * button. Built on Mantine's `FloatingWindow` primitive and wrapped in a
 * `Transition` for animated show/hide. The body is wrapped in `Collapse` so
 * the user can shrink the window to just the header.
 */
export function FloatingPanel({
  title,
  opened,
  collapsed,
  onClose,
  onToggleCollapse,
  initialPosition,
  width = 360,
  children,
}: Props): JSX.Element {
  return (
    <Transition
      mounted={opened}
      transition="pop"
      duration={200}
      exitDuration={150}
      timingFunction="ease"
      keepMounted
    >
      {(transitionStyles) => {
        return (
          <FloatingWindow
            shadow="md"
            radius="md"
            withBorder
            w={width}
            initialPosition={initialPosition}
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
            <Collapse in={!collapsed} transitionDuration={180}>
              <Box className={css.body}>{children}</Box>
            </Collapse>
          </FloatingWindow>
        );
      }}
    </Transition>
  );
}
