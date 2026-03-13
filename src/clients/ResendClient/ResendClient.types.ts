import type { Resend } from "resend";

/**
 * This is a thin wrapper around the Resend API that adds rate limiting to make
 * sure that emails always get sent within Resend's API rate limits.
 *
 * For an abstracted client to actually send emails more intuitively,
 * see {@link EmailClient} instead.
 *
 * @see {@link EmailClient}
 */
export type IResendClient = {
  /** The base function for sending an email */
  sendEmail: Resend["emails"]["send"];

  /** Create a new broadcast */
  createBroadcast: Resend["broadcasts"]["create"];

  /** Send an already-created broadcast */
  sendBroadcast: Resend["broadcasts"]["send"];

  /** Create a new contact in Resend */
  createContact: Resend["contacts"]["create"];

  /** Change the details of a contact in Resend */
  updateContact: Resend["contacts"]["update"];

  /** Get a contact from Resend */
  getContact: Resend["contacts"]["get"];

  /**
   * List the available topics that can be used for an email broadcast
   */
  listTopics: Resend["topics"]["list"];
};
