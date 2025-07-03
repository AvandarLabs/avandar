import { createFileRoute } from "@tanstack/react-router";
import { DataManagerApp } from "@/components/DataManagerApp";

export const Route = createFileRoute("/_auth/$workspaceSlug/data-manager")({
  component: DataManagerApp,
});
