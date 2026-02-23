import { Button, Loader, PasswordInput, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { z } from "zod";
import { AuthClient } from "@/clients/AuthClient";
import { AuthLayout } from "@/components/common/AuthLayout";
import { AuthFooter } from "@/components/common/AuthLayout/AuthFooter";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { Link } from "@/lib/ui/links/Link";
import { isValidRedirectPath } from "@/utils/isValidRedirectPath/isValidRedirectPath";

// TODO(jpsyx): move this to some shared utility file.
export const Route = createFileRoute("/signin")({
  component: SignInPage,
  validateSearch: z.object({
    redirect: z.string().optional().catch("/"),
  }),
  beforeLoad: async ({ search }) => {
    const session = await AuthClient.getCurrentSession();
    if (session?.user) {
      // if we're already authenticated and there's a valid redirect,
      // let's go to it
      if (search.redirect && isValidRedirectPath(search.redirect)) {
        throw redirect({ to: search.redirect });
      }
      throw redirect({ to: "/" });
    }
  },
});

function SignInPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const searchParams = Route.useSearch();

  const [sendSignInRequest, isSignInPending] = useMutation({
    mutationFn: AuthClient.signIn,
    onSuccess: () => {
      if (searchParams.redirect) {
        navigate({ to: searchParams.redirect });
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
  });

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
    <AuthLayout
      title="Welcome back!"
      subtitle={
        <>
          <span>Don&apos;t have an account yet?</span>
          <Link to="/register">Create account</Link>
        </>
      }
      footer={<AuthFooter />}
    >
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
          <PasswordInput
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
          <Link to="/forgot-password">Forgot your password?</Link>
        </Stack>
      </form>
    </AuthLayout>
  );
}
