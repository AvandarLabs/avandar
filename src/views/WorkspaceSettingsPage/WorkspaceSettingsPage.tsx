import { Tabs } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Container, Stack, Text, Title } from "@mantine/core";
import { useNavigate, useParams } from "@tanstack/react-router";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AvaForm } from "@/components/forms/AvaForm/AvaForm";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { useIsGlobalAdmin } from "@/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { WorkspaceBillingView } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/WorkspaceBillingView";
import { PrivacyLogTab } from "./PrivacyLogTab/PrivacyLogTab";
import { WorkspaceDangerZone } from "./WorkspaceDangerZone";
import { WorkspaceLanguageTab } from "./WorkspaceLanguageTab/WorkspaceLanguageTab";
import { WorkspaceRolesTab } from "./WorkspaceRolesTab/WorkspaceRolesTab";
import { WorkspaceTagsTab } from "./WorkspaceTagsTab/WorkspaceTagsTab";
import { WorkspaceUsersTab } from "./WorkspaceUsersTab/WorkspaceUsersTab";

/**
 * Settings tabs shown to the workspace owner (the user whose id matches
 * `workspace.ownerId`). The owner sees every tab, including "billing", which
 * manages the workspace subscription and is owner-only.
 */
const OWNER_TAB_IDS = [
  "general",
  "users",
  "roles",
  "tags",
  "language",
  "privacy",
  "billing",
] as const;

/**
 * Settings tabs shown to a non-owner settings admin: the same set as the owner
 * minus "billing", since only the workspace owner can manage billing.
 */
const NON_OWNER_TAB_IDS = [
  "general",
  "users",
  "roles",
  "tags",
  "language",
  "privacy",
] as const;

type OwnerTabId = (typeof OWNER_TAB_IDS)[number];
type NonOwnerTabId = (typeof NON_OWNER_TAB_IDS)[number];

function isOwnerTabId(value: string): value is OwnerTabId {
  return (OWNER_TAB_IDS as readonly string[]).includes(value);
}

function isNonOwnerTabId(value: string): value is NonOwnerTabId {
  return (NON_OWNER_TAB_IDS as readonly string[]).includes(value);
}

export function WorkspaceSettingsPage(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();
  const isSettingsAdmin = useIsGlobalAdmin();
  const { t } = useLingui();
  const navigate = useNavigate();
  const { tabName } = useParams({
    from: "/_auth/$workspaceSlug/settings/$tabName",
  });

  const [saveWorkspace, isWorkspaceSaving] = WorkspaceClient.useUpdate({
    queriesToInvalidate: [
      WorkspaceClient.QueryKeys.getWorkspacesOfCurrentUser(),
    ],
    onSuccess: () => {
      notifySuccess({
        title: t`Workspace name updated`,
        message: t`The workspace name was saved successfully.`,
      });
    },
    onError: (error: Error) => {
      notifyError({
        title: t`Failed to update workspace name`,
        message: error.message,
      });
    },
  });

  const isCurrentUserTheWorkspaceOwner =
    workspace.ownerId === userProfile?.userId;

  if (!isSettingsAdmin) {
    return (
      <AppLayout title={t`Settings`}>
        <Container py="xxxl" size="xl">
          <Title order={3}>
            <Trans>Access denied</Trans>
          </Title>
          <Text mt="md" c="dimmed">
            <Trans>
              Only workspace settings administrators can open workspace
              settings.
            </Trans>
          </Text>
        </Container>
      </AppLayout>
    );
  }

  const generalTabPanel = () => {
    return (
      <Stack gap="xl">
        <AvaForm
          fields={{
            workspaceName: {
              key: "workspaceName",
              type: "text",
              initialValue: workspace.name,
              label: t`Workspace Name`,
              validateFn: (value: string) => {
                return value.trim() === ""
                  ? t`Workspace name is required`
                  : undefined;
              },
            },
          }}
          formElements={["workspaceName"]}
          disableSubmitWhileUnchanged
          buttonAlignment="right"
          submitIsLoading={isWorkspaceSaving}
          onSubmit={(values) => {
            saveWorkspace({
              id: workspace.id,
              data: {
                name: values.workspaceName,
              },
            });
          }}
        />
        {isCurrentUserTheWorkspaceOwner ? (
          <WorkspaceDangerZone workspace={workspace} />
        ) : null}
      </Stack>
    );
  };

  const tabHeaders = {
    general: t`General`,
    users: t`Members`,
    roles: t`Roles & Permissions`,
    tags: t`User groups`,
    language: t`Language`,
    privacy: t`Privacy log`,
    billing: t`Billing`,
  };

  const navigateToTab = (next: string): void => {
    navigate({
      to: "/$workspaceSlug/settings/$tabName",
      params: {
        workspaceSlug: workspace.slug,
        tabName: next,
      },
      replace: true,
    });
  };

  return (
    <AppLayout title={t`Settings`}>
      <Container py="xxxl" size="xl">
        {isCurrentUserTheWorkspaceOwner ? (
          <Tabs
            tabIds={OWNER_TAB_IDS}
            value={isOwnerTabId(tabName) ? tabName : "general"}
            onTabChange={navigateToTab}
            renderTabHeader={{
              general: tabHeaders.general,
              users: tabHeaders.users,
              roles: tabHeaders.roles,
              tags: tabHeaders.tags,
              language: tabHeaders.language,
              privacy: tabHeaders.privacy,
              billing: tabHeaders.billing,
            }}
            renderTabPanel={{
              general: generalTabPanel,
              users: () => {
                return <WorkspaceUsersTab />;
              },
              roles: () => {
                return <WorkspaceRolesTab />;
              },
              tags: () => {
                return <WorkspaceTagsTab />;
              },
              language: () => {
                return <WorkspaceLanguageTab />;
              },
              privacy: () => {
                return <PrivacyLogTab />;
              },
              billing: () => {
                return <WorkspaceBillingView />;
              },
            }}
          />
        ) : (
          <Tabs
            tabIds={NON_OWNER_TAB_IDS}
            value={isNonOwnerTabId(tabName) ? tabName : "general"}
            onTabChange={navigateToTab}
            renderTabHeader={{
              general: tabHeaders.general,
              users: tabHeaders.users,
              roles: tabHeaders.roles,
              tags: tabHeaders.tags,
              language: tabHeaders.language,
              privacy: tabHeaders.privacy,
            }}
            renderTabPanel={{
              general: generalTabPanel,
              users: () => {
                return <WorkspaceUsersTab />;
              },
              roles: () => {
                return <WorkspaceRolesTab />;
              },
              tags: () => {
                return <WorkspaceTagsTab />;
              },
              language: () => {
                return <WorkspaceLanguageTab />;
              },
              privacy: () => {
                return <PrivacyLogTab />;
              },
            }}
          />
        )}
      </Container>
    </AppLayout>
  );
}
