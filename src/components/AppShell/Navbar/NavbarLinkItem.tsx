import { Link } from "@avandar/ui";
import { Box, Flex, Group, Text } from "@mantine/core";
import css from "@/components/AppShell/Navbar/Navbar.module.css";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import { isAppLinkAvailableOffline } from "@/lib/offline/isAppLinkAvailableOffline/isAppLinkAvailableOffline";
import type { NavbarLink } from "@/config/NavbarLinks/NavbarLinks";

type Props = {
  item: NavbarLink;
  isOnline: boolean;
  isUtility?: boolean;
};

/** Renders one navbar destination with offline gating when required. */
export function NavbarLinkItem({
  item: { link, icon },
  isOnline,
  isUtility = false,
}: Props): JSX.Element {
  const isOfflineBlocked = !isOnline && !isAppLinkAvailableOffline(link);
  const label = (
    <>
      <Box mr="xs">{icon}</Box>
      <Text span fw={500} className={css.collapsibleText}>
        {link.label()}
      </Text>
    </>
  );
  const linkContent = (
    <Flex
      px={isUtility ? "sm" : "xs"}
      py="xs"
      bdrs="md"
      align="center"
      className={css.navbarLinkPill}
    >
      {isUtility ? (
        <Group gap={0} wrap="nowrap">
          {label}
        </Group>
      ) : (
        label
      )}
    </Flex>
  );

  if (isOfflineBlocked) {
    return (
      <OfflineGated isBlocked>
        <Box component="span" display="block" w="100%">
          {linkContent}
        </Box>
      </OfflineGated>
    );
  }

  return (
    <Link
      to={link.to}
      underline="never"
      params={link.params}
      className="transition-colors"
      py={isUtility ? "xxs" : undefined}
      pl={isUtility ? "xs" : undefined}
      pr={isUtility ? "sm" : undefined}
      size="sm"
      activeOptions={
        link.to === "/$workspaceSlug" ? { exact: true } : undefined
      }
    >
      {linkContent}
    </Link>
  );
}
