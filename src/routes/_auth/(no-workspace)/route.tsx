import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/_auth/(no-workspace)")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AppLayout mode="no-workspace" />;
}
