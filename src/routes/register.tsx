import {
  Anchor,
  Button,
  Divider,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { isEmail } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AuthClient } from "@/clients/AuthClient";
import { AuthLayout } from "@/components/common/AuthLayout";
import { BackToLoginLink } from "@/components/common/AuthLayout/BackToLoginLink";
import { AppConfig } from "@/config/AppConfig";
import {
  FeatureFlag,
  FeatureFlagConfig,
  isFlagEnabled,
} from "@/config/FeatureFlagConfig";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { useForm } from "@/lib/hooks/ui/useForm";
import { notifySuccess } from "@/lib/ui/notifications/notifySuccess";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  beforeLoad: async () => {
    const session = await AuthClient.getCurrentSession();
    if (session?.user) {
      throw redirect({ to: "/" });
    }
  },
});

const IS_REGISTRATION_DISABLED = isFlagEnabled(
  FeatureFlag.DisableSelfRegistration,
);

const waitlistURL =
  FeatureFlagConfig[FeatureFlag.DisableSelfRegistration].waitlistURL;

function RegisterPage() {
  const router = useRouter();
  const [isRegistrationSuccess, setIsRegistrationSuccess] = useState(false);

  const [sendRegistrationRequest, isRegistrationPending] = useMutation({
    mutationFn: async (values: { email: string; password: string }) => {
      await AuthClient.register(values);
    },
    onSuccess: () => {
      router.invalidate();
      setIsRegistrationSuccess(true);
      notifySuccess({
        title: "Please check your email",
        message: "A confirmation email has been sent to your email address.",
      });
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
      {IS_REGISTRATION_DISABLED ?
        <Stack>
          <Title order={3}>Thank you for your interest!</Title>
          <Text>
            However, we are not allowing new registrations at the moment.
          </Text>
          <Text>
            Please{" "}
            <Anchor
              href={`mailto:${AppConfig.infoEmail}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              email us
            </Anchor>{" "}
            if you would like early access.
          </Text>
          {waitlistURL ?
            <Text>
              Or{" "}
              <Anchor
                href={waitlistURL}
                target="_blank"
                rel="noopener noreferrer"
              >
                sign up for our waitlist
              </Anchor>{" "}
              to be notified when our public launch is ready.
            </Text>
          : null}
          <Divider mb="sm" />
        </Stack>
      : null}

      <form onSubmit={onFormSubmit}>
        <Stack>
          <TextInput
            key={form.key("email")}
            label="Email"
            name="email"
            type="email"
            required
            autoComplete="email"
            disabled={IS_REGISTRATION_DISABLED}
            {...form.getInputProps("email")}
          />
          <PasswordInput
            key={form.key("password")}
            label="Password"
            name="password"
            type="password"
            required
            disabled={IS_REGISTRATION_DISABLED}
            {...form.getInputProps("password")}
          />
          <PasswordInput
            key={form.key("confirmPassword")}
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            required
            disabled={IS_REGISTRATION_DISABLED}
            {...form.getInputProps("confirmPassword")}
          />

          <Group justify="space-between" gap="xl" mt="md">
            <BackToLoginLink />
            <Button
              className="flex-1"
              loading={isRegistrationPending}
              type="submit"
              disabled={
                isRegistrationPending ||
                isRegistrationSuccess ||
                IS_REGISTRATION_DISABLED
              }
            >
              Register
            </Button>
          </Group>

          {isRegistrationSuccess ?
            <Text c="green">
              Please check your email for a confirmation link. It may take a few
              minutes to arrive.
            </Text>
          : null}
        </Stack>
      </form>
    </AuthLayout>
  );
}
