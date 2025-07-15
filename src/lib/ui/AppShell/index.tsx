import {
  Burger,
  Group,
  Loader,
  AppShell as MantineAppShell,
  MantineTheme,
  Menu,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  Spotlight,
  SpotlightActionData,
  SpotlightActionGroupData,
} from "@mantine/spotlight";
import {
  IconChevronDown,
  IconLogout,
  IconSearch,
  IconUser,
} from "@tabler/icons-react";
import { Outlet, ReactNode, useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { AuthClient } from "@/clients/AuthClient";
import { AppConfig } from "@/config/AppConfig";
import { AppLink } from "@/config/AppLinks";
import { NavbarLink } from "@/config/NavbarLinks";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { useIsMobileSize } from "@/lib/hooks/ui/useIsMobileSize";
import { Link } from "@/lib/ui/links/Link";
import css from "./AppShell.module.css";

const HEADER_DEFAULT_HEIGHT = 60;
const FOOTER_DEFAULT_HEIGHT = 60;
const ASIDE_DEFAULT_WIDTH = 300;
const NAVBAR_DEFAULT_WIDTH = 220;

type Props = {
  title?: string;
  headerHeight?: number;
  footerHeight?: number;
  asideWidth?: number;
  navbarWidth?: number;
  spotlightActions?: Array<SpotlightActionData | SpotlightActionGroupData>;
  profileLink?: AppLink;
  navbarLinks: readonly NavbarLink[];

  /**
   * The main content of the app shell.
   * Defaults to `<Outlet />` so it can be used in a router.
   */
  mainContent?: ReactNode;
};

/**
 * The main app shell component.
 * The main content defaults to just being an `<Outlet />` component so it
 * can be used as a layout in the router.
 */
export function AppShell({
  headerHeight = HEADER_DEFAULT_HEIGHT,
  footerHeight = FOOTER_DEFAULT_HEIGHT,
  asideWidth = ASIDE_DEFAULT_WIDTH,
  navbarWidth = NAVBAR_DEFAULT_WIDTH,
  title,
  profileLink,
  spotlightActions,
  navbarLinks,
  mainContent = <Outlet />,
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

  const [isNavbarOpened, { toggle: toggleNavbar }] = useDisclosure(false);
  const isMobileViewSize = useIsMobileSize() ?? false;

  const logo = (
    <img
      src={`/${AppConfig.logoFilename}`}
      className="logo"
      alt="Logo"
      width={28}
    />
  );

  return (
    <>
      <MantineAppShell
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
        {isMobileViewSize ?
          <MantineAppShell.Header>
            <Group
              h="100%"
              px="md"
              className={clsx(css.anchor, "transition-colors")}
            >
              <Burger
                opened={isNavbarOpened}
                onClick={toggleNavbar}
                size="sm"
                hiddenFrom="sm"
              />
              {logo}
              <Title order={2} size="md" textWrap="nowrap">
                {title ?? AppConfig.appName}
              </Title>
            </Group>
          </MantineAppShell.Header>
        : null}

        <MantineAppShell.Navbar style={$navbarBorder}>
          <Group
            className={clsx(css.anchor, "transition-colors")}
            px="md"
            py="sm"
            wrap="nowrap"
          >
            <Burger
              opened={isNavbarOpened}
              onClick={toggleNavbar}
              size="sm"
              hiddenFrom="sm"
            />
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Group wrap="nowrap" gap="xs">
                    {logo}
                    <Title order={2} size="md" textWrap="nowrap">
                      {title ?? AppConfig.appName}
                    </Title>
                    <IconChevronDown size={18} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                {profileLink ?
                  <Menu.Item
                    leftSection={<IconUser size={16} />}
                    onClick={() => {
                      router.navigate({ to: profileLink.to });
                    }}
                  >
                    <Text span>Profile</Text>
                  </Menu.Item>
                : null}
                <Menu.Item
                  leftSection={<IconLogout size={16} />}
                  onClick={() => {
                    sendSignOutRequest();
                  }}
                >
                  <Group>
                    <Text span>Sign Out</Text>
                    {isSignOutPending ?
                      <Loader />
                    : null}
                  </Group>
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>

          {navbarLinks.map(({ link, icon }: NavbarLink) => {
            return (
              <Link
                key={link.key}
                to={link.to}
                params={link.params}
                className={clsx(css.anchor, "transition-colors")}
                activeOptions={
                  link.to === "/$workspaceSlug" ? { exact: true } : undefined
                }
              >
                <Group>
                  {icon}
                  <Text span fw={500}>
                    {link.label}
                  </Text>
                </Group>
              </Link>
            );
          })}
        </MantineAppShell.Navbar>

        <MantineAppShell.Main py="0" pr="0" ml={-16}>
          {mainContent}
        </MantineAppShell.Main>
      </MantineAppShell>
      <Spotlight
        highlightQuery
        actions={spotlightActions ?? []}
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
