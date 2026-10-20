import { useLingui } from "@lingui/react/macro";
import { Icon, type IconName } from "../../../gallery/MotionGallery/Icon";
import { useContinuityCopy } from "../../useContinuityCopy";
import css from "./CompositionPreview.module.css";

type Props = {
  title: string;
  expanded: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
};

/** Stable title and navigation controls for inline and expanded previews. */
export function CompositionPreviewHeader({
  title,
  expanded,
  onClose,
  onPrevious,
  onNext,
}: Props) {
  const { t } = useLingui();
  const translate = useContinuityCopy();
  const actions: Array<{ label: string; icon: IconName; action?: () => void }> =
    [
      { label: t`Previous preview`, icon: "previous", action: onPrevious },
      { label: t`Next preview`, icon: "arrow", action: onNext },
      ...(expanded
        ? [{ label: t`Close preview`, icon: "close" as const, action: onClose }]
        : []),
    ];
  return (
    <header className="dialog-header">
      <h2 id="composition-preview-title" aria-live="polite">
        {translate(title)}
      </h2>
      <div className={css.navigation}>
        {actions.map(({ label, icon, action }) => (
          <button
            key={icon}
            className="icon-button"
            onClick={action}
            disabled={!action}
            aria-label={label}
            title={label}
            autoFocus={icon === "close"}
          >
            <Icon name={icon} />
          </button>
        ))}
      </div>
    </header>
  );
}
