import {
  AppShell,
  Burger,
  Group,
  Loader,
  Menu,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconChevronDown, IconLogout } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { Outlet, useRouter } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Link } from "@/components/ui/Link";
import { AppConfig } from "@/config/AppConfig";
import { useIsMobileSize } from "@/hooks/useIsMobileSize";
import { AuthService } from "@/services/AuthService";
import css from "./AppScaffold.module.css";

const HEADER_DEFAULT_HEIGHT = 60;
const FOOTER_DEFAULT_HEIGHT = 60;
const ASIDE_DEFAULT_WIDTH = 300;
const NAVBAR_DEFAULT_WIDTH = 300;

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
  const { mutate: sendSignOutRequest, isPending: isSignOutPending } =
    useMutation({
      mutationFn: async () => {
        await AuthService.signOut();
      },
      onSuccess: () => {
        router.invalidate();
      },
      onError: (error) => {
        notifications.show({
          title: "Sign out failed",
          message: error.message,
          color: "red",
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
      width={40}
    />
  );

  return (
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

      <AppShell.Navbar>
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
                  <Title order={2}>{AppConfig.appName}</Title>
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
        {AppConfig.navbarLinkOrder.map((linkKey) => {
          const link = AppConfig.links[linkKey];
          return (
            <Link
              key={linkKey}
              to={link.to}
              className={css.anchor}
              px="md"
              py="sm"
            >
              {link.label}
            </Link>
          );
        })}
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
        <TanStackRouterDevtools />
      </AppShell.Main>
      {aside ?
        <AppShell.Aside p="md">{aside}</AppShell.Aside>
      : null}
      {footer ?
        <AppShell.Footer p="md">{footer}</AppShell.Footer>
      : null}
    </AppShell>
  );
}
