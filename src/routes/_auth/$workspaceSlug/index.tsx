import { Container, Loader, Stack, Text, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";

export const Route = createFileRoute("/_auth/$workspaceSlug/")({
  component: WorkspaceHomePage,
});

function WorkspaceHomePage() {
  const { user } = Route.useRouteContext();

  // get the workspace slug from params
  const workspaceSlug = Route.useParams().workspaceSlug;

  const [userProfile, isLoadingUserProfile] = useCurrentUserProfile();

  if (!user) {
    return <Loader />;
  }

  return (
    <Container ta="left" my="xxxl">
      <Stack>
        <Title order={1}>
          Welcome back{" "}
          {isLoadingUserProfile ?
            <Loader ml="xs" />
          : userProfile.displayName}
        </Title>
        <Text>Welcome to your workspace: {workspaceSlug}.</Text>
      </Stack>
    </Container>
  );
}
