import { Button, Loader, Stack, TextInput, Title } from "@mantine/core";
import { isEmail, useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { AuthService } from "@/services/AuthService";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  beforeLoad: async () => {
    const session = await AuthService.getCurrentSession();
    if (session?.user) {
      throw redirect({ to: "/" });
    }
  },
});

function RegisterPage() {
  const router = useRouter();
  const { mutate: sendRegistrationRequest, isPending: isRegistrationPending } =
    useMutation({
      mutationFn: async (values: { email: string; password: string }) => {
        await AuthService.register(values);
      },
      onSuccess: () => {
        router.invalidate();
      },
      onError: (error) => {
        notifications.show({
          title: "Registration failed",
          message: error.message,
          color: "red",
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
    <Stack>
      <Title order={2}>Create a new account</Title>
      <form onSubmit={onFormSubmit}>
        <Stack>
          <TextInput
            label="Email"
            name="email"
            type="email"
            required
            key={form.key("email")}
            {...form.getInputProps("email")}
          />
          <TextInput
            label="Password"
            name="password"
            type="password"
            required
            key={form.key("password")}
            {...form.getInputProps("password")}
          />
          <TextInput
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            required
            key={form.key("confirmPassword")}
            {...form.getInputProps("confirmPassword")}
          />

          <Button type="submit" disabled={isRegistrationPending}>
            Register
            {isRegistrationPending ?
              <Loader />
            : null}
          </Button>
          <Link to="/signin">Back to sign in</Link>
        </Stack>
      </form>
    </Stack>
  );
}
