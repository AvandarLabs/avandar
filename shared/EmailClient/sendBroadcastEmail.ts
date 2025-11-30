import { render } from "@react-email/render";
import { SendBroadcastResponseSuccess } from "resend";
import { ResendClient } from "./ResendClient.ts";
import type { ReactNode } from "react";

export type SendBroadcastEmailOptions = {
  subject: string;
  audienceId: string;
  topicId?: string;
  from: {
    email: string;
    name: string;
  };
  body: ReactNode;
  replyTo?: string;

  /**
   * A prefix to add to the subject of the email. Used only as the internal
   * broadcast name in Resend. This is not shown to the recipient.
   */
  broadcastNamePrefix?: string;
};

export async function sendBroadcastEmail({
  audienceId,
  topicId,
  broadcastNamePrefix,
  subject,
  from,
  replyTo,
  body,
}: SendBroadcastEmailOptions): Promise<SendBroadcastResponseSuccess> {
  const plaintextContent = await render(body, { plainText: true });
  const { data: broadcast, error: createBroadcastError } =
    await ResendClient.createBroadcast({
      audienceId,
      from: `${from.name} <${from.email}>`,
      name:
        broadcastNamePrefix ? `${broadcastNamePrefix} - ${subject}` : subject,
      subject,
      topicId,
      replyTo,
      react: body,
      text: plaintextContent,
    });
  if (createBroadcastError || !broadcast) {
    console.error("Error creating broadcast:", createBroadcastError.message);
    throw createBroadcastError;
  }

  const { data: sendBroadcastResult, error: sendBroadcastError } =
    await ResendClient.sendBroadcast(broadcast.id);
  if (sendBroadcastError) {
    console.error("Error sending broadcast:", sendBroadcastError.message);
    throw sendBroadcastError;
  }
  return sendBroadcastResult;
}
