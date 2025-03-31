import { Anchor, AnchorProps } from "@mantine/core";
import { createLink, LinkComponent } from "@tanstack/react-router";
import { AnchorHTMLAttributes, forwardRef } from "react";

interface MantineRouterLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "color" | "style">,
    AnchorProps {}

const MantineRouterLink = forwardRef<HTMLAnchorElement, MantineRouterLinkProps>(
  (props, ref): JSX.Element => {
    return <Anchor ref={ref} {...props} />;
  },
);

const MantineRouterLinkComponent = createLink(MantineRouterLink);

// eslint-disable-next-line react/function-component-definition
export const Link: LinkComponent<typeof MantineRouterLink> = (props) => {
  return <MantineRouterLinkComponent {...props} />;
};
