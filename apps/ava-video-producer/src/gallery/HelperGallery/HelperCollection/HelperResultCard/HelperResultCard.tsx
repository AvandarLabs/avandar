import { HelperCard } from "../../HelperCard/HelperCard";
import { getHelperCategoryLabelFromId } from "../../helperCategoryHelpers";
import { useHelperGallery } from "../../useHelperGallery";
import type { ReactNode } from "react";

type Props = {
  helper: ReturnType<typeof useHelperGallery>["entries"][number];
  playing: boolean;
  open: ReturnType<typeof useHelperGallery>["open"];
  gallery: ReturnType<typeof useHelperGallery>;
};
/** Adapts one helper catalog result to its live preview card. */
export function HelperResultCard({
  helper,
  playing,
  open,
  gallery,
}: Readonly<Props>): ReactNode {
  return (
    <HelperCard
      helper={helper}
      category={getHelperCategoryLabelFromId(helper.category)}
      playing={playing && !open}
      onOpen={gallery.openHelper}
    />
  );
}
