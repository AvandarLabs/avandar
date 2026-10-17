import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterDownloads } from "../../showcase/download.js";
import {
  STOCK_CATALOG,
  STOCK_CATEGORIES,
  type StockPresetId,
} from "../stock/catalog";
import { Icon, type IconName } from "./MotionGallery/Icon";
import { MotionCard } from "./MotionGallery/MotionCard";
import { PaletteControls } from "./MotionGallery/PaletteControls";
import { PreviewDialog } from "./MotionGallery/PreviewDialog";
import {
  reduceMotion,
  referenceBrief,
  type Preset,
} from "./MotionGallery/shared";
import { DEFAULT_ACCENT, DEFAULT_BACKGROUND } from "./palette";

const CATEGORY_ICONS: Record<string, IconName> = {
  Networks: "network",
  "Data flow": "flow",
  Code: "code",
  Charts: "chart",
  Interface: "interface",
};
const SAVED_KEY = "motion-atlas:saved:v1";
const findPreset = (id: string) => STOCK_CATALOG.find((item) => item.id === id);
const hashPreset = () => findPreset(window.location.hash.slice(1)) ?? null;

function readPaletteOverride(key: string, fallback: string) {
  try {
    const value = sessionStorage.getItem(key);
    return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    /* Local HTTP fallback. */
  }
  const previousFocus = document.activeElement as HTMLElement | null;
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("aria-label", "Text to copy");
  field.style.cssText =
    "position:fixed;left:0;top:0;opacity:0;width:1px;height:1px";
  (document.querySelector("dialog[open]") ?? document.body).append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  previousFocus?.focus();
  if (!copied) throw new Error("Clipboard unavailable");
}

/** Root of the Motion Atlas showcase: browses, previews, and exports stock motion presets. */
function MotionGallery() {
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
    readPaletteOverride("atlas:accent", DEFAULT_ACCENT),
  );
  const [background, setBackground] = useState(() =>
    readPaletteOverride("atlas:background", DEFAULT_BACKGROUND),
  );
  useEffect(
    function persistPaletteOverrides() {
      try {
        if (accent === DEFAULT_ACCENT)
          sessionStorage.removeItem("atlas:accent");
        else sessionStorage.setItem("atlas:accent", accent);
        if (background === DEFAULT_BACKGROUND)
          sessionStorage.removeItem("atlas:background");
        else sessionStorage.setItem("atlas:background", background);
      } catch {
        /* Current palette remains usable when storage is unavailable. */
      }
    },
    [accent, background],
  );
  const [category, setCategory] = useState("All motions");
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState(() => !reduceMotion());
  const [selected, setSelected] = useState<Preset | null>(hashPreset);
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
                  typeof id === "string" && Boolean(findPreset(id)),
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
    const update = () => setSelected(hashPreset());
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changeMotion = () => {
      if (media.matches) setPlaying(false);
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
    setSelected(null);
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
        await copyText(value);
        announce(label);
      } catch {
        announce(
          "Copy unavailable. Select the reference text and copy it manually.",
        );
      }
    },
    [announce],
  );
  const results = useMemo(
    () =>
      STOCK_CATALOG.filter(
        (preset) =>
          (category === "All motions" ||
            (category === "Saved references"
              ? saved.includes(preset.id)
              : preset.category === category)) &&
          [
            preset.name,
            preset.id,
            preset.description,
            preset.useWhen,
            ...preset.tags,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase().trim()),
      ),
    [category, query, saved],
  );
  const savedPresets = STOCK_CATALOG.filter((preset) =>
    saved.includes(preset.id),
  );
  const selectCategory = (value: string) => {
    setCategory(value);
    setQuery("");
  };
  return (
    <>
      <a className="skip-link" href="#library">
        Skip to motion library
      </a>
      <header className="site-header">
        <a
          href="motion.html"
          className="brand"
          aria-label="Avandar Motion Atlas home"
        >
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            avandar<span className="brand-divider">/</span>
            <span className="brand-room">Motion Atlas</span>
          </span>
        </a>
        <nav aria-label="Showcase">
          <a href="index.html">Starter showcase</a>
          <a href="productions.html">
            Productions
            <Icon name="arrow" size={15} />
          </a>
        </nav>
        <span className="header-edition">
          A LIBRARY IN MOTION
          <span className="tiny-dot" />
        </span>
      </header>
      <div className="workspace">
        <aside className="sidebar" aria-label="Library navigation">
          <div className="sidebar-top">
            <p className="eyebrow">BROWSE THE COLLECTION</p>
            <button
              className={`category-button ${category === "All motions" ? "active" : ""}`}
              onClick={() => selectCategory("All motions")}
              aria-pressed={category === "All motions"}
            >
              <Icon name="grid" />
              <span>All motions</span>
              <span className="category-count">{STOCK_CATALOG.length}</span>
            </button>
            <div className="category-list">
              {STOCK_CATEGORIES.map((name) => (
                <button
                  key={name}
                  className={`category-button ${category === name ? "active" : ""}`}
                  onClick={() => selectCategory(name)}
                  aria-pressed={category === name}
                >
                  <Icon name={CATEGORY_ICONS[name] ?? "grid"} />
                  <span>{name}</span>
                  <span className="category-count">
                    {
                      STOCK_CATALOG.filter((preset) => preset.category === name)
                        .length
                    }
                  </span>
                </button>
              ))}
            </div>
            <div className="saved-nav">
              <button
                className={`category-button ${category === "Saved references" ? "active" : ""}`}
                onClick={() => selectCategory("Saved references")}
                aria-pressed={category === "Saved references"}
              >
                <Icon name="bookmark" />
                <span>Saved references</span>
                <span className="category-count">{saved.length}</span>
              </button>
            </div>
          </div>
          <div className="sidebar-note">
            <span className="note-symbol" aria-hidden="true">
              ✳
            </span>
            <h2>
              Find the movement.
              <br />
              Shape the story.
            </h2>
            <p>
              Save a few references, then copy a creative brief for your next
              film.
            </p>
            <div className="note-rule" />
            <span>
              CONCEPTUAL GRAPHICS
              <br />
              NOT PRODUCT FOOTAGE
            </span>
          </div>
          <div className="sidebar-bottom">
            <span className="tiny-dot" />
            LOCAL MOTION LIBRARY <span>01</span>
          </div>
        </aside>
        <main className="library-main" id="library" tabIndex={-1}>
          <section className="library-intro" aria-labelledby="page-title">
            <div className="intro-copy">
              <p className="eyebrow">
                <span className="tiny-dot" />
                THE MOTION REFERENCE COLLECTION
              </p>
              <h1 id="page-title">
                Motion, with <em>meaning.</em>
              </h1>
              <p>
                Small movements. Clear ideas. {STOCK_CATALOG.length} reusable
                motion presets for the moments a screenshot can’t explain.
              </p>
            </div>
            <div
              className="collection-stamp"
              aria-label={`${STOCK_CATALOG.length} presets in ${STOCK_CATEGORIES.length} families`}
            >
              <span className="stamp-top">CURATED COLLECTION</span>
              <strong>
                {String(STOCK_CATALOG.length).padStart(2, "0")}
                <span>/</span>
              </strong>
              <div>
                <span>MOTION PRESETS</span>
                <span>
                  {String(STOCK_CATEGORIES.length).padStart(2, "0")} FAMILIES
                </span>
              </div>
            </div>
          </section>
          <section className="collection" aria-labelledby="collection-title">
            <div className="collection-toolbar">
              <div className="collection-heading">
                <h2 id="collection-title">{category}</h2>
                <span className="result-count">{results.length}</span>
              </div>
              <div className="toolbar-tools">
                <div className="search-field">
                  <Icon name="search" size={17} />
                  <label className="sr-only" htmlFor="motion-search">
                    Search motions
                  </label>
                  <input
                    id="motion-search"
                    type="search"
                    placeholder="Search motions, ideas…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    autoComplete="off"
                  />
                  {query ? (
                    <button
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  ) : null}
                </div>
                <button
                  className="play-all"
                  onClick={() => setPlaying((value) => !value)}
                  aria-label={
                    playing ? "Pause all animations" : "Play all animations"
                  }
                >
                  <Icon name={playing ? "pause" : "play"} size={15} />
                  <span>{playing ? "Pause all" : "Play all"}</span>
                </button>
              </div>
            </div>
            <div className="collection-subline">
              <span>
                {category === "Saved references"
                  ? "Your references, ready for a creative brief."
                  : "Explore a preset. Scrub the motion. Make it yours."}
              </span>
              <span className="loop-spec">
                6 SEC LOOPS <span>·</span> 30 FPS <span>·</span> LIVE PREVIEWS
              </span>
            </div>
            <PaletteControls
              accent={accent}
              background={background}
              setAccent={setAccent}
              setBackground={setBackground}
            />
            {results.length ? (
              <div className="motion-grid">
                {results.map((preset) => (
                  <MotionCard
                    accent={accent}
                    background={background}
                    key={preset.id}
                    preset={preset}
                    index={STOCK_CATALOG.indexOf(preset)}
                    playing={playing && !selected}
                    saved={saved.includes(preset.id)}
                    onOpen={onOpen}
                    onSave={onSave}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Icon
                  name={
                    category === "Saved references" && !query
                      ? "bookmark"
                      : "search"
                  }
                  size={30}
                />
                <h3>
                  {category === "Saved references" && !query
                    ? "Keep a little inspiration."
                    : "No matching motions."}
                </h3>
                <p>
                  {category === "Saved references" && !query
                    ? "Use the bookmark on any preset to add it to your references."
                    : "Try a different keyword, or explore the full collection."}
                </p>
                <button
                  className="button"
                  onClick={() => selectCategory("All motions")}
                >
                  Explore all motions
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            )}
          </section>
          <footer className="library-footer">
            <p>A visual vocabulary for your next explanation.</p>
            <span>
              CONCEPTUAL STUDIES / {STOCK_CATALOG.length} PRESETS / VOL. 01
            </span>
          </footer>
        </main>
      </div>
      {saved.length > 0 ? (
        <div className="reference-tray" aria-label="Saved reference actions">
          <div className="tray-count">
            <Icon name="bookmark" size={17} />
            <strong>{saved.length}</strong>
            <span>
              {saved.length === 1 ? "reference saved" : "references saved"}
            </span>
          </div>
          <button className="tray-clear" onClick={() => setSaved([])}>
            Clear
          </button>
          <button
            className="button button-primary"
            onClick={() =>
              onCopy(
                `Motion Atlas / Creative reference brief\n${saved.length} selected motion references\n\n${savedPresets.map((preset) => referenceBrief(preset, accent, background)).join("\n\n---\n\n")}`,
                "Reference brief copied",
              )
            }
          >
            <Icon name="copy" size={15} />
            Copy brief
            <Icon name="arrow" size={16} />
          </button>
        </div>
      ) : null}
      <div
        className={`toast ${notice && !selected ? "is-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {!selected && notice ? (
          <>
            <Icon name="check" size={16} />
            {notice}
          </>
        ) : null}
      </div>
      {selected ? (
        <PreviewDialog
          accent={accent}
          background={background}
          setAccent={setAccent}
          setBackground={setBackground}
          key={selected.id}
          preset={selected}
          saved={saved.includes(selected.id)}
          initialPlaying={playing}
          onClose={onClose}
          onSave={onSave}
          onCopy={onCopy}
          notice={notice}
        />
      ) : null}
    </>
  );
}

const root = document.getElementById("motion-root");
if (root) createRoot(root).render(<MotionGallery />);
