import { Trans, useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { AtlasCategoryNav } from "../AtlasLayout/AtlasCategoryNav/AtlasCategoryNav";
import { AtlasCollection } from "../AtlasLayout/AtlasCollection/AtlasCollection";
import { AtlasDialog } from "../AtlasLayout/AtlasDialog/AtlasDialog";
import { AtlasSections } from "../MotionGallery/AtlasSections";
import { GalleryHeader } from "../MotionGallery/GalleryHeader";
import { Icon } from "../MotionGallery/Icon";
import { isReducedMotionPreferred } from "../MotionGallery/isReducedMotionPreferred";
import { HelperCard } from "./HelperCard/HelperCard";
import { HELPER_CATALOG } from "./helperCatalog";
import { HelperDetail } from "./HelperDetail/HelperDetail";
import css from "./HelperGallery.module.css";
import { HelperPreview } from "./HelperPreview/HelperPreview";
import { useHelperCopy } from "./useHelperCopy";
import { useHelperGallery } from "./useHelperGallery";

/** Each helper category with its helper count, in catalog order. */
function useHelperCategories() {
  const translate = useHelperCopy();
  return HELPER_CATALOG.categories.map((category) => ({
    id: category.id,
    label: translate(category.title),
    count: HELPER_CATALOG.helpers.filter(
      (helper) => helper.category === category.id,
    ).length,
  }));
}

/**
 * The Helpers section of the Motion Atlas: the shared helpers motions and
 * compositions are built from, as live thumbnail cards by category, each
 * opening its live preview and reference in the shared modal.
 */
export function HelperGallery() {
  const { t } = useLingui();
  const translate = useHelperCopy();
  const gallery = useHelperGallery();
  const categories = useHelperCategories();
  const [playing, setPlaying] = useState(() => !isReducedMotionPreferred());
  const { selection, open, previous, next } = gallery;
  const labelOf = (id: string) =>
    categories.find((category) => category.id === id)?.label ?? id;
  return (
    <>
      <a className="skip-link" href="#library">
        <Trans>Skip to the helpers</Trans>
      </a>
      <GalleryHeader />
      <AtlasSections section="helpers" />
      <div className="workspace">
        <AtlasCategoryNav
          label={t`Helper categories`}
          eyebrow={t`BROWSE THE LIBRARY`}
          allLabel={t`All helpers`}
          total={HELPER_CATALOG.helpers.length}
          categories={categories}
          selected={selection.category}
          onSelect={gallery.chooseCategory}
        />
        <AtlasCollection
          eyebrow={t`THE HELPER LIBRARY`}
          title={
            <Trans>
              The code <em>behind the motion.</em>
            </Trans>
          }
          description={t`The shared helpers every motion and composition is built from, each previewed live with the real code.`}
          heading={
            categories.find((item) => item.id === selection.category)?.label ??
            t`All helpers`
          }
          resultCount={gallery.entries.length}
          query={selection.query}
          onQueryChange={gallery.setQuery}
          searchLabel={t`Search helpers`}
          searchPlaceholder={t`Search helpers or exports…`}
          tools={
            <button
              type="button"
              className="play-all"
              onClick={() => setPlaying((value) => !value)}
              aria-label={
                playing ? t`Pause all animations` : t`Play all animations`
              }
            >
              <Icon name={playing ? "pause" : "play"} size={15} />
              <span>{playing ? t`Pause all` : t`Play all`}</span>
            </button>
          }
          emptyTitle={t`No matching helpers.`}
          onReset={() => {
            gallery.setQuery("");
            gallery.chooseCategory("all");
          }}
          resetLabel={t`All helpers`}
        >
          {gallery.entries.map((helper) => (
            <HelperCard
              key={helper.id}
              helper={helper}
              category={labelOf(helper.category)}
              playing={playing && !open}
              onOpen={gallery.openHelper}
            />
          ))}
        </AtlasCollection>
      </div>
      {open ? (
        <AtlasDialog
          title={translate(open.title)}
          subtitle={labelOf(open.category)}
          previousLabel={t`Previous helper`}
          nextLabel={t`Next helper`}
          onClose={gallery.close}
          onPrevious={
            previous ? () => gallery.openHelper(previous.id) : undefined
          }
          onNext={next ? () => gallery.openHelper(next.id) : undefined}
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
