/** Palette JSON emitted from the worktree's Avandar theme by buildAtlas(). */
declare const theme: Record<
  | "primary"
  | "neutral"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info",
  readonly string[]
> & {
  brand: string;
  shell: string;
  surfaces: Record<
    "light" | "dark",
    { body: string; raised: string; sunken: string }
  >;
};

export default theme;
