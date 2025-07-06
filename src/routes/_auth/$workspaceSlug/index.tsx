import { Container, Loader, Stack, Text, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";

export const Route = createFileRoute("/_auth/$workspaceSlug/")({
  component: WorkspaceHomePage,
});

function WorkspaceHomePage() {
  const { user } = Route.useRouteContext();
  const [userProfile, isLoadingUserProfile] = useCurrentUserProfile();

  if (!user) {
    return <Loader />;
  }

  return (
    <Container ta="left" my="xxxl">
      <Stack>
        <Title order={1}>
          Welcome back
          {isLoadingUserProfile ?
            <Loader ml="sm" />
          : `, ${userProfile.displayName}`}
        </Title>
        <Text>
          This is where eventually you will see the newest updates for your
          workspace.
        </Text>
      </Stack>
    </Container>
  );
}
