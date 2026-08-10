import { IconPencil } from "@tabler/icons-react";
import { ActionIcon } from "../ActionIcon/ActionIcon";
import type { ActionIconProps } from "@mantine/core";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { useI18nMessages } from "@ui/i18n/I18nAvaUiProvider";

type HTMLButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;
type HTMLAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement>;

type BaseProps = {
  /**
   * The name of the item to edit. The name will be used in the tooltip label
   * as "Edit ${name}". */
  name?: string;

  /** Whether to show a tooltip with the item name. */
  withTooltip?: boolean;
};

type Props =
  | ({
      as?: "button";
    } & BaseProps &
      HTMLButtonProps &
      ActionIconProps)
  | ({
      as: "a";
    } & BaseProps &
      HTMLAnchorProps &
      ActionIconProps);

const DEFAULT_ICON_SIZE = 16;

/**
 * A button used in situations to trigger an "Edit". Renders as a
 * pencil icon by default.
 * This component can be rendered as either a button or an anchor element.
 */
export function EditButton({
  as = "button",
  withTooltip = true,
  ...props
}: Props): JSX.Element {
  const i18n = useI18nMessages();

  const defaultButtonProps: ActionIconProps & HTMLButtonProps = {
    variant: "default",
    size: "md",
    color: "neutral",
    "aria-label": i18n.edit,
  };

  const defaultAnchorProps: ActionIconProps & HTMLAnchorProps = {
    variant: "subtle",
    size: "md",
    color: "neutral",
    "aria-label": i18n.edit,
  };

  const passThroughProps =
    as === "button" ?
      {
        ...defaultButtonProps,
        ...props,
      }
    : {
        ...defaultAnchorProps,
        ...props,
      };

  return (
    <ActionIcon
      tooltip={
        withTooltip ?
          props.name ?
            i18n.editNamed(props.name)
          : i18n.edit
        : undefined
      }
      {...passThroughProps}
    >
      <IconPencil size={DEFAULT_ICON_SIZE} />
    </ActionIcon>
  );
}
