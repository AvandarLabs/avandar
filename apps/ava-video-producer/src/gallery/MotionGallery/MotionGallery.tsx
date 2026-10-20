import { I18nProvider } from "@lingui/react";
import { Trans, useLingui as useGalleryLingui } from "@lingui/react/macro";
import { createRoot } from "react-dom/client";
import { CompositionGallery } from "../../continuity/gallery/CompositionGallery/CompositionGallery";
import { STOCK_CATALOG } from "../../stock/catalog";
import { galleryI18n } from "../i18n";
import { AtlasSections, getAtlasSection } from "./AtlasSections";
import { GalleryHeader } from "./GalleryHeader";
import { GalleryIntroduction } from "./GalleryIntroduction";
import { GalleryNavigation } from "./GalleryNavigation";
import { GalleryToolbar } from "./GalleryToolbar";
import { Icon } from "./Icon";
import { MotionCard } from "./MotionCard";
import { PaletteControls } from "./PaletteControls";
import { PreviewDialog } from "./PreviewDialog/PreviewDialog";
import { ReferenceTray } from "./ReferenceTray";
import { useMotionGalleryState } from "./useMotionGalleryState";
const PRESET_INDEX: Map<(typeof STOCK_CATALOG)[number]["id"], number> = new Map(
  STOCK_CATALOG.map((preset, index) => [preset.id, index]),
);

/**
 * Root of the Motion Atlas showcase: browses, previews, and exports stock
 * motion presets.
 */
function MotionGallery() {
  const { t } = useGalleryLingui();
  const {
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
  } = useMotionGalleryState();

  return (
    <>
      <a className="skip-link" href="#library">
        <Trans>Skip to motion library</Trans>
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
                  ? t`Your references, ready for a creative brief.`
                  : t`Explore a preset. Scrub the motion. Make it yours.`}
              </span>
              <span className="loop-spec">
                <Trans>6 SEC LOOPS</Trans>
                <span>
                  <Trans>·</Trans>
                </span>
                <Trans>30 FPS</Trans>
                <span>
                  <Trans>·</Trans>
                </span>
                <Trans>LIVE PREVIEWS</Trans>
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
                    index={PRESET_INDEX.get(preset.id) ?? 0}
                    playing={playing && !selected}
                    contentState={drafts[preset.id]}
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
                    ? t`Keep a little inspiration.`
                    : t`No matching motions.`}
                </h3>
                <p>
                  {category === "Saved references" && !query
                    ? t`Use the bookmark on any preset to add it to your references.`
                    : t`Try a different keyword, or explore the full collection.`}
                </p>
                <button
                  className="button"
                  onClick={() => selectCategory("All motions")}
                >
                  <Trans>Explore all motions</Trans>
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            )}
          </section>
          <footer className="library-footer">
            <p>
              <Trans>A visual vocabulary for your next explanation.</Trans>
            </p>
            <span>
              <Trans>
                CONCEPTUAL STUDIES / {STOCK_CATALOG.length} PRESETS / VOL. 01
              </Trans>
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
      {selected ? (
        <PreviewDialog
          accent={accent}
          background={background}
          setAccent={setAccent}
          setBackground={setBackground}
          preset={selected}
          onPrevious={previousPreset ? () => onOpen(previousPreset) : undefined}
          onNext={nextPreset ? () => onOpen(nextPreset) : undefined}
          contentState={contentState!}
          onContentChange={(state) => updateContent(selected.id, state)}
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
const root: HTMLElement | null = document.getElementById("motion-root");
if (root) {
  createRoot(root).render(
    <I18nProvider i18n={galleryI18n}>
      {getAtlasSection() === "motions" ? (
        <MotionGallery />
      ) : (
        <CompositionGallery />
      )}
    </I18nProvider>,
  );
}
