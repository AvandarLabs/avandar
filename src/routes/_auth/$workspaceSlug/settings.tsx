import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/components/common/SettingsPage";

export const Route = createFileRoute("/_auth/$workspaceSlug/settings")({
  component: SettingsPage,
});
