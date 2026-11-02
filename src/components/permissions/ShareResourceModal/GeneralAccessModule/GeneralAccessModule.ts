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

/** The persisted sharing state a General access value is derived from. */
type GeneralAccessShareState = {
  isRestricted: boolean;
  shares: readonly ResourceShareRow[];
  ownerId: string;
};

function _getGeneralAccessValueFromShareState(
  options: Readonly<GeneralAccessShareState>,
): GeneralAccessValue {
  const restrictedValue = _doesNonOwnerHaveAccess({
    shares: options.shares,
    ownerId: options.ownerId,
  })
    ? "restricted"
    : "private";
  return options.isRestricted ? restrictedValue : "workspace";
}

/**
 * Resolves the value the dropdown shows for a resource that may also have a
 * published form. Public outranks the share-derived value, because public
 * reads never consult `resource_shares`.
 *
 * @param options.isPublicSelected The PENDING selection, not the persisted
 *   visibility, so the dropdown keeps showing what the user picked while a
 *   publish is in flight. Anything warning about real exposure must read the
 *   persisted visibility instead. A boolean rather than a visibility keeps
 *   this module resource-generic; datasets pass `false`.
 */
function _getGeneralAccessValueFromResourceState(
  options: Readonly<GeneralAccessShareState & { isPublicSelected: boolean }>,
): GeneralAccessValue {
  // Showing the derived share value while public would tell an owner their
  // dashboard is Restricted when the whole internet can read it: the anon
  // policy and the `is_public` short-circuit in
  // `util__auth_user_may_select_dashboard` both fire before shares are read.
  return options.isPublicSelected
    ? "public"
    : _getGeneralAccessValueFromShareState(options);
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
    ...(options.isPublicOptionAvailable
      ? [
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
