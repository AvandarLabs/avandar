import { Container, Loader, Stack, Text, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { useCurrentWorkspace } from "@/lib/hooks/workspaces/useCurrentWorkspace";
import { Logger } from "@/lib/Logger";

export const Route = createFileRoute("/_auth/$workspaceSlug/")({
  component: WorkspaceHomePage,
});

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
