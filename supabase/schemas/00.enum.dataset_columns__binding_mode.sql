/**
 * What applying a dictionary entry to a dataset column does.
 *
 * Enum values:
 *
 * `reference`: the entry's description and code list are attached to the
 * column. The values in the data stay as they are.
 *
 * `convert`: the column's values are translated through the code list when
 * the dataset loads.
 *
 * Note: `rpc_dataset_columns__apply_dictionaries` refuses `convert`, since
 * nothing translates values at load time yet.
 */
create type public.dataset_columns__binding_mode as enum('reference', 'convert');
