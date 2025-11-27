import { Text } from "@react-email/components";
import { buildAppPageURL } from "$/utils/urls/buildAppPageURL";
import { EmailFullButton } from "./lib/EmailFullButton";
import { EmailHeading } from "./lib/EmailHeading";
import { EmailParagraph } from "./lib/EmailParagraph";
import { EmailTemplate } from "./lib/EmailTemplate";

type Props = {
  inviteId: string;
  workspaceSlug: string;
  workspaceName: string;
};

export function WorkspaceInviteEmail({
  inviteId,
  workspaceSlug,
  workspaceName,
}: Props): JSX.Element {
  const acceptInviteURL = buildAppPageURL({
    path: "/$workspaceSlug/invites/$inviteId",
    queryParams: {
      workspaceSlug,
      inviteId,
    },
  });

  return (
    <EmailTemplate previewText={`You've been invited to join ${workspaceName}`}>
      <EmailHeading order={1} style={styles.heading}>
        You've been invited to collaborate with the team at {workspaceName}
      </EmailHeading>

      <Text style={styles.workspaceBox.container}>
        <span style={styles.workspaceBox.label}>Workspace</span>
        <span style={styles.workspaceBox.name}>{workspaceName}</span>
      </Text>

      <EmailParagraph>
        Click the button below to accept the invitation and get started.
      </EmailParagraph>

      <EmailFullButton href={acceptInviteURL}>
        Join {workspaceName}
      </EmailFullButton>
    </EmailTemplate>
  );
}

const styles = {
  heading: {
    fontSize: "1.75rem",
    fontWeight: "normal",
  },
  workspaceBox: {
    container: {
      textAlign: "center" as const,
      margin: "24px 0",
      padding: "20px",
      backgroundColor: "#f8f9fa",
      borderRadius: "4px",
      border: "2px solid #e9ecef",
    },
    label: {
      display: "block",
      fontSize: "14px",
      fontWeight: "600",
      color: "#6c757d",
      textTransform: "uppercase" as const,
      letterSpacing: "1px",
      marginBottom: "8px",
    },
    name: {
      display: "block",
      fontSize: "24px",
      fontWeight: "bold",
      color: "#212529",
      marginTop: "4px",
    },
  },
};

export default WorkspaceInviteEmail;

WorkspaceInviteEmail.PreviewProps = {
  workspaceName: "Avandar Labs",
  workspaceSlug: "avandar-labs",
  inviteId: "1234567890",
} satisfies Props;
