import { Button, Group, Stack, TextInput } from "@mantine/core";
import { isEmail, useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthClient } from "@/clients/AuthClient";
import { AuthLayout } from "@/components/common/AuthLayout";
import { BackToLoginLink } from "@/components/common/AuthLayout/BackToLoginLink";
import { useMutation } from "@/lib/hooks/query/useMutation";

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
  const [sendResetPasswordRequest, isResetPasswordPending] = useMutation({
    mutationFn: async (values: { email: string }) => {
      await AuthClient.requestPasswordResetEmail(values.email);
    },
    onSuccess: () => {
      notifications.show({
        title: "Sent password reset email",
        message: "Check your email for a password reset link",
        color: "success",
      });
    },
    onError: (error) => {
      notifications.show({
        title: "Password reset failed",
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
      email: isEmail("Invalid email address"),
    },
  });

  const onFormSubmit = form.onSubmit(async (values) => {
    if (isResetPasswordPending) {
      return;
    }
    sendResetPasswordRequest(values);
  });

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email to get a reset link"
    >
      <form onSubmit={onFormSubmit}>
        <Stack>
          <TextInput
            label="Email"
            name="email"
            type="email"
            placeholder="Enter your email address"
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
              disabled={isResetPasswordPending}
            >
              Reset password
            </Button>
          </Group>
        </Stack>
      </form>
    </AuthLayout>
  );
}
