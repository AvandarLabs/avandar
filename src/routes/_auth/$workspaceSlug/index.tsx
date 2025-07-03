import { Container, Loader, Stack, Text, Title } from "@mantine/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks";
import { Logger } from "@/lib/Logger";
import { propEquals } from "@/lib/utils/objects/higherOrderFuncs";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";
import { WorkspaceRootRouteAPI } from "./route";

export const Route = createFileRoute("/_auth/$workspaceSlug/")({
  component: WorkspaceHomePage,
});

function useCurrentWorkspace() {
  const { workspaceSlug } = WorkspaceRootRouteAPI.useParams();
  const workspaceFromRoute = WorkspaceRootRouteAPI.useLoaderData();
  const [userWorkspaces, isLoading] =
    WorkspaceClient.useGetWorkspacesOfCurrentUser();
  const navigate = useNavigate();

  if (isLoading) {
    return workspaceFromRoute;
  }

  const userWorkspace = userWorkspaces?.find(propEquals("slug", workspaceSlug));

  if (!userWorkspace) {
    navigate({
      to: AppLinks.invalidWorkspace.to,
      search: {
        redirectReason: "Workspace not found or access was revoked",
      },
      replace: true,
    });
  }

  // we still return `workspaceFromRoute` even if `userWorkspace` is undefined
  // just so UI doesn't crash from an undefined type, while we're waiting for
  // the `navigate` redirect above to kick in
  return userWorkspace ?? workspaceFromRoute;
}

function WorkspaceHomePage() {
  const { user } = Route.useRouteContext();
  const workspace = useCurrentWorkspace();

  Logger.log("loaded workspace", workspace);

  // get the workspace slug from params
  const workspaceSlug = Route.useParams().workspaceSlug;

  if (!user) {
    return <Loader />;
  }

  return (
    <Container ta="left" my="xxxl">
      <Stack>
        <Title order={1}>Welcome back {user.email}</Title>
        <Text>Welcome to your workspace: {workspaceSlug}.</Text>
      </Stack>
    </Container>
  );
}
