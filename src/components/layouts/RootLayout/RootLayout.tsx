import { match } from "ts-pattern";
import { AppShell } from "@/components/AppShell/AppShell";
import { WorkspaceLayout } from "@/components/layouts/RootLayout/WorkspaceLayout";
import { NavbarLinks } from "@/config/NavbarLinks";

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
