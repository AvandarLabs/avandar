import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";

import { UserClient } from "@/clients/UserClient";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";

type Props = {
  profileId: UserProfile.Id;
  workspaceId: Workspace.Id;
  currentDisplayName: string;
  workspaceName: string;
  isInMultipleWorkspaces: boolean;
};

/** Edits the user's workspace-scoped display name. */
export function DisplayNameSection({
  profileId,
  workspaceId,
  currentDisplayName,
  workspaceName,
  isInMultipleWorkspaces,
}: Props): JSX.Element {
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
          saveProfile({ profileId, data: { displayName: trimmed } });
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
      {isInMultipleWorkspaces ? (
        <Text c="dimmed" size="xs">
          <Trans>
            This name only applies in {workspaceName}. Your other workspaces
            keep their own.
          </Trans>
        </Text>
      ) : null}
    </Stack>
  );
}
