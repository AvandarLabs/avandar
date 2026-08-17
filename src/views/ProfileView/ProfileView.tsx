import { Trans, useLingui } from "@lingui/react/macro";
import { Container, Divider, Loader, Stack, Text, Title } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { useNuxEligibility } from "@/components/Nux/useNuxEligibility/useNuxEligibility";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { DisplayNameSection } from "./DisplayNameSection";
import { EmailSection } from "./EmailSection";
import { PasswordSection } from "./PasswordSection";
import { TutorialSection } from "./TutorialSection/TutorialSection";

/**
 * Renders the per-user settings page (display name, email, password) scoped
 * to the active workspace.
 */
export function ProfileView(): JSX.Element {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();
  const [userProfile, isProfileLoading] = useCurrentUserProfile();
  const { t } = useLingui();
  const [userWorkspaces] = WorkspaceClient.useGetWorkspacesOfCurrentUser({
    useQueryOptions: { staleTime: Infinity },
  });
  const isInMultipleWorkspaces = (userWorkspaces?.length ?? 0) > 1;
  const nuxDispatch = NuxStateManager.useDispatch();
  // The restart only does anything while `NuxRoot` is mounted, and that is
  // gated on the same eligibility check. Showing the section to anyone else
  // would offer a button that silently does nothing but still log a restart.
  const isNuxEligible = useNuxEligibility();

  if (!user || !userProfile || isProfileLoading) {
    return (
      <AppLayout title={t`Profile`}>
        <Container size={560} py="xxxl">
          <Loader />
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t`Profile`}>
      <Container size={560} py="xxxl">
        <Stack gap="xxl">
          <Stack gap={4}>
            <Title order={2}>
              <Trans>Profile</Trans>
            </Title>
            <Text c="dimmed" size="sm">
              <Trans>
                Manage how you appear in {workspace.name} and the account you
                use to sign in.
              </Trans>
            </Text>
          </Stack>

          <DisplayNameSection
            profileId={userProfile.profileId}
            workspaceId={userProfile.workspaceId}
            currentDisplayName={userProfile.displayName}
            workspaceName={workspace.name}
            isInMultipleWorkspaces={isInMultipleWorkspaces}
          />

          <Divider />

          <EmailSection email={user.email ?? ""} />

          <Divider />

          <PasswordSection
            onChangePassword={() => {
              navigate({
                to: AppLinks.updatePassword.to,
                search: { redirect: window.location.pathname },
              });
            }}
          />

          {isNuxEligible ?
            <>
              <Divider />

              <TutorialSection
                onRestart={() => {
                  nuxDispatch.restart();
                  void AnalyticsClient.logEvent({
                    event: "nux.restarted",
                    workspaceId: workspace.id,
                  });
                  navigate(AppLinks.workspaceHome(workspace.slug));
                }}
              />
            </>
          : null}
        </Stack>
      </Container>
    </AppLayout>
  );
}
