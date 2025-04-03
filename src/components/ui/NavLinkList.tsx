import { Box } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { NavLink } from "@/components/ui/NavLink";
import type { NavLinkProps } from "@/components/ui/NavLink";

type Props = {
  links: readonly NavLinkProps[];
  color?: NavLinkProps["color"];
  gap?: NavLinkProps["py"];
};

export function NavLinkList({
  links,
  color = "primary",
  gap = "sm",
}: Props): JSX.Element {
  const navLinks = links.map((link) => {
    return (
      <NavLink
        key={link.to}
        {...link}
        variant="filled"
        color={color}
        rightSection={<IconChevronRight size={16} stroke={0.5} />}
        py={gap}
      />
    );
  });

  return <Box>{navLinks}</Box>;
}
