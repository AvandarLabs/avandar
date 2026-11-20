import { useMemo } from "react";
import { STOCK_CATALOG } from "../../stock/catalog";
import { makeDraftThemeResultFromDraft } from "../../videoThemeEditor/resolveDraftTheme/resolveDraftTheme";
import { useGalleryVideoTheme } from "../GalleryVideoTheme/useGalleryVideoTheme";
import { AtlasSections } from "./AtlasSections/AtlasSections";
import { GalleryHeader } from "./GalleryHeader";
import { GalleryIntroduction } from "./GalleryIntroduction";
import { GalleryNavigation } from "./GalleryNavigation";
import { GalleryToolbar } from "./GalleryToolbar";
import { Icon } from "./Icon";
import { MotionCard } from "./MotionCard";
import { MotionLibraryEmptyState } from "./MotionLibraryEmptyState";
import { MotionLibraryPreview } from "./MotionLibraryPreview/MotionLibraryPreview";
import { ReferenceTray } from "./ReferenceTray";
import { useMotionGalleryState } from "./useMotionGalleryState";
import type { ReactNode } from "react";

const PRESET_INDEX: Map<(typeof STOCK_CATALOG)[number]["id"], number> = new Map(
  STOCK_CATALOG.map((preset, index) => {
    return [preset.id, index];
  }),
);

/**
 * The accent and ground one motion's preview shows: the theme draft, the
 * motion's saved overrides, and its own draft. With no motion open it
 * resolves nothing. It returns undefined then, or while the draft does not
 * resolve, and the caller falls back to the theme-scope colors.
 */
function useItemThemeColors(
  itemId: string | undefined,
): { accent: string; background: string } | undefined {
  const { library, themeId, draft } = useGalleryVideoTheme();
  return useMemo(() => {
    if (!itemId) {
      return undefined;
    }
    const result = makeDraftThemeResultFromDraft({
      library,
      themeId,
      draft,
      scope: { kind: "item", itemId },
    });
    return result.ok
      ? {
          accent: result.theme.semantic.color.accent,
          background: result.theme.semantic.color.ground,
        }
      : undefined;
  }, [library, themeId, draft, itemId]);
}

/**
 * Root of the Motion Atlas showcase: browses, previews, and exports stock
 * motion presets.
 */
export function MotionLibrary(): ReactNode {
  const state = useMotionGalleryState();
  const {
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
  } = state;
  const savedIds = useMemo(() => {
    return new Set(saved);
  }, [saved]);
  const { galleryTheme } = useGalleryVideoTheme();
  const accent = galleryTheme.semantic.color.accent;
  const background = galleryTheme.semantic.color.ground;
  const selectedColors = useItemThemeColors(selected?.id);

  return (
    <>
      <a className="skip-link" href="#library">
        Skip to motion library
      </a>
      <GalleryHeader />
      <AtlasSections section="motions" />
      <div className="workspace">
        <GalleryNavigation
          category={category}
          selectCategory={selectCategory}
          saved={saved}
        />
        <main className="library-main" id="library" tabIndex={-1}>
          <GalleryIntroduction />
          <section className="collection" aria-labelledby="collection-title">
            <GalleryToolbar
              category={category}
              results={results}
              collection={collection}
              setCollection={setCollection}
              query={query}
              setQuery={setQuery}
              playing={playing}
              setPlaying={setPlaying}
            />
            <div className="collection-subline">
              <span>
                {category === "Saved references"
                  ? "Your references, ready for a creative brief."
                  : "Explore a preset. Scrub the motion. Make it yours."}
              </span>
              <span className="loop-spec">
                6 SEC LOOPS
                <span>·</span>
                30 FPS
                <span>·</span>
                LIVE PREVIEWS
              </span>
            </div>
            {results.length ? (
              <div className="motion-grid">
                {results.map((preset) => {
                  return (
                    <MotionCard
                      key={preset.id}
                      preset={preset}
                      index={PRESET_INDEX.get(preset.id) ?? 0}
                      playing={playing && !selected}
                      contentState={drafts[preset.id]}
                      saved={savedIds.has(preset.id)}
                      onOpen={onOpen}
                      onSave={onSave}
                    />
                  );
                })}
              </div>
            ) : (
              <MotionLibraryEmptyState
                {...{ category, query, selectCategory }}
              />
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
        <ReferenceTray
          saved={saved}
          setSaved={setSaved}
          savedPresets={savedPresets}
          accent={accent}
          background={background}
          onCopy={onCopy}
        />
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
      <MotionLibraryPreview
        {...{ state, accent, background, selectedColors }}
      />
    </>
  );
}
