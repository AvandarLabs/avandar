import type { ResourceShareRow } from "@/clients/permissions/ResourceShareClient";

const _GENERAL_ACCESS_VALUES = [
  "private",
  "restricted",
  "workspace",
  "public",
] as const;

/** A value available in the General access dropdown. */
export type GeneralAccessValue = (typeof _GENERAL_ACCESS_VALUES)[number];

function _doesNonOwnerHaveAccess(
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

function _getGeneralAccessValueFromShareState(
  options: Readonly<{
    isRestricted: boolean;
    shares: readonly ResourceShareRow[];
    ownerId: string;
  }>,
): GeneralAccessValue {
  const restrictedValue =
    (
      _doesNonOwnerHaveAccess({
        shares: options.shares,
        ownerId: options.ownerId,
      })
    ) ?
      "restricted"
    : "private";
  return options.isRestricted ? restrictedValue : "workspace";
}

/**
 * Resolves the value the dropdown shows for a resource that may also have a
 * published form.
 *
 * "Anyone with the link" outranks whatever the share rows derive to, because
 * public reads never consult `resource_shares`: the anon policy and the
 * `is_public` short-circuit in `util__auth_user_may_select_dashboard` both fire
 * first. Showing the derived share value instead would tell an owner their
 * dashboard is Restricted while the whole internet can read it.
 *
 * `isPublicSelected` is deliberately NOT named for the database. Callers pass
 * the PENDING selection, so the dropdown keeps showing what the user picked
 * rather than snapping back while a publish is in flight. It is therefore the
 * wrong input for any warning about real exposure, which must read the
 * persisted visibility instead; see `useGeneralAccessControl`, which keeps the
 * two as separate options for exactly that reason. Do not "correct" a caller
 * that passes a target here.
 *
 * It is a boolean rather than a visibility so this module stays
 * resource-generic; datasets have no published form and pass `false`.
 */
function _getGeneralAccessValueFromResourceState(
  options: Readonly<{
    isRestricted: boolean;
    shares: readonly ResourceShareRow[];
    ownerId: string;
    isPublicSelected: boolean;
  }>,
): GeneralAccessValue {
  if (options.isPublicSelected) {
    return "public";
  }
  return _getGeneralAccessValueFromShareState(options);
}

function _makeDropdownOptionsFromLabels(
  options: Readonly<{
    isOwner: boolean;
    labels: Record<GeneralAccessValue, string>;
    /** False for every resource type with no published form. */
    isPublicOptionAvailable: boolean;
    /** True when the caller may not publish publicly. */
    isPublicOptionDisabled: boolean;
  }>,
): Array<{
  value: GeneralAccessValue;
  label: string;
  disabled: boolean;
}> {
  return [
    {
      value: "private",
      label: options.labels.private,
      disabled: !options.isOwner,
    },
    { value: "restricted", label: options.labels.restricted, disabled: false },
    { value: "workspace", label: options.labels.workspace, disabled: false },
    ...(options.isPublicOptionAvailable ?
      [
        {
          value: "public" as const,
          label: options.labels.public,
          disabled: options.isPublicOptionDisabled,
        },
      ]
    : []),
  ];
}

function _isValidGeneralAccessValue(
  value: string,
): value is GeneralAccessValue {
  return (_GENERAL_ACCESS_VALUES as readonly string[]).includes(value);
}

/** Stateless operations for General access values and sharing-state mapping. */
export const GeneralAccessModule = {
  /** Every supported General access value in display order. */
  values: _GENERAL_ACCESS_VALUES,

  /** Whether a string is a supported General access value. */
  isValidAccessValue: _isValidGeneralAccessValue,

  /** Whether a share grants access to a principal other than the owner. */
  doesNonOwnerHaveAccess: _doesNonOwnerHaveAccess,

  /** Maps persisted sharing state to its General access value. */
  fromShareState: _getGeneralAccessValueFromShareState,

  /** Maps sharing state plus publication state to its General access value. */
  fromResourceState: _getGeneralAccessValueFromResourceState,

  /** Maps localized labels to dropdown options. */
  makeDropdownOptionsFromLabels: _makeDropdownOptionsFromLabels,
} as const;
