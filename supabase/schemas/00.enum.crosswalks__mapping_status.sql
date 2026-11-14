/**
 * Whether a crosswalk mapping is a guess or the user's choice.
 *
 * Enum values:
 *
 * `suggested`: filled by matching, and not yet accepted.
 *
 * `confirmed`: chosen or accepted by the user.
 */
create type public.crosswalks__mapping_status as enum('suggested', 'confirmed');
