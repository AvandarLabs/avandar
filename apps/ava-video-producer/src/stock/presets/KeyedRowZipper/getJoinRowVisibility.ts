import type { Input } from "./KeyedRowZipper.schema";

type JoinRowVisibility = {
  isHidden: boolean;
  opacity: number;
  showKey: boolean;
  showMissingPartner: boolean;
};

/** Visibility of a source row, its key and its missing-partner marker. */
export function getJoinRowVisibility({
  input,
  side,
  isContext,
  progress,
  hasPartner,
}: Readonly<{
  input: Input;
  side: "left" | "right";
  isContext: boolean;
  progress: number;
  hasPartner: boolean;
}>): JoinRowVisibility {
  const isTrayHidden = isContext && !input.showUnmatchedTray;
  return {
    isHidden: isTrayHidden && progress === 1,
    opacity: isTrayHidden ? 1 - progress : 1,
    showKey: input.showKeys || progress < 1,
    showMissingPartner:
      side === "left" && !isContext && !hasPartner && progress > 0,
  };
}
