/** All persisted dashboard publication states. */
export const DASHBOARD_VISIBILITIES = ["draft", "workspace", "public"] as const;

/** All durable dashboard snapshot transition states. */
export const DASHBOARD_SNAPSHOT_TRANSITION_KINDS = [
  "publish",
  "abort_publish",
  "unpublish",
  "delete",
] as const;
