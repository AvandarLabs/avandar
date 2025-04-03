import { NavLink as MantineNavLink } from "@mantine/core";
import { createLink, LinkComponent } from "@tanstack/react-router";
import { AnchorHTMLAttributes, forwardRef } from "react";
import type { NavLinkProps } from "@mantine/core";

interface MantineRouterNavLinkProps
  extends Omit<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      "style" | "color" | "onChange"
    >,
    NavLinkProps {}

const MantineRouterNavLink = forwardRef<
  HTMLAnchorElement,
  MantineRouterNavLinkProps
>((props, ref): JSX.Element => {
  return <MantineNavLink ref={ref} {...props} />;
});

const MantineRouterNavLinkComponent = createLink(MantineRouterNavLink);

// eslint-disable-next-line react/function-component-definition
export const NavLink: LinkComponent<typeof MantineRouterNavLink> = (props) => {
  return <MantineRouterNavLinkComponent {...props} />;
};
