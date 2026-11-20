import { useState } from "react";
import { AtlasCategoryNav } from "../AtlasLayout/AtlasCategoryNav/AtlasCategoryNav";
import { AtlasCollection } from "../AtlasLayout/AtlasCollection/AtlasCollection";
import { AtlasDialog } from "../AtlasLayout/AtlasDialog/AtlasDialog";
import { AtlasSections } from "../MotionGallery/AtlasSections/AtlasSections";
import { GalleryHeader } from "../MotionGallery/GalleryHeader";
import { Icon } from "../MotionGallery/Icon";
import { isReducedMotionPreferred } from "../MotionGallery/isReducedMotionPreferred";
import { HelperCard } from "./HelperCard/HelperCard";
import { HELPER_CATALOG } from "./helperCatalog";
import { HelperDetail } from "./HelperDetail/HelperDetail";
import css from "./HelperGallery.module.css";
import { HelperPreview } from "./HelperPreview/HelperPreview";
import { useHelperGallery } from "./useHelperGallery";
import type { ReactNode } from "react";

/** Each helper category with its helper count, in catalog order. */
const HELPER_CATEGORIES = HELPER_CATALOG.categories.map((category) => {
  return {
    id: category.id,
    label: category.title,
    count: HELPER_CATALOG.helpers.filter((helper) => {
      return helper.category === category.id;
    }).length,
  };
});

/**
 * The Helpers section of the Motion Atlas: the shared helpers motions and
 * compositions are built from, as live thumbnail cards by category, each
 * opening its live preview and reference in the shared modal.
 */
export function HelperGallery(): ReactNode {
  const gallery = useHelperGallery();
  const [playing, setPlaying] = useState(() => {
    return !isReducedMotionPreferred();
  });
  const { selection, open, previous, next } = gallery;
  const labelOf = (id: string) => {
    return (
      HELPER_CATEGORIES.find((category) => {
        return category.id === id;
      })?.label ?? id
    );
  };
  return (
    <>
      <a className="skip-link" href="#library">
        Skip to the helpers
      </a>
      <GalleryHeader />
      <AtlasSections section="helpers" />
      <div className="workspace">
        <AtlasCategoryNav
          label="Helper categories"
          eyebrow="BROWSE THE LIBRARY"
          allLabel="All helpers"
          total={HELPER_CATALOG.helpers.length}
          categories={HELPER_CATEGORIES}
          selected={selection.category}
          onSelect={gallery.chooseCategory}
        />
        <AtlasCollection
          eyebrow="THE HELPER LIBRARY"
          title={
            <>
              The code <em>behind the motion.</em>
            </>
          }
          description={
            "The shared helpers every motion and composition is built from, each previewed live with the real code."
          }
          heading={
            HELPER_CATEGORIES.find((item) => {
              return item.id === selection.category;
            })?.label ?? "All helpers"
          }
          resultCount={gallery.entries.length}
          query={selection.query}
          onQueryChange={gallery.setQuery}
          searchLabel="Search helpers"
          searchPlaceholder="Search helpers or exports…"
          tools={
            <button
              type="button"
              className="play-all"
              onClick={() => {
                return setPlaying((value) => {
                  return !value;
                });
              }}
              aria-label={
                playing ? "Pause all animations" : "Play all animations"
              }
            >
              <Icon name={playing ? "pause" : "play"} size={15} />
              <span>{playing ? "Pause all" : "Play all"}</span>
            </button>
          }
          emptyTitle="No matching helpers."
          onReset={() => {
            gallery.setQuery("");
            gallery.chooseCategory("all");
          }}
          resetLabel="All helpers"
        >
          {gallery.entries.map((helper) => {
            return (
              <HelperCard
                key={helper.id}
                helper={helper}
                category={labelOf(helper.category)}
                playing={playing && !open}
                onOpen={gallery.openHelper}
              />
            );
          })}
        </AtlasCollection>
      </div>
      {open ? (
        <AtlasDialog
          title={open.title}
          subtitle={labelOf(open.category)}
          previousLabel="Previous helper"
          nextLabel="Next helper"
          onClose={gallery.close}
          onPrevious={
            previous
              ? () => {
                  return gallery.openHelper(previous.id);
                }
              : undefined
          }
          onNext={
            next
              ? () => {
                  return gallery.openHelper(next.id);
                }
              : undefined
          }
        >
          <div className={css.modalBody}>
            <HelperPreview helper={open} />
            <HelperDetail helper={open} />
          </div>
        </AtlasDialog>
      ) : null}
    </>
  );
}
