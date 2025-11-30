import { WaitlistSignupCodeEmail } from "$/emails/WaitlistSignupCodeEmail.tsx";
import WorkspaceInviteEmail from "$/emails/WorkspaceInviteEmail.tsx";
import { AvaHTTPError } from "$/utils/http/AvaHTTPError.ts";
import { HTTPResponseCodes } from "$/utils/http/HTTPResponseCodes.ts";
import {
  CreateEmailResponseSuccess,
  SendBroadcastResponseSuccess,
} from "resend";
import { match } from "ts-pattern";
import { NOTIFICATION_EMAIL_FROM } from "./EmailClientConfig.ts";
import {
  sendBroadcastEmail,
  SendBroadcastEmailOptions,
} from "./sendBroadcastEmail.ts";
import {
  sendTransactionalEmail,
  SendTransactionalEmailOptions,
} from "./sendTransactionalEmail.ts";
import type { IEmailClient } from "./EmailClient.types.ts";

function createEmailClient(): IEmailClient {
  // make sure the RESEND_API_KEY is set otherwise throw an error.
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const emailClient: IEmailClient = {
    sendNotificationEmail: async (
      options,
    ): Promise<CreateEmailResponseSuccess> => {
      const { recipientEmail, disableDevEmailOverride } = options;
      const baseConfig = {
        disableDevEmailOverride,
        from: NOTIFICATION_EMAIL_FROM,
        to: recipientEmail,
        replyTo: NOTIFICATION_EMAIL_FROM.email,
      };

      return match(options)
        .with({ type: "waitlist_signup_code" }, async (opts) => {
          const { waitlistSignupCode } = opts;
          return await emailClient.sendTransactionalEmail({
            ...baseConfig,
            subject: "You're in! Your signup code is ready",
            body: (
              <WaitlistSignupCodeEmail
                signupCode={waitlistSignupCode}
                userEmail={recipientEmail}
              />
            ),
          });
        })
        .with({ type: "workspace_invite" }, async (opts) => {
          const { workspaceSlug, workspaceName, inviteId } = opts;
          return await emailClient.sendTransactionalEmail({
            ...baseConfig,
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
        })
        .exhaustive(() => {
          throw AvaHTTPError.fromString({
            message: `Unknown notification type: ${options.type}`,
            status: HTTPResponseCodes.BAD_REQUEST,
          });
        });
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

export const EmailClient = createEmailClient();
