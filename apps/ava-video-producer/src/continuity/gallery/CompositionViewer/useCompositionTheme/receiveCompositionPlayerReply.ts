import { FilmThemeMessages } from "../../../../showcase/FilmThemeMessages/FilmThemeMessages";
import { ThemeExportState } from "../ThemeExportState/ThemeExportState";
import type { PlayerReplies } from "./useCompositionTheme.types";
import type { Dispatch, SetStateAction } from "react";

function _isOptionsFrom({
  data,
  id,
}: Readonly<{
  data: unknown;
  id: string;
}>): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "film-options" &&
    "id" in data &&
    data.id === id
  );
}
/** Process theme acknowledgements and token usage for the active film only. */
export function receiveCompositionPlayerReply({
  event,
  id,
  onOptions,
  setReplies,
}: Readonly<{
  event: MessageEvent<unknown>;
  id: string;
  onOptions: () => void;
  setReplies: Dispatch<SetStateAction<PlayerReplies>>;
}>): void {
  const { data } = event;
  if (
    _isOptionsFrom({
      data,
      id,
    })
  ) {
    onOptions();
  }
  const acknowledgement = ThemeExportState.receiveThemeAcknowledgement({
    data,
    id,
  });
  if (acknowledgement) {
    setReplies((current) => {
      return current.id === id ? { ...current, acknowledgement } : current;
    });
  }
  const tokensMessage = {
    data,
    id,
  };
  if (FilmThemeMessages.isFilmTokensUsedMessage(tokensMessage)) {
    const { data: tokensUsed } = tokensMessage;

    setReplies((current) => {
      return current.id === id
        ? { ...current, paths: tokensUsed.paths }
        : current;
    });
  }
}
