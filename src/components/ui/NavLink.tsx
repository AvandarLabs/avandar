import {
  NavLink as MantineNavLink,
  NavLinkProps as MantineNavLinkProps,
} from "@mantine/core";
import {
  createLink,
  LinkComponent,
  LinkComponentProps,
} from "@tanstack/react-router";
import { forwardRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface NewMantineNavLinkProps extends Omit<MantineNavLinkProps, "href"> {}

const MantineNavLinkComponent = forwardRef<
  HTMLAnchorElement,
  NewMantineNavLinkProps
>((props, ref): JSX.Element => {
  return <MantineNavLink ref={ref} {...props} />;
});

const MantineRouterNavLink = createLink(MantineNavLinkComponent);

/**
 * This is a Mantine NavLink that works with our router.
 */
// eslint-disable-next-line react/function-component-definition
export const NavLink: LinkComponent<typeof MantineRouterNavLink> = (props) => {
  return <MantineRouterNavLink {...props} />;
};

export type NavLinkProps = LinkComponentProps<typeof MantineRouterNavLink>;
