import {
  AppShell,
  Burger,
  Group,
  Loader,
  MantineTheme,
  Menu,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { Spotlight } from "@mantine/spotlight";
import { IconChevronDown, IconLogout, IconSearch } from "@tabler/icons-react";
import { Outlet, useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { AuthClient } from "@/clients/AuthClient";
import { APP_CONFIG } from "@/config/AppConfig";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { useIsMobileSize } from "@/lib/hooks/useIsMobileSize";
import { Link } from "@/lib/ui/links/Link";
import css from "./AppScaffold.module.css";
import { useSpotlightActions } from "./useSpotlightActions";

const HEADER_DEFAULT_HEIGHT = 60;
const FOOTER_DEFAULT_HEIGHT = 60;
const ASIDE_DEFAULT_WIDTH = 300;
const NAVBAR_DEFAULT_WIDTH = 220;

type Props = {
  header?: React.ReactNode;
  headerHeight?: number;
  footer?: React.ReactNode;
  footerHeight?: number;
  aside?: React.ReactNode;
  asideWidth?: number;
  navbarWidth?: number;
};

export function AppScaffold({
  header = null,
  footer = null,
  aside = null,
  headerHeight = HEADER_DEFAULT_HEIGHT,
  footerHeight = FOOTER_DEFAULT_HEIGHT,
  asideWidth = ASIDE_DEFAULT_WIDTH,
  navbarWidth = NAVBAR_DEFAULT_WIDTH,
}: Props): JSX.Element {
  const router = useRouter();
  const [sendSignOutRequest, isSignOutPending] = useMutation({
    mutationFn: async () => {
      await AuthClient.signOut();
    },
    onSuccess: () => {
      router.invalidate();
    },
    onError: (error) => {
      notifications.show({
        title: "Sign out failed",
        message: error.message,
        color: "danger",
      });
    },
  });

  const spotlightActions = useSpotlightActions();
  const [isNavbarOpened, { toggle: toggleNavbar }] = useDisclosure(false);
  const isMobileViewSize = useIsMobileSize() ?? false;

  const logo = (
    <img
      src={`/${APP_CONFIG.logoFilename}`}
      className="logo"
      alt="Logo"
      width={40}
    />
  );

  return (
    <>
      <AppShell
        layout="alt"
        header={{ height: headerHeight }}
        footer={{ height: footerHeight }}
        classNames={{
          navbar: css.navbar,
        }}
        navbar={{
          width: navbarWidth,
          breakpoint: "sm",
          collapsed: { mobile: !isNavbarOpened },
        }}
        aside={{
          width: asideWidth,
          breakpoint: "md",
          collapsed: { desktop: false, mobile: true },
        }}
        padding="md"
      >
        {header || isMobileViewSize ?
          <AppShell.Header>
            <Group h="100%" px="md">
              <Burger
                opened={isNavbarOpened}
                onClick={toggleNavbar}
                size="sm"
                hiddenFrom="sm"
              />
              {logo}
              {header}
            </Group>
          </AppShell.Header>
        : null}

        <AppShell.Navbar style={$navbarBorder}>
          <Group px="md" py="sm" justify="center">
            <Burger
              opened={isNavbarOpened}
              onClick={toggleNavbar}
              size="sm"
              hiddenFrom="sm"
            />
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    {logo}
                    <Title order={2}>{APP_CONFIG.appName}</Title>
                    <IconChevronDown />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconLogout size={16} />}
                  onClick={() => {
                    sendSignOutRequest();
                  }}
                >
                  Sign Out{" "}
                  {isSignOutPending ?
                    <Loader />
                  : null}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
          {APP_CONFIG.navbarLinkOrder.map((linkKey) => {
            const link = APP_CONFIG.links[linkKey];
            return (
              <Link
                key={linkKey}
                to={link.to}
                className={clsx(css.anchor, "transition-colors")}
                px="md"
                py="sm"
              >
                <Group>
                  {link.icon}
                  <Text span fw={500}>
                    {link.label}
                  </Text>
                </Group>
              </Link>
            );
          })}
        </AppShell.Navbar>

        <AppShell.Main py="0" pr="0" ml={-16}>
          <Outlet />
        </AppShell.Main>

        {aside ?
          <AppShell.Aside p="md">{aside}</AppShell.Aside>
        : null}
        {footer ?
          <AppShell.Footer p="md">{footer}</AppShell.Footer>
        : null}
      </AppShell>
      <Spotlight
        highlightQuery
        actions={spotlightActions}
        nothingFound="Nothing found..."
        searchProps={{
          leftSection: <IconSearch size={20} stroke={1.5} />,
          placeholder: "Search...",
        }}
      />
    </>
  );
}

const $navbarBorder = (theme: MantineTheme) => {
  return {
    borderRight: `1px solid ${theme.colors.neutral[7]}`,
  };
};
