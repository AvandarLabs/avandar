import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Loader } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconPencil } from "@tabler/icons-react";
import css from "@/views/GisApp/shell/MapTopBar/SaveStateIndicator/SaveStateIndicator.module.css";
import type { MapSaveState } from "@/views/GisApp/useAvaMapEditor/useAvaMapEditor";
import type { ReactNode } from "react";

type Props = { saveState: MapSaveState };

/** Reports whether the map's latest changes are persisted. */
export function SaveStateIndicator({ saveState }: Props): ReactNode {
  const { t } = useLingui();
  const content = matchLiteral(saveState, {
    saved: {
      icon: <IconCheck size={14} stroke={1.8} />,
      label: t`All changes saved`,
    },
    saving: { icon: <Loader size={12} />, label: t`Saving` },
    unsaved: {
      icon: <IconPencil size={14} stroke={1.8} />,
      label: t`Unsaved changes`,
    },
    failed: {
      icon: <IconAlertTriangle size={14} stroke={1.8} />,
      label: t`Could not save. Your last change is still on screen.`,
    },
  });

  return (
    <span
      className={css.saveStateIndicator}
      role="status"
      aria-label={content.label}
    >
      {content.icon}
      <span className={css.saveStateIndicatorLabel}>{content.label}</span>
    </span>
  );
}
