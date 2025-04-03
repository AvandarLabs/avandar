import { UnstyledButton as MantineUnstyledButton } from "@mantine/core";
import { createLink, LinkComponent } from "@tanstack/react-router";
import { AnchorHTMLAttributes, forwardRef } from "react";
import type { UnstyledButtonProps } from "@mantine/core";

interface MantineRouterUnstyledButtonProps
  extends Omit<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      "color" | "onChange" | "style"
    >,
    UnstyledButtonProps {}

const MantineRouterNavLink = forwardRef<
  HTMLAnchorElement,
  MantineRouterUnstyledButtonProps
>((props, ref): JSX.Element => {
  return <MantineUnstyledButton component="a" ref={ref} {...props} />;
});

const MantineRouterNavLinkComponent = createLink(MantineRouterNavLink);

// eslint-disable-next-line react/function-component-definition
export const UnstyledButtonLink: LinkComponent<typeof MantineRouterNavLink> = (
  props,
) => {
  return <MantineRouterNavLinkComponent {...props} />;
};
