import type { ResourceShareRow } from "@/clients/permissions/ResourceShareClient";

const _GENERAL_ACCESS_VALUES = ["private", "restricted", "workspace"] as const;

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

function _makeDropdownOptionsFromLabels(
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

  /** Maps localized labels to dropdown options. */
  makeDropdownOptionsFromLabels: _makeDropdownOptionsFromLabels,
} as const;
