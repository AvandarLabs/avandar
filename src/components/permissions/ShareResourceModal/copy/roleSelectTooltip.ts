import { t } from "@lingui/core/macro";

/**
 * Explains what a role grants on a resource. Shared copy: the same sentence
 * documents the per-principal role picker in `SharePrincipalRow` and the
 * workspace-wide role picker in `ShareGeneralAccess`, and the two must not
 * drift.
 */
export function roleSelectTooltip(): string {
  return t`What this person or group can do. Viewer = read only, Editor = edit content, Admin = full control including sharing.`;
}
