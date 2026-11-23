import { Group, Text, Box } from "@mantine/core";
import logo from "@product-assets/logoWhite.png";
import { IconChevronDown } from "@tabler/icons-react";
import { Img } from "remotion";
import navCss from "@/components/AppShell/Navbar/Navbar.module.css";
import { NavbarLinkItem } from "@/components/AppShell/Navbar/NavbarLinkItem";
import { NavbarLinks } from "@/config/NavbarLinks/NavbarLinks";
import type { ComponentProps, ReactNode } from "react";

type Props = {
  links: ReadonlyArray<ComponentProps<typeof NavbarLinkItem>["item"]>;
};
/**
 * Show the product workspace and navigation using its existing source styles.
 */
export function AvandarSidebar({ links }: Readonly<Props>): ReactNode {
  return (
    <aside className="videoNavbar">
      <Group
        className={navCss.navbarLinkPill}
        gap="xs"
        px="xs"
        py="sm"
        wrap="nowrap"
      >
        <Img src={logo} width={25} height={25} alt="Avandar Labs" />
        <Text size="sm" fw={500} flex={1}>
          Avandar Labs
        </Text>
        <IconChevronDown size={18} />
      </Group>
      {links.map((item) => {
        return <NavbarLinkItem key={item.link.key} item={item} isOnline />;
      })}
      <Box mt="auto">
        <NavbarLinkItem
          item={NavbarLinks.workspaceSettings("avandar-labs")}
          isOnline
          isUtility
        />
      </Box>
    </aside>
  );
}
