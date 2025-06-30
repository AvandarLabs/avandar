import { Box, BoxProps, MantineColor, Text } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import clsx from "clsx";
import { ReactNode } from "react";
import { NavLink } from "@/lib/ui/links/NavLink";
import { objectEntries } from "@/lib/utils/objects/misc";
import type { NavLinkProps } from "@/lib/ui/links/NavLink";

type Props = {
  links: ReadonlyArray<
    | (NavLinkProps & { linkKey: string })
    | { loadingText: ReactNode; style: NavLinkProps["style"] }
    | undefined
  >;

  /**
   * Color of active nav links. The hover color will be automatically
   * computed based on this color.
   */
  activeColor?: MantineColor;

  /** Color of inactive nav links when hovered */
  inactiveHoverColor?: MantineColor;
  gap?: NavLinkProps["py"];
  showRightChevrons?: boolean;
} & Omit<BoxProps, "color">;

function generateLinkKey(linkProps: NavLinkProps): string {
  const keyParts: string[] = [linkProps.to as string];
  if (linkProps.params && typeof linkProps.params === "object") {
    // Using `any` here but it's safe.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paramKeyVals = objectEntries(linkProps.params as any).map(
      ([key, val]: [string, unknown]) => {
        return `${key}=${String(val)}`;
      },
    );
    keyParts.push(...paramKeyVals);
  }
  return keyParts.join("_");
}

/**
 * This is a vertical list of NavLink components, whose props are
 * specified in the `links` prop, that works with our router.
 */
export function NavLinkList({
  links,
  activeColor = "primary.5",
  gap = "sm",
  showRightChevrons = false,
  inactiveHoverColor = "neutral.0",
  ...boxProps
}: Props): JSX.Element {
  const navLinks = links.map((link) => {
    if (!link) {
      return null;
    }

    if ("loadingText" in link) {
      return (
        <Text key="loading-text" style={link.style}>
          {link.loadingText}
        </Text>
      );
    }

    const { label, className, ...restOfLinkProps } = link;
    const navLinkClassName = clsx(
      "transition-colors",
      "[&:not(.active)]:text-neutral-700",
      "[&:not(.active)]:hover:text-black",
      className,
    );

    return (
      <NavLink
        key={link.linkKey ?? generateLinkKey(link)}
        {...restOfLinkProps}
        className={navLinkClassName}
        variant="filled"
        color={activeColor}
        inactiveHoverColor={inactiveHoverColor}
        rightSection={
          showRightChevrons ? <IconChevronRight size={16} stroke={0.5} /> : null
        }
        py={gap}
        label={
          <Text span fw={500}>
            {label}
          </Text>
        }
      />
    );
  });

  return <Box {...boxProps}>{navLinks}</Box>;
}
