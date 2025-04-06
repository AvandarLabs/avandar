import { Button, Loader, Stack, TextInput, Title } from "@mantine/core";
import { isEmail, useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { AuthClient } from "@/clients/AuthClient";

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
  const {
    mutate: sendResetPasswordRequest,
    isPending: isResetPasswordPending,
  } = useMutation({
    mutationFn: async (values: { email: string }) => {
      await AuthClient.requestPasswordResetEmail(values.email);
    },
    onSuccess: () => {
      notifications.show({
        title: "Sent password reset email",
        message: "Check your email for a password reset link",
        color: "green",
      });
    },
    onError: (error) => {
      notifications.show({
        title: "Password reset failed",
        message: error.message,
        color: "red",
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
    <Stack>
      <Title order={2}>Reset your password</Title>
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
          <Button type="submit" disabled={isResetPasswordPending}>
            Reset my password
            {isResetPasswordPending ?
              <Loader />
            : null}
          </Button>
          <Link to="/signin">Back to sign in</Link>
        </Stack>
      </form>
    </Stack>
  );
}
