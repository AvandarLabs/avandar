import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/$workspaceSlug/settings/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$workspaceSlug/settings/$tabName",
      params: {
        workspaceSlug: params.workspaceSlug,
        tabName: "general",
      },
      replace: true,
    });
  },
});
