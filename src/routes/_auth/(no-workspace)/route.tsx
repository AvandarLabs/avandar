import { createFileRoute } from "@tanstack/react-router";
import { RootLayout } from "@/components/common/layouts/RootLayout";

export const Route = createFileRoute("/_auth/(no-workspace)")({
  component: RouteComponent,
});

function RouteComponent() {
  return <RootLayout mode="no-workspace" />;
}
