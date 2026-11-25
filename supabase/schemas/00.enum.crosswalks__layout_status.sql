/**
 * How far the mapping of one crosswalk layout has got.
 *
 * Enum values:
 *
 * `to_do`: some column of the combined dataset has no fill for this layout
 * yet.
 *
 * `review`: every column has a fill, and the user has not confirmed them.
 *
 * `mapped`: the user confirmed the layout's fills. The reference layout is
 * always mapped.
 *
 * `skipped`: the user left the layout's datasets out of the combined
 * dataset.
 */
create type public.crosswalks__layout_status as enum('to_do', 'review', 'mapped', 'skipped');
