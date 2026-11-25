import { createFileRoute } from "@tanstack/react-router";
import { CrosswalkView } from "@/views/DataManagerApp/CrosswalkView/CrosswalkView";
import type { ReactNode } from "react";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/data-manager/crosswalks/new",
)({
  component: RouteComponent,
});

function RouteComponent(): ReactNode {
  return <CrosswalkView crosswalkId={undefined} />;
}
