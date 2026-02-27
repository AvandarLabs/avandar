import { createFileRoute } from "@tanstack/react-router";
import { DataImportView } from "@/views/DataManagerApp/DataImportView";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/data-manager/data-import",
)({
  component: DataImportView,
});
