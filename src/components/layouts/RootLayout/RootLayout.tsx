import { match } from "ts-pattern";
import { AppShell } from "@/components/AppShell/AppShell";
import { ChatPanelProvider } from "@/components/ChatPanel/ChatPanelProvider/ChatPanelProvider";
import { WorkspaceLayout } from "@/components/layouts/RootLayout/WorkspaceLayout/WorkspaceLayout";
import { NavbarLinks } from "@/config/NavbarLinks/NavbarLinks";

type Props = {
  mode: "no-workspace" | "workspace";
};

export function RootLayout({ mode }: Props): JSX.Element {
  return match(mode)
    .with("no-workspace", () => {
      const navbarLinks = [NavbarLinks.home];
      return (
        <ChatPanelProvider isChatAvailable={false}>
          <AppShell navbarLinks={navbarLinks} showChatPanel={false} />
        </ChatPanelProvider>
      );
    })
    .with("workspace", () => {
      return <WorkspaceLayout />;
    })
    .exhaustive();
}
