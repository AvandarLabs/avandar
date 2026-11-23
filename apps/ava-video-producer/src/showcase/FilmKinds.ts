const VALUES = [
  "stock",
  "storyboard",
  "title-study",
  "motion-lab",
  "helper",
] as const;
/** A supported live film family. */
export type FilmKind = (typeof VALUES)[number];
/** The live film families accepted by previews and transports. */
export const FilmKinds = {
  /** Supported live film family names. */
  values: VALUES,
  /** Whether a value names a supported live film family. */
  isValid: (value: unknown): value is FilmKind => {
    return VALUES.some((kind) => {
      return kind === value;
    });
  },
};
