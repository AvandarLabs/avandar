import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/$workspaceSlug/invites/$inviteId")(
  {
    component: InviteIdPage,
  },
);

function InviteIdPage() {
  return (
    <Container pt="xxxl">/_auth/$workspaceSlug/invites/$inviteId</Container>
  );
}
