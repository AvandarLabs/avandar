import { useEffect, useRef, type RefObject } from "react";
import { match, P } from "ts-pattern";
import {
  continuityAppearanceSchema,
  type ContinuityAppearance,
} from "../continuity/continuityAppearance/continuityAppearance";
import {
  type FilmControl,
  FilmThemeMessages,
} from "./FilmThemeMessages/FilmThemeMessages";
import { postToParentGallery } from "./postToParentGallery";
import type { VideoThemeSnapshot } from "../videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
import type { PlayerRef } from "@remotion/player";

const UNHANDLED_HANDLE_PLAYBACK_KINDS = [
  "appearance",
  "theme",
  "options",
] as const;

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
  onAppearance: (appearance: ContinuityAppearance) => void;
  onTheme: (snapshot: VideoThemeSnapshot) => void;
  onSpeed: (speed: number) => void;
  onLoop: (loop: boolean) => void;
}>;
function _sendOptions(options: FilmControlOptions): void {
  postToParentGallery({
    type: "film-options",
    id: options.id,
    options: options.isContinuity
      ? { ...options.appearance, captions: options.captions }
      : { captions: options.captions },
    transport: { speed: options.speed, loop: options.loop },
  });
}
function _seek({
  value,
  options,
}: Readonly<{
  value: unknown;
  options: FilmControlOptions;
}>): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return;
  }
  const player = options.player.current;
  player?.seekTo(Math.max(0, Math.min(options.previewFrames - 1, value)));
  player?.play();
}
function _handlePlayback({
  filmControl: { action, value },
  options,
}: Readonly<{
  filmControl: FilmControl;
  options: FilmControlOptions;
}>): boolean {
  const player = options.player.current;
  return match(action)
    .with("play", () => {
      player?.play();
      return true;
    })
    .with("pause", () => {
      player?.pause();
      return true;
    })
    .with("replay", () => {
      player?.seekTo(0);
      player?.play();
      return true;
    })
    .with("seek", () => {
      _seek({
        value,
        options,
      });
      return true;
    })
    .with("speed", () => {
      if (typeof value === "number" && PLAYBACK_SPEEDS.includes(value)) {
        options.onSpeed(value);
      }
      return true;
    })
    .with("loop", () => {
      options.onLoop(Boolean(value));
      return true;
    })
    .with(P.union(...UNHANDLED_HANDLE_PLAYBACK_KINDS), () => {
      return false;
    })
    .exhaustive();
}
function _applyTheme({
  filmControl: { value, requestKey },
  options,
}: Readonly<{
  filmControl: FilmControl;
  options: FilmControlOptions;
}>): void {
  if (!options.isContinuity) {
    postToParentGallery(
      FilmThemeMessages.makeUnsupportedThemeErrorFromMessage({
        id: options.id,
        requestKey,
      }),
    );
    return;
  }
  const { snapshot, message } = FilmThemeMessages.makeAcknowledgementFromTheme({
    id: options.id,
    value,
    requestKey,
  });
  if (snapshot) {
    options.onTheme(snapshot);
  }
  postToParentGallery(message);
}
/**
 * Posts the film's token usage within the gallery's limits, only when the
 * bounded list differs from the last one sent.
 */
function useUsedTokensReport({
  id,
  usedTokens,
}: Readonly<{
  id: string;
  usedTokens: readonly string[];
}>): void {
  const lastSentPaths = useRef<string[]>([]);
  useEffect(() => {
    const message = FilmThemeMessages.makeTokensUsedMessageFromTokens({
      id,
      paths: usedTokens,
    });
    if (
      message.paths.length === 0 ||
      (message.paths.length === lastSentPaths.current.length &&
        message.paths.every((path, index) => {
          return path === lastSentPaths.current[index];
        }))
    ) {
      return;
    }
    lastSentPaths.current = message.paths;
    postToParentGallery(message);
  }, [usedTokens, id]);
}
function _handleSettings({
  control,
  options,
}: Readonly<{
  control: FilmControl;
  options: FilmControlOptions;
}>): void {
  const { action, value } = control;
  match(action)
    .with("appearance", () => {
      if (options.isContinuity) {
        const result = continuityAppearanceSchema.safeParse(value);
        if (result.success) {
          options.onAppearance(result.data);
        }
      }
    })
    .with("theme", () => {
      return _applyTheme({ filmControl: control, options });
    })
    .with("options", () => {
      return _sendOptions(options);
    })
    .with("play", "pause", "replay", "seek", "speed", "loop", () => {
      return undefined;
    })
    .exhaustive();
}
/**
 * Connects the live player to the gallery that embeds it: answers transport,
 * appearance, and theme messages, acknowledges a theme by its resolved
 * hash, reports its options whenever they change, and posts the tokens its
 * film has read.
 */
export function useFilmControl(options: FilmControlOptions): void {
  const latestOptions = useRef(options);
  useEffect(() => {
    latestOptions.current = options;
  });
  const { isContinuity, appearance, captions, speed, loop } = options;
  const { usedTokens, id } = options;
  useEffect(() => {
    _sendOptions(latestOptions.current);
  }, [isContinuity, appearance, captions, speed, loop]);
  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== location.origin || event.source !== window.parent) {
        return;
      }
      const control = FilmThemeMessages.parseFilmControlMessage({
        data: event.data,
        id: latestOptions.current.id,
      });
      if (
        control &&
        !_handlePlayback({
          filmControl: control,
          options: latestOptions.current,
        })
      ) {
        _handleSettings({
          control,
          options: latestOptions.current,
        });
      }
    };
    window.addEventListener("message", receive);
    return () => {
      return window.removeEventListener("message", receive);
    };
  }, []);
  useUsedTokensReport({
    id,
    usedTokens,
  });
}
