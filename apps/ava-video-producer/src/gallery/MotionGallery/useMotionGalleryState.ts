import { propEq } from "@avandar/utils";
import { useLingui as useGalleryLingui } from "@lingui/react/macro";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { afterDownloads } from "../../../showcase/download.js";
import { STOCK_CATALOG, type StockPresetId } from "../../stock/catalog";
import { DEFAULT_ACCENT, DEFAULT_BACKGROUND } from "../palette";
import {
  type ContentDraft,
  ContentDraftModule,
} from "./ContentControls/ContentDraftModule/ContentDraftModule";
import { isReducedMotionPreferred } from "./isReducedMotionPreferred";
import { useReferenceBrief } from "./useReferenceBrief";
import type { Preset } from "./Preset.types";
import type { Dispatch, SetStateAction } from "react";

const SAVED_KEY = "motion-atlas:saved:v1" as const;

const _findPreset = (id: string): Preset | undefined =>
  STOCK_CATALOG.find(propEq<{ id: unknown }, "id", unknown>("id", id));

const _getPresetFromHash = (): Preset | undefined =>
  _findPreset(window.location.hash.slice(1));

function _readPaletteOverride({
  key,
  fallback,
}: {
  key: string;
  fallback: string;
}): string {
  try {
    const value = sessionStorage.getItem(key);
    return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

async function _copyText({
  value,
  label,
}: {
  value: string;
  label: string;
}): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    /* Local HTTP fallback. */
  }
  const previousFocus =
    document.activeElement instanceof HTMLElement ||
    document.activeElement instanceof SVGElement
      ? document.activeElement
      : undefined;
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("aria-label", label);
  field.style.cssText =
    "position:fixed;left:0;top:0;opacity:0;width:1px;height:1px";
  (document.querySelector("dialog[open]") ?? document.body).append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  previousFocus?.focus();
  if (!copied) {
    throw new Error("Clipboard unavailable");
  }
}
/** Catalog selection, saved references, editable content, and playback controls. */
export type MotionGalleryState = {
  accent: string;
  background: string;
  setAccent: Dispatch<SetStateAction<string>>;
  setBackground: Dispatch<SetStateAction<string>>;
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

/**
 * Coordinates catalog selection, editable content, saved references, and
 * playback.
 */
export function useMotionGalleryState(): MotionGalleryState {
  const { t } = useGalleryLingui();

  useEffect(function reloadOnRebuildNotification() {
    const events = new EventSource("/events");
    let generation: string | undefined;
    let cancelRefresh: (() => void) | undefined;
    events.onmessage = (event) => {
      if (generation !== undefined && generation !== event.data) {
        cancelRefresh?.();
        cancelRefresh = afterDownloads(() => location.reload());
      }
      generation = event.data;
    };
    return () => {
      events.close();
      cancelRefresh?.();
    };
  }, []);

  const [accent, setAccent] = useState(() =>
    _readPaletteOverride({ key: "atlas:accent", fallback: DEFAULT_ACCENT }),
  );

  const [background, setBackground] = useState(() =>
    _readPaletteOverride({
      key: "atlas:background",
      fallback: DEFAULT_BACKGROUND,
    }),
  );

  useEffect(
    function persistPaletteOverrides() {
      try {
        if (accent === DEFAULT_ACCENT) {
          sessionStorage.removeItem("atlas:accent");
        } else {
          sessionStorage.setItem("atlas:accent", accent);
        }
        if (background === DEFAULT_BACKGROUND) {
          sessionStorage.removeItem("atlas:background");
        } else {
          sessionStorage.setItem("atlas:background", background);
        }
      } catch {
        /* Current palette remains usable when storage is unavailable. */
      }
    },
    [accent, background],
  );

  const [category, setCategory] = useState("All motions");

  const [collection, setCollection] = useState("all");

  const [drafts, setDrafts] = useState<
    Partial<Record<StockPresetId, ContentDraft>>
  >({});

  const updateContent = (id: StockPresetId, state: ContentDraft) =>
    setDrafts((previous) => ({
      ...previous,
      [id]: state,
    }));

  const [query, setQuery] = useState("");

  const [playing, setPlaying] = useState(() => !isReducedMotionPreferred());

  const [selected, setSelected] = useState<Preset | undefined>(
    _getPresetFromHash,
  );

  const contentState = useMemo(
    () =>
      selected
        ? (drafts[selected.id] ?? ContentDraftModule.fromPreset(selected.id))
        : undefined,
    [selected, drafts],
  );

  const [notice, setNotice] = useState("");

  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const [saved, setSaved] = useState<StockPresetId[]>(() => {
    try {
      const data: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
      return Array.isArray(data)
        ? [
            ...new Set(
              data.filter(
                (id): id is StockPresetId =>
                  typeof id === "string" && Boolean(_findPreset(id)),
              ),
            ),
          ]
        : [];
    } catch {
      return [];
    }
  });

  useEffect(
    function persistSavedReferences() {
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
      } catch {
        /* Saving remains available for this visit. */
      }
    },
    [saved],
  );

  useEffect(function syncSelectionWithUrlAndMotionPreference() {
    const update = () => setSelected(_getPresetFromHash());
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changeMotion = () => {
      if (media.matches) {
        setPlaying(false);
      }
    };
    media.addEventListener("change", changeMotion);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
      media.removeEventListener("change", changeMotion);
      clearTimeout(noticeTimer.current);
    };
  }, []);

  const announce = useCallback((message: string) => {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 4200);
  }, []);

  const onSave = useCallback(
    (id: StockPresetId) =>
      setSaved((previous) =>
        previous.includes(id)
          ? previous.filter((value) => value !== id)
          : [...previous, id],
      ),
    [],
  );

  const onOpen = useCallback((preset: Preset) => {
    setNotice("");
    setSelected(preset);
    window.history.pushState(null, "", `#${preset.id}`);
  }, []);

  const onClose = useCallback(() => {
    setSelected(undefined);
    setNotice("");
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }, []);

  const onCopy = useCallback(
    async (value: string, label: string) => {
      try {
        await _copyText({ value, label: t`Text to copy` });
        announce(label);
      } catch {
        announce(
          t`Copy unavailable. Select the reference text and copy it manually.`,
        );
      }
    },
    [announce, t],
  );

  const results = useMemo(
    () =>
      STOCK_CATALOG.filter(
        (preset) =>
          (collection === "all" || preset.collection === collection) &&
          (category === "All motions" ||
            (category === "Saved references"
              ? saved.includes(preset.id)
              : preset.category === category)) &&
          [
            preset.name,
            preset.id,
            preset.description,
            preset.useWhen,
            preset.searchText,
            ...preset.tags,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase().trim()),
      ),
    [category, collection, query, saved],
  );

  const selectedCatalogIndex = selected ? STOCK_CATALOG.indexOf(selected) : -1;

  const previousPreset = [...results]
    .reverse()
    .find((preset) => STOCK_CATALOG.indexOf(preset) < selectedCatalogIndex);

  const nextPreset = results.find(
    (preset) => STOCK_CATALOG.indexOf(preset) > selectedCatalogIndex,
  );

  const savedPresets = STOCK_CATALOG.filter((preset) =>
    saved.includes(preset.id),
  );

  const selectCategory = (value: string) => {
    setCategory(value);
    setQuery("");
  };
  return {
    accent,
    background,
    setAccent,
    setBackground,
    category,
    selectCategory,
    saved,
    setSaved,
    results,
    collection,
    setCollection,
    query,
    setQuery,
    playing,
    setPlaying,
    drafts,
    onOpen,
    onSave,
    selected,
    savedPresets,
    onCopy,
    notice,
    previousPreset,
    nextPreset,
    contentState,
    updateContent,
    onClose,
  };
}
