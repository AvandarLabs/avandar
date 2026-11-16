import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CrosswalkView } from "@/views/DataManagerApp/CrosswalkView/CrosswalkView";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { ReactNode } from "react";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/data-manager/crosswalks/$crosswalkId",
)({
  component: RouteComponent,
  // The view reads the step and layout itself, so moving between steps
  // changes only the search and never remounts the view.
  validateSearch: z.object({
    step: z.enum(["datasets", "map", "combine"]).optional().catch(undefined),
    layoutId: z.uuid().optional().catch(undefined),
  }),
});

function RouteComponent(): ReactNode {
  const { crosswalkId } = Route.useParams();
  // The router's typing drops the id's brand, so restore it. A new key
  // starts the view over for another crosswalk.
  return (
    <CrosswalkView
      key={crosswalkId}
      crosswalkId={crosswalkId as Crosswalk.Id}
    />
  );
}
