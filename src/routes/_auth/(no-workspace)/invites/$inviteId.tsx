import { Container, Text, Title } from "@mantine/core";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { APIClient } from "@/clients/APIClient";
import { AuthClient } from "@/clients/AuthClient";
import { AppLinks } from "@/config/AppLinks";

export const Route = createFileRoute("/_auth/(no-workspace)/invites/$inviteId")(
  {
    validateSearch: z.object({
      email: z.string(),
      workspaceSlug: z.string(),
    }),
    beforeLoad: async ({ params, search, context }) => {
      const { inviteId } = params;
      const { email, workspaceSlug } = search;
      const { queryClient } = context;

      // check if we're authenticated. But don't rely on the `context` session
      // we need to make sure we are doing a fresh new check
      const session = await AuthClient.getCurrentSession();
      if (session?.user) {
        const { user } = session;
        const { invite } = await APIClient.get({
          route: "workspaces/invites/:inviteId",
          pathParams: { inviteId },
          queryParams: { email, workspaceSlug },
        });
        if (invite && invite.email === user.email) {
          if (invite.invite_status === "accepted") {
            // already accepted, nothing to do. Go to the workspace home.
            throw redirect(AppLinks.workspaceHome(workspaceSlug));
          } else {
            // the invitation needs to be accepted
            await APIClient.post({
              route: "workspaces/invites/:inviteId/accept",
              pathParams: { inviteId },
              body: {
                workspaceSlug,
                userId: user.id,
              },
            });

            // we accepted. Now go to the workspace home, because the user
            // should now be a part of the workspace.
            // and clear our query client cache
            queryClient.clear();
            throw redirect(AppLinks.workspaceHome(workspaceSlug));
          }
        } else {
          // this invite either doesn't exist, or it's not for the current user.
          // Either way, just go to the home page.
          throw redirect(AppLinks.home);
        }
      }

      // if we're not authenticated then redirect to the signin page and set
      // the redirect param
      throw redirect({
        to: AppLinks.signin.to,
        search: { redirect: location.href },
      });
    },
    component: AcceptInvitePage,
  },
);

function AcceptInvitePage() {
  return (
    <Container pt="xxxl">
      <Title order={3}>Oops!</Title>
      <Text>
        The invitation you are trying to accept is not valid. Please contact the
        workspace owner to get a new invitation.
      </Text>
    </Container>
  );
}
