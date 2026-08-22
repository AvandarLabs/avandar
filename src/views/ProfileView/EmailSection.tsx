import { useToggleBoolean } from "@avandar/hooks";
import { useMutation } from "@avandar/query-hooks";
import { InputTextForm } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Text } from "@mantine/core";

import { AuthClient } from "@/clients/AuthClient/AuthClient";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";

type Props = {
  email: string;
};

/** Displays the sign-in email and an explicit email-change form. */
export function EmailSection({ email }: Props): JSX.Element {
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
      {isEditing ? (
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
          placeholder={t`you@example.com`}
          onCancel={toggleEditing}
          onSubmit={(updatedEmail) => {
            if (!isUpdateEmailPending) {
              sendUpdateEmailRequest(updatedEmail);
            }
          }}
        />
      ) : (
        <Group justify="space-between" wrap="nowrap" gap="md">
          <Text size="sm" style={{ wordBreak: "break-all" }}>
            {email}
          </Text>
          <Button variant="default" onClick={toggleEditing}>
            <Trans>Change</Trans>
          </Button>
        </Group>
      )}
    </Stack>
  );
}
