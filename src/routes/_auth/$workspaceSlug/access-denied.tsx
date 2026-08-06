import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { WorkspaceAppAccessDenied } from "@/components/WorkspaceAppAccessDenied/WorkspaceAppAccessDenied";

const AccessDeniedSearchSchema = z.object({
  app: z.string().optional(),
});

export const Route = createFileRoute("/_auth/$workspaceSlug/access-denied")({
  validateSearch: AccessDeniedSearchSchema,
  component: AccessDeniedPage,
});

function AccessDeniedPage(): JSX.Element {
  const { app } = Route.useSearch();

  return <WorkspaceAppAccessDenied appLabel={app} />;
}
