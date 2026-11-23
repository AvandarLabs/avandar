import { Icon } from "../../../MotionGallery/Icon";
import css from "./AtlasCardCopy.module.css";
import type { ReactNode } from "react";

type Props = {
  title: string;
  category: string;
  description: string;
  reference: string;
  badge?: ReactNode;
  onOpen: () => void;
};
/** Presents the category and reference actions beneath an AtlasCard preview. */
export function AtlasCardCopy({
  title,
  category,
  description,
  reference,
  badge,
  onOpen,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.atlasCardCopyCardCopy}>
      <div className={css.atlasCardCopyCardCategory}>
        <span>{category}</span>
        {badge}
      </div>
      <div className={css.atlasCardCopyCardHeading}>
        <button
          type="button"
          className={css.atlasCardCopyCardTitle}
          onClick={onOpen}
        >
          {title}
        </button>
      </div>
      <p>{description}</p>
      <div className={css.atlasCardCopyCardFoot}>
        <code>{reference}</code>
        <button
          type="button"
          onClick={onOpen}
          aria-label={`View ${title} details`}
        >
          <span>Explore</span>
          <Icon name="arrow" size={15} />
        </button>
      </div>
    </div>
  );
}
