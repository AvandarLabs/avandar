import {
  CreateEmailResponseSuccess,
  SendBroadcastResponseSuccess,
} from "resend";
import { SendBroadcastEmailOptions } from "./sendBroadcastEmail";
import { SendTransactionalEmailOptions } from "./sendTransactionalEmail";

export type NotificationEmailType = "waitlist_signup_code";

export type IEmailClient = {
  /**
   * Sends a notification email to a single recipient using Resend.
   * You can only specify a notification type here. The metadata will be
   * determined by the notification type, and taken from your EmailConfig.
   *
   * To have complete control over the email content, use
   * `sendTransactionalEmail` instead.
   */
  sendNotificationEmail: (options: {
    type: NotificationEmailType;
    recipientEmail: string;

    /**
     * The base URL of the application.
     * It defaults to the `VITE_APP_URL` environment variable, but can be
     * overridden if you need to send a production email locally.
     */
    appURL?: string;

    /**
     * By default, if the NODE_ENV is "development" then we the
     * `DEV_EMAIL_OVERRIDE` environment variable will be used as the recipient's
     * address, regardless of which `to` address was passed. This is to avoid
     * accidentally sending real emails during development.
     *
     * To disable this behavior, set this option to `true`. This should only be
     * disabled when manually running email scripts locally, so we can send
     * real emails from our local environment.
     *
     * @default false
     */
    disableDevOverride?: boolean;

    /** The recipient's waitlist signup code */
    waitlistSignupCode: string;
  }) => Promise<CreateEmailResponseSuccess>;

  /**
   * Sends an email broadcast to a Resend audience. This uses Resend's
   * broadcast API. This sends an email to an entire audience at once. To send
   * to individual recipients, use `sendTransactionalEmail` or
   * `sendNotificationEmail` instead.
   *
   * **NOTE:** this method should only be used via command line scripts, and not
   * triggered through the website.
   */
  sendBroadcastEmail: (
    options: SendBroadcastEmailOptions,
  ) => Promise<SendBroadcastResponseSuccess>;

  /**
   * Sends a transactional email to a single recipient using Resend. This uses
   * Resend's transactional email API. If you want to broadcast an email to an
   * entire audience at once, use `sendBroadcastEmail` or `sendBlogBroadcast`
   * instead.
   *
   * **NOTE:** Avoid using this method directly. It is better to use
   * `sendNotificationEmail` to send a pre-defined email type.
   */
  sendTransactionalEmail: (
    options: SendTransactionalEmailOptions & {
      from: {
        email: `${string}@notifications.avandarlabs.com`;
        name: string;
      };
    },
  ) => Promise<CreateEmailResponseSuccess>;
};
