import { createFileRoute } from "@tanstack/react-router";
import { DataImportView } from "@/components/DataManagerApp/DataImportView";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/data-manager/data-import",
)({
  component: DataImportView,
});
