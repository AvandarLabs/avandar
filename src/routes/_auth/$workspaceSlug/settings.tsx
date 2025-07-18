import { createFileRoute } from "@tanstack/react-router";
import { SettingsView } from "@/components/SettingsView";

export const Route = createFileRoute("/_auth/$workspaceSlug/settings")({
  component: SettingsView,
});
