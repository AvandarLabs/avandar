import { AppShell, Burger, Button, Group, Loader, Stack } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation } from "@tanstack/react-query";
import { Link, Outlet, useRouter } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { AuthService } from "@/services/AuthService";

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

export function App({
  header = null,
  footer = null,
  aside = null,
  headerHeight = HEADER_DEFAULT_HEIGHT,
  footerHeight = FOOTER_DEFAULT_HEIGHT,
  asideWidth = ASIDE_DEFAULT_WIDTH,
  navbarWidth = NAVBAR_DEFAULT_WIDTH,
}: Props): JSX.Element {
  const router = useRouter();
  const { mutate: doSignOut, isPending: isSignOutPending } = useMutation({
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
  const isMobileViewSize = useMediaQuery("(max-width: 768px)");

  const logo = <img src="/logo.svg" className="logo" alt="Vite logo" />;

  return (
    <AppShell
      layout="alt"
      header={{ height: headerHeight }}
      footer={{ height: footerHeight }}
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

      <AppShell.Navbar p="md">
        <Group>
          <Burger
            opened={isNavbarOpened}
            onClick={toggleNavbar}
            size="sm"
            hiddenFrom="sm"
          />
          {logo}
          Navbar
        </Group>

        <Stack>
          <Link to="/" className="[&.active]:font-bold">
            Home
          </Link>
          <Link to="/profile" className="[&.active]:font-bold">
            Profile
          </Link>
          <Button type="button" onClick={() => doSignOut()}>
            Sign Out{" "}
            {isSignOutPending ?
              <Loader />
            : null}
          </Button>
        </Stack>
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
