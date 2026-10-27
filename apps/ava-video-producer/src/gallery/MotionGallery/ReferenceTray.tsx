import { Trans, useLingui as useGalleryLingui } from "@lingui/react/macro";
import { type StockPresetId } from "../../stock/catalog";
import { Icon } from "./Icon";
import { useReferenceBrief } from "./useReferenceBrief";
import type { Preset } from "./Preset.types";
import type { ReactNode, Dispatch, SetStateAction } from "react";

type Props = {
  saved: StockPresetId[];
  setSaved: Dispatch<SetStateAction<StockPresetId[]>>;
  savedPresets: Preset[];
  accent: string;
  background: string;
  onCopy: (value: string, label: string) => Promise<void>;
};
/** Saved motion references and their exportable creative brief. */
export function ReferenceTray({
  saved,
  setSaved,
  savedPresets,
  accent,
  background,
  onCopy,
}: Readonly<Props>): ReactNode {
  const { t } = useGalleryLingui();
  const referenceBrief = useReferenceBrief();
  return (
    <div className="reference-tray" aria-label={t`Saved reference actions`}>
      <div className="tray-count">
        <Icon name="bookmark" size={17} />
        <strong>{saved.length}</strong>
        <span>
          {saved.length === 1 ? t`reference saved` : t`references saved`}
        </span>
      </div>
      <button className="tray-clear" onClick={() => setSaved([])}>
        <Trans>Clear</Trans>
      </button>
      <button
        className="button button-primary"
        onClick={() =>
          onCopy(
            t`Motion Atlas / Creative reference brief\n${saved.length} selected motion references\n\n${savedPresets.map((preset) => referenceBrief({ preset, accent, background })).join("\n\n---\n\n")}`,
            t`Reference brief copied`,
          )
        }
      >
        <Icon name="copy" size={15} />
        <Trans>Copy brief</Trans>
        <Icon name="arrow" size={16} />
      </button>
    </div>
  );
}
