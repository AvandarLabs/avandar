import { useEffect, useState } from "react";
import { receiveCompositionPlayerReply } from "./receiveCompositionPlayerReply";
import type { Player, PlayerReplies } from "./useCompositionTheme.types";
/**
 * The live player's theme acknowledgement, tagged with the request the
 * player echoed (never the request that is current on arrival), and its
 * token usage for film `id`. Both reset whenever the id changes, so a reply
 * from an earlier visit to the same film never stands in for its new
 * player's answer.
 */
export function usePlayerReplies({
  id,
  player,
  onOptions,
}: Readonly<{
  id: string;
  player: Player;
  onOptions: () => void;
}>): PlayerReplies {
  const [replies, setReplies] = useState<PlayerReplies>({ id, paths: [] });
  if (replies.id !== id) {
    setReplies({ id, paths: [] });
  }
  useEffect(
    function receivePlayerReplies() {
      const receive = (event: MessageEvent<unknown>) => {
        if (
          event.origin !== location.origin ||
          event.source !== player.current?.contentWindow
        ) {
          return;
        }
        receiveCompositionPlayerReply({ event, id, onOptions, setReplies });
      };
      window.addEventListener("message", receive);
      return () => {
        return window.removeEventListener("message", receive);
      };
    },
    [id, player, onOptions],
  );
  return replies.id === id ? replies : { id, paths: [] };
}
