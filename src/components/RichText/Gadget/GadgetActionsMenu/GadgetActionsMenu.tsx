import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Button, Menu, Popover } from "@mantine/core";
import { IconDots } from "@tabler/icons-react";
import classes from "@/components/RichText/Gadget/GadgetActionsMenu/GadgetActionsMenu.module.css";
import { useGadgetActions } from "@/components/RichText/Gadget/GadgetActionsMenu/useGadgetActions";
import { useHoverFocusOpen } from "@/components/RichText/Gadget/GadgetActionsMenu/useHoverFocusOpen";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type {
  GadgetAction,
  GadgetDisplay,
} from "@/components/RichText/Gadget/GadgetActionsMenu/useGadgetActions";
import type { Editor } from "@tiptap/core";
import type { ReactNode } from "react";

type Props = {
  gadgetRef: Gadget.Ref;
  display: GadgetDisplay;
  editor: Editor;

  /** The node's position in the document, as a node view reports it. */
  getPos: () => number | undefined;

  /** The chip the actions belong to. Without it, a menu button is drawn. */
  children?: ReactNode;
};

type ActionListProps = {
  actions: readonly GadgetAction[];

  /** Called before an action runs, such as to close the hover card. */
  onBeforeSelect: () => void;
};

/** The hover card's actions, one full-width button each. */
function GadgetLinkActionList({
  actions,
  onBeforeSelect,
}: ActionListProps): ReactNode {
  const { t } = useLingui();
  return (
    <div role="group" aria-label={t`More actions`}>
      {actions.map((action) => {
        return (
          <Button
            key={action.id}
            variant="subtle"
            color="neutral"
            size="compact-sm"
            fullWidth
            justify="flex-start"
            leftSection={<action.Icon size={14} aria-hidden />}
            onClick={() => {
              onBeforeSelect();
              action.onSelect();
            }}
          >
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}

/** A hover card of buttons over an inline chip, so the line stays clean. */
function GadgetLinkActions({
  actions,
  children,
}: {
  actions: readonly GadgetAction[];
  children: ReactNode;
}): ReactNode {
  const { isOpen, close, handlers } = useHoverFocusOpen({
    openDelay: 300,
    closeDelay: 150,
  });
  // Kept in place rather than in a portal, so Tab moves from the chip into
  // the actions and the pointer can cross into them without closing.
  return (
    <span {...handlers} className={classes.linkActions}>
      <Popover
        opened={isOpen}
        onDismiss={close}
        withinPortal={false}
        floatingStrategy="fixed"
        position="bottom-start"
        offset={4}
        shadow="md"
        trapFocus={false}
        returnFocus={false}
      >
        <Popover.Target>
          <span>{children}</span>
        </Popover.Target>
        <Popover.Dropdown className={classes.dropdown}>
          <GadgetLinkActionList actions={actions} onBeforeSelect={close} />
        </Popover.Dropdown>
      </Popover>
    </span>
  );
}

/** A menu button in an embedded card's header. */
function GadgetEmbedActions({
  actions,
}: {
  actions: readonly GadgetAction[];
}): ReactNode {
  const { t } = useLingui();
  return (
    <Menu position="bottom-end" shadow="md" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="neutral"
          size="sm"
          aria-label={t`More actions`}
        >
          <IconDots size={16} aria-hidden />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {actions.map((action) => {
          return (
            <Menu.Item
              key={action.id}
              leftSection={<action.Icon size={14} aria-hidden />}
              onClick={action.onSelect}
            >
              {action.label}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}

function GadgetActionsMenuContent({ children, ...options }: Props): ReactNode {
  const actions = useGadgetActions(options);
  if (children === undefined) {
    return <GadgetEmbedActions actions={actions} />;
  }
  return <GadgetLinkActions actions={actions}>{children}</GadgetLinkActions>;
}

/**
 * The editor's actions on a gadget node: open it, show it as an embed or a
 * link, and copy a link to it. Wrapping a chip, the actions appear when the
 * chip is hovered or focused; on its own, it draws a menu button for a
 * card's header. Outside an editable editor it draws only `children`, since
 * a published comment offers no display switch.
 */
export function GadgetActionsMenu(props: Props): ReactNode {
  if (!props.editor.isEditable) {
    return props.children ?? null;
  }
  // Each type calls different hooks, so a type change in place remounts.
  return (
    <GadgetActionsMenuContent key={props.gadgetRef.gadgetType} {...props} />
  );
}
