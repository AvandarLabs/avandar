import { Box, BoxProps, Text } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import clsx from "clsx";
import * as R from "remeda";
import { NavLink } from "@/components/ui/NavLink";
import type { NavLinkProps } from "@/components/ui/NavLink";

type Props = {
  links: readonly NavLinkProps[];
  color?: NavLinkProps["color"];
  gap?: NavLinkProps["py"];
  showRightChevrons?: boolean;
} & Omit<BoxProps, "color">;

function generateLinkKey(linkProps: NavLinkProps): string {
  const keyParts: string[] = [linkProps.to as string];
  if (linkProps.params && typeof linkProps.params === "object") {
    const paramKeyVals = R.entries(linkProps.params).map(([key, val]) => {
      return `${key}=${String(val)}`;
    });
    keyParts.push(...paramKeyVals);
  }
  return keyParts.join("_");
}

export function NavLinkList({
  links,
  color = "primary.5",
  gap = "sm",
  showRightChevrons = false,
  ...boxProps
}: Props): JSX.Element {
  const navLinks = links.map((link) => {
    const { label, className, ...restOfLinkProps } = link;
    const navLinkClassName = clsx(
      "[&:not(.active)]:hover:bg-neutral-50",
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
        color={color}
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
