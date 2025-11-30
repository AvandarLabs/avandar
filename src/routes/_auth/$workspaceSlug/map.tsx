import { createFileRoute } from "@tanstack/react-router";
import { GISApp } from "@/components/GISApp";

export const Route = createFileRoute("/_auth/$workspaceSlug/map")({
  component: GISAppPage,
});

function GISAppPage() {
  return <GISApp />;
}
