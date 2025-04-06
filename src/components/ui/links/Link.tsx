import { Anchor, AnchorProps } from "@mantine/core";
import {
  createLink,
  LinkComponent,
  LinkComponentProps,
} from "@tanstack/react-router";
import { forwardRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface NewMantineLinkProps extends Omit<AnchorProps, "href"> {}

const MantineLinkComponent = forwardRef<HTMLAnchorElement, NewMantineLinkProps>(
  (props, ref): JSX.Element => {
    return <Anchor ref={ref} {...props} />;
  },
);

const MantineRouterLink = createLink(MantineLinkComponent);

/**
 * This is a Mantine Anchor Link that works with our router.
 */
// eslint-disable-next-line react/function-component-definition
export const Link: LinkComponent<typeof MantineRouterLink> = (props) => {
  return <MantineRouterLink {...props} />;
};

export type LinkProps = LinkComponentProps<typeof MantineRouterLink>;
