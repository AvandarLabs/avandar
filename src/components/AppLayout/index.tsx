import { match } from "ts-pattern";
import { NavbarLinks } from "@/config/NavbarLinks";
import { AppShell } from "@/lib/ui/AppShell";
import { WorkspaceAppLayout } from "./WorkspaceAppLayout";

type Props = {
  mode: "no-workspace" | "workspace";
};

export function AppLayout({ mode }: Props): JSX.Element {
  return match(mode)
    .with("no-workspace", () => {
      const navbarLinks = [NavbarLinks.home];
      return <AppShell navbarLinks={navbarLinks} utilityLinks={[]} />;
    })
    .with("workspace", () => {
      return <WorkspaceAppLayout />;
    })
    .exhaustive();
}
