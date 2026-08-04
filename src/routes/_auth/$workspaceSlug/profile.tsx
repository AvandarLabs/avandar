import { createFileRoute } from "@tanstack/react-router";
import { ProfileView } from "@/views/ProfileView/ProfileView";

export const Route = createFileRoute("/_auth/$workspaceSlug/profile")({
  component: ProfileView,
});
