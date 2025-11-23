import {
  Button,
  Center,
  Container,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { APIClient } from "@/clients/APIClient";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useQuery } from "@/lib/hooks/query/useQuery";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";

const searchSchema = z.object({
  success: z.boolean().optional(),
  checkout_id: z.uuid().optional(),
});

export const Route = createFileRoute("/_auth/$workspaceSlug/checkout")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    if (!search.success) {
      throw redirect({ to: "/" });
    }
  },
  component: CheckoutPage,
});

function CheckoutPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { success } = Route.useSearch();
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();
  const [subscriptions] = useQuery({
    queryKey: ["subscriptions", "fetch-and-sync", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return undefined;
      }
      // TODO(jpsyx): this should be a POST request and should be
      // done with the useMutation hook.
      const data = await APIClient.get({
        route: "subscriptions/fetch-and-sync",
        queryParams: {
          userId: user.id,
        },
      });
      return data.subscriptions;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (subscriptions) {
      // iterate over the subscriptions and see if any of them correspond
      // to the current workspace
      if (
        subscriptions.some((sub) => {
          return sub.workspace_id === workspace.id;
        })
      ) {
        // invalidate all workspace queries so that when we navigate to the
        // home page, we will refetch the workspace and get the updated
        // subscription
        queryClient.invalidateQueries({
          queryKey: [WorkspaceClient.getClientName()],
        });
        // if there's a subscription for the current workspace then we
        // can redirect to the workspace home
        navigate(AppLinks.workspaceHome(workspace.slug));
      }
    }
  }, [subscriptions, workspace.id, workspace.slug, navigate, queryClient]);

  const contents =
    success === true ?
      <>
        <ThemeIcon size={64} radius="xl" variant="light" color="green">
          <IconCheck size={32} stroke={2.5} />
        </ThemeIcon>
        <Stack gap="xs" align="center">
          <Title order={2} fw={600}>
            Checkout Successful!
          </Title>
          <Text size="lg" c="dimmed" maw={400}>
            Your checkout was successful!
          </Text>
          <Text component="strong" size="lg" c="dimmed" maw={400} fw="bold">
            It may take a few minutes for your subscription to take effect.
          </Text>
        </Stack>
        <Button
          onClick={() => {
            navigate({ to: "/" });
          }}
          size="md"
          mt="md"
        >
          Continue to your workspace
        </Button>
      </>
    : null;

  // This shouldn't be reached due to beforeLoad redirect
  return (
    <Container size="sm" py="xl">
      <Center h="100%">
        <Paper
          p="xl"
          radius="md"
          shadow="sm"
          withBorder
          bg="white"
          w="100%"
          maw={500}
        >
          <Stack gap="lg" align="center" ta="center">
            {contents}
          </Stack>
        </Paper>
      </Center>
    </Container>
  );
}
