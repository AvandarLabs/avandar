import type { ResourceShareRow } from "@/clients/permissions/ResourceShareClient";

const _GENERAL_ACCESS_VALUES = ["private", "restricted", "workspace"] as const;

/** A value available in the General access dropdown. */
export type GeneralAccessValue = (typeof _GENERAL_ACCESS_VALUES)[number];

function _hasNonOwnerShare(
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

function _sharingStateToValue(
  options: Readonly<{
    isRestricted: boolean;
    shares: readonly ResourceShareRow[];
    ownerId: string;
  }>,
): GeneralAccessValue {
  const restrictedValue =
    _hasNonOwnerShare({ shares: options.shares, ownerId: options.ownerId }) ?
      "restricted"
    : "private";
  return options.isRestricted ? restrictedValue : "workspace";
}

function _labelsToOptions(
  options: Readonly<{
    isOwner: boolean;
    labels: Record<GeneralAccessValue, string>;
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
  ];
}

function _isValid(value: string): value is GeneralAccessValue {
  return (_GENERAL_ACCESS_VALUES as readonly string[]).includes(value);
}

/** Stateless operations for General access values and sharing-state mapping. */
export const GeneralAccess = {
  /** Every supported General access value in display order. */
  values: _GENERAL_ACCESS_VALUES,

  /** Whether a string is a supported General access value. */
  isValid: _isValid,

  /** Whether a share grants access to a principal other than the owner. */
  hasNonOwnerShare: _hasNonOwnerShare,

  /** Maps persisted sharing state to its General access value. */
  fromSharingState: _sharingStateToValue,

  /** Maps localized labels to dropdown options. */
  toOptions: _labelsToOptions,
} as const;
