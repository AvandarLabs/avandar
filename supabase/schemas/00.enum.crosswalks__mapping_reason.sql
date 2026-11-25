/**
 * Why matching suggested a crosswalk mapping. Null on a mapping the user
 * chose.
 *
 * Enum values:
 *
 * `name_and_type`: the source column's name and type resemble the target's.
 *
 * `same_values`: the source column holds the same values as the target,
 * whatever its name.
 *
 * `similar_layout`: carried over from the most similar layout already
 * mapped.
 *
 * `meaning`: an AI suggestion that the two columns mean the same thing.
 */
create type public.crosswalks__mapping_reason as enum(
  'name_and_type',
  'same_values',
  'similar_layout',
  'meaning'
);
