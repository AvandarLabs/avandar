/**
 * Which side of each code pair a bound column holds.
 *
 * Enum values:
 *
 * `decode`: the column holds codes, such as 1 and 2, and the code list says
 * what each means.
 *
 * `encode`: the column holds labels, such as Male, and the code list gives
 * each one's code.
 */
create type public.dataset_columns__binding_direction as enum('decode', 'encode');
