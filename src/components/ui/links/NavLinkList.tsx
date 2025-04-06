import { Box, BoxProps, MantineColor, Text } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import clsx from "clsx";
import * as R from "remeda";
import { NavLink } from "@/components/ui/links/NavLink";
import type { NavLinkProps } from "@/components/ui/links/NavLink";

type Props = {
  links: readonly NavLinkProps[];

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
    const paramKeyVals = R.entries(linkProps.params as any).map(
      ([key, val]) => {
        return `${key}=${String(val)}`;
      },
    );
    keyParts.push(...paramKeyVals);
  }
  return keyParts.join("_");
}

export function NavLinkList({
  links,
  activeColor = "primary.5",
  gap = "sm",
  showRightChevrons = false,
  inactiveHoverColor = "neutral.0",
  ...boxProps
}: Props): JSX.Element {
  const navLinks = links.map((link) => {
    const { label, className, ...restOfLinkProps } = link;
    const navLinkClassName = clsx(
      "transition-colors",
      "[&:not(.active)]:text-neutral-700",
      "[&:not(.active)]:hover:text-black",
      className,
    );

    return (
      <NavLink
        key={generateLinkKey(link)}
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
