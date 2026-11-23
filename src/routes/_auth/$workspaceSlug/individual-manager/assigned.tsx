import { createFileRoute } from "@tanstack/react-router";
import { appLabel } from "$/copy/appLabel";
import { RouteMiddleware } from "@/utils/RouteMiddleware";
import { AssignedToMeView } from "@/views/IndividualManagerApp/AssignedToMeView/AssignedToMeView";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/individual-manager/assigned",
)({
  beforeLoad: RouteMiddleware.BeforeLoad.checkUserPermissions({
    permissionKey: "case_records__can_view_record",
    appLabel: () => {
      return appLabel("case_records");
    },
  }),
  component: AssignedToMeView,
});
