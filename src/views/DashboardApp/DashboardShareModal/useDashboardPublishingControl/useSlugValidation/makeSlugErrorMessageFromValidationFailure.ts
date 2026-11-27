import { matchLiteral } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import type { I18n } from "@lingui/core";
import type { DashboardSlugValidationFailure } from "@sbfn/dashboards/DashboardsRoutes/DashboardsRoutes.types";

/**
 * Returns a localized message for a server slug validation failure.
 * Use it, for example, to show a publishing form's slug validation error.
 */
export function makeSlugErrorMessageFromValidationFailure(
  options: Readonly<{ failure: DashboardSlugValidationFailure; i18n: I18n }>,
): string {
  return matchLiteral(options.failure.reason, {
    empty: options.i18n._(msg`The custom URL cannot be empty`),
    spaces: options.i18n._(msg`The custom URL cannot contain spaces`),
    invalid_characters: options.i18n._(
      msg`The custom URL can only contain lowercase letters, numbers, and hyphens`,
    ),
    too_short: options.i18n._(
      msg`The custom URL must be at least ${options.failure.limit ?? 3} characters`,
    ),
    too_long: options.i18n._(
      msg`The custom URL cannot exceed ${options.failure.limit ?? 64} characters`,
    ),
    taken: options.i18n._(msg`This custom URL is already taken`),
    reserved: options.i18n._(
      msg`This custom URL is reserved. Try adding a word to it.`,
    ),
  });
}
