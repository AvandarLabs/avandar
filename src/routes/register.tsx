import {
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
import { notifications } from "@mantine/notifications";
import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { INFO_EMAIL } from "$/config/AppConfig";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { APIClient } from "@/clients/APIClient";
import { AuthClient } from "@/clients/AuthClient";
import { AuthLayout } from "@/components/common/AuthLayout";
import { BackToLoginLink } from "@/components/common/AuthLayout/BackToLoginLink";
import { WAITLIST_URL } from "@/config/AppConfig";
import { FeatureFlag, isFlagEnabled } from "@/config/FeatureFlagConfig";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { useBoolean } from "@/lib/hooks/state/useBoolean";
import { useForm } from "@/lib/hooks/ui/useForm";
import { AvaForm } from "@/lib/ui/AvaForm/AvaForm";
import { notifyError, notifySuccess } from "@/lib/ui/notifications/notify";

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
  const router = useRouter();
  const navigate = useNavigate();
  const searchParams = Route.useSearch();
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
          title: "Your waitlist code has been verified",
          message: "Please choose a password to complete your registration",
        });
        showRegistrationForm();
      } else {
        notifyError("This is an invalid waitlist code");
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
      if (searchParams.redirect) {
        navigate({ to: searchParams.redirect });
      } else {
        router.invalidate();
      }
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

  const registrationForm = useForm({
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

  const onFormSubmit = registrationForm.onSubmit(async (values) => {
    if (isRegistrationPending) {
      return;
    }
    sendRegistrationRequest(values);
  });

  // Maintain container height during transitions
  useEffect(() => {
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
  }, [isRegistrationFormVisible]);

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
                  <Title order={3}>Thank you for your interest!</Title>
                  <Text>
                    While Avandar is in beta, we are only allowing registration
                    if you are on our waitlist and have received a sign-up code
                    in your email.
                  </Text>
                  {WAITLIST_URL ?
                    <Text>
                      {elements.waitlistLink("Sign up for our waitlist")} to be
                      notified when it's your turn to register! If you are
                      already on our waitlist and have not received a sign-up
                      code, we appreciate your patience. You will receive a
                      sign-up code soon. We promise!
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
          <Title order={3}>Thank you for your interest!</Title>
          <Text>
            However, we are not allowing new registrations at the moment.
          </Text>
          <Text>
            Please{" "}
            <Anchor
              href={`mailto:${INFO_EMAIL}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              email us
            </Anchor>{" "}
            if you would like early access.
          </Text>
          {WAITLIST_URL ?
            <Text>
              Or {elements.waitlistLink("sign up for our waitlist")} to be
              notified when our public launch is ready.
            </Text>
          : null}
          <Divider mb="sm" />
        </Stack>
      );
    },
  };

  return (
    <AuthLayout
      title="Create a new account"
      subtitle="Start your journey with us"
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
                    <TextInput
                      key={registrationForm.key("email")}
                      label="Email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      disabled={
                        IS_REGISTRATION_DISABLED || IS_SIGN_UP_CODE_REQUIRED
                      }
                      {...registrationForm.getInputProps("email")}
                    />
                    <PasswordInput
                      key={registrationForm.key("password")}
                      label="Password"
                      name="password"
                      type="password"
                      required
                      disabled={IS_REGISTRATION_DISABLED}
                      {...registrationForm.getInputProps("password")}
                    />
                    <PasswordInput
                      key={registrationForm.key("confirmPassword")}
                      label="Confirm Password"
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
                          IS_REGISTRATION_DISABLED
                        }
                      >
                        Register
                      </Button>
                    </Group>

                    {isRegistrationSuccess ?
                      <Text mt="lg" c="green">
                        Please check your email for a confirmation link. It may
                        take a few minutes to arrive.
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
