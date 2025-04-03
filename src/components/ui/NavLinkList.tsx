import { Box, NavLinkProps } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { LinkProps } from "@tanstack/react-router";
import { NavLink } from "@/components/ui/NavLink";

type Props = {
  links: ReadonlyArray<Pick<LinkProps, "to" | "params"> & { label: string }>;
  color?: NavLinkProps["color"];
};

export function NavLinkList({ links, color = "primary" }: Props): JSX.Element {
  const navLinks = links.map((link) => {
    return (
      <NavLink
        variant="filled"
        color={color}
        key={link.to}
        to={link.to}
        params={link.params}
        label={link.label}
        rightSection={<IconChevronRight size={16} stroke={0.5} />}
      />
    );
  });

  return <Box>{navLinks}</Box>;
}
