import { useEffect, useRef, type RefObject } from "react";
import {
  continuityAppearanceSchema,
  type ContinuityAppearance,
} from "../../continuity/continuityAppearance";
import {
  createFilmThemeAcknowledgement,
  createFilmTokensUsedMessage,
  parseFilmControlMessage,
  type FilmControl,
} from "../filmTheme/filmTheme";
import type { VideoThemeSnapshot } from "../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type { PlayerRef } from "@remotion/player";

const PLAYBACK_SPEEDS: readonly number[] = [0.5, 1, 1.5, 2];

/** The live player's state and setters that parent messages read and change. */
export type FilmControlOptions = Readonly<{
  id: string;
  player: RefObject<PlayerRef | null>;
  isContinuity: boolean;
  appearance: ContinuityAppearance;
  captions: boolean;
  speed: number;
  loop: boolean;
  previewFrames: number;
  usedTokens: readonly string[];
  send: (message: object) => void;
  onAppearance: (appearance: ContinuityAppearance) => void;
  onTheme: (snapshot: VideoThemeSnapshot) => void;
  onSpeed: (speed: number) => void;
  onLoop: (loop: boolean) => void;
}>;

function _sendOptions(options: FilmControlOptions): void {
  options.send({
    type: "film-options",
    id: options.id,
    options: options.isContinuity
      ? { ...options.appearance, captions: options.captions }
      : { captions: options.captions },
    transport: { speed: options.speed, loop: options.loop },
  });
}

function _seek(value: unknown, options: FilmControlOptions): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return;
  }
  const player = options.player.current;
  player?.seekTo(Math.max(0, Math.min(options.previewFrames - 1, value)));
  player?.play();
}

function _handlePlayback(
  { action, value }: FilmControl,
  options: FilmControlOptions,
): boolean {
  const player = options.player.current;
  switch (action) {
    case "play":
      player?.play();
      return true;
    case "pause":
      player?.pause();
      return true;
    case "replay":
      player?.seekTo(0);
      player?.play();
      return true;
    case "seek":
      _seek(value, options);
      return true;
    case "speed":
      if (typeof value === "number" && PLAYBACK_SPEEDS.includes(value)) {
        options.onSpeed(value);
      }
      return true;
    case "loop":
      options.onLoop(Boolean(value));
      return true;
    default:
      return false;
  }
}

function _handleSettings(
  { action, value }: FilmControl,
  options: FilmControlOptions,
): void {
  if (action === "appearance" && options.isContinuity) {
    const result = continuityAppearanceSchema.safeParse(value);
    if (result.success) {
      options.onAppearance(result.data);
    }
  }
  if (action === "theme" && options.isContinuity) {
    const { snapshot, message } = createFilmThemeAcknowledgement(
      options.id,
      value,
    );
    if (snapshot) {
      options.onTheme(snapshot);
    }
    options.send(message);
  }
  if (action === "options") {
    _sendOptions(options);
  }
}

/**
 * Connects the live player to the gallery that embeds it: answers transport,
 * appearance, and theme messages, acknowledges a theme by its resolved
 * hash, reports its options whenever they change, and posts the tokens its
 * film has read.
 */
export function useFilmControl(options: FilmControlOptions): void {
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });
  const { isContinuity, appearance, captions, speed, loop } = options;
  const { usedTokens, id, send } = options;
  useEffect(
    function reportOptions() {
      _sendOptions(latest.current);
    },
    [isContinuity, appearance, captions, speed, loop],
  );
  useEffect(function listenForFilmControls() {
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== location.origin || event.source !== window.parent) {
        return;
      }
      const control = parseFilmControlMessage(event.data, latest.current.id);
      if (control && !_handlePlayback(control, latest.current)) {
        _handleSettings(control, latest.current);
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(
    function reportUsedTokens() {
      if (usedTokens.length > 0) {
        send(createFilmTokensUsedMessage(id, usedTokens));
      }
    },
    [usedTokens, id, send],
  );
}
