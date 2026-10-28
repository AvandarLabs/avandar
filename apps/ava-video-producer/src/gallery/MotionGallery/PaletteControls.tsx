import { Trans, useLingui as useGalleryLingui } from "@lingui/react/macro";
import {
  ACCENT_SWATCHES,
  BACKGROUND_SWATCHES,
  DEFAULT_ACCENT,
  DEFAULT_BACKGROUND,
} from "../palette";
import { PaletteSwatches } from "./PaletteSwatches";
export type Props = {
  accent: string;
  background: string;
  setAccent: (color: string) => void;
  setBackground: (color: string) => void;
};
export function PaletteControls({
  accent,
  background,
  setAccent,
  setBackground,
}: Props) {
  const { t } = useGalleryLingui();
  return (
    <div
      className="palette-controls"
      role="group"
      aria-label={t`Live preview colors`}
    >
      <div className="palette-group">
        <label className="color-control">
          <span>
            <Trans>Brand color</Trans>
          </span>
          <input
            type="color"
            aria-label={t`Brand color`}
            value={accent}
            onChange={(event) => setAccent(event.target.value)}
          />
          <code>{accent}</code>
        </label>
        <PaletteSwatches
          swatches={ACCENT_SWATCHES}
          value={accent}
          onChange={setAccent}
          kind="accent"
        />
      </div>
      <div className="palette-group">
        <label className="color-control">
          <span>
            <Trans>Background</Trans>
          </span>
          <input
            type="color"
            aria-label={t`Background`}
            value={background}
            onChange={(event) => setBackground(event.target.value)}
          />
          <code>{background}</code>
        </label>
        <PaletteSwatches
          swatches={BACKGROUND_SWATCHES}
          value={background}
          onChange={setBackground}
          kind="background"
        />
      </div>
      <button
        className="palette-reset"
        onClick={() => {
          setAccent(DEFAULT_ACCENT);
          setBackground(DEFAULT_BACKGROUND);
        }}
      >
        <Trans>Reset colors</Trans>
      </button>
      <p className="palette-help">
        <Trans>
          Avandar theme swatches. Previews and MP4 downloads use these colors.
          Text and secondary colors stay authored.
        </Trans>
      </p>
    </div>
  );
}
