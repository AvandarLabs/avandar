import type { ContinuityAppearance } from "../../../continuityAppearance/continuityAppearance";
import type { CompositionExportOptions } from "../compositionExportOptions/compositionExportOptions";
import type { CompositionTransport } from "../getCompositionTransportUpdates";
import type { Dispatch, SetStateAction } from "react";
/** The active film's appearance draft, playback, and player messaging. */
export type CompositionAppearanceState = {
  draft: ContinuityAppearance;
  transport: CompositionTransport;
  setTransport: Dispatch<SetStateAction<CompositionTransport>>;
  options: CompositionExportOptions | undefined;
  send: (action: string, value?: unknown) => void;
  update: (patch: Partial<ContinuityAppearance>) => void;
  loaded: () => void;
};
