import { useLingui } from "@lingui/react/macro";
import { Button, Popover } from "@mantine/core";
import { IconThumbUp } from "@tabler/icons-react";
import clsx from "clsx";
import { COMMENT_REACTION_DISPLAY } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/commentReactionKinds";
import classes from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/CommentReactions.module.css";
import { ReactionOptions } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/ReactionOptions";
import { useReactionPickerState } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/useReactionPickerState";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";
import type { ReactNode } from "react";

type Props = {
  currentKind: CommentReaction.Kind | undefined;
  isSaving: boolean;
  onPick: (kind: CommentReaction.Kind) => void;
};

/**
 * The reaction button and its picker. A click toggles your current
 * reaction (Like by default); resting the pointer on the button, or
 * pressing the down arrow on it, opens all six. While a reaction saves,
 * the controls stay focusable and further picks are ignored.
 */
export function ReactionPicker({
  currentKind,
  isSaving,
  onPick,
}: Props): ReactNode {
  const { i18n } = useLingui();
  const picker = useReactionPickerState(onPick);
  const buttonKind = currentKind ?? "like";
  const ButtonIcon = currentKind
    ? COMMENT_REACTION_DISPLAY[currentKind].Icon
    : IconThumbUp;

  return (
    <Popover
      opened={picker.isOpen}
      onChange={picker.setIsOpen}
      position="top-start"
      shadow="md"
      trapFocus={picker.isOpenedByKeyboard}
      returnFocus
    >
      <Popover.Target>
        <Button
          variant={currentKind ? "light" : "subtle"}
          color={currentKind ? "primary" : "neutral"}
          size="compact-xs"
          aria-pressed={currentKind !== undefined}
          // Not `loading`: that disables the button, which drops focus to
          // the page when the picker returns it or Enter toggles it.
          aria-busy={isSaving}
          className={clsx(isSaving && classes.saving)}
          leftSection={<ButtonIcon size={13} />}
          onClick={() => {
            picker.pick(buttonKind);
          }}
          onMouseEnter={picker.onButtonMouseEnter}
          onMouseLeave={picker.onPointerLeave}
          onKeyDown={picker.onButtonKeyDown}
        >
          {i18n._(COMMENT_REACTION_DISPLAY[buttonKind].label)}
        </Button>
      </Popover.Target>
      <Popover.Dropdown
        p={4}
        onMouseEnter={picker.onPointerEnterPicker}
        onMouseLeave={picker.onPointerLeave}
      >
        <ReactionOptions
          isSaving={isSaving}
          currentKind={currentKind}
          autoFocusKind={buttonKind}
          onPick={picker.pick}
        />
      </Popover.Dropdown>
    </Popover>
  );
}
