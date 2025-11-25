import { registry } from "@/lib/utils/objects/misc";
import { NotificationEmailType } from "./EmailClient.types";

export const NOTIFICATION_EMAIL_FROM = {
  email: "avandar@notifications.avandarlabs.com",
  name: "Avandar Team",
} as const;

export const NOTIFICATION_EMAIL_TYPES = registry<NotificationEmailType>().keys(
  "waitlist_signup_code",
);
