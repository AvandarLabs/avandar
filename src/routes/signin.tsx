import { Button, Loader, Stack, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { z } from "zod";
import { AuthService } from "@/services/AuthService";

export const Route = createFileRoute("/signin")({
  component: SignInPage,
  validateSearch: z.object({
    redirect: z.string().optional().catch("/"),
  }),
  beforeLoad: async ({ search }) => {
    const session = await AuthService.getCurrentSession();
    if (session?.user) {
      if (search.redirect) {
        // if we're already authenticated and there's a redirect,
        // let's go to it
        throw redirect({ to: search.redirect });
      }
      throw redirect({ to: "/" });
    }
  },
});

function SignInPage() {
  const router = useRouter();
  const searchParams = Route.useSearch();

  const { mutate: sendSignInRequest, isPending: isSignInPending } = useMutation(
    {
      mutationFn: AuthService.signIn,
      onSuccess: () => {
        if (searchParams.redirect) {
          router.history.push(searchParams.redirect);
        } else {
          router.invalidate();
        }
      },
      onError: (error) => {
        notifications.show({
          title: "Sign in failed",
          message: error.message,
          color: "danger",
        });
      },
    },
  );

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      email: "",
      password: "",
    },
  });

  const onFormSubmit = form.onSubmit(async (values) => {
    if (isSignInPending) {
      return;
    }
    sendSignInRequest(values);
  });

  return (
    <Stack>
      <Title order={2}>Please sign in</Title>
      <form onSubmit={onFormSubmit}>
        <Stack>
          <TextInput
            required
            label="Email"
            name="email"
            type="email"
            key={form.key("email")}
            {...form.getInputProps("email")}
          />
          <TextInput
            required
            label="Password"
            name="password"
            type="password"
            key={form.key("password")}
            {...form.getInputProps("password")}
          />
          <Button type="submit" disabled={isSignInPending}>
            Sign in
            {isSignInPending ?
              <Loader />
            : null}
          </Button>
          <Link to="/register">Don&apos;t have an account?</Link>
          <Link to="/forgot-password">Forgot your password?</Link>
        </Stack>
      </form>
    </Stack>
  );
}
