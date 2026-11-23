const VALUES = ["participant", "facilitator", "worker"] as const;
/** A supported authored role badge. */
export type PersonRole = (typeof VALUES)[number];
/** The authored role badges available to a person glyph. */
export const PersonRoles = {
  /** Person glyph role names accepted by the renderer. */
  values: VALUES,
  /** Whether a value names one supported role badge. */
  isValid: (value: unknown): value is PersonRole => {
    return VALUES.some((role) => {
      return role === value;
    });
  },
};
