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
  const referenceBrief = useReferenceBrief();
  return (
    <div className="reference-tray" aria-label="Saved reference actions">
      <div className="tray-count">
        <Icon name="bookmark" size={17} />
        <strong>{saved.length}</strong>
        <span>
          {saved.length === 1 ? "reference saved" : "references saved"}
        </span>
      </div>
      <button className="tray-clear" onClick={() => setSaved([])}>
        Clear
      </button>
      <button
        className="button button-primary"
        onClick={() =>
          onCopy(
            `Motion Atlas / Creative reference brief\n${saved.length} selected motion references\n\n${savedPresets.map((preset) => referenceBrief({ preset, accent, background })).join("\n\n---\n\n")}`,
            "Reference brief copied",
          )
        }
      >
        <Icon name="copy" size={15} />
        Copy brief
        <Icon name="arrow" size={16} />
      </button>
    </div>
  );
}
