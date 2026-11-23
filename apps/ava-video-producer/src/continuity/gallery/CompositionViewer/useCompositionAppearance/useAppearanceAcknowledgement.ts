import { useEffect } from "react";
import { continuityAppearanceSchema } from "../../../continuityAppearance/continuityAppearance";
import { getCompositionTransportUpdates } from "../getCompositionTransportUpdates";
import type { ContinuityAppearance } from "../../../continuityAppearance/continuityAppearance";
import type { CompositionTransport } from "../getCompositionTransportUpdates";
import type { Dispatch, SetStateAction, RefObject } from "react";

type Options = {
  id: string;
  player: RefObject<HTMLIFrameElement | null>;
  isScene: boolean;
  draft: ContinuityAppearance;
  transport: CompositionTransport;
  send: (action: string, value?: unknown) => void;
  setAcknowledged: Dispatch<
    SetStateAction<{ id: string; options: ContinuityAppearance } | undefined>
  >;
};
/**
 * Accept only active same-origin player options and reconcile draft playback.
 */
export function useAppearanceAcknowledgement({
  id,
  player,
  isScene,
  draft,
  transport,
  send,
  setAcknowledged,
}: Readonly<Options>): void {
  useEffect(
    function synchronizePlayerAppearance() {
      const receive = (event: MessageEvent) => {
        if (
          event.origin !== location.origin ||
          event.source !== player.current?.contentWindow ||
          event.data?.id !== id ||
          event.data?.type !== "film-options"
        ) {
          return;
        }
        getCompositionTransportUpdates({
          desired: transport,
          actual: event.data.transport,
        }).forEach((update) => {
          send(update.action, update.value);
        });
        const result = continuityAppearanceSchema.safeParse(event.data.options);
        if (result.success) {
          setAcknowledged({ id, options: result.data });
          if (
            !isScene &&
            JSON.stringify(result.data) !== JSON.stringify(draft)
          ) {
            send("appearance", draft);
          }
        }
      };
      window.addEventListener("message", receive);
      return () => {
        return window.removeEventListener("message", receive);
      };
    },
    [id, player, draft, transport, send, isScene, setAcknowledged],
  );
}
