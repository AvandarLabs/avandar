import {
  Box,
  BoxProps,
  DEFAULT_THEME,
  MantineColor,
  Text,
} from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import clsx from "clsx";
import * as R from "remeda";
import { NavLink } from "@/components/ui/NavLink";
import { Theme } from "@/config/Theme";
import type { NavLinkProps } from "@/components/ui/NavLink";

const DEFAULT_PRIMARY_SHADE =
  typeof DEFAULT_THEME.primaryShade === "object" ?
    DEFAULT_THEME.primaryShade.light
  : DEFAULT_THEME.primaryShade;

type Props = {
  links: readonly NavLinkProps[];
  activeColor?: MantineColor;
  inactiveHoverColor?: MantineColor;
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

function mantineShadeToTailwindShade(shade: number): number {
  if (shade === 0) {
    return 50;
  }
  return shade * 100;
}

function mantineColorToTailwind(color: MantineColor | undefined): string {
  if (!color) {
    return "";
  }

  if (color.startsWith("#")) {
    return `[${color}]`;
  }

  const [colorName, colorShade] = color.split(".");
  if (!colorShade) {
    const primaryShade =
      typeof Theme.primaryShade === "object" ?
        // TODO(pablo): this should handle using the `dark` primary shade if
        // we're in dark mode
        Theme.primaryShade.light
      : DEFAULT_PRIMARY_SHADE;
    const tailwindShade = mantineShadeToTailwindShade(Number(primaryShade));
    return `${colorName}-${tailwindShade}`;
  }

  const tailwindShade = mantineShadeToTailwindShade(Number(colorShade));
  return `${colorName}-${tailwindShade}`;
}

export function NavLinkList({
  links,
  activeColor = "primary.5",
  gap = "sm",
  showRightChevrons = false,
  inactiveHoverColor,
  ...boxProps
}: Props): JSX.Element {
  const navLinks = links.map((link) => {
    const { label, className, ...restOfLinkProps } = link;
    const navLinkClassName = clsx(
      "[&:not(.active)]:text-neutral-700",
      "[&:not(.active)]:hover:text-black",
      {
        "[&:not(.active)]:hover:bg-neutral-50": !inactiveHoverColor,
        [`[&:not(.active)]:hover:bg-${mantineColorToTailwind(inactiveHoverColor)}`]:
          !!inactiveHoverColor,
      },
      className,
    );

    return (
      <NavLink
        key={generateLinkKey(link)}
        {...restOfLinkProps}
        className={navLinkClassName}
        variant="filled"
        color={activeColor}
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
