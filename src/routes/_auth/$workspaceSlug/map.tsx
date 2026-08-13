import { createFileRoute } from "@tanstack/react-router";
import { GISApp } from "@/views/GISApp/GISApp";

export const Route = createFileRoute("/_auth/$workspaceSlug/map")({
  component: GISAppPage,
});

function GISAppPage() {
  return <GISApp />;
}
