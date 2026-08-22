import { NOTIFICATION_EMAIL_FROM } from "$/EmailClient/EmailClientConfig.ts";
import { sendBroadcastEmail } from "$/EmailClient/sendBroadcastEmail.ts";
import { sendTransactionalEmail } from "$/EmailClient/sendTransactionalEmail.ts";
import WorkspaceInviteEmail from "$/emails/WorkspaceInviteEmail.tsx";
import { getResendSendingAPIKey } from "$/env/getResendSendingAPIKey.ts";
import type {
  IEmailClient,
  WorkspaceInviteNotificationEmailOptions,
} from "$/EmailClient/EmailClient.types.ts";
import type { SendBroadcastEmailOptions } from "$/EmailClient/sendBroadcastEmail.ts";
import type { SendTransactionalEmailOptions } from "$/EmailClient/sendTransactionalEmail.ts";
import type {
  CreateEmailResponseSuccess,
  SendBroadcastResponseSuccess,
} from "resend";

async function _sendWorkspaceInviteNotification(
  options: Readonly<WorkspaceInviteNotificationEmailOptions>,
): Promise<CreateEmailResponseSuccess> {
  const {
    recipientEmail,
    disableDevEmailOverride,
    workspaceSlug,
    workspaceName,
    inviteId,
  } = options;
  return await sendTransactionalEmail({
    disableDevEmailOverride,
    from: NOTIFICATION_EMAIL_FROM,
    to: recipientEmail,
    replyTo: NOTIFICATION_EMAIL_FROM.email,
    subject: "You've been invited to join a workspace",
    body: (
      <WorkspaceInviteEmail
        workspaceSlug={workspaceSlug}
        workspaceName={workspaceName}
        inviteId={inviteId}
        inviteEmail={recipientEmail}
      />
    ),
  });
}

function createEmailClient(): IEmailClient {
  getResendSendingAPIKey();

  const emailClient: IEmailClient = {
    sendNotificationEmail: async (options) => {
      return await _sendWorkspaceInviteNotification(options);
    },

    sendBroadcastEmail: async (
      options: SendBroadcastEmailOptions,
    ): Promise<SendBroadcastResponseSuccess> => {
      return await sendBroadcastEmail(options);
    },

    sendTransactionalEmail: async (
      options: SendTransactionalEmailOptions,
    ): Promise<CreateEmailResponseSuccess> => {
      return await sendTransactionalEmail(options);
    },
  };

  return emailClient;
}

/** Shared client for transactional, notification, and broadcast email. */
export const EmailClient = createEmailClient();
