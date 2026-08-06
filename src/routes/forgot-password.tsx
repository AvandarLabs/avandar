import { useMutation } from "@hooks";
import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Button, Group, Stack, TextInput } from "@mantine/core";
import { isEmail, useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthClient } from "@/clients/AuthClient/AuthClient";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { BackToLoginLink } from "@/components/layouts/AuthLayout/BackToLoginLink";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  beforeLoad: async () => {
    const session = await AuthClient.getCurrentSession();
    if (session?.user) {
      throw redirect({ to: "/" });
    }
  },
});

/**
 * This is where the user can request a password reset by supplying their email
 * and a password reset link will be sent to their email.
 */
function ForgotPasswordPage() {
  const isOnline = useIsOnline();
  const { t } = useLingui();
  const [sendResetPasswordRequest, isResetPasswordPending] = useMutation({
    mutationFn: async (values: { email: string }) => {
      await AuthClient.requestPasswordResetEmail(values.email);
    },
    onSuccess: () => {
      notifications.show({
        title: t`Sent password reset email`,
        message: t`Check your email for a password reset link`,
        color: "success",
      });
    },
    onError: (error) => {
      notifications.show({
        title: t`Password reset failed`,
        message: error.message,
        color: "danger",
      });
    },
  });

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      email: "",
    },
    validate: {
      email: isEmail(t`Invalid email address`),
    },
  });

  const onFormSubmit = form.onSubmit(async (values) => {
    if (!isOnline || isResetPasswordPending) {
      return;
    }
    sendResetPasswordRequest(values);
  });

  return (
    <AuthLayout
      title={t`Forgot your password?`}
      subtitle={t`Enter your email to get a reset link`}
    >
      <form onSubmit={onFormSubmit}>
        <Stack>
          {!isOnline ?
            <Alert color="yellow" variant="light">
              <Trans>Password reset requires an internet connection.</Trans>
            </Alert>
          : null}
          <TextInput
            label={t`Email`}
            name="email"
            type="email"
            placeholder={t`Enter your email address`}
            required
            key={form.key("email")}
            {...form.getInputProps("email")}
          />

          <Group justify="space-between" gap="xl" mt="md">
            <BackToLoginLink />
            <Button
              className="flex-1"
              loading={isResetPasswordPending}
              type="submit"
              disabled={isResetPasswordPending || !isOnline}
            >
              <Trans>Reset password</Trans>
            </Button>
          </Group>
        </Stack>
      </form>
    </AuthLayout>
  );
}
