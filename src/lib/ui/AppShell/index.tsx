import {
  Burger,
  Divider,
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
import { useMutation } from "@/lib/hooks/query/useMutation";
import { useBoolean } from "@/lib/hooks/state/useBoolean";
import { useIsMobileSize } from "@/lib/hooks/ui/useIsMobileSize";
import { Link } from "@/lib/ui/links/Link";
import { Modal } from "@/lib/ui/Modal";
import { Workspace } from "@/models/Workspace/Workspace.types";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";
import { CreateWorkspaceForm } from "../../../components/common/forms/CreateWorkspaceForm";
import css from "./AppShell.module.css";

const HEADER_DEFAULT_HEIGHT = 60;
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
  navbarWidth?: number;
  spotlightActions?: Array<SpotlightActionData | SpotlightActionGroupData>;
  profileLink?: AppLink;
  navbarLinks: readonly NavbarLink[];

  /** Utility links go on the bottom of the navbar */
  utilityLinks?: readonly NavbarLink[];

  /**
   * The main content of the app shell.
   * Defaults to `<Outlet />` so it can be used in a router.
   */
  currentWorkspace?: Workspace;
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
                {title ?? APP_NAME}
              </Title>
            </Group>
          </MantineAppShell.Header>
        : null}

        <MantineAppShell.Navbar style={styles.navbar}>
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
                <UnstyledButton className="w-full text-left">
                  <div className="flex w-full items-center justify-between gap-2">
                    {logo}
                    <span className="flex-1 break-words text-base font-medium leading-tight">
                      {title ?? APP_NAME}
                    </span>
                    <IconChevronDown size={18} className="min-h-4 min-w-4" />
                  </div>
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
          <Stack gap="xs" justify="space-between" h="100%">
            <Stack flex={1} gap={0}>
              {navbarLinks.map(({ link, icon }) => {
                return (
                  <Link
                    key={link.key}
                    to={link.to}
                    params={link.params}
                    px="md"
                    py="sm"
                    className={clsx(css.anchor, "transition-colors")}
                    activeOptions={
                      link.to === "/$workspaceSlug" ?
                        { exact: true }
                      : undefined
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
            </Stack>
            <BetaBadge style={{ alignSelf: "center" }} />
            <Divider />
            <Stack gap={0} pb="md" pos="relative">
              {utilityLinks.map(({ link, icon }) => {
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
                      {icon}
                      <Text span fw={500}>
                        {link.label}
                      </Text>
                    </Group>
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
