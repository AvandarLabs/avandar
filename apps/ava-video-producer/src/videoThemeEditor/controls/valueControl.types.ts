import type { TokenDefinition } from "../../videoTheme/videoTheme.types";

/** What every literal value control receives. */
export type ValueControlProps = Readonly<{
  /** Accessible name naming the token. */
  label: string;
  definition: Pick<
    TokenDefinition,
    "kind" | "min" | "max" | "step" | "unit" | "options"
  >;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Key for enum option names: the token path or the composite field name. */
  optionKey?: string;
  /**
   * A camera curve: control points stay in 0..1 and the only power curve is the
   * cubic in-out (`isCameraSafeEasing`).
   */
  isCameraCurve?: boolean;
}>;
