import { Container, Text, Title } from "@mantine/core";
import { Trans, useLingui } from "@lingui/react/macro";
import { notifyError, notifySuccess, Tabs } from "@ui";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AvaForm } from "@/components/forms/AvaForm/AvaForm";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { useIsGlobalAdmin } from "@/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { WorkspaceBillingView } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/WorkspaceBillingView";
import { PrivacyLogTab } from "./PrivacyLogTab/PrivacyLogTab";
import { WorkspaceLanguageTab } from "./WorkspaceLanguageTab/WorkspaceLanguageTab";
import { WorkspaceRolesTab } from "./WorkspaceRolesTab/WorkspaceRolesTab";
import { WorkspaceTagsTab } from "./WorkspaceTagsTab/WorkspaceTagsTab";
import { WorkspaceUsersTab } from "./WorkspaceUsersTab/WorkspaceUsersTab";

export function WorkspaceSettingsPage(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();
  const isSettingsAdmin = useIsGlobalAdmin();
  const { t } = useLingui();

  const [saveWorkspace, isWorkspaceSaving] = WorkspaceClient.useUpdate({
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
      <AvaForm
        fields={{
          workspaceName: {
            key: "workspaceName",
            type: "text",
            initialValue: workspace.name,
            label: t`Workspace Name`,
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
    );
  };

  const tabHeaders = {
    general: t`General`,
    users: t`Members`,
    roles: t`Roles`,
    tags: t`Tags`,
    language: t`Language`,
    privacy: t`Privacy log`,
    billing: t`Billing`,
  };

  return (
    <AppLayout title={t`Settings`}>
      <Container py="xxxl" size="xl">
        {isCurrentUserTheWorkspaceOwner ?
          <Tabs
            tabIds={
              [
                "general",
                "users",
                "roles",
                "tags",
                "language",
                "privacy",
                "billing",
              ] as const
            }
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
        : <Tabs
            tabIds={
              [
                "general",
                "users",
                "roles",
                "tags",
                "language",
                "privacy",
              ] as const
            }
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
        }
      </Container>
    </AppLayout>
  );
}
