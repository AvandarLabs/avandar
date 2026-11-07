import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Menu } from "@mantine/core";
import { IconDots } from "@tabler/icons-react";
import { useState } from "react";
import { useGadgetActions } from "@/components/RichText/Gadget/GadgetActionsMenu/useGadgetActions";
import { GadgetChip } from "@/components/RichText/Gadget/GadgetChip/GadgetChip";
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
};

function GadgetActionItems({
  actions,
}: {
  actions: readonly GadgetAction[];
}): ReactNode {
  return actions.map((action) => {
    return (
      <Menu.Item
        key={action.id}
        leftSection={<action.Icon size={14} aria-hidden />}
        onClick={action.onSelect}
      >
        {action.label}
      </Menu.Item>
    );
  });
}

/**
 * An editor's chip as a button that opens the actions on hover or click.
 * Only a click moves focus into the menu, so resting the pointer on a chip
 * never pulls focus away from someone typing.
 */
function GadgetLinkActions({
  gadgetRef,
  actions,
}: {
  gadgetRef: Gadget.Ref;
  actions: readonly GadgetAction[];
}): ReactNode {
  const [isOpenedByClick, setIsOpenedByClick] = useState(false);
  return (
    <Menu
      trigger="click-hover"
      openDelay={300}
      closeDelay={150}
      position="bottom-start"
      shadow="md"
      withinPortal
      trapFocus={isOpenedByClick}
      onClose={() => {
        setIsOpenedByClick(false);
      }}
    >
      <Menu.Target>
        <GadgetChip
          gadgetRef={gadgetRef}
          isLinked={false}
          onClick={() => {
            setIsOpenedByClick(true);
          }}
        />
      </Menu.Target>
      <Menu.Dropdown>
        <GadgetActionItems actions={actions} />
      </Menu.Dropdown>
    </Menu>
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
        <GadgetActionItems actions={actions} />
      </Menu.Dropdown>
    </Menu>
  );
}

function GadgetActionsMenuContent(props: Props): ReactNode {
  const actions = useGadgetActions(props);
  if (props.display === "embed") {
    return <GadgetEmbedActions actions={actions} />;
  }
  return <GadgetLinkActions gadgetRef={props.gadgetRef} actions={actions} />;
}

/**
 * The editor's actions on a gadget node: open it in a new tab, show it as an
 * embed or a link, and copy a link to it. For a link it draws the chip
 * itself, as a button that opens the actions on hover or click and never
 * navigates; for an embed it draws a menu button for the card's header. In
 * a read-only editor a link is only the chip and an embed has no menu.
 */
export function GadgetActionsMenu(props: Props): ReactNode {
  if (!props.editor.isEditable) {
    return props.display === "link" ? (
      <GadgetChip gadgetRef={props.gadgetRef} isLinked={false} />
    ) : null;
  }
  // Each type calls different hooks, so a type change in place remounts.
  return (
    <GadgetActionsMenuContent key={props.gadgetRef.gadgetType} {...props} />
  );
}
