import type { EtlScope } from "@etl/EtlEngine/EtlEngine.types";

/** The one scope a drive has when its pipeline declares none. */
export const ETL_DEFAULT_SCOPE: EtlScope = { key: "all" };

/**
 * What a scope key may be: 1 to 64 lowercase letters, digits, and `.`, `_`,
 * `:`, `@`, `-`, starting with a letter or digit. Keys are stored in a
 * `text[]` and sent in PostgREST array filters, where commas, braces, and
 * quotes would need escaping.
 */
export const ETL_SCOPE_KEY_PATTERN = /^[a-z0-9][a-z0-9._:@-]{0,63}$/;
