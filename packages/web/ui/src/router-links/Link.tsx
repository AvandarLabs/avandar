import { Anchor } from "@mantine/core";
import { createLink } from "@tanstack/react-router";
import { forwardRef } from "react";
import type { AnchorProps } from "@mantine/core";
import type { LinkComponent, LinkComponentProps } from "@tanstack/react-router";

// oxlint-disable-next-line typescript/no-empty-object-type -- Mantine props
interface NewMantineLinkProps extends Omit<AnchorProps, "href"> {}

const MantineLinkComponent = forwardRef<HTMLAnchorElement, NewMantineLinkProps>(
  (props, ref): JSX.Element => {
    return <Anchor ref={ref} {...props} />;
  },
);

const MantineRouterLink = createLink(MantineLinkComponent);

/** This is a Mantine Anchor Link that works with our router. */
// oxlint-disable-next-line react-js/function-component-definition -- typed API
export const Link: LinkComponent<typeof MantineRouterLink> = (props) => {
  return <MantineRouterLink {...props} />;
};

export type LinkProps = LinkComponentProps<typeof MantineRouterLink>;
