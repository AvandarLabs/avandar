//! How one primitive value is rendered, and which keys say so.

import { registry } from "@avandar/utils";
import type {
  GenericRootData,
  RenderAsTypeOptions,
} from "./describableValues";
import type { FormattableTimezone } from "@avandar/utils";
import type { ReactNode } from "react";

/**
 * Render options for primitive values. These can also be passed to any
 * recursive DescribableValues to apply to its children.
 */
export type PrimitiveValueRenderOptions<
  T,
  RootData extends GenericRootData | undefined,
> = {
  /**
   * When rendering we will do our best to infer the type of the value based on
   * its JavaScript type. However, for better control over how it is rendered,
   * you can explicitly set an `asType` prop.
   *
   * This prop is most useful if the value should be editable, so that the
   * correct editable component can be used. For example, if the value is `null`
   * or `undefined` then it is impossible to infer what input component to use
   * to allow the user to enter a value.
   *
   * `renderAsType` controls how the value is rendered in display mode and edit
   * mode. If either `renderValue` or `renderEditableValue` props are provided,
   * these will override how the value is rendered in display or edit mode,
   * respectively.
   *
   */
  renderAsType?: RenderAsTypeOptions;

  /**
   * A custom render function for the value. If provided, this will take
   * precedence over any other render options.
   *
   * If `undefined` is returned, this will be interpreted as a no-op, and
   * we will fall back to using the other render options for that value.
   */
  renderValue?: (value: T, rootData: RootData) => ReactNode;

  /**
   * A custom render function for the value in edit mode. If provided, this will
   * take precedence over the `renderAsType` prop.
   *
   * If `undefined` is returned, this will be interpreted as a no-op, and
   * we will fall back to using `renderAsType` to render the editable value in
   * edit mode.
   */
  renderEditableValue?: (value: T, rootData: RootData) => ReactNode;

  /** The string to display for empty strings */
  renderEmptyString?: NonNullable<ReactNode>;

  /** The string to display for null values */
  renderNullString?: NonNullable<ReactNode>;

  /** The string to display for undefined values */
  renderUndefinedString?: NonNullable<ReactNode>;

  /** The string to display for boolean true values */
  renderBooleanTrue?: NonNullable<ReactNode>;

  /** The string to display for boolean false values */
  renderBooleanFalse?: NonNullable<ReactNode>;

  /** The format to use for dates. Defaults to ISO 8601. */
  dateFormat?: string;

  /**
   * The timezone to use for dates. Defaults to "local", meaning that the user's
   * local timezone will be used, as determined by `dayjs`. Otherwise, any valid
   * timezone string can be passed, such as "UTC" or "America/New_York".
   */
  dateTimeZone?: FormattableTimezone;
};

export const PRIMITIVE_VALUE_RENDER_OPTIONS_KEYS = registry<
  keyof PrimitiveValueRenderOptions<unknown, GenericRootData>
>().keys(
  "renderAsType",
  "renderValue",
  "renderEditableValue",
  "renderEmptyString",
  "renderNullString",
  "renderUndefinedString",
  "renderBooleanTrue",
  "renderBooleanFalse",
  "dateFormat",
  "dateTimeZone",
);
