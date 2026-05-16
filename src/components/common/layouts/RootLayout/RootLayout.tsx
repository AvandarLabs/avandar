import { match } from "ts-pattern";
import { WorkspaceLayout } from "@/components/common/layouts/RootLayout/WorkspaceLayout";
import { NavbarLinks } from "@/config/NavbarLinks";
import { AppShell } from "@/lib/ui/AppShell/AppShell";

type Props = {
  mode: "no-workspace" | "workspace";
};

export function RootLayout({ mode }: Props): JSX.Element {
  return match(mode)
    .with("no-workspace", () => {
      const navbarLinks = [NavbarLinks.home];
      return <AppShell navbarLinks={navbarLinks} />;
    })
    .with("workspace", () => {
      return <WorkspaceLayout />;
    })
    .exhaustive();
}
