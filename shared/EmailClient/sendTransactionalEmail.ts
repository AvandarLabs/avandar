import { render } from "@react-email/render";
import { getDevOverrideEmail } from "$/env/getDevOverrideEmail.ts";
import { ReactNode } from "react";
import { CreateEmailResponseSuccess } from "resend";
import { ResendClient } from "./ResendClient.ts";

export type SendTransactionalEmailOptions = {
  to: string | string[];
  from: {
    email: string;
    name: string;
  };
  subject: string;
  body: ReactNode;
  replyTo?: string | string[];
  emailToken?: string;

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
  disableDevEmailOverride?: boolean;
};

export async function sendTransactionalEmail({
  to,
  from,
  subject,
  replyTo,
  body,
  disableDevEmailOverride: disableDevOverride,
}: SendTransactionalEmailOptions): Promise<CreateEmailResponseSuccess> {
  const devEmailOverride =
    disableDevOverride ? undefined : getDevOverrideEmail();
  const plaintextContent = await render(body, { plainText: true });
  const { data, error } = await ResendClient.sendEmail({
    from: `${from.name} <${from.email}>`,
    to: devEmailOverride ?? to,
    subject,
    react: body,
    text: plaintextContent,
    ...(replyTo ? { replyTo } : {}),
  });
  if (error) {
    console.error("[sendTransactionEmail] Error sending email:", error.message);
    throw error;
  }
  return data;
}
