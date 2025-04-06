import { UnstyledButton, UnstyledButtonProps } from "@mantine/core";
import {
  createLink,
  LinkComponent,
  LinkComponentProps,
} from "@tanstack/react-router";
import { forwardRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface NewMantineUnstyledButtonProps
  extends Omit<UnstyledButtonProps, "href"> {}

const MantineUnstyledButtonLinkComponent = forwardRef<
  HTMLAnchorElement,
  NewMantineUnstyledButtonProps
>((props, ref): JSX.Element => {
  return <UnstyledButton component="a" ref={ref} {...props} />;
});

const MantineRouterUnstyledButtonLink = createLink(
  MantineUnstyledButtonLinkComponent,
);

/**
 * This is a Mantine UnstyledButton that is a link and that works with
 * our router.
 */
export const UnstyledButtonLink: LinkComponent<
  typeof MantineRouterUnstyledButtonLink
  // eslint-disable-next-line react/function-component-definition
> = (props) => {
  return <MantineRouterUnstyledButtonLink {...props} />;
};

export type UnstyledButtonLinkProps = LinkComponentProps<
  typeof MantineRouterUnstyledButtonLink
>;
