import { Button, Loader, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { AuthClient } from "@/clients/AuthClient";
import { useMutation } from "@/lib/hooks/query/useMutation";

export const Route = createFileRoute("/update-password")({
  component: UpdatePasswordPage,
  validateSearch: z.object({
    redirect: z.string().optional().catch("/"),
  }),
  beforeLoad: async () => {
    const session = await AuthClient.getCurrentSession();
    if (!session?.user) {
      throw redirect({ to: "/signin" });
    }
  },
});

function UpdatePasswordPage() {
  const router = useRouter();
  const { user } = Route.useRouteContext();
  const searchParams = Route.useSearch();

  const [sendUpdatedPassword, isPasswordUpdatePending] = useMutation({
    mutationFn: async (values: {
      password: string;
      confirmPassword: string;
    }) => {
      const { user: updatedUser } = await AuthClient.updatePassword(
        values.password,
      );
      if (updatedUser?.email) {
        // After updating password, sign in with the new password
        await AuthClient.signIn({
          email: updatedUser.email,
          password: values.password,
        });
      }
    },
    onSuccess: () => {
      if (searchParams.redirect) {
        router.history.push(searchParams.redirect);
      } else {
        router.navigate({ to: "/" });
      }
      notifications.show({
        title: "Password updated successfully",
        message: "You can start using your new password now",
        color: "success",
      });
    },
    onError: (error) => {
      notifications.show({
        title: "Password update failed",
        message: error.message,
        color: "danger",
      });
    },
  });

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      password: "",
      confirmPassword: "",
    },
    validate: {
      confirmPassword: (value: string, formValues: { password: string }) => {
        return value !== formValues.password ?
            "Passwords do not match"
          : undefined;
      },
    },
  });

  const onFormSubmit = form.onSubmit(async (values) => {
    if (isPasswordUpdatePending) {
      return;
    }
    sendUpdatedPassword(values);
  });

  if (!user) {
    return <Loader />;
  }

  return (
    <form onSubmit={onFormSubmit}>
      Updating password for {user.email}
      <Stack>
        <TextInput
          required
          label="Password"
          name="password"
          type="password"
          key={form.key("password")}
          {...form.getInputProps("password")}
        />
        <TextInput
          required
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          key={form.key("confirmPassword")}
          {...form.getInputProps("confirmPassword")}
        />
        <Button type="submit" disabled={isPasswordUpdatePending}>
          Update password
          {isPasswordUpdatePending ?
            <Loader />
          : null}
        </Button>
      </Stack>
    </form>
  );
}
