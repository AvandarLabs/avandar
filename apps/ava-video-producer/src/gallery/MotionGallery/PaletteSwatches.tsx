import React from "react";
import { Icon } from "./Icon";

export function PaletteSwatches({
  swatches,
  value,
  onChange,
  kind,
}: {
  swatches: ReadonlyArray<{ name: string; color: string; token: string }>;
  value: string;
  onChange: (color: string) => void;
  kind: "accent" | "background";
}) {
  return (
    <div
      className="swatches"
      role="group"
      aria-label={`${kind === "accent" ? "Brand" : "Background"} swatches`}
    >
      {swatches.map((swatch) => (
        <button
          key={swatch.name}
          className={`swatch ${value === swatch.color ? "is-selected" : ""}`}
          style={{ "--swatch": swatch.color } as React.CSSProperties}
          title={`${swatch.name}: ${swatch.color} (${swatch.token})`}
          aria-label={`${swatch.name} ${kind}`}
          aria-pressed={value === swatch.color}
          onClick={() => onChange(swatch.color)}
        >
          {value === swatch.color ? <Icon name="check" size={13} /> : null}
        </button>
      ))}
    </div>
  );
}
