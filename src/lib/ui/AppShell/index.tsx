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
import {
  LinkProps,
  Outlet,
  ReactNode,
  useRouter,
} from "@tanstack/react-router";
import clsx from "clsx";
import { useMemo } from "react";
import { AuthClient } from "@/clients/AuthClient";
import { APP_CONFIG } from "@/config/AppConfig";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { useIsMobileSize } from "@/lib/hooks/useIsMobileSize";
import { Link } from "@/lib/ui/links/Link";
import { objectEntries } from "@/lib/utils/objects/misc";
import css from "./AppShell.module.css";

const HEADER_DEFAULT_HEIGHT = 60;
const FOOTER_DEFAULT_HEIGHT = 60;
const ASIDE_DEFAULT_WIDTH = 300;
const NAVBAR_DEFAULT_WIDTH = 220;

type Props = {
  header?: ReactNode;
  headerHeight?: number;
  footer?: ReactNode;
  footerHeight?: number;
  aside?: ReactNode;
  asideWidth?: number;
  navbarWidth?: number;
  additionalSpotlightActions?: Array<
    SpotlightActionData | SpotlightActionGroupData
  >;
  additionalLinks?: ReadonlyArray<
    Pick<LinkProps, "to" | "params"> & {
      icon: ReactNode;
      key: string;
      label: string;
    }
  >;
};

export function AppShell({
  header = null,
  footer = null,
  aside = null,
  headerHeight = HEADER_DEFAULT_HEIGHT,
  footerHeight = FOOTER_DEFAULT_HEIGHT,
  asideWidth = ASIDE_DEFAULT_WIDTH,
  navbarWidth = NAVBAR_DEFAULT_WIDTH,
  additionalSpotlightActions,
  additionalLinks,
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

  const spotlightActionsToUse = useMemo(() => {
    const navigationActions = objectEntries(APP_CONFIG.links).map(
      ([linkKey, link]): SpotlightActionData | SpotlightActionGroupData => {
        return {
          id: linkKey,
          label: link.label,
          description: link.spotlightDescription,
          onClick: () => {
            router.navigate({ to: link.to });
          },
          leftSection: link.icon,
        };
      },
    );
    return [...navigationActions, ...(additionalSpotlightActions ?? [])];
  }, [router, additionalSpotlightActions]);

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
        {header || isMobileViewSize ?
          <MantineAppShell.Header>
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
          </MantineAppShell.Header>
        : null}

        <MantineAppShell.Navbar style={$navbarBorder}>
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
                  leftSection={<IconUser size={16} />}
                  onClick={() => {
                    router.navigate({ to: APP_CONFIG.links.profile.to });
                  }}
                >
                  <Text span>Profile</Text>
                </Menu.Item>

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
          {additionalLinks?.map((link) => {
            return (
              <Link
                key={link.key}
                to={link.to}
                params={link.params}
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
        </MantineAppShell.Navbar>

        <MantineAppShell.Main py="0" pr="0" ml={-16}>
          <Outlet />
        </MantineAppShell.Main>

        {aside ?
          <MantineAppShell.Aside p="md">{aside}</MantineAppShell.Aside>
        : null}
        {footer ?
          <MantineAppShell.Footer p="md">{footer}</MantineAppShell.Footer>
        : null}
      </MantineAppShell>
      <Spotlight
        highlightQuery
        actions={spotlightActionsToUse}
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
