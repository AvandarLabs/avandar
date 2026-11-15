import { match, P } from "ts-pattern";
import { StockCopyMessages } from "../../../../stock/i18n/StockCopyMessages";
import type {
  StockControl,
  StockJsonValue,
  StockMessageDescriptor,
} from "../../../../stock/contracts/StockContract.types";

/**
 * Resolves dynamic references against the root or the nearest collection item.
 */
function _getOptionsFromControl({
  control,
  root,
  item,
}: Readonly<{
  control: Extract<
    StockControl,
    {
      kind: "select";
    }
  >;
  root: unknown;
  item: unknown;
}>): Array<{
  value: string | number | boolean;
  label: StockMessageDescriptor | string;
}> {
  if ("options" in control) {
    return control.options;
  }
  const source = control.optionsFrom;
  const values = StockCopyMessages.getValueFromPath({
    value: source.scope === "item" ? item : root,
    path: source.path.split(".").filter(Boolean),
  });
  if (!Array.isArray(values)) {
    return [];
  }
  return values.flatMap((value: unknown) => {
    if (!value || typeof value !== "object") {
      return [];
    }
    const optionValue: unknown = Reflect.get(value, source.valueKey);
    const label: unknown = Reflect.get(value, source.labelKey);
    return typeof optionValue === "string" ||
      typeof optionValue === "number" ||
      typeof optionValue === "boolean"
      ? [
          {
            value: optionValue,
            label:
              typeof label === "string" && label ? label : String(optionValue),
          },
        ]
      : [];
  });
}
/**
 * Chooses an editor from the authored JSON type without coercing string values.
 */
function _getUnionVariantFromValue({
  control,
  value,
}: Readonly<{
  control: Extract<
    StockControl,
    {
      kind: "union";
    }
  >;
  value: unknown;
}>): Extract<StockControl, { kind: "union" }>["variants"][number] {
  return (
    control.variants.find((variant) => variant.valueType === typeof value) ??
    control.variants[0]
  );
}
/**
 * Empty enabled fields remain visibly invalid until the author supplies
 * content.
 */
function _getBlankValueFromControl(
  control: Readonly<StockControl>,
): StockJsonValue {
  return match(control)
    .with({ kind: "object" }, (matchedControl) => {
      return Object.fromEntries(
        matchedControl.controls.map((child) => [
          child.path,
          child.nullable ? null : _getBlankValueFromControl(child),
        ]),
      );
    })
    .with({ kind: "boolean" }, () => {
      return false;
    })
    .with({ kind: "collection" }, () => {
      return [];
    })
    .with({ kind: "union" }, (matchedControl) => {
      return _getBlankValueFromControl(matchedControl.variants[0].control);
    })
    .with({ kind: P.union("text", "number", "select") }, () => {
      return "";
    })
    .exhaustive();
}

/** Related content fields operations. */
export const ContentFields = {
  /**
   * Resolves dynamic references against the root or the nearest collection
   * item.
   */
  getOptionsFromControl: _getOptionsFromControl,
  /**
   * Chooses an editor from the authored JSON type without coercing string
   * values.
   */
  getVariantFromValue: _getUnionVariantFromValue,
  /**
   * Empty enabled fields remain visibly invalid until the author supplies
   * content.
   */
  getBlankValueFromControl: _getBlankValueFromControl,
} satisfies {
  getOptionsFromControl: typeof _getOptionsFromControl;
  getVariantFromValue: typeof _getUnionVariantFromValue;
  getBlankValueFromControl: typeof _getBlankValueFromControl;
};
