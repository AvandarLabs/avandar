import { useLingui } from "@lingui/react/macro";
import css from "./ChatComposerOverlay.module.css";

type Props = {
  onDismiss: () => void;
};

/**
 * Dims the navbar and canvas while Ask Avandar is expanded, so the panel
 * reads as floating above the chrome. Clicking the overlay docks chat back
 * to the side column.
 */
export function ChatComposerOverlay({
  onDismiss,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();

  return (
    <button
      type="button"
      className={css.overlay}
      onClick={onDismiss}
      aria-label={t`Dock chat panel`}
    />
  );
}
