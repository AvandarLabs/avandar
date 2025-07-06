import {
  Button,
  Container,
  Group,
  List,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthClient } from "@/clients/AuthClient";
import { AppLinks } from "@/config/AppLinks";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { useToggleBoolean } from "@/lib/hooks/useToggleBoolean";
import { InputTextField } from "@/lib/ui/singleton-forms/InputTextField";

export const Route = createFileRoute("/_auth/$workspaceSlug/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [isEditingEmail, toggleEditingEmailState] = useToggleBoolean(false);
  const [sendUpdateEmailRequest, isUpdateEmailPending] = useMutation({
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
    <Container pt="xxxl">
      <Stack>
        <Title ta="center" order={1}>
          Profile
        </Title>

        <Paper withBorder shadow="md" p="lg" mt="lg" radius="md" bg="white">
          {user ?
            <Stack>
              <List listStyleType="none" spacing="sm">
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
                        navigate({
                          to: AppLinks.updatePassword.to,
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
        </Paper>
      </Stack>
    </Container>
  );
}
