import { Button, Group, List, Loader, Stack, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AuthClient } from "@/clients/AuthClient";
import { InputTextField } from "@/components/ui/InputTextField";
import { useToggleBoolean } from "@/hooks/useToggleBoolean";

export const Route = createFileRoute("/_auth/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const router = useRouter();
  const { user } = Route.useRouteContext();
  const [isEditingEmail, toggleEditingEmailState] = useToggleBoolean(false);
  const { mutate: sendUpdateEmailRequest, isPending: isUpdateEmailPending } =
    useMutation({
      mutationFn: AuthClient.updateEmail,
      onSuccess: () => {
        notifications.show({
          title: "Email address updated",
          message: "Please check your email for a confirmation link",
          color: "success",
        });
        toggleEditingEmailState();
      },
      onError: () => {
        notifications.show({
          title: "Failed to update email",
          message: "Please try again or reach out to support",
          color: "danger",
        });
      },
    });

  if (!user) {
    return <Loader />;
  }

  return (
    <Stack>
      <Title order={1}>Profile</Title>
      {user ?
        <Stack>
          <List listStyleType="none">
            <List.Item>
              {isEditingEmail ?
                <InputTextField
                  required
                  hideLabel
                  isSubmitting={isUpdateEmailPending}
                  showCancelButton
                  type="email"
                  label="Email"
                  defaultValue={user.email ?? ""}
                  submitButtonLabel="Edit"
                  minLength={3}
                  placeholder="Email"
                  onCancel={toggleEditingEmailState}
                  onSubmit={async (email) => {
                    if (isUpdateEmailPending) {
                      return;
                    }
                    sendUpdateEmailRequest(email);
                  }}
                />
              : <Group>
                  <Text>Email: {user.email}</Text>
                  <Button onClick={toggleEditingEmailState}>Edit</Button>
                </Group>
              }
            </List.Item>
            <List.Item>
              <Group>
                <Text>Password: ********</Text>
                <Button
                  onClick={() => {
                    // use route.navigate to go to /update-password and include
                    // a redirect to the current page
                    router.navigate({
                      to: "/update-password",
                      search: {
                        redirect: window.location.pathname,
                      },
                    });
                  }}
                >
                  Change password
                </Button>
              </Group>
            </List.Item>
          </List>
        </Stack>
      : <Loader />}
    </Stack>
  );
}
