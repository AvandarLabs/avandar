import { ActionIcon } from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import type { ActionIconProps } from "@mantine/core";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type HTMLButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;
type HTMLAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement>;

type Props =
  | ({
      as?: "button";
    } & HTMLButtonProps &
      ActionIconProps)
  | ({
      as: "a";
    } & HTMLAnchorProps &
      ActionIconProps);

const DEFAULT_ICON_SIZE = 16;

const defaultButtonProps: ActionIconProps & HTMLButtonProps = {
  variant: "subtle",
  size: "md",
  color: "neutral",
};

const defaultAnchorProps: ActionIconProps & HTMLAnchorProps = {
  variant: "subtle",
  size: "md",
  color: "neutral",
};

/**
 * An icon button displaying a pencil icon, typically used for edit actions.
 */
export function EditIconButton({ as, ...props }: Props): JSX.Element {
  const passThroughProps: ActionIconProps =
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
    <ActionIcon {...passThroughProps}>
      <IconPencil size={DEFAULT_ICON_SIZE} />
    </ActionIcon>
  );
}
