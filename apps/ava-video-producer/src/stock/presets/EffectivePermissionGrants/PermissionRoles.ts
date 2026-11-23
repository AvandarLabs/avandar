const VALUES = ["none", "viewer", "editor", "admin"] as const;
/** The effective permission role, including the absence of grants. */
export type PermissionRole = (typeof VALUES)[number];
const RANK = {
  none: 0,
  viewer: 1,
  editor: 2,
  admin: 3,
} as const satisfies Record<PermissionRole, number>;
/** The effective permission roles and their stable visual ranking. */
export const PermissionRoles = {
  /** Effective permission role names in increasing privilege order. */
  values: VALUES,
  /** Numeric rank of each role for comparing effective permissions. */
  rank: RANK,
  /** Whether a value names an effective permission role. */
  isValid: (value: unknown): value is PermissionRole => {
    return VALUES.some((role) => {
      return role === value;
    });
  },
};
