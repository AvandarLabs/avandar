import { useLingui as useGalleryLingui } from "@lingui/react/macro";
import React from "react";
import { Icon } from "./Icon";

export function PaletteSwatches({
  swatches,
  value,
  onChange,
  kind,
}: {
  swatches: ReadonlyArray<{
    name: string;
    color: string;
    token: string;
  }>;
  value: string;
  onChange: (color: string) => void;
  kind: "accent" | "background";
}) {
  const { t } = useGalleryLingui();
  return (
    <div
      className="swatches"
      role="group"
      aria-label={
        kind === "accent" ? t`Brand swatches` : t`Background swatches`
      }
    >
      {swatches.map((swatch) => (
        <button
          key={swatch.name}
          className={`swatch ${value === swatch.color ? "is-selected" : ""}`}
          style={
            {
              "--swatch": swatch.color,
            } as React.CSSProperties
          }
          title={t`${swatch.name}: ${swatch.color} (${swatch.token})`}
          aria-label={
            kind === "accent"
              ? t`${swatch.name} brand color`
              : t`${swatch.name} background`
          }
          aria-pressed={value === swatch.color}
          onClick={() => onChange(swatch.color)}
        >
          {value === swatch.color ? <Icon name="check" size={13} /> : null}
        </button>
      ))}
    </div>
  );
}
