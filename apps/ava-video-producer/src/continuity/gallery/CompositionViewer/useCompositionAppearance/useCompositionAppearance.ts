import { useState } from "react";
import { getExportOptionsFromAcknowledgement } from "../compositionExportOptions/compositionExportOptions";
import { getStoredCompositionAppearance } from "./getStoredCompositionAppearance";
import { getStoredCompositionTransport } from "./getStoredCompositionTransport";
import { updateCompositionAppearance } from "./updateCompositionAppearance";
import { useAppearanceAcknowledgement } from "./useAppearanceAcknowledgement";
import { useFilmControlSender } from "./useFilmControlSender";
import { useTransportPreferences } from "./useTransportPreferences";
import type { ContinuityAppearance } from "../../../continuityAppearance/continuityAppearance";
import type { CompositionAppearanceState } from "./useCompositionAppearance.types";
import type { RefObject } from "react";

type Options = {
  id: string;
  player: RefObject<HTMLIFrameElement | null>;
  isScene: boolean;
};
/**
 * Synchronize validated options only with the active, same-origin film. A
 * scene study's player plays plain storyboard scenes, so it receives no
 * appearance and exports only its caption choice.
 */
export function useCompositionAppearance({
  id,
  player,
  isScene,
}: Readonly<Options>): CompositionAppearanceState {
  const [transport, setTransport] = useState(getStoredCompositionTransport);
  const [draft, setDraft] = useState(getStoredCompositionAppearance);
  const [acknowledged, setAcknowledged] = useState<{
    id: string;
    options: ContinuityAppearance;
  }>();
  const send = useFilmControlSender({ id, player });
  useAppearanceAcknowledgement({
    id,
    player,
    isScene,
    draft,
    transport,
    send,
    setAcknowledged,
  });
  useTransportPreferences({ transport, send });
  const options = getExportOptionsFromAcknowledgement({
    id,
    isScene,
    draft,
    acknowledged,
  });
  return {
    draft,
    transport,
    setTransport,
    options,
    send,
    update: (patch) => {
      updateCompositionAppearance({ patch, draft, setDraft, isScene, send });
    },
    loaded: () => {
      if (!isScene) {
        send("appearance", draft);
      }
    },
  };
}
