import { Container, Paper, Stack, Title } from "@mantine/core";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { isNonEmptyArray } from "$/lib/utils/guards/isNonEmptyArray/isNonEmptyArray";
import { CreateWorkspaceForm } from "@/components/common/forms/CreateWorkspaceForm";
import { AppLinks } from "@/config/AppLinks";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";

/**
 * This is the `/` root page. We already checked if the user is logged in
 * in the `route.tsx` file. In this file, we are attempting to actually
 * render the `CreateFirstWorkspacePage` which should only render if the
 * user has no workspaces.
 */
export const Route = createFileRoute("/_auth/(no-workspace)/")({
  component: CreateFirstWorkspacePage,

  /**
   * Before loading the `/` root page, we check if the user has any workspaces.
   * If they do, then we redirect to that workspace.
   * Otherwise, we can continue rendering this page.
   */
  beforeLoad: async ({ context }) => {
    const { queryClient } = context;
    const userWorkspaces = await WorkspaceClient.withCache(queryClient)
      .withEnsureQueryData()
      .getWorkspacesOfCurrentUser();

    if (isNonEmptyArray(userWorkspaces)) {
      // TODO(jpsyx): redirect to the most recent workspace
      // For now we're just choosing the first one we find for this user
      throw redirect(AppLinks.workspaceHome(userWorkspaces[0].slug));
    }
  },
});

/**
 * Page where a user can create their first workspace.
 * If the user already has a workspace, this page is never accessible.
 * We will always redirect them to their workspace page.
 */
function CreateFirstWorkspacePage() {
  return (
    <Container py="xxxl">
      <Stack>
        <Title ta="center" order={1}>
          Welcome to your first workspace
        </Title>
        <Paper withBorder shadow="md" p="lg" mt="lg" radius="md" bg="white">
          <CreateWorkspaceForm introText="It's time to create your first workspace. Don't think for too long—you can always change these later!" />
        </Paper>
      </Stack>
    </Container>
  );
}
