import type { ReceivedThemeAcknowledgement } from "../ThemeExportState/ThemeExportState";
import type { RefObject } from "react";
/** Replies scoped to the film whose iframe produced them. */
export type PlayerReplies = Readonly<{
  id: string;
  acknowledgement?: ReceivedThemeAcknowledgement;
  paths: readonly string[];
}>;
/** Ref to the live same-origin film player. */
export type Player = RefObject<HTMLIFrameElement | null>;
