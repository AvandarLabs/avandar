import { Button, Group, PasswordInput, Stack, TextInput } from "@mantine/core";
import { isEmail } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { AuthClient } from "@/clients/AuthClient";
import { AuthLayout } from "@/components/common/AuthLayout";
import { BackToLoginLink } from "@/components/common/AuthLayout/BackToLoginLink";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { useForm } from "@/lib/hooks/ui/useForm";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  beforeLoad: async () => {
    const session = await AuthClient.getCurrentSession();
    if (session?.user) {
      throw redirect({ to: "/" });
    }
  },
});

function RegisterPage() {
  const router = useRouter();
  const [sendRegistrationRequest, isRegistrationPending] = useMutation({
    mutationFn: async (values: { email: string; password: string }) => {
      await AuthClient.register(values);
    },
    onSuccess: () => {
      router.invalidate();
    },
    onError: (error) => {
      notifications.show({
        title: "Registration failed",
        message: error.message,
        color: "danger",
      });
    },
  });

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validate: {
      email: isEmail("Invalid email address"),
      confirmPassword: (value: string, formValues: { password: string }) => {
        return value !== formValues.password ?
            "Passwords do not match"
          : undefined;
      },
    },
  });

  const onFormSubmit = form.onSubmit(async (values) => {
    if (isRegistrationPending) {
      return;
    }
    sendRegistrationRequest(values);
  });

  return (
    <AuthLayout
      title="Create a new account"
      subtitle="Start your journey with us"
    >
      <form onSubmit={onFormSubmit}>
        <Stack>
          <TextInput
            label="Email"
            name="email"
            type="email"
            required
            autoComplete="email"
            key={form.key("email")}
            {...form.getInputProps("email")}
          />
          <PasswordInput
            label="Password"
            name="password"
            type="password"
            required
            key={form.key("password")}
            {...form.getInputProps("password")}
          />
          <PasswordInput
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            required
            key={form.key("confirmPassword")}
            {...form.getInputProps("confirmPassword")}
          />

          <Group justify="space-between" gap="xl" mt="md">
            <BackToLoginLink />
            <Button
              className="flex-1"
              loading={isRegistrationPending}
              type="submit"
              disabled={isRegistrationPending}
            >
              Register
            </Button>
          </Group>
        </Stack>
      </form>
    </AuthLayout>
  );
}
