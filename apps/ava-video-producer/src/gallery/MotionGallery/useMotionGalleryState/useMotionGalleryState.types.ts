import type { StockPresetId } from "../../../stock/stockEntry";
import type { ContentDraft } from "../ContentControls/ContentDraftModule/ContentDraftModule";
import type { Preset } from "../Preset.types";
import type { Dispatch, SetStateAction } from "react";
/**
 * Catalog selection, saved references, editable content, and playback controls.
 */
export type MotionGalleryState = {
  category: string;
  selectCategory: (value: string) => void;
  saved: StockPresetId[];
  setSaved: Dispatch<SetStateAction<StockPresetId[]>>;
  results: Preset[];
  collection: string;
  setCollection: Dispatch<SetStateAction<string>>;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  playing: boolean;
  setPlaying: Dispatch<SetStateAction<boolean>>;
  drafts: Partial<Record<StockPresetId, ContentDraft>>;
  onOpen: (preset: Preset) => void;
  onSave: (id: StockPresetId) => void;
  selected: Preset | undefined;
  savedPresets: Preset[];
  onCopy: (value: string, label: string) => Promise<void>;
  notice: string;
  previousPreset: Preset | undefined;
  nextPreset: Preset | undefined;
  contentState: ContentDraft | undefined;
  updateContent: (id: StockPresetId, state: ContentDraft) => void;
  onClose: () => void;
};
