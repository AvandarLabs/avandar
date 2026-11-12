import { Trans, useLingui } from "@lingui/react/macro";
import { memo } from "react";
import { Icon } from "../../MotionGallery/Icon";
import type { ReactNode, Ref } from "react";

type Props = {
  title: string;
  category: string;
  description: string;
  /** Short monospace reference in the footer, for example the item id. */
  reference: string;
  /** The picture inside the 8:5 preview button. */
  thumbnail: ReactNode;
  /** Right-hand badge in the category row, for example a duration. */
  badge?: ReactNode;
  /** Lets a live thumbnail observe whether its button is on screen. */
  previewRef?: Ref<HTMLButtonElement>;
  onOpen: () => void;
};

/**
 * A Motion Atlas gallery card: a thumbnail that opens the item's preview
 * modal, then its category, title, description and reference. Every section
 * uses it, so the galleries read alike.
 */
export const AtlasCard = memo(function AtlasCard({
  title,
  category,
  description,
  reference,
  thumbnail,
  badge,
  previewRef,
  onOpen,
}: Props) {
  const { t } = useLingui();
  return (
    <article className="motion-card">
      <button
        ref={previewRef}
        type="button"
        className="card-preview"
        onClick={onOpen}
        aria-label={t`Explore ${title}`}
      >
        {thumbnail}
        <span className="preview-open">
          <Icon name="arrow" size={21} />
        </span>
      </button>
      <div className="card-copy">
        <div className="card-category">
          <span>{category}</span>
          {badge}
        </div>
        <div className="card-heading">
          <button type="button" className="card-title" onClick={onOpen}>
            {title}
          </button>
        </div>
        <p>{description}</p>
        <div className="card-foot">
          <code>{reference}</code>
          <button
            type="button"
            onClick={onOpen}
            aria-label={t`View ${title} details`}
          >
            <span>
              <Trans>Explore</Trans>
            </span>
            <Icon name="arrow" size={15} />
          </button>
        </div>
      </div>
    </article>
  );
});
