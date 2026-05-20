import { useMutation, useToggleBoolean } from "@hooks";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  Container,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { InputTextForm, notifyError, notifySuccess } from "@ui";
import { useState } from "react";
import { AuthClient } from "@/clients/AuthClient";
import { UserClient } from "@/clients/UserClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { UserProfileId } from "$/models/User/UserProfile.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

export const Route = createFileRoute("/_auth/$workspaceSlug/profile")({
  component: ProfilePage,
});

/**
 * Renders the per-user settings page (display name, email, password) scoped
 * to the active workspace.
 */
function ProfilePage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const workspace = useCurrentWorkspace();
  const [userProfile, isProfileLoading] = useCurrentUserProfile();
  const { t } = useLingui();
  const [userWorkspaces] = WorkspaceClient.useGetWorkspacesOfCurrentUser({
    useQueryOptions: { staleTime: Infinity },
  });
  const isInMultipleWorkspaces = (userWorkspaces?.length ?? 0) > 1;

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
        </Stack>
      </Container>
    </AppLayout>
  );
}

type DisplayNameSectionProps = {
  profileId: UserProfileId;
  workspaceId: WorkspaceId;
  currentDisplayName: string;
  workspaceName: string;
  isInMultipleWorkspaces: boolean;
};

/**
 * Inline editor for the workspace-scoped display name. Save stays disabled
 * until the value changes; on save we invalidate the workspace's profile
 * query so the navbar and other surfaces re-read the new name.
 */
function DisplayNameSection({
  profileId,
  workspaceId,
  currentDisplayName,
  workspaceName,
  isInMultipleWorkspaces,
}: DisplayNameSectionProps): JSX.Element {
  const [value, setValue] = useState(currentDisplayName);
  const trimmed = value.trim();
  const isDirty = trimmed !== currentDisplayName;
  const { t } = useLingui();

  const [saveProfile, isSaving] = UserClient.useUpdateProfile({
    queryToInvalidate: UserClient.QueryKeys.getProfile({ workspaceId }),
    onSuccess: (updated) => {
      setValue(updated.displayName);
      notifySuccess({
        title: t`Display name updated`,
        message: t`Saved as "${updated.displayName}".`,
      });
    },
    onError: (error) => {
      notifyError({
        title: t`Failed to update display name`,
        message: error.message,
      });
    },
  });

  return (
    <Stack gap="xs">
      <Stack gap={2}>
        <Text fw={600}>
          <Trans>Display name</Trans>
        </Text>
        <Text c="dimmed" size="sm">
          <Trans>The name other members see in {workspaceName}.</Trans>
        </Text>
      </Stack>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!isDirty || trimmed.length === 0 || isSaving) {
            return;
          }
          saveProfile({
            profileId,
            data: { displayName: trimmed },
          });
        }}
      >
        <Group gap="xs" align="flex-start" wrap="nowrap">
          <TextInput
            flex={1}
            value={value}
            onChange={(event) => {
              setValue(event.currentTarget.value);
            }}
            placeholder={t`Your name`}
            aria-label={t`Display name`}
            maxLength={80}
          />
          <Button
            type="submit"
            loading={isSaving}
            disabled={!isDirty || trimmed.length === 0}
          >
            <Trans>Save</Trans>
          </Button>
        </Group>
      </form>
      {isInMultipleWorkspaces ?
        <Text c="dimmed" size="xs">
          <Trans>
            This name only applies in {workspaceName}. Your other workspaces
            keep their own.
          </Trans>
        </Text>
      : null}
    </Stack>
  );
}

type EmailSectionProps = {
  email: string;
};

/**
 * Email row. Editing swaps to an inline form because updating the address
 * triggers a confirmation email and shouldn't happen on a stray keystroke.
 */
function EmailSection({ email }: EmailSectionProps): JSX.Element {
  const [isEditing, toggleEditing] = useToggleBoolean(false);
  const { t } = useLingui();
  const [sendUpdateEmailRequest, isUpdateEmailPending] = useMutation({
    mutationFn: AuthClient.updateEmail,
    onSuccess: () => {
      notifySuccess({
        title: t`Email address updated`,
        message: t`Please check your email for a confirmation link.`,
      });
      toggleEditing();
    },
    onError: () => {
      notifyError({
        title: t`Failed to update email`,
        message: t`Please try again or reach out to support.`,
      });
    },
  });

  return (
    <Stack gap="xs">
      <Stack gap={2}>
        <Text fw={600}>
          <Trans>Email</Trans>
        </Text>
        <Text c="dimmed" size="sm">
          <Trans>Used to sign in to your account.</Trans>
        </Text>
      </Stack>
      {isEditing ?
        <InputTextForm
          required
          hideLabel
          isSubmitting={isUpdateEmailPending}
          showCancelButton
          type="email"
          label={t`Email`}
          defaultValue={email}
          submitButtonLabel={t`Change`}
          minLength={3}
          placeholder="you@example.com"
          onCancel={toggleEditing}
          onSubmit={(nextEmail) => {
            if (isUpdateEmailPending) return;
            sendUpdateEmailRequest(nextEmail);
          }}
        />
      : <Group justify="space-between" wrap="nowrap" gap="md">
          <Text size="sm" style={{ wordBreak: "break-all" }}>
            {email}
          </Text>
          <Button variant="default" onClick={toggleEditing}>
            <Trans>Change</Trans>
          </Button>
        </Group>
      }
    </Stack>
  );
}

type PasswordSectionProps = {
  onChangePassword: () => void;
};

function PasswordSection({
  onChangePassword,
}: PasswordSectionProps): JSX.Element {
  return (
    <Stack gap="xs">
      <Stack gap={2}>
        <Text fw={600}>
          <Trans>Password</Trans>
        </Text>
        <Text c="dimmed" size="sm">
          <Trans>You'll be asked to confirm your current password.</Trans>
        </Text>
      </Stack>
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" c="dimmed" ff="monospace">
          ••••••••••
        </Text>
        <Button variant="default" onClick={onChangePassword}>
          <Trans>Change password</Trans>
        </Button>
      </Group>
    </Stack>
  );
}
