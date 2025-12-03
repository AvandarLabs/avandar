import {
  ActionIcon,
  Box,
  Burger,
  Divider,
  Flex,
  Group,
  Loader,
  AppShell as MantineAppShell,
  MantineTheme,
  Menu,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  Spotlight,
  SpotlightActionData,
  SpotlightActionGroupData,
} from "@mantine/spotlight";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconLogout,
  IconPlus,
  IconSearch,
  IconSwitch2,
  IconUser,
} from "@tabler/icons-react";
import { Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { APP_NAME } from "$/config/AppConfig";
import clsx from "clsx";
import { ReactNode } from "react";
import { AuthClient } from "@/clients/AuthClient";
import { BetaBadge } from "@/components/common/BetaBadge";
import { AppConfig } from "@/config/AppConfig";
import { AppLink, AppLinks } from "@/config/AppLinks";
import { NavbarLink } from "@/config/NavbarLinks";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { useBoolean } from "@/lib/hooks/state/useBoolean";
import { useToggleBoolean } from "@/lib/hooks/state/useToggleBoolean";
import { useIsMobileSize } from "@/lib/hooks/ui/useIsMobileSize";
import { AvaTooltip } from "@/lib/ui/AvaTooltip";
import { Link } from "@/lib/ui/links/Link";
import { Modal } from "@/lib/ui/Modal";
import { WorkspaceWithSubscription } from "@/models/Workspace/Workspace.types";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";
import { CreateWorkspaceForm } from "../../../components/common/forms/CreateWorkspaceForm";
import css from "./AppShell.module.css";

const HEADER_DEFAULT_HEIGHT = 42;
const FOOTER_DEFAULT_HEIGHT = 60;
const ASIDE_DEFAULT_WIDTH = 300;
const NAVBAR_DEFAULT_WIDTH = 220;

type Props = {
  /**
   * The main content of the app shell.
   * Defaults to `<Outlet />` so it can be used in a router.
   */
  children?: ReactNode;
  title?: string;
  headerHeight?: number;
  footerHeight?: number;
  asideWidth?: number;
  defaultNavbarWidth?: number;
  spotlightActions?: Array<SpotlightActionData | SpotlightActionGroupData>;
  profileLink?: AppLink;
  navbarLinks: readonly NavbarLink[];

  /** Utility links go on the bottom of the navbar */
  utilityLinks?: readonly NavbarLink[];

  /**
   * The main content of the app shell.
   * Defaults to `<Outlet />` so it can be used in a router.
   */
  currentWorkspace?: WorkspaceWithSubscription;
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
  defaultNavbarWidth = NAVBAR_DEFAULT_WIDTH,
  children = <Outlet />,
  title,
  profileLink,
  spotlightActions,
  navbarLinks,
  currentWorkspace,
  utilityLinks = [],
}: Props): JSX.Element {
  const router = useRouter();
  const [opened, open, close] = useBoolean(false);
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [userWorkspaces] = WorkspaceClient.useGetWorkspacesOfCurrentUser({
    useQueryOptions: { staleTime: Infinity },
  });

  const [sendSignOutRequest, isSignOutPending] = useMutation({
    mutationFn: async () => {
      await AuthClient.signOut();
    },
    onSuccess: () => {
      router.invalidate();
      close();
    },
    onError: (error) => {
      notifications.show({
        title: "Sign out failed",
        message: error.message,
        color: "danger",
      });
    },
  });

  const [isMobileNavbarOpened, toggleMobileNavbar] = useToggleBoolean(false);
  const [isDesktopNavbarCollapsed, toggleDesktopNavbar] =
    useToggleBoolean(false);
  const isMobileViewSize = useIsMobileSize() ?? false;
  const navbarWidth = isDesktopNavbarCollapsed ? 58 : defaultNavbarWidth;

  const logo =
    isMobileViewSize ?
      <img
        src={`/${AppConfig.logoFilename}`}
        className="logo"
        alt="Logo"
        width={25}
      />
    : <img
        src={`/${AppConfig.logoFilename}`}
        className="logo"
        alt="Logo"
        width={28}
      />;

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
          collapsed: { mobile: !isMobileNavbarOpened },
        }}
        aside={{
          width: asideWidth,
          breakpoint: "md",
          collapsed: { desktop: false, mobile: true },
        }}
        padding="md"
      >
        {isMobileViewSize ?
          <MantineAppShell.Header bg="neutral">
            <Group
              h="100%"
              px="md"
              className={clsx(css.navbarTitleLink, "transition-colors")}
            >
              <Burger
                color="white"
                opened={isMobileNavbarOpened}
                onClick={toggleMobileNavbar}
                size="sm"
                hiddenFrom="sm"
              />
              {logo}
              <Title order={2} size="md" textWrap="nowrap" fw={500}>
                {title ?? APP_NAME}
              </Title>
            </Group>
          </MantineAppShell.Header>
        : null}

        <MantineAppShell.Navbar style={styles.navbar}>
          <Group
            className={clsx(css.navbarTitleLink, "transition-colors")}
            px="md"
            pt="sm"
            pb="xs"
            wrap="nowrap"
            justify="space-between"
            gap={0}
          >
            <Group
              wrap="nowrap"
              style={{ flex: 1, minWidth: 0 }}
              className={clsx(
                css.collapsibleContent,
                isDesktopNavbarCollapsed && css.collapsibleContentHidden,
              )}
            >
              <Burger
                opened={isMobileNavbarOpened}
                color="white"
                onClick={toggleMobileNavbar}
                size="sm"
                hiddenFrom="sm"
              />
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <UnstyledButton className="w-full text-left">
                    <Group
                      gap={0}
                      w="100%"
                      justify="space-between"
                      align="center"
                    >
                      <Group gap="xs">
                        {logo}
                        <Text
                          className="text-base font-medium leading-tight"
                          style={{ flex: 1, minWidth: 0 }}
                          truncate
                        >
                          {title ?? APP_NAME}
                        </Text>
                        <IconChevronDown
                          size={18}
                          className="min-h-4 min-w-4 shrink-0"
                        />
                      </Group>
                    </Group>
                  </UnstyledButton>
                </Menu.Target>
                <Menu.Dropdown style={{ width: "max-content", minWidth: 200 }}>
                  {profileLink ?
                    <>
                      <Menu.Item
                        leftSection={<IconUser size={16} />}
                        onClick={() => {
                          router.navigate({ to: profileLink.to });
                        }}
                      >
                        <Text span>Profile</Text>
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconPlus size={16} />}
                        onClick={open}
                      >
                        <Text span>Create Workspace</Text>
                      </Menu.Item>
                      {userWorkspaces && userWorkspaces?.length > 1 ?
                        <Menu.Sub>
                          <Menu.Sub.Target>
                            <Menu.Sub.Item
                              leftSection={<IconSwitch2 size={14} />}
                            >
                              <Text>Switch Workspace</Text>
                            </Menu.Sub.Item>
                          </Menu.Sub.Target>

                          <Menu.Sub.Dropdown>
                            {userWorkspaces?.map((ws) => {
                              return (
                                <Menu.Item
                                  key={ws.id}
                                  onClick={() => {
                                    navigate(AppLinks.workspaceHome(ws.slug));
                                  }}
                                  disabled={
                                    currentWorkspace &&
                                    ws.slug === currentWorkspace.slug
                                  }
                                >
                                  {ws.name}
                                </Menu.Item>
                              );
                            })}
                          </Menu.Sub.Dropdown>
                        </Menu.Sub>
                      : null}
                    </>
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
            <AvaTooltip
              label={
                isDesktopNavbarCollapsed ? "Open sidebar" : "Close sidebar"
              }
            >
              <ActionIcon
                variant="subtle"
                color="white"
                size="md"
                onClick={toggleDesktopNavbar}
                aria-label="Close sidebar"
              >
                {isDesktopNavbarCollapsed ?
                  <IconChevronRight size={18} />
                : <IconChevronLeft size={18} />}
              </ActionIcon>
            </AvaTooltip>
          </Group>
          <Stack gap="xs" justify="space-between" h="100%">
            <Stack flex={1} gap={0}>
              {navbarLinks.map(({ link, icon, isEnabled }) => {
                if (
                  !user ||
                  !currentWorkspace ||
                  (isEnabled &&
                    !isEnabled?.({ user, workspace: currentWorkspace }))
                ) {
                  return null;
                }

                return (
                  <Link
                    key={link.key}
                    to={link.to}
                    underline="never"
                    params={link.params}
                    className="transition-colors"
                    py="xxs"
                    pl="xs"
                    pr={isDesktopNavbarCollapsed ? "xs" : "sm"}
                    activeOptions={
                      link.to === "/$workspaceSlug" ?
                        { exact: true }
                      : undefined
                    }
                  >
                    <Flex
                      px="xs"
                      py="xs"
                      bdrs="md"
                      align="center"
                      className={css.navbarLinkPill}
                    >
                      <Group gap={0} wrap="nowrap">
                        {isDesktopNavbarCollapsed ?
                          <AvaTooltip label={link.label} position="right">
                            <Box mr="xs">{icon}</Box>
                          </AvaTooltip>
                        : <Box mr="xs">{icon}</Box>}
                        <Text
                          span
                          fw={500}
                          className={clsx(
                            css.collapsibleText,
                            isDesktopNavbarCollapsed ?
                              css.collapsibleTextHidden
                            : undefined,
                          )}
                        >
                          {link.label}
                        </Text>
                      </Group>
                    </Flex>
                  </Link>
                );
              })}
            </Stack>
            <BetaBadge
              size={isDesktopNavbarCollapsed ? "xs" : "md"}
              style={{ alignSelf: "center" }}
            />
            <Divider />
            <Stack gap={0} pb="xs" pos="relative">
              {utilityLinks.map(({ link, icon }) => {
                return (
                  <Link
                    key={link.key}
                    to={link.to}
                    underline="never"
                    params={link.params}
                    className="transition-colors"
                    py="xxs"
                    pl="xs"
                    pr={isDesktopNavbarCollapsed ? "xs" : "sm"}
                    activeOptions={
                      link.to === "/$workspaceSlug" ?
                        { exact: true }
                      : undefined
                    }
                  >
                    <Flex
                      px={isDesktopNavbarCollapsed ? "xs" : "sm"}
                      py="xs"
                      bdrs="md"
                      align="center"
                      className={css.navbarLinkPill}
                    >
                      <Group gap={0} wrap="nowrap">
                        {isDesktopNavbarCollapsed ?
                          <AvaTooltip label={link.label} position="right">
                            <Box mr="xs">{icon}</Box>
                          </AvaTooltip>
                        : <Box mr="xs">{icon}</Box>}
                        <Text
                          span
                          fw={500}
                          className={clsx(
                            css.collapsibleText,
                            isDesktopNavbarCollapsed &&
                              css.collapsibleTextHidden,
                          )}
                        >
                          {link.label}
                        </Text>
                      </Group>
                    </Flex>
                  </Link>
                );
              })}
            </Stack>
          </Stack>
        </MantineAppShell.Navbar>

        <MantineAppShell.Main py="0" pr="0" ml={-16}>
          {children}
        </MantineAppShell.Main>
      </MantineAppShell>
      <Modal opened={opened} onClose={close}>
        <CreateWorkspaceForm introText="Create a new workspace. You can always edit it later." />
      </Modal>

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

const styles = {
  navbar: (theme: MantineTheme) => {
    return {
      borderRight: `1px solid ${theme.colors.neutral[7]}`,
    };
  },
};
