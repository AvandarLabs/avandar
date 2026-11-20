import { propEq } from "@avandar/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilmDownloads } from "../../../showcase/FilmDownloads/FilmDownloads";
import { STOCK_CATALOG, type StockPresetId } from "../../stock/catalog";
import { copyTextToClipboard } from "../copyText";
import {
  type ContentDraft,
  ContentDraftModule,
} from "./ContentControls/ContentDraftModule/ContentDraftModule";
import { isReducedMotionPreferred } from "./isReducedMotionPreferred";
import type { Preset } from "./Preset.types";
import type { Dispatch, SetStateAction } from "react";

const SAVED_KEY = "motion-atlas:saved:v1" as const;

const _findPreset = (id: string): Preset | undefined => {
  return STOCK_CATALOG.find(propEq<{ id: unknown }, "id", unknown>("id", id));
};

const _getPresetFromHash = (): Preset | undefined => {
  return _findPreset(window.location.hash.slice(1));
};

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

/**
 * Coordinates catalog selection, editable content, saved references, and
 * playback.
 */
export function useMotionGalleryState(): MotionGalleryState {
  useEffect(function reloadOnRebuildNotification() {
    const events = new EventSource("/events");
    let generation: string | undefined;
    let cancelRefresh: (() => void) | undefined;
    events.onmessage = (event) => {
      if (generation !== undefined && generation !== event.data) {
        cancelRefresh?.();
        cancelRefresh = FilmDownloads.afterDownloads(() => {
          return location.reload();
        });
      }
      generation = event.data;
    };
    return () => {
      events.close();
      cancelRefresh?.();
    };
  }, []);

  const [category, setCategory] = useState("All motions");

  const [collection, setCollection] = useState("all");

  const [drafts, setDrafts] = useState<
    Partial<Record<StockPresetId, ContentDraft>>
  >({});

  const updateContent = (id: StockPresetId, state: ContentDraft) => {
    return setDrafts((previous) => {
      return {
        ...previous,
        [id]: state,
      };
    });
  };

  const [query, setQuery] = useState("");

  const [playing, setPlaying] = useState(() => {
    return !isReducedMotionPreferred();
  });

  const [selected, setSelected] = useState<Preset | undefined>(
    _getPresetFromHash,
  );

  const contentState = useMemo(() => {
    return selected
      ? (drafts[selected.id] ?? ContentDraftModule.fromPreset(selected.id))
      : undefined;
  }, [selected, drafts]);

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
              data.filter((id): id is StockPresetId => {
                return typeof id === "string" && Boolean(_findPreset(id));
              }),
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
    const update = () => {
      return setSelected(_getPresetFromHash());
    };
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
    noticeTimer.current = setTimeout(() => {
      return setNotice("");
    }, 4200);
  }, []);

  const onSave = useCallback((id: StockPresetId) => {
    return setSaved((previous) => {
      return previous.includes(id)
        ? previous.filter((value) => {
            return value !== id;
          })
        : [...previous, id];
    });
  }, []);

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
        await copyTextToClipboard(value, "Text to copy");
        announce(label);
      } catch {
        announce(
          "Copy unavailable. Select the reference text and copy it manually.",
        );
      }
    },
    [announce],
  );

  const results = useMemo(() => {
    return STOCK_CATALOG.filter((preset) => {
      return (
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
          .includes(query.toLowerCase().trim())
      );
    });
  }, [category, collection, query, saved]);

  const selectedCatalogIndex = selected ? STOCK_CATALOG.indexOf(selected) : -1;

  const previousPreset = [...results].reverse().find((preset) => {
    return STOCK_CATALOG.indexOf(preset) < selectedCatalogIndex;
  });

  const nextPreset = results.find((preset) => {
    return STOCK_CATALOG.indexOf(preset) > selectedCatalogIndex;
  });

  const savedPresets = STOCK_CATALOG.filter((preset) => {
    return saved.includes(preset.id);
  });

  const selectCategory = (value: string) => {
    setCategory(value);
    setQuery("");
  };
  return {
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
