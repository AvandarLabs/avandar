import { msg } from "@lingui/core/macro";
import { matchLiteral } from "@utils";
import type { I18n } from "@lingui/core";

/** Builds the compact data-type label used by the column outline. */
export function buildShortDataTypeLabel(dataType: string, i18n: I18n): string {
  return matchLiteral(dataType, {
    varchar: i18n._(msg`text`),
    bigint: i18n._(msg`number`),
    double: i18n._(msg`number`),
    date: i18n._(msg`date`),
    time: i18n._(msg`date`),
    timestamp: i18n._(msg`date`),
    _otherwise: dataType,
  });
}

/** Builds the full data-type label used by a column section. */
export function buildFullDataTypeLabel(dataType: string, i18n: I18n): string {
  return matchLiteral(dataType, {
    varchar: i18n._(msg`Text`),
    bigint: i18n._(msg`Whole number`),
    double: i18n._(msg`Decimal`),
    date: i18n._(msg`Date`),
    time: i18n._(msg`Time`),
    timestamp: i18n._(msg`Timestamp`),
    _otherwise: dataType,
  });
}
