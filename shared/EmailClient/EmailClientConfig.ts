import { registry } from "@avandar/utils";
import type { NotificationEmailType } from "$/EmailClient/EmailClient.types.ts";

export const NOTIFICATION_EMAIL_FROM = {
  email: "avandar@notifications.avandarlabs.com",
  name: "Avandar Team",
} as const;

/** Registry of notification template identifiers accepted by EmailClient. */
export const NOTIFICATION_EMAIL_TYPES =
  registry<NotificationEmailType>().keys("workspace_invite");
