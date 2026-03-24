import { useBoolean } from "@hooks/useBoolean/useBoolean";
import { useMutation } from "@hooks/useMutation/useMutation";
import {
  Box,
  Burger,
  Divider,
  Flex,
  Group,
  Loader,
  Menu,
  Modal,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconChevronDown,
  IconLogout,
  IconPlus,
  IconSwitch2,
  IconUser,
} from "@tabler/icons-react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { APP_NAME } from "$/config/AppConfig";
import { AuthClient } from "@/clients/AuthClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { BetaBadge } from "@/components/common/BetaBadge/BetaBadge";
import { CreateWorkspaceForm } from "@/components/common/forms/CreateWorkspaceForm";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { Link } from "@/lib/ui/links/Link";
import { Logo } from "../Logo";
import css from "./Navbar.module.css";
import type { AppLink } from "@/config/AppLinks";
import type { NavbarLink } from "@/config/NavbarLinks";
import type { Workspace } from "$/models/Workspace/Workspace";

type Props = {
  isMobileNavbarOpened: boolean;
  onToggleMobileNavbar: () => void;
  title?: string;
  profileLink?: AppLink;

  /** Core navbar links, listed at the top of the navbar */
  navbarLinks: readonly NavbarLink[];

  /** Utility links go on the bottom of the navbar */
  utilityLinks: readonly NavbarLink[];
  currentWorkspace?: Workspace.WithSubscription;
};

export function Navbar({
  isMobileNavbarOpened,
  onToggleMobileNavbar,
  title,
  profileLink,
  navbarLinks,
  utilityLinks,
  currentWorkspace,
}: Props): JSX.Element {
  const router = useRouter();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [userWorkspaces] = WorkspaceClient.useGetWorkspacesOfCurrentUser({
    useQueryOptions: { staleTime: Infinity },
  });

  const [
    isCreateWorkspaceModalOpen,
    openCreateWorkspaceModal,
    closeCreateWorkspaceModal,
  ] = useBoolean(false);

  const [sendSignOutRequest, isSignOutPending] = useMutation({
    mutationFn: async () => {
      await AuthClient.signOut();
    },
    onSuccess: () => {
      router.invalidate();
      closeCreateWorkspaceModal();
    },
    onError: (error) => {
      notifications.show({
        title: "Sign out failed",
        message: error.message,
        color: "danger",
      });
    },
  });

  const logo = <Logo size="small" />;
  const mobile = {
    burgerIcon: (
      <Burger
        opened={isMobileNavbarOpened}
        color="white"
        onClick={onToggleMobileNavbar}
        size="sm"
        // hide in sizes larger than mobile
        hiddenFrom="sm"
      />
    ),
  };

  // whether to render the navbar in mobile or desktop mode is based on the
  // viewport size and its handled internally by Mantine's AppShell component
  return (
    <>
      <Group
        pt="xs"
        pl="xs"
        wrap="nowrap"
        gap={0}
        justify="space-between"
        w="100%"
      >
        {mobile.burgerIcon}
        <Box flex={1} miw={0}>
          <Menu shadow="md" width="100%">
            <Menu.Target>
              <UnstyledButton className="w-full text-left">
                <Flex
                  px="xs"
                  py="xxs"
                  bdrs="md"
                  align="center"
                  className={css.navbarLinkPill}
                  w="100%"
                >
                  <Group
                    gap="xs"
                    wrap="nowrap"
                    align="center"
                    justify="space-between"
                    flex={1}
                    miw={0}
                  >
                    <Group
                      gap="xs"
                      wrap="nowrap"
                      align="center"
                      flex={1}
                      miw={0}
                    >
                      <Box className="shrink-0">{logo}</Box>
                      <Text
                        className="font-medium leading-tight"
                        flex={1}
                        miw={0}
                        size="sm"
                        truncate
                      >
                        {title ?? APP_NAME}
                      </Text>
                    </Group>
                    <IconChevronDown
                      size={18}
                      className="min-h-4 min-w-4 shrink-0"
                    />
                  </Group>
                </Flex>
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
                    onClick={openCreateWorkspaceModal}
                  >
                    <Text span>Create Workspace</Text>
                  </Menu.Item>
                  {userWorkspaces && userWorkspaces?.length > 1 ?
                    <Menu.Sub>
                      <Menu.Sub.Target>
                        <Menu.Sub.Item leftSection={<IconSwitch2 size={14} />}>
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
        </Box>
      </Group>
      <Stack gap="xs" justify="space-between" h="100%">
        <Stack flex={1} gap="xxs" pl="xs">
          {navbarLinks.map(({ link, icon, isEnabled }) => {
            if (
              !user ||
              !currentWorkspace ||
              (isEnabled && !isEnabled?.({ user, workspace: currentWorkspace }))
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
                size="sm"
                activeOptions={
                  link.to === "/$workspaceSlug" ? { exact: true } : undefined
                }
              >
                <Flex
                  px="xs"
                  py="xs"
                  bdrs="md"
                  align="center"
                  className={css.navbarLinkPill}
                >
                  <Box mr="xs">{icon}</Box>
                  <Text span fw={500} className={css.collapsibleText}>
                    {link.label}
                  </Text>
                </Flex>
              </Link>
            );
          })}
        </Stack>
        <BetaBadge size="md" style={{ alignSelf: "center" }} />
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
                pr="sm"
                size="sm"
                activeOptions={
                  link.to === "/$workspaceSlug" ? { exact: true } : undefined
                }
              >
                <Flex
                  px="sm"
                  py="xs"
                  bdrs="md"
                  align="center"
                  className={css.navbarLinkPill}
                >
                  <Group gap={0} wrap="nowrap">
                    <Box mr="xs">{icon}</Box>
                    <Text span fw={500} className={css.collapsibleText}>
                      {link.label}
                    </Text>
                  </Group>
                </Flex>
              </Link>
            );
          })}
        </Stack>
      </Stack>
      <Modal
        opened={isCreateWorkspaceModalOpen}
        onClose={closeCreateWorkspaceModal}
      >
        <CreateWorkspaceForm introText="Create a new workspace. You can always edit it later." />
      </Modal>
    </>
  );
}
