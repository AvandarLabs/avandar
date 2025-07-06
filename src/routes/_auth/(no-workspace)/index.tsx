import { Container, Divider, Paper, Stack, Title } from "@mantine/core";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks";
import { BasicForm } from "@/lib/ui/BasicForm";
import { notifySuccess } from "@/lib/ui/notifications/notifySuccess";
import { isNonEmptyArray } from "@/lib/utils/guards";
import { slugify } from "@/lib/utils/strings/transformations";
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

const FORM_FIELDS = {
  workspaceName: {
    type: "text" as const,
    initialValue: "",
    required: true,
  },
  workspaceIdentifier: {
    type: "text" as const,
    description: "This is the unique ID of your organization used in URLs.",
    initialValue: "",
    required: true,
    syncWhileUntouched: {
      syncFrom: "workspaceName",
      transform: slugify,
    },
  },
  fullName: {
    type: "text" as const,
    initialValue: "",
    required: true,
  },
  displayName: {
    type: "text" as const,
    description:
      "This could be your name, a nickname, or however you want your team to refer to you.",
    initialValue: "",
    required: true,
    syncWhileUntouched: {
      syncFrom: "fullName",
    },
  },
};

const FORM_ELEMENTS = [
  <Title order={4}>About your workspace</Title>,
  "workspaceName",
  "workspaceIdentifier",
  <Divider mt="xs" />,
  <Title order={4}>About you</Title>,
  "fullName",
  "displayName",
] as const;

/**
 * Page where a user can create their first workspace.
 * If the user already has a workspace, this page is never accessible.
 * We will always redirect them to their workspace page.
 */
function CreateFirstWorkspacePage() {
  const navigate = useNavigate();
  const [createWorkspace, isWorkspaceCreating] =
    WorkspaceClient.useCreateWorkspaceWithOwner({
      queryToInvalidate: [WorkspaceClient.getClientName()],
      onSuccess: (newWorkspace) => {
        notifySuccess("Workspace created successfully!");

        // navigate to the new workspace
        navigate(AppLinks.workspaceHome(newWorkspace.slug));
      },
    });

  return (
    <Container py="xxxl">
      <Stack>
        <Title ta="center" order={1}>
          Welcome to your first workspace
        </Title>

        <Paper withBorder shadow="md" p="lg" mt="lg" radius="md" bg="white">
          <BasicForm
            fields={FORM_FIELDS}
            formElements={FORM_ELEMENTS}
            submitIsLoading={isWorkspaceCreating}
            onSubmit={(values) => {
              createWorkspace({
                workspaceName: values.workspaceName,
                workspaceSlug: values.workspaceIdentifier,
                ownerName: values.fullName,
                ownerDisplayName: values.displayName,
              });
            }}
            introText="It's time to create your first workspace. Don't think for too long you can always change these later!"
          />
        </Paper>
      </Stack>
    </Container>
  );
}
