import { WaitlistSignupCodeEmail } from "$/emails/WaitlistSignupCodeEmail";
import { AvaHTTPError } from "$/utils/http/AvaHTTPError";
import { HTTPResponseCodes } from "$/utils/http/HTTPResponseCodes";
import {
  CreateEmailResponseSuccess,
  SendBroadcastResponseSuccess,
} from "resend";
import { match } from "ts-pattern";
import { IEmailClient } from "./EmailClient.types";
import { NOTIFICATION_EMAIL_FROM } from "./EmailClientConfig";
import {
  sendBroadcastEmail,
  SendBroadcastEmailOptions,
} from "./sendBroadcastEmail";
import {
  sendTransactionalEmail,
  SendTransactionalEmailOptions,
} from "./sendTransactionalEmail";

function createEmailClient(): IEmailClient {
  // make sure the RESEND_API_KEY is set otherwise throw an error.
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const emailClient: IEmailClient = {
    sendNotificationEmail: async ({
      type,
      recipientEmail,
      disableDevOverride,
      waitlistSignupCode,
    }): Promise<CreateEmailResponseSuccess> => {
      return match(type)
        .with("waitlist_signup_code", async () => {
          return await emailClient.sendTransactionalEmail({
            disableDevOverride,
            from: {
              email: NOTIFICATION_EMAIL_FROM.email,
              name: NOTIFICATION_EMAIL_FROM.name,
            },
            to: recipientEmail,
            subject: "You're in! Your signup code is ready",
            body: (
              <WaitlistSignupCodeEmail
                signupCode={waitlistSignupCode}
                userEmail={recipientEmail}
              />
            ),
            replyTo: NOTIFICATION_EMAIL_FROM.email,
          });
        })
        .exhaustive(() => {
          throw AvaHTTPError.fromString({
            message: `Unknown notification type: ${type}`,
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
