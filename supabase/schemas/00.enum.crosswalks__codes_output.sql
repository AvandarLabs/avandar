/**
 * How a crosswalk's combined dataset writes a column that a dictionary
 * entry governs.
 *
 * Enum values:
 *
 * `labels`: the labels of the entry's primary code list, such as Male.
 *
 * `codes`: the codes of the entry's primary code list, such as 1.
 */
create type public.crosswalks__codes_output as enum('labels', 'codes');
