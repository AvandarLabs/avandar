import type { ResourceShareRow } from "@/clients/permissions/ResourceShareClient";

/**
 * The three states the General access dropdown can be in.
 *
 * `private` is not a stored column. It is derived: restricted, with no share
 * granting anyone but the owner. It is the same condition
 * `util__is_resource_private_to_owner` evaluates in Postgres. Neither accounts
 * for publication, so a published (`is_public`) dashboard reads as "Only me"
 * here while staying world-readable.
 */
export type GeneralAccessValue = "private" | "restricted" | "workspace";

/** One entry in the General access dropdown. */
export type GeneralAccessOption = {
  value: GeneralAccessValue;
  label: string;
  disabled: boolean;
};

/**
 * Whether any share grants access to a principal other than the owner.
 *
 * Mirrors `util__has_non_owner_share` exactly, including the workspace
 * principal, whose `principalId` is null by convention. Do not reimplement this
 * by filtering to `principalType === "user"` first: that drops the workspace
 * and group rows and reports a shared resource as private.
 */
export function hasNonOwnerShare(
  options: Readonly<{
    shares: readonly ResourceShareRow[];
    ownerId: string;
  }>,
): boolean {
  return options.shares.some((share) => {
    return (
      share.principalType !== "user" || share.principalId !== options.ownerId
    );
  });
}

/**
 * Maps the stored sharing state onto the dropdown's three-way value.
 */
export function deriveGeneralAccessValue(
  options: Readonly<{
    isRestricted: boolean;
    shares: readonly ResourceShareRow[];
    ownerId: string;
  }>,
): GeneralAccessValue {
  if (!options.isRestricted) {
    return "workspace";
  }
  const isSharedWithOthers = hasNonOwnerShare({
    shares: options.shares,
    ownerId: options.ownerId,
  });
  return isSharedWithOthers ? "restricted" : "private";
}

/**
 * Builds the dropdown's option list, with "Only me" first and owner-gated.
 *
 * Extracted from the component because a Mantine `Select` dropdown cannot be
 * opened in jsdom, so this is the only place the option list and its disabled
 * state can be asserted without a real browser. Takes resolved label strings
 * rather than calling Lingui itself, so it stays pure.
 */
export function buildGeneralAccessOptions(
  options: Readonly<{
    isOwner: boolean;
    labels: Record<GeneralAccessValue, string>;
  }>,
): GeneralAccessOption[] {
  return [
    {
      value: "private",
      label: options.labels.private,
      // Owner-only: this deletes every non-owner share, so a non-owner
      // selecting it would lock themselves out on the spot.
      disabled: !options.isOwner,
    },
    { value: "restricted", label: options.labels.restricted, disabled: false },
    { value: "workspace", label: options.labels.workspace, disabled: false },
  ];
}
