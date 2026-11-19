import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import {
  continuityAppearanceSchema,
  type ContinuityAppearance,
} from "../../continuityAppearance";
import {
  getExportOptionsFromAcknowledgement,
  type CompositionExportOptions,
} from "./compositionExportOptions";
import {
  getCompositionTransportUpdates,
  type CompositionTransport,
} from "./compositionTransport";

/** The active film's appearance draft, playback, and player messaging. */
type CompositionAppearanceState = {
  draft: ContinuityAppearance;
  transport: CompositionTransport;
  setTransport: Dispatch<SetStateAction<CompositionTransport>>;
  options: CompositionExportOptions | undefined;
  send: (action: string, value?: unknown) => void;
  update: (patch: Partial<ContinuityAppearance>) => void;
  loaded: () => void;
};

/**
 * Synchronize validated options only with the active, same-origin film. A
 * scene study's player plays plain storyboard scenes, so it receives no
 * appearance and exports only its caption choice.
 */
export function useCompositionAppearance(
  id: string,
  player: RefObject<HTMLIFrameElement | null>,
  isScene: boolean,
): CompositionAppearanceState {
  const [transport, setTransport] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("composition-transport") ?? "{}",
      );
      return {
        speed: [0.5, 1, 1.5, 2].includes(saved.speed) ? Number(saved.speed) : 1,
        loop: saved.loop === true,
      };
    } catch {
      return { speed: 1, loop: false };
    }
  });
  const [draft, setDraft] = useState<ContinuityAppearance>(() => {
    try {
      return continuityAppearanceSchema.parse(
        JSON.parse(localStorage.getItem("composition-appearance:v2") ?? "{}"),
      );
    } catch {
      return continuityAppearanceSchema.parse({});
    }
  });
  const [acknowledged, setAcknowledged] = useState<{
    id: string;
    options: ContinuityAppearance;
  }>();
  const send = useCallback(
    (action: string, value?: unknown) => {
      return player.current?.contentWindow?.postMessage(
        { type: "film-control", id, action, value },
        location.origin,
      );
    },
    [id, player],
  );
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.source !== player.current?.contentWindow ||
        event.data?.id !== id ||
        event.data?.type !== "film-options"
      )
        return;
      for (const update of getCompositionTransportUpdates(
        transport,
        event.data.transport,
      ))
        send(update.action, update.value);
      const result = continuityAppearanceSchema.safeParse(event.data.options);
      if (result.success) {
        setAcknowledged({ id, options: result.data });
        if (!isScene && JSON.stringify(result.data) !== JSON.stringify(draft))
          send("appearance", draft);
      }
    };
    window.addEventListener("message", receive);
    return () => {
      return window.removeEventListener("message", receive);
    };
  }, [id, player, draft, transport, send, isScene]);
  useEffect(() => {
    if (!isScene) send("appearance", draft);
    try {
      localStorage.setItem("composition-appearance:v2", JSON.stringify(draft));
    } catch {
      /* Preferences remain usable when storage is unavailable. */
    }
  }, [draft, send, isScene]);
  useEffect(() => {
    send("speed", transport.speed);
    send("loop", transport.loop);
    try {
      localStorage.setItem("composition-transport", JSON.stringify(transport));
    } catch {
      /* Preferences remain usable when storage is unavailable. */
    }
  }, [transport, send]);
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
    update: (patch: Partial<ContinuityAppearance>) => {
      return setDraft((current) => {
        return { ...current, ...patch };
      });
    },
    loaded: () => {
      if (!isScene) send("appearance", draft);
    },
  };
}
