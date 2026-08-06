import { useBoolean, useMutation } from "@hooks";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Alert,
  Anchor,
  Box,
  Button,
  Divider,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  Transition,
} from "@mantine/core";
import { isEmail } from "@mantine/form";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { notifyError, notifySuccess } from "@ui";
import { INFO_EMAIL } from "$/config/AppConfig";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { APIClient } from "@/clients/APIClient";
import { AuthClient } from "@/clients/AuthClient/AuthClient";
import { AvaForm } from "@/components/forms/AvaForm/AvaForm";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { AuthFooter } from "@/components/layouts/AuthLayout/AuthFooter";
import { BackToLoginLink } from "@/components/layouts/AuthLayout/BackToLoginLink";
import { WAITLIST_URL } from "@/config/AppConfig";
import { FeatureFlag, isFlagEnabled } from "@/config/FeatureFlagConfig";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";
import { useForm } from "@/lib/hooks/ui/useForm/useForm";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  validateSearch: z.object({
    email: z.email().optional(),
    signupCode: z.string().optional(),
    redirect: z.string().optional(),
  }),
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

const IS_SIGN_UP_CODE_REQUIRED = isFlagEnabled(FeatureFlag.RequireSignUpCode);

function RegisterPage() {
  const isOnline = useIsOnline();
  const searchParams = Route.useSearch();
  const { t } = useLingui();
  const [isRegistrationFormVisible, showRegistrationForm] = useBoolean(
    !IS_REGISTRATION_DISABLED && !IS_SIGN_UP_CODE_REQUIRED,
  );
  const [isRegistrationSuccess, setIsRegistrationSuccess] = useState(false);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const signupFormRef = useRef<HTMLDivElement>(null);
  const registrationFormRef = useRef<HTMLDivElement>(null);
  const [submittedSignupCode, setSubmittedSignupCode] = useState<string>("");

  const [sendVerifyWaitlistCodeRequest, isVerifyingWaitlistCode] = useMutation({
    mutationFn: async (values: { email: string; signupCode: string }) => {
      return await APIClient.post({
        route: "waitlist/:signupCode/verify",
        pathParams: {
          signupCode: values.signupCode,
        },
        body: {
          email: values.email,
        },
      });
    },
    onSuccess: (response, variables) => {
      if (response.success) {
        registrationForm.setValues({
          email: variables.email,
        });
        notifySuccess({
          title: t`Your waitlist code has been verified`,
          message: t`Please choose a password to complete your registration`,
        });
        showRegistrationForm();
      } else {
        notifyError(t`This is an invalid waitlist code`);
      }
    },
  });

  const [sendRegistrationRequest, isRegistrationPending] = useMutation({
    mutationFn: async (values: { email: string; password: string }) => {
      const { user } = await AuthClient.register(values);

      // if a signup code was required and the registration was successful,
      // we will set that code as claimed now.
      if (user && user.email && IS_SIGN_UP_CODE_REQUIRED) {
        await APIClient.post({
          route: "waitlist/:signupCode/claim",
          pathParams: {
            signupCode: submittedSignupCode,
          },
          body: {
            userId: user.id,
            email: user.email,
          },
        });
      }
    },
    onSuccess: () => {
      setIsRegistrationSuccess(true);
      notifySuccess({
        title: t`Please check your email`,
        message: t`A confirmation email has been sent to your email address.`,
      });
      // Navigation is driven by useAuth's onAuthStateChange. When signUp
      // creates a session, onAuthStateChange fires, invalidates the workspace
      // cache, and updates user state. A useEffect in useAuth then invalidates
      // the router (and navigates to any redirect param) with the correct
      // user context already in place.
    },
    onError: (error) => {
      registrationForm.setFieldError("email", error.message);
    },
  });

  const registrationForm = useForm({
    mode: "uncontrolled",
    initialValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validate: {
      email: isEmail(t`Invalid email address`),
      confirmPassword: (value: string, formValues: { password: string }) => {
        return value !== formValues.password ?
            t`Passwords do not match`
          : undefined;
      },
    },
  });

  const onFormSubmit = registrationForm.onSubmit(async (values) => {
    if (!isOnline || isRegistrationPending) {
      return;
    }
    sendRegistrationRequest(values);
  });

  // Maintain container height during transitions
  useEffect(
    function synchronizeFormContainerHeight() {
      if (!formContainerRef.current) {
        return;
      }

      const updateHeight = () => {
        const container = formContainerRef.current;
        if (!container) {
          return;
        }

        // Get the height of the currently visible form
        const visibleForm =
          isRegistrationFormVisible ?
            registrationFormRef.current
          : signupFormRef.current;

        if (visibleForm) {
          const height = visibleForm.offsetHeight;
          container.style.minHeight = `${height}px`;
        }
      };

      // Update height immediately and after delays to account for transitions
      updateHeight();
      const timeoutId = setTimeout(updateHeight, 50);
      const transitionTimeoutId = setTimeout(updateHeight, 300);

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(transitionTimeoutId);
      };
    },
    [isRegistrationFormVisible],
  );

  const elements = {
    waitlistLink: (text: string) => {
      return (
        <Anchor href={WAITLIST_URL} target="_blank" rel="noopener noreferrer">
          {text}
        </Anchor>
      );
    },

    signupCodeNotice: () => {
      return (
        <Transition
          mounted={!isRegistrationFormVisible}
          transition="fade"
          duration={250}
          timingFunction="ease"
        >
          {(styles) => {
            return (
              <div
                ref={signupFormRef}
                style={{
                  ...styles,
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  width: "100%",
                }}
              >
                <Stack>
                  <Title order={3}>
                    <Trans>Thank you for your interest!</Trans>
                  </Title>
                  <Text>
                    <Trans>
                      While Avandar is in beta, we are only allowing
                      registration if you are on our waitlist and have received
                      a sign-up code in your email.
                    </Trans>
                  </Text>
                  {WAITLIST_URL ?
                    <Text>
                      <Trans>
                        {elements.waitlistLink(t`Sign up for our waitlist`)} to
                        be notified when it's your turn to register! If you are
                        already on our waitlist and have not received a sign-up
                        code, we appreciate your patience. You will receive a
                        sign-up code soon. We promise!
                      </Trans>
                    </Text>
                  : null}
                  <Divider mb="sm" />
                  <AvaForm
                    fields={{
                      email: {
                        key: "email",
                        type: "text",
                        initialValue: searchParams.email ?? "",
                        required: true,
                      },
                      signupCode: {
                        key: "signupCode",
                        type: "text",
                        initialValue: searchParams.signupCode ?? "",
                        required: true,
                      },
                    }}
                    submitIsLoading={isVerifyingWaitlistCode}
                    formElements={["email", "signupCode"]}
                    onSubmit={async (values) => {
                      setSubmittedSignupCode(values.signupCode);
                      sendVerifyWaitlistCodeRequest(values);
                    }}
                  />
                </Stack>
              </div>
            );
          }}
        </Transition>
      );
    },

    disabledRegistrationNotice: () => {
      return (
        <Stack>
          <Title order={3}>
            <Trans>Thank you for your interest!</Trans>
          </Title>
          <Text>
            <Trans>
              However, we are not allowing new registrations at the moment.
            </Trans>
          </Text>
          <Text>
            <Trans>
              Please{" "}
              <Anchor
                href={`mailto:${INFO_EMAIL}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                email us
              </Anchor>{" "}
              if you would like early access.
            </Trans>
          </Text>
          {WAITLIST_URL ?
            <Text>
              <Trans>
                Or {elements.waitlistLink(t`sign up for our waitlist`)} to be
                notified when our public launch is ready.
              </Trans>
            </Text>
          : null}
          <Divider mb="sm" />
        </Stack>
      );
    },
  };

  return (
    <AuthLayout
      title={t`Create a new account`}
      subtitle={t`Start your journey with us`}
      footer={<AuthFooter />}
    >
      {IS_REGISTRATION_DISABLED && !IS_SIGN_UP_CODE_REQUIRED ?
        elements.disabledRegistrationNotice()
      : null}

      <Box ref={formContainerRef} pos="relative">
        {IS_SIGN_UP_CODE_REQUIRED ? elements.signupCodeNotice() : null}
        <Transition
          mounted={isRegistrationFormVisible}
          transition="fade"
          duration={250}
          timingFunction="ease"
        >
          {(styles) => {
            return (
              <div
                ref={registrationFormRef}
                style={{
                  ...styles,
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  width: "100%",
                }}
              >
                <form onSubmit={onFormSubmit}>
                  <Stack>
                    {!isOnline ?
                      <Alert color="yellow" variant="light">
                        <Trans>
                          Registration requires an internet connection.
                        </Trans>
                      </Alert>
                    : null}
                    <TextInput
                      key={registrationForm.key("email")}
                      label={t`Email`}
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      disabled={
                        IS_REGISTRATION_DISABLED || IS_SIGN_UP_CODE_REQUIRED
                      }
                      {...registrationForm.getInputProps("email")}
                      onChange={(e) => {
                        registrationForm.getInputProps("email").onChange?.(e);
                        registrationForm.clearFieldError("email");
                      }}
                    />
                    <PasswordInput
                      key={registrationForm.key("password")}
                      label={t`Password`}
                      name="password"
                      type="password"
                      required
                      disabled={IS_REGISTRATION_DISABLED}
                      {...registrationForm.getInputProps("password")}
                    />
                    <PasswordInput
                      key={registrationForm.key("confirmPassword")}
                      label={t`Confirm Password`}
                      name="confirmPassword"
                      type="password"
                      required
                      disabled={IS_REGISTRATION_DISABLED}
                      {...registrationForm.getInputProps("confirmPassword")}
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
                          IS_REGISTRATION_DISABLED ||
                          !isOnline
                        }
                      >
                        <Trans>Register</Trans>
                      </Button>
                    </Group>

                    {isRegistrationSuccess ?
                      <Text mt="lg" c="green">
                        <Trans>
                          Please check your email for a confirmation link. It
                          may take a few minutes to arrive.
                        </Trans>
                      </Text>
                    : null}
                  </Stack>
                </form>
              </div>
            );
          }}
        </Transition>
      </Box>
    </AuthLayout>
  );
}
